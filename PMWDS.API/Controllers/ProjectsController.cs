using PMWDS.Application.DTOs.Controllers;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PMWDS.API.Middleware;
using PMWDS.API.Services;
using PMWDS.Application.DTOs.Common;
using PMWDS.Application.DTOs.Documents;
using PMWDS.Application.DTOs.Projects;
using PMWDS.Application.Features.Projects.Commands;
using PMWDS.Application.Features.Projects.Queries;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Application.Security;
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

    /// <summary>
    /// Upload ceiling for ordinary project documents, matching the limit already
    /// applied to utilization certificates.
    /// </summary>
    private const long MaxUploadBytes = 10_000_000;

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

        // Default the manager to the creator when they hold the project-manager role
        // and none was supplied.
        //
        // The wizard sends an empty ProjectManagerId, so every wizard-created project
        // was managerless. That silently broke the project-manager role specifically:
        // POST /milestones requires CanManageProjectAsync, which grants the project's
        // own manager. Nobody was the manager, and a project manager is neither
        // superadmin, nor a director, nor the head of the project's primary
        // department, so the check failed and creating the first milestone returned
        // 403. The project row was left behind with nothing on it. Super admin,
        // director and department head never hit this because they satisfy
        // CanManageProjectAsync through their own role.
        //
        // Scoped to the project-manager role on purpose. A director or department head
        // creating a project is not thereby its manager, and defaulting them into that
        // role would change who can edit the project afterwards.
        var effectiveDto = dto;
        if (string.IsNullOrEmpty(dto.ProjectManagerId) &&
            _scope.IsProjectManager &&
            _currentUser.UserId is { } creatorId)
        {
            effectiveDto = dto with { ProjectManagerId = creatorId };
        }

        var result = await Mediator.Send(new CreateProjectCommand(effectiveDto), ct);

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
    [RequestSizeLimit(MaxUploadBytes)]
    public async Task<IActionResult> UploadDocument(
    Guid id,
    IFormFile file,
    [FromForm] DocumentCategory? category,
    [FromForm] DocumentLevel level,
    [FromForm] Guid? milestoneId,
    [FromForm] Guid? taskId,
    CancellationToken ct)
    {
        var project = await _uow.Projects.GetByIdAsync(id, ct);
        if (project == null)
            return NotFound();

        if (file.Length > MaxUploadBytes)
        {
            return BadRequest(new { message = "The file exceeds the maximum upload size." });
        }

        var levelCheck = await ValidateDocumentTargetAsync(id, level, milestoneId, taskId, ct);
        if (levelCheck != null)
        {
            return levelCheck;
        }

        // The upload level is a permission in its own right, separate from managing the
        // project. A role can manage a project and still only be entitled to file
        // documents at, say, task level.
        if (!await _scope.HasAnyPermissionAsync(ct, [.. PermissionCatalog.UploadLevelPermissionsFor(level)]))
        {
            return Forbid();
        }

        if (!await CanUploadDocumentAtAsync(id, level, milestoneId, taskId, ct))
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
            category: resolvedCategory,
            level: level,
            milestoneId: milestoneId,
            taskId: taskId);

        await _uow.ProjectDocuments.AddAsync(doc, ct);
        await _uow.SaveChangesAsync(ct);

        HttpContext.Items["ActivityLog"] = new ActivityLogContext(
            ActivityType: "Document Uploaded",
            Description: $"{_currentUser.FullName} uploaded \"{file.FileName}\" to {DescribeLevel(level, milestoneId, taskId)} of project \"{project.Name}\"",
            Metadata: new Dictionary<string, object>
            {
                ["projectId"] = id,
                ["projectName"] = project.Name,
                ["documentId"] = doc.Id,
                ["fileName"] = file.FileName,
                ["fileSize"] = file.Length,
                ["level"] = level.ToString()
            },
            ProjectId: id
        );

        await _changes.NotifyAsync(DataChangeScopes.Documents, doc.Id.ToString(), id, ct);

        return Ok(new { id = doc.Id, level = doc.Level });
    }

    /// <summary>
    /// Whether the caller may file a document at this level of this project.
    ///
    /// Managing the project is sufficient at every level. Below the project it is
    /// not required: the levels are progressively narrower, so a person doing task
    /// level work is entitled to attach a document to their own task even though they
    /// do not manage the project. This mirrors how task attachments are already
    /// authorised, so filing a document behaves the same way as attaching a file to
    /// the task itself.
    /// </summary>
    private async Task<bool> CanUploadDocumentAtAsync(
    Guid projectId,
    DocumentLevel level,
    Guid? milestoneId,
    Guid? taskId,
    CancellationToken ct)
    {
        if (await _scope.CanManageProjectAsync(projectId, ct))
        {
            return true;
        }

        if (level == DocumentLevel.Task && taskId.HasValue)
        {
            return await _scope.CanAccessProjectAsync(projectId, ct)
                && await CanWorkOnTaskAsync(taskId.Value, ct);
        }

        // Milestone level is only opened up to someone who owns the milestone's
        // department, or to the project's primary department.
        if (level == DocumentLevel.Milestone && milestoneId.HasValue)
        {
            return await CanAccessMilestoneDepartmentAsync(milestoneId.Value, projectId, ct);
        }

        return false;
    }

    /// <summary>
    /// Whether the caller is the task's assignee or otherwise works on it. Mirrors
    /// TaskWorkflowService.CanWorkOnTaskAsync, which also admits project managers;
    /// that branch is already covered above.
    /// </summary>
    private async Task<bool> CanWorkOnTaskAsync(Guid taskId, CancellationToken ct)
    {
        var currentUserId = _scope.CurrentUserId;
        if (currentUserId is null)
        {
            return false;
        }

        // AssignedToUserId is the primary owner and Assignments are additional
        // assignees; either makes the caller someone who works on the task.
        var userId = currentUserId.Value;
        return await _db.Tasks
            .Where(task => task.Id == taskId)
            .AnyAsync(task =>
                task.AssignedToUserId == userId ||
                task.Assignments.Any(assignment =>
                    assignment.UserId == userId && !assignment.IsDeleted),
                ct);
    }

    /// <summary>
    /// Confirms the level and the milestone or task it points at agree with each
    /// other, that the target belongs to this project, and that the caller can reach
    /// it. Returns null when the request is valid.
    /// </summary>
    private async Task<IActionResult?> ValidateDocumentTargetAsync(
    Guid projectId,
    DocumentLevel level,
    Guid? milestoneId,
    Guid? taskId,
    CancellationToken ct)
    {
        switch (level)
        {
            case DocumentLevel.Project:
                if (milestoneId.HasValue || taskId.HasValue)
                {
                    return BadRequest(new { message = "A project-level document must not name a milestone or task." });
                }

                return null;

            case DocumentLevel.Milestone:
                if (!milestoneId.HasValue)
                {
                    return BadRequest(new { message = "A milestone-level document must name a milestone." });
                }

                var milestoneExists = await _db.Milestones
                    .AnyAsync(m => m.Id == milestoneId.Value && m.ProjectId == projectId, ct);
                if (!milestoneExists)
                {
                    return BadRequest(new { message = "That milestone does not belong to this project." });
                }

                // A department that only contributes its own milestones must not file
                // documents against somebody else's milestone, or it could use the
                // document list to read work it is not entitled to.
                if (!await CanAccessMilestoneDepartmentAsync(milestoneId.Value, projectId, ct))
                {
                    return Forbid();
                }

                return null;

            case DocumentLevel.Task:
                if (!taskId.HasValue)
                {
                    return BadRequest(new { message = "A task-level document must name a task." });
                }

                var taskRecord = await _db.Tasks
                    .Where(t => t.Id == taskId.Value)
                    .Select(t => new { t.ProjectId, t.MilestoneId, MilestoneDepartmentId = t.Milestone != null ? t.Milestone.DepartmentId : (Guid?)null })
                    .FirstOrDefaultAsync(ct);

                if (taskRecord == null)
                {
                    return NotFound();
                }

                if (taskRecord.ProjectId != projectId)
                {
                    return BadRequest(new { message = "That task does not belong to this project." });
                }

                return null;

            default:
                return BadRequest(new { message = "Unknown document level." });
        }
    }

    /// <summary>
    /// A milestone the caller can act on: either the whole project is theirs to
    /// manage, or the milestone belongs to one of their departments.
    /// </summary>
    private async Task<bool> CanAccessMilestoneDepartmentAsync(
    Guid milestoneId,
    Guid projectId,
    CancellationToken ct)
    {
        if (await _scope.CanAccessProjectAsPrimaryDepartmentAsync(projectId, ct) ||
            await _scope.CanManageProjectAsync(projectId, ct))
        {
            return true;
        }

        var departmentIds = await _scope.GetDepartmentIdsAsync(ct);
        if (departmentIds.Count == 0)
        {
            return false;
        }

        var milestoneDepartmentId = await _db.Milestones
            .Where(m => m.Id == milestoneId)
            .Select(m => m.DepartmentId)
            .FirstOrDefaultAsync(ct);

        return milestoneDepartmentId.HasValue && departmentIds.Contains(milestoneDepartmentId.Value);
    }

    private static string DescribeLevel(DocumentLevel level, Guid? milestoneId, Guid? taskId) => level switch
    {
        DocumentLevel.Milestone => $"milestone {milestoneId}",
        DocumentLevel.Task => $"task {taskId}",
        _ => "the project"
    };

    /// <summary>
    /// The levels the caller may upload into, for ordinary documents and for
    /// utilization certificates alike. Returned by the API so the upload dialog can
    /// offer exactly these levels rather than guessing from the role.
    /// </summary>
    [HttpGet("documents/upload-capabilities")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> GetDocumentUploadCapabilities(CancellationToken ct)
    {
        var documentLevels = await ResolveUploadLevelsAsync(
            PermissionCatalog.UploadLevelPermissionsFor, ct);

        var certificateLevels = await ResolveUploadLevelsAsync(
            PermissionCatalog.CertificateUploadLevelPermissionsFor, ct);

        return Ok(new DocumentUploadCapabilities(
            documentLevels,
            certificateLevels,
            documentLevels.Contains(DocumentLevel.Project),
            documentLevels.Contains(DocumentLevel.Milestone),
            documentLevels.Contains(DocumentLevel.Task)));
    }

    /// <summary>
    /// Turns "any of these permissions suffices at this level" into the list of
    /// levels the caller may actually use, so the upload dialog can offer exactly
    /// those rather than guessing from a role name.
    /// </summary>
    private async Task<List<DocumentLevel>> ResolveUploadLevelsAsync(
    Func<DocumentLevel, IReadOnlyList<string>> permissionsFor,
    CancellationToken ct)
    {
        var levels = new List<DocumentLevel>();

        foreach (var level in Enum.GetValues<DocumentLevel>())
        {
            if (await _scope.HasAnyPermissionAsync(ct, [.. permissionsFor(level)]))
            {
                levels.Add(level);
            }
        }

        return levels;
    }

    [HttpGet("{id:guid}/documents")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> GetDocuments(
    Guid id,
    [FromQuery] DocumentLevel? level,
    [FromQuery] DocumentCategory? category,
    CancellationToken ct)
    {
        var project = await _uow.Projects.GetByIdAsync(id, ct);
        if (project == null)
            return NotFound();

        if (!await _scope.CanAccessProjectAsync(id, ct))
        {
            return Forbid();
        }

        // Visibility mirrors the milestone list exactly, and that rule is deliberately
        // narrow: only a department head who is *not* the project's primary
        // department is cut down to their own milestones. Everyone else who can reach
        // the project already sees all of its milestones, so filtering them here too
        // would make the documents tab reveal less than the milestones tab beside it,
        // which is confusing rather than careful.
        var restrictToOwnDepartments =
            _scope.IsDepartmentHead
            && !_scope.IsDirector
            && !_scope.IsSuperAdmin
            && !await _scope.CanAccessProjectAsPrimaryDepartmentAsync(id, ct);

        var query = _db.ProjectDocuments
            .Where(d => d.ProjectId == id && !d.IsDeleted);

        if (level.HasValue)
        {
            query = query.Where(d => d.Level == level.Value);
        }

        if (category.HasValue)
        {
            query = query.Where(d => d.Category == category.Value);
        }

        if (restrictToOwnDepartments)
        {
            var departmentIds = await _scope.GetDepartmentIdsAsync(ct);
            if (departmentIds.Count == 0)
            {
                return Ok(Array.Empty<ProjectDocumentDto>());
            }

            var visibleDepartmentIds = departmentIds;
            query = query.Where(d =>
                d.Level == DocumentLevel.Project ||
                (d.Level == DocumentLevel.Milestone && d.Milestone != null &&
                    d.Milestone.DepartmentId.HasValue &&
                    visibleDepartmentIds.Contains(d.Milestone.DepartmentId.Value)) ||
                (d.Level == DocumentLevel.Task &&
                    (d.Task == null || d.Task.MilestoneId == null ||
                        (d.Task.Milestone != null && d.Task.Milestone.DepartmentId.HasValue &&
                            visibleDepartmentIds.Contains(d.Task.Milestone.DepartmentId.Value)))));
        }

        // A task-level document also reports the milestone it sits under, so the task
        // documents tab can show the milestone and project a task belongs to without
        // the client making a second request to find out.
        var docs = await query
            .OrderByDescending(d => d.CreatedDate)
            .Select(d => new ProjectDocumentDto(
                d.Id,
                d.ProjectId,
                project.Name,
                d.Title,
                d.FilePath,
                d.ContentType,
                d.FileSizeBytes,
                d.UploadedByUserId,
                d.Description,
                d.Version,
                d.Category,
                d.Level,
                d.MilestoneId,
                d.Milestone != null
                    ? d.Milestone.Name
                    : d.Task != null && d.Task.Milestone != null
                        ? d.Task.Milestone.Name
                        : null,
                d.TaskId,
                d.Task != null ? d.Task.Title : null,
                d.CreatedDate))
            .ToListAsync(ct);

        return Ok(docs);
    }

    [HttpGet("{id:guid}/documents/{docId:guid}/download")]
    public async Task<IActionResult> DownloadDocument(Guid id, Guid docId, CancellationToken ct)
    {
        var doc = await _db.ProjectDocuments
            .Include(d => d.Milestone)
            .Include(d => d.Task)
            .ThenInclude(t => t!.Milestone)
            .FirstOrDefaultAsync(d => d.Id == docId && d.ProjectId == id && !d.IsDeleted, ct);

        if (doc == null)
            return NotFound();

        if (!await _scope.CanAccessProjectAsync(id, ct))
        {
            return Forbid();
        }

        // Same scope rule as the list, so a document can never be downloaded that the
        // list would have withheld.
        var restrictToOwnDepartments =
            _scope.IsDepartmentHead
            && !_scope.IsDirector
            && !_scope.IsSuperAdmin
            && !await _scope.CanAccessProjectAsPrimaryDepartmentAsync(id, ct);

        if (restrictToOwnDepartments && !await CanSeeDocumentAsync(doc, ct))
        {
            return Forbid();
        }

        var stream = await _localFiles.DownloadFileAsync(doc.FilePath, ct);
        return File(stream, doc.ContentType, doc.Title);
    }

    private async Task<bool> CanSeeDocumentAsync(ProjectDocument doc, CancellationToken ct)
    {
        if (doc.IsProjectLevel())
        {
            return true;
        }

        var departmentIds = await _scope.GetDepartmentIdsAsync(ct);
        if (departmentIds.Count == 0)
        {
            return false;
        }

        var ownerDepartmentId = doc.Level switch
        {
            DocumentLevel.Milestone => doc.Milestone?.DepartmentId,
            DocumentLevel.Task => doc.Task?.Milestone?.DepartmentId,
            _ => null
        };

        // A task with no milestone has no department of its own, so it follows the
        // project and is visible to anyone who can see the project.
        return ownerDepartmentId is null || departmentIds.Contains(ownerDepartmentId.Value);
    }

    [HttpDelete("{id:guid}/documents/{docId:guid}")]
    [Authorize(Policy = $"{AuthorizationPolicies.DocumentsPrefix}.Delete")]
    public async Task<IActionResult> DeleteDocument(Guid id, Guid docId, CancellationToken ct)
    {
        var doc = await _db.ProjectDocuments
            .Include(d => d.Milestone)
            .Include(d => d.Task)
            .ThenInclude(t => t!.Milestone)
            .FirstOrDefaultAsync(d => d.Id == docId && d.ProjectId == id && !d.IsDeleted, ct);

        if (doc == null)
        {
            return NotFound();
        }

        if (!await _scope.CanManageProjectAsync(id, ct))
        {
            return Forbid();
        }

        // Same scope rule as the list, so a document can never be deleted or
        // downloaded that the list would have withheld. Checking this
        // unconditionally would block a superadmin, who has no department
        // assignments to match against.
        var restrictToOwnDepartments =
            _scope.IsDepartmentHead
            && !_scope.IsDirector
            && !_scope.IsSuperAdmin
            && !await _scope.CanAccessProjectAsPrimaryDepartmentAsync(id, ct);

        if (restrictToOwnDepartments && !await CanSeeDocumentAsync(doc, ct))
        {
            return Forbid();
        }

        // A utilization certificate must be withdrawn through its own endpoint,
        // which enforces the review lifecycle. Removing the file directly would
        // leave an approved financial claim with no evidence behind it.
        if (doc.IsUtilizationCertificate())
        {
            return BadRequest(new { message = "Delete this utilization certificate from the utilization certificates section so its review history is preserved." });
        }

        var title = doc.Title;
        _db.ProjectDocuments.Remove(doc);
        await _uow.SaveChangesAsync(ct);

        HttpContext.Items["ActivityLog"] = new ActivityLogContext(
            ActivityType: "Document Deleted",
            Description: $"{_currentUser.FullName} deleted document \"{title}\"",
            Metadata: new Dictionary<string, object>
            {
                ["projectId"] = id,
                ["documentId"] = docId
            },
            ProjectId: id
        );

        await _changes.NotifyAsync(DataChangeScopes.Documents, docId.ToString(), id, ct);

        return NoContent();
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
