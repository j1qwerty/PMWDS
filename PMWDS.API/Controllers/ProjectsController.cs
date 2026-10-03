using PMWDS.Application.DTOs.Controllers;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PMWDS.API.Middleware;
using PMWDS.API.Services;
using PMWDS.Application.DTOs.Common;
using PMWDS.Application.DTOs.Projects;
using PMWDS.Application.Features.Projects.Commands;
using PMWDS.Application.Features.Projects.Queries;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;
using PMWDS.Domain.Enums;
using PMWDS.Infrastructure.Services;
using PMWDS.Persistence.Context;

namespace PMWDS.API.Controllers;

public class ProjectsController : BaseApiController
{
    private readonly IUnitOfWork _uow;
    private readonly IProjectHealthService _ai;
    private readonly ICurrentUserService _currentUser;
    private readonly ILocalFileStorageService _localFiles;
    private readonly RoleScopeService _scope;
    private readonly ApplicationDbContext _db;
    private readonly IDataChangeNotifier _changes;

    public ProjectsController(
        IMediator mediator,
        IUnitOfWork uow,
        IProjectHealthService ai,
        ICurrentUserService currentUser,
        ILocalFileStorageService localFiles,
        RoleScopeService scope,
        ApplicationDbContext db,
        IDataChangeNotifier changes) : base(mediator)
    {
        _uow = uow;
        _ai = ai;
        _currentUser = currentUser;
        _localFiles = localFiles;
        _scope = scope;
        _db = db;
        _changes = changes;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard([FromQuery] Guid? departmentId, CancellationToken ct)
    {
        if (departmentId.HasValue && !await _scope.CanAccessDepartmentAsync(departmentId.Value, ct))
        {
            return Forbid();
        }

        var now = DateTime.UtcNow;
        var query = _db.Projects
            .AsNoTracking()
            .AsQueryable();
        if (departmentId.HasValue)
        {
            query = query.Where(project =>
                project.DepartmentId == departmentId.Value ||
                project.ProjectDepartments.Any(assignment => assignment.DepartmentId == departmentId.Value));
        }

        query = await _scope.ScopeProjectsAsync(query, ct);
        var totalProjects = await query.CountAsync(ct);
        var activeProjects = await query.CountAsync(project => project.Status == ProjectStatus.InProgress, ct);
        var completedProjects = await query.CountAsync(project => project.Status == ProjectStatus.Completed, ct);
        var overdueProjects = await query.CountAsync(project =>
            (project.ActualEndDate.HasValue && project.ActualEndDate > project.PlannedEndDate) ||
            (!project.ActualEndDate.HasValue && now > project.PlannedEndDate),
            ct);
        var highRiskProjects = await query.CountAsync(project => project.AIDelayRiskScore >= 0.7, ct);
        var averageHealthScore = totalProjects > 0
            ? await query.AverageAsync(project => project.AIHealthScore, ct)
            : 0;
        var totalBudget = await query.SumAsync(project => project.PlannedBudget, ct);
        var totalActualCost = await query.SumAsync(project => project.ActualCost, ct);
        var recentProjectRows = await query
            .OrderByDescending(project => project.CreatedDate)
            .Take(5)
            .Select(project => new
            {
                project.Id,
                project.ProjectCode,
                project.Name,
                project.Status,
                project.ProgressPercentage,
                project.AIHealthScore,
                project.AIDelayRiskScore,
                project.ActualEndDate,
                project.PlannedEndDate
            })
            .ToListAsync(ct);
        var atRiskProjectRows = await query
            .Where(project => project.AIDelayRiskScore >= 0.7)
            .OrderByDescending(project => project.AIDelayRiskScore)
            .Take(10)
            .Select(project => new
            {
                project.Id,
                project.ProjectCode,
                project.Name,
                project.Status,
                project.ProgressPercentage,
                project.AIHealthScore,
                project.AIDelayRiskScore,
                project.ActualEndDate,
                project.PlannedEndDate
            })
            .ToListAsync(ct);
        var recentProjects = recentProjectRows
            .Select(project => new ProjectSummaryDto(
                project.Id,
                project.ProjectCode,
                project.Name,
                project.Status.ToString(),
                project.ProgressPercentage,
                (double)project.AIHealthScore,
                (double)project.AIDelayRiskScore,
                GetDelayDays(project.ActualEndDate, project.PlannedEndDate, now),
                project.PlannedEndDate))
            .ToList();
        var atRiskProjects = atRiskProjectRows
            .Select(project => new ProjectSummaryDto(
                project.Id,
                project.ProjectCode,
                project.Name,
                project.Status.ToString(),
                project.ProgressPercentage,
                (double)project.AIHealthScore,
                (double)project.AIDelayRiskScore,
                GetDelayDays(project.ActualEndDate, project.PlannedEndDate, now),
                project.PlannedEndDate))
            .ToList();

        return Ok(new ProjectDashboardDto(
            TotalProjects: totalProjects,
            ActiveProjects: activeProjects,
            CompletedProjects: completedProjects,
            OverdueProjects: overdueProjects,
            HighRiskProjects: highRiskProjects,
            AverageHealthScore: averageHealthScore,
            TotalBudget: totalBudget,
            TotalActualCost: totalActualCost,
            RecentProjects: recentProjects,
            AtRiskProjects: atRiskProjects));
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? departmentId,
        [FromQuery] ProjectStatus? status,
        [FromQuery] PaginationQuery pagination,
        CancellationToken ct)
    {
        if (departmentId.HasValue && !await _scope.CanAccessDepartmentAsync(departmentId.Value, ct))
        {
            return Forbid();
        }

        var query = _db.Projects
            .Include(p => p.Department)
            .Include(p => p.ProjectDepartments).ThenInclude(assignment => assignment.Department)
            .Include(p => p.Tasks)
            .Include(p => p.Milestones)
            .AsQueryable();

        if (departmentId.HasValue)
        {
            query = query.Where(p =>
                p.DepartmentId == departmentId.Value ||
                p.ProjectDepartments.Any(assignment => assignment.DepartmentId == departmentId.Value));
        }

        query = await _scope.ScopeProjectsAsync(query, ct);

        if (status.HasValue)
        {
            query = query.Where(p => p.Status == status.Value);
        }

        var totalCount = await query.CountAsync(ct);
        var projects = await query
            .OrderByDescending(p => p.CreatedDate)
            .Skip(pagination.Skip)
            .Take(pagination.NormalizedPageSize)
            .ToListAsync(ct);
        var managerNames = await ResolveProjectManagerNamesAsync(projects, ct);
        var items = projects
            .Select(project => ProjectDto.FromEntity(
                project,
                project.ProjectManagerId.HasValue
                    ? managerNames.GetValueOrDefault(project.ProjectManagerId.Value)
                    : null))
            .ToList();
        return Ok(PaginatedResponse<ProjectDto>.Create(items, pagination, totalCount));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        if (!await _scope.CanAccessProjectAsync(id, ct))
        {
            return Forbid();
        }

        return Ok(await Mediator.Send(new GetProjectDetailsQuery(id), ct));
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    public async Task<IActionResult> Create([FromBody] CreateProjectDto dto, CancellationToken ct)
    {
        var departmentIds = ResolveDepartmentIds(dto.DepartmentId, dto.DepartmentIds);
        if (!await AreDepartmentsInScopeAsync(departmentIds, ct))
        {
            return Forbid();
        }

        if (!_scope.IsSuperAdmin && !_scope.IsDirector && _scope.IsDepartmentHead && _currentUser.UserId is not null)
        {
            var userHeadedDepts = await _db.Departments
                .Where(d => d.DepartmentHeadUserId == _currentUser.UserId)
                .Select(d => d.Id)
                .ToListAsync(ct);
            if (userHeadedDepts.Count > 0 && !departmentIds.Any(id => userHeadedDepts.Contains(id)))
                return Forbid();
        }

        if (!string.IsNullOrEmpty(dto.ProjectManagerId) &&
            !await IsUserInDepartmentOrganizationsAsync(dto.ProjectManagerId, departmentIds, ct))
        {
            return BadRequest(new { message = "Project manager must belong to one of the selected department organizations." });
        }

        var result = await Mediator.Send(new CreateProjectCommand(dto), ct);

        HttpContext.Items["ActivityLog"] = new ActivityLogContext(
            ActivityType: "Project Created",
            Description: $"{_currentUser.FullName} created project \"{result.Name}\"",
            Metadata: new Dictionary<string, object>
            {
                ["projectId"] = result.Id,
                ["projectName"] = result.Name
            },
            ProjectId: result.Id
        );

        await _changes.NotifyAsync(DataChangeScopes.Projects, result.Id.ToString(), result.Id, ct);

        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProjectDto dto, CancellationToken ct)
    {
        if (!await _scope.CanManageProjectAsync(id, ct))
        {
            return Forbid();
        }

        var departmentIds = ResolveDepartmentIds(dto.DepartmentId, dto.DepartmentIds);
        if (!await AreDepartmentsInScopeAsync(departmentIds, ct))
        {
            return Forbid();
        }

        if (!string.IsNullOrEmpty(dto.ProjectManagerId) &&
            !await IsUserInDepartmentOrganizationsAsync(dto.ProjectManagerId, departmentIds, ct))
        {
            return BadRequest(new { message = "Project manager must belong to one of the selected department organizations." });
        }

        var updateResult = await Mediator.Send(new UpdateProjectCommand(id, dto), ct);

        HttpContext.Items["ActivityLog"] = new ActivityLogContext(
            ActivityType: "Project Updated",
            Description: $"{_currentUser.FullName} updated project \"{updateResult.Name}\"",
            Metadata: new Dictionary<string, object>
            {
                ["projectId"] = updateResult.Id,
                ["projectName"] = updateResult.Name
            },
            ProjectId: updateResult.Id
        );

        await _changes.NotifyAsync(DataChangeScopes.Projects, updateResult.Id.ToString(), updateResult.Id, ct);

        return Ok(updateResult);
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateProjectStatusRequest req, CancellationToken ct)
    {
        if (!await _scope.CanManageProjectAsync(id, ct))
        {
            return Forbid();
        }

        var statusResult = await Mediator.Send(new UpdateProjectStatusCommand(id, req.NewStatus, req.Justification), ct);

        HttpContext.Items["ActivityLog"] = new ActivityLogContext(
            ActivityType: "Project Status Changed",
            Description: $"{_currentUser.FullName} changed project \"{statusResult.Name}\" status to \"{req.NewStatus}\"",
            Metadata: new Dictionary<string, object>
            {
                ["projectId"] = statusResult.Id,
                ["projectName"] = statusResult.Name,
                ["newStatus"] = req.NewStatus.ToString(),
                ["justification"] = req.Justification ?? ""
            },
            ProjectId: statusResult.Id
        );

        await _changes.NotifyAsync(DataChangeScopes.Projects, statusResult.Id.ToString(), statusResult.Id, ct);

        return Ok(statusResult);
    }

    [HttpGet("{id:guid}/progress")]
    public async Task<IActionResult> GetProgress(Guid id, CancellationToken ct)
    {
        var project = await _uow.Projects.GetWithDetailsAsync(id, ct);
        if (project == null)
            return NotFound();

        if (!await _scope.CanAccessProjectAsync(id, ct))
        {
            return Forbid();
        }

        return Ok(new
        {
            project.Id,
            project.Name,
            project.ProgressPercentage,
            TotalTasks = project.Tasks.Count,
            CompletedTasks = project.Tasks.Count(t => t.Status == PMWDS.Domain.Enums.TaskStatus.Completed),
            OverdueTasks = project.Tasks.Count(t => t.IsOverdue())
        });
    }

    [HttpGet("{id:guid}/ai/health")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    public async Task<IActionResult> GetAIHealth(Guid id, CancellationToken ct)
    {
        if (!await _scope.CanAccessProjectAsync(id, ct))
        {
            return Forbid();
        }

        return Ok(await Mediator.Send(new GetProjectHealthQuery(id), ct));
    }

    [HttpGet("{id:guid}/ai/insights")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    public async Task<IActionResult> GetAIInsights(Guid id, CancellationToken ct)
    {
        if (!await _scope.CanAccessProjectAsync(id, ct))
        {
            return Forbid();
        }

        return Ok(await _ai.GenerateProjectInsightsAsync(id, ct));
    }

    [HttpPost("{id:guid}/ai/optimize-resources")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    public async Task<IActionResult> OptimizeResources(Guid id, CancellationToken ct)
    {
        if (!await _scope.CanManageProjectAsync(id, ct))
        {
            return Forbid();
        }

        return Ok(await _ai.OptimizeResourceAllocationAsync(id, ct));
    }

    [HttpPost("{id:guid}/documents")]
    public async Task<IActionResult> UploadDocument(
    Guid id,
    IFormFile file,
    [FromForm] DocumentCategory? category,
    CancellationToken ct)
    {
        var project = await _uow.Projects.GetByIdAsync(id, ct);
        if (project == null)
            return NotFound();

        if (!await _scope.CanManageProjectAsync(id, ct))
        {
            return Forbid();
        }

        // A Utilization Certificate carries extra finance metadata and an approval
        // lifecycle, so it has to go through the dedicated UC endpoint instead.
        var resolvedCategory = category is null || category == DocumentCategory.UtilizationCertificate
            ? DocumentCategory.General
            : category.Value;

        await using var stream = file.OpenReadStream();
        var extension = Path.GetExtension(file.FileName);
        var filePath = await _localFiles.UploadDocumentAsync(stream, project.ProjectCode, project.Name, extension, file.ContentType, ct);

        var doc = ProjectDocument.Create(
            id,
            file.FileName,
            filePath,
            file.ContentType,
            file.Length,
            _currentUser.UserId ?? "system",
            description: null,
            category: resolvedCategory);

        await _uow.ProjectDocuments.AddAsync(doc, ct);
        await _uow.SaveChangesAsync(ct);

        HttpContext.Items["ActivityLog"] = new ActivityLogContext(
            ActivityType: "Document Uploaded",
            Description: $"{_currentUser.FullName} uploaded \"{file.FileName}\" to project \"{project.Name}\"",
            Metadata: new Dictionary<string, object>
            {
                ["projectId"] = id,
                ["projectName"] = project.Name,
                ["documentId"] = doc.Id,
                ["fileName"] = file.FileName,
                ["fileSize"] = file.Length
            },
            ProjectId: id
        );

        await _changes.NotifyAsync(DataChangeScopes.Documents, doc.Id.ToString(), id, ct);

        return Ok();
    }

    [HttpGet("{id:guid}/documents")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> GetDocuments(Guid id, CancellationToken ct)
    {
        var project = await _uow.Projects.GetByIdAsync(id, ct);
        if (project == null)
            return NotFound();

        if (!await _scope.CanAccessProjectAsync(id, ct))
        {
            return Forbid();
        }

        var docs = await _uow.ProjectDocuments.FindAsync(d => d.ProjectId == id);
        return Ok(docs.Select(d => new
        {
            d.Id,
            d.ProjectId,
            d.Title,
            d.FilePath,
            d.ContentType,
            d.FileSizeBytes,
            d.UploadedByUserId,
            d.Description,
            d.Version,
            d.Category,
            d.CreatedDate
        }));
    }

    [HttpGet("{id:guid}/documents/{docId:guid}/download")]
    public async Task<IActionResult> DownloadDocument(Guid id, Guid docId, CancellationToken ct)
    {
        var docs = await _uow.ProjectDocuments.FindAsync(d => d.Id == docId && d.ProjectId == id);
        var doc = docs.FirstOrDefault();
        if (doc == null)
            return NotFound();

        if (!await _scope.CanAccessProjectAsync(id, ct))
        {
            return Forbid();
        }

        var stream = await _localFiles.DownloadFileAsync(doc.FilePath, ct);
        return File(stream, doc.ContentType, doc.Title);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var project = await _uow.Projects.GetByIdAsync(id, ct);
        if (project == null)
        {
            return NotFound();
        }

        if (!await _scope.CanManageProjectAsync(id, ct))
        {
            return Forbid();
        }

        var projectName = project.Name;
        var deletedBy = _currentUser.UserId ?? "system";

        await using var transaction = await _db.Database.BeginTransactionAsync(ct);

        var milestoneIds = await _db.Milestones
            .Where(m => m.ProjectId == id)
            .Select(m => m.Id)
            .ToListAsync(ct);
        if (milestoneIds.Count > 0)
        {
            var deps = await _db.MilestoneDependencies
                .Where(d => milestoneIds.Contains(d.PrerequisiteMilestoneId) || milestoneIds.Contains(d.DependentMilestoneId))
                .ToListAsync(ct);
            if (deps.Count > 0)
                _db.MilestoneDependencies.RemoveRange(deps);
        }

        await _uow.Tasks.DeleteTasksByProjectAsync(id, ct);

        // Project is soft-deleted, so database ON DELETE CASCADE does not execute.
        // Explicitly soft-delete every project-owned descendant that participates in the
        // soft-delete model so direct child endpoints and future restores cannot expose
        // records belonging to a deleted project.
        var goals = await _db.Goals.Where(goal => goal.ProjectId == id).ToListAsync(ct);
        foreach (var goal in goals)
            goal.SoftDelete(deletedBy);

        var milestones = await _db.Milestones.Where(milestone => milestone.ProjectId == id).ToListAsync(ct);
        foreach (var milestone in milestones)
            milestone.SoftDelete(deletedBy);

        var documents = await _db.ProjectDocuments.Where(document => document.ProjectId == id).ToListAsync(ct);
        foreach (var document in documents)
            document.SoftDelete(deletedBy);

        // Financial descendants must be hidden with the deleted project as well. Keep the
        // rows for auditability rather than physically deleting the ledger.
        var goalIds = goals.Select(goal => goal.Id).ToList();
        if (goalIds.Count > 0)
        {
            var allocationIds = await _db.GoalBudgetAllocations
                .Where(allocation => goalIds.Contains(allocation.GoalId))
                .Select(allocation => allocation.Id)
                .ToListAsync(ct);

            var allocations = await _db.GoalBudgetAllocations
                .Where(allocation => allocationIds.Contains(allocation.Id))
                .ToListAsync(ct);
            foreach (var allocation in allocations)
                allocation.SoftDelete(deletedBy);

            var releases = await _db.BudgetReleases
                .Where(release => allocationIds.Contains(release.GoalBudgetAllocationId))
                .ToListAsync(ct);
            foreach (var release in releases)
                release.SoftDelete(deletedBy);

            var expenditures = await _db.BudgetExpenditures
                .Where(expenditure => allocationIds.Contains(expenditure.GoalBudgetAllocationId))
                .ToListAsync(ct);
            foreach (var expenditure in expenditures)
                expenditure.SoftDelete(deletedBy);
        }

        await _uow.Projects.DeleteAsync(id, ct);
        await _uow.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        HttpContext.Items["ActivityLog"] = new ActivityLogContext(
            ActivityType: "Project Deleted",
            Description: $"{_currentUser.FullName} deleted project \"{projectName}\"",
            Metadata: new Dictionary<string, object>
            {
                ["projectName"] = projectName,
                ["projectId"] = id
            },
            ProjectId: id
        );

        // Deleting a project cascades its milestones, tasks and documents, so every
        // dependent scope has to refetch too.
        await _changes.NotifyAsync(DataChangeScopes.Projects, id.ToString(), null, ct);
        await _changes.NotifyAsync(DataChangeScopes.Milestones, id.ToString(), null, ct);
        await _changes.NotifyAsync(DataChangeScopes.Tasks, id.ToString(), null, ct);
        await _changes.NotifyAsync(DataChangeScopes.Documents, id.ToString(), null, ct);

        return NoContent();
    }

    private async Task<bool> AreDepartmentsInScopeAsync(IReadOnlyCollection<Guid> departmentIds, CancellationToken ct)
    {
        foreach (var departmentId in departmentIds)
        {
            if (!await _scope.CanAccessDepartmentAsync(departmentId, ct))
            {
                return false;
            }
        }

        return true;
    }

    private static List<Guid> ResolveDepartmentIds(Guid primaryDepartmentId, IReadOnlyCollection<Guid>? assignedDepartmentIds)
        => (assignedDepartmentIds ?? Array.Empty<Guid>())
            .Append(primaryDepartmentId)
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();

    private static int GetDelayDays(DateTime? actualEndDate, DateTime plannedEndDate, DateTime now)
    {
        var compareDate = actualEndDate ?? now;
        return compareDate > plannedEndDate
            ? (int)(compareDate - plannedEndDate).TotalDays
            : 0;
    }

    private async Task<bool> IsUserInDepartmentOrganizationsAsync(string userId, IReadOnlyCollection<Guid> departmentIds, CancellationToken ct)
    {
        if (!Guid.TryParse(userId, out var parsedUserId))
        {
            return false;
        }

        var organizationIds = await _db.Departments
            .Where(department => departmentIds.Contains(department.Id) && department.OrganizationId.HasValue)
            .Select(department => department.OrganizationId!.Value)
            .ToListAsync(ct);

        if (organizationIds.Count == 0)
        {
            return false;
        }

        return await _db.Users.AnyAsync(user =>
            user.Id == parsedUserId &&
            ((user.OrganizationId.HasValue && organizationIds.Contains(user.OrganizationId.Value)) ||
             user.DepartmentAssignments.Any(assignment =>
                 assignment.Department != null &&
                 assignment.Department.OrganizationId.HasValue &&
                 organizationIds.Contains(assignment.Department.OrganizationId.Value)) ||
             user.Department != null &&
                 user.Department.OrganizationId.HasValue &&
                 organizationIds.Contains(user.Department.OrganizationId.Value)),
            ct);
    }

    private async Task<Dictionary<Guid, string>> ResolveProjectManagerNamesAsync(IEnumerable<Project> projects, CancellationToken ct)
    {
        var managerIds = projects
            .Select(project => project.ProjectManagerId)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();

        if (managerIds.Count == 0)
        {
            return new Dictionary<Guid, string>();
        }

        return await _db.Users
            .AsNoTracking()
            .Where(user => managerIds.Contains(user.Id))
            .ToDictionaryAsync(user => user.Id, user => user.FullName, ct);
    }
}
