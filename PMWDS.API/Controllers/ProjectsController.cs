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

    public ProjectsController(
        IMediator mediator,
        IUnitOfWork uow,
        IProjectHealthService ai,
        ICurrentUserService currentUser,
        ILocalFileStorageService localFiles,
        RoleScopeService scope,
        ApplicationDbContext db) : base(mediator)
    {
        _uow = uow;
        _ai = ai;
        _currentUser = currentUser;
        _localFiles = localFiles;
        _scope = scope;
        _db = db;
    }

    [HttpGet("dashboard")]
    [Authorize(Policy = AuthorizationPolicies.Authenticated)]
    public async Task<IActionResult> GetDashboard([FromQuery] Guid? departmentId, CancellationToken ct)
    {
        if (departmentId.HasValue && !await _scope.CanAccessDepartmentAsync(departmentId.Value, ct))
        {
            return Forbid();
        }

        var query = _db.Projects
            .Include(project => project.Department)
            .Include(project => project.ProjectDepartments).ThenInclude(assignment => assignment.Department)
            .AsQueryable();
        if (departmentId.HasValue)
        {
            query = query.Where(project =>
                project.DepartmentId == departmentId.Value ||
                project.ProjectDepartments.Any(assignment => assignment.DepartmentId == departmentId.Value));
        }

        query = await _scope.ScopeProjectsAsync(query, ct);
        var list = await query.ToListAsync(ct);
        return Ok(new ProjectDashboardDto(
            TotalProjects: list.Count,
            ActiveProjects: list.Count(project => project.Status == ProjectStatus.InProgress),
            CompletedProjects: list.Count(project => project.Status == ProjectStatus.Completed),
            OverdueProjects: list.Count(project => project.GetDelayDays() > 0),
            HighRiskProjects: list.Count(project => project.AIDelayRiskScore >= 0.7),
            AverageHealthScore: list.Any() ? list.Average(project => project.AIHealthScore) : 0,
            TotalBudget: list.Sum(project => project.PlannedBudget),
            TotalActualCost: list.Sum(project => project.ActualCost),
            RecentProjects: list.OrderByDescending(project => project.CreatedDate).Take(5).Select(ProjectSummaryDto.FromEntity).ToList(),
            AtRiskProjects: list.Where(project => project.AIDelayRiskScore >= 0.7).OrderByDescending(project => project.AIDelayRiskScore).Take(10).Select(ProjectSummaryDto.FromEntity).ToList()));
    }

    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.Authenticated)]
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
    [Authorize(Policy = AuthorizationPolicies.Authenticated)]
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

        return Ok(statusResult);
    }

    [HttpGet("{id:guid}/progress")]
    [Authorize(Policy = AuthorizationPolicies.Authenticated)]
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
    [Authorize(Policy = AuthorizationPolicies.Authenticated)]
    public async Task<IActionResult> UploadDocument(Guid id, IFormFile file, CancellationToken ct)
    {
        var project = await _uow.Projects.GetByIdAsync(id, ct);
        if (project == null)
            return NotFound();

        if (!await _scope.CanManageProjectAsync(id, ct))
        {
            return Forbid();
        }

        await using var stream = file.OpenReadStream();
        var extension = Path.GetExtension(file.FileName);
        var filePath = await _localFiles.UploadDocumentAsync(stream, project.ProjectCode, project.Name, extension, file.ContentType, ct);

        var doc = ProjectDocument.Create(
            id,
            file.FileName,
            filePath,
            file.ContentType,
            file.Length,
            _currentUser.UserId ?? "system");

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

        return Ok();
    }

    [HttpGet("{id:guid}/documents")]
    [Authorize(Policy = AuthorizationPolicies.Authenticated)]
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
            d.CreatedDate
        }));
    }

    [HttpGet("{id:guid}/documents/{docId:guid}/download")]
    [Authorize(Policy = AuthorizationPolicies.Authenticated)]
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
        await _uow.Projects.DeleteAsync(id, ct);
        await _uow.SaveChangesAsync(ct);

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

    private async Task<bool> IsUserInDepartmentOrganizationsAsync(string userId, IReadOnlyCollection<Guid> departmentIds, CancellationToken ct)
    {
        if (!Guid.TryParse(userId, out var parsedUserId))
        {
            return false;
        }

        var organizationIds = await _db.Departments
            .Where(department => departmentIds.Contains(department.Id) && department.OrganizationId.HasValue)
            .Select(department => department.OrganizationId)
            .ToListAsync(ct);

        if (organizationIds.Count == 0)
        {
            return false;
        }

        return await _db.Users.AnyAsync(user =>
            user.Id == parsedUserId &&
            ((user.OrganizationId.HasValue && organizationIds.Contains(user.OrganizationId)) ||
             user.DepartmentAssignments.Any(assignment => organizationIds.Contains(assignment.Department.OrganizationId)) ||
             user.Department != null && organizationIds.Contains(user.Department.OrganizationId)),
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

public record UpdateProjectStatusRequest(ProjectStatus NewStatus, string? Justification = null);
