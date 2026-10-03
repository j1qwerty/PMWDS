using PMWDS.Application.DTOs.Controllers;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PMWDS.API.Middleware;
using PMWDS.API.Services;
using PMWDS.Application.DTOs.Common;
using PMWDS.Application.DTOs.Projects;
using PMWDS.Application.Exceptions;
using PMWDS.Application.Validation;
using PMWDS.Application.Features.Projects.Commands;
using System.Data;
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
    private readonly ITaskAiEnrichmentQueue _aiEnrichment;
    private readonly INotificationService _notifications;

    public ProjectsController(
        IMediator mediator,
        IUnitOfWork uow,
        IProjectHealthService ai,
        ICurrentUserService currentUser,
        ILocalFileStorageService localFiles,
        RoleScopeService scope,
        ApplicationDbContext db,
        IDataChangeNotifier changes,
        ITaskAiEnrichmentQueue aiEnrichment,
        INotificationService notifications) : base(mediator)
    {
        _uow = uow;
        _ai = ai;
        _currentUser = currentUser;
        _localFiles = localFiles;
        _scope = scope;
        _db = db;
        _changes = changes;
        _aiEnrichment = aiEnrichment;
        _notifications = notifications;
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

    [HttpPost("wizard")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    public async Task<IActionResult> CreateWizard(
        [FromBody] CreateProjectWizardRequest request,
        CancellationToken ct)
    {
        var dto = request.Project;
        if (request.Milestones == null ||
            request.Dependencies == null ||
            request.Tasks == null)
        {
            return BadRequest(new { message = "Wizard collections cannot be null." });
        }

        var departmentIds = ResolveDepartmentIds(dto.DepartmentId, dto.DepartmentIds);
        if (departmentIds.Count == 0)
            return BadRequest(new { message = "At least one project department is required." });

        if (!await AreDepartmentsInScopeAsync(departmentIds, ct))
            return Forbid();

        if (!string.IsNullOrWhiteSpace(dto.ProjectManagerId) &&
            !await IsUserInDepartmentOrganizationsAsync(dto.ProjectManagerId, departmentIds, ct))
        {
            return BadRequest(new
            {
                message = "Project manager must belong to one of the selected department organizations."
            });
        }

        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Project name is required." });

        if (dto.PlannedStartDate > dto.PlannedEndDate)
            return BadRequest(new { message = "Project end date must be on or after the start date." });

        if (dto.PlannedBudget < 0)
            return BadRequest(new { message = "Project budget cannot be negative." });

        var milestoneClientIds = request.Milestones
            .Select(milestone => milestone.ClientId?.Trim())
            .ToList();

        if (milestoneClientIds.Any(string.IsNullOrWhiteSpace))
            return BadRequest(new { message = "Every wizard milestone must have a client id." });

        if (milestoneClientIds.Count != milestoneClientIds.Distinct(StringComparer.OrdinalIgnoreCase).Count())
            return BadRequest(new { message = "Wizard milestone client ids must be unique." });

        var milestoneMap = new Dictionary<string, Guid>(StringComparer.OrdinalIgnoreCase);
        var createdTaskIds = new List<Guid>();
        ProjectDto? projectDto = null;

        var executionStrategy = _db.Database.CreateExecutionStrategy();

        await executionStrategy.ExecuteAsync(async () =>
        {
            await using var transaction =
                await _db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);

            projectDto = await Mediator.Send(new CreateProjectCommand(dto), ct);
            var projectId = projectDto.Id;

            // Re-read the tracked project so child validation uses the real persisted
            // departments and dates from the same transaction.
            var project = await _db.Projects
                .Include(item => item.ProjectDepartments)
                .FirstAsync(item => item.Id == projectId, ct);

            var projectDepartmentSet = project.ProjectDepartments
                .Select(item => item.DepartmentId)
                .Append(project.DepartmentId)
                .ToHashSet();

            var validMilestoneDepartments = request.Milestones
                .Where(item => item.DepartmentId.HasValue)
                .Select(item => item.DepartmentId!.Value)
                .Distinct()
                .ToList();

            if (validMilestoneDepartments.Any(id => !projectDepartmentSet.Contains(id)))
                throw new System.ComponentModel.DataAnnotations.ValidationException("Every milestone department must be assigned to the project.");

            if (request.Milestones.Any(item =>
                item.DueDate < project.PlannedStartDate ||
                item.DueDate > project.PlannedEndDate))
            {
                throw new ValidationException(
                    "Every milestone due date must fall inside the project planned timeline.");
            }

            for (var index = 0; index < request.Milestones.Count; index++)
            {
                var input = request.Milestones.ElementAt(index);
                if (string.IsNullOrWhiteSpace(input.Name))
                    throw new ValidationException("Milestone name is required.");

                var milestone = Milestone.Create(
                    projectId,
                    input.Name.Trim(),
                    input.Description?.Trim() ?? string.Empty,
                    input.DueDate,
                    index,
                    input.IsCritical,
                    input.DepartmentId);
                milestone.SetCreatedBy(_currentUser.UserId ?? "system");
                await _db.Milestones.AddAsync(milestone, ct);
                await _db.SaveChangesAsync(ct);
                milestoneMap[input.ClientId.Trim()] = milestone.Id;
            }

            var wizardDependencyEdges = new List<(Guid From, Guid To)>();

            foreach (var input in request.Dependencies)
            {
                if (!milestoneMap.TryGetValue(input.PrerequisiteMilestoneClientId?.Trim() ?? string.Empty, out var prerequisiteId) ||
                    !milestoneMap.TryGetValue(input.DependentMilestoneClientId?.Trim() ?? string.Empty, out var dependentId))
                {
                    throw new ValidationException("A wizard dependency references an unknown milestone.");
                }

                if (prerequisiteId == dependentId)
                    throw new ValidationException("A milestone cannot depend on itself.");

                if (input.Type == MilestoneDependencyType.ProgressThreshold &&
                    (!input.ThresholdPercentage.HasValue ||
                     input.ThresholdPercentage < 0 ||
                     input.ThresholdPercentage > 100))
                {
                    throw new ValidationException(
                        "ProgressThreshold dependencies require a threshold between 0 and 100.");
                }

                var duplicate = await _db.MilestoneDependencies.AnyAsync(
                    dependency =>
                        dependency.ProjectId == projectId &&
                        dependency.PrerequisiteMilestoneId == prerequisiteId &&
                        dependency.DependentMilestoneId == dependentId,
                    ct);
                if (duplicate)
                    throw new ValidationException("Duplicate milestone dependency.");

                var dep = MilestoneDependency.Create(
                    projectId,
                    prerequisiteId,
                    dependentId,
                    input.Type,
                    input.ThresholdPercentage);

                wizardDependencyEdges.Add((prerequisiteId, dependentId));
                dep.SetCreatedBy(_currentUser.UserId ?? "system");
                await _db.MilestoneDependencies.AddAsync(dep, ct);
            }

            foreach (var input in request.Tasks)
            {
                Guid? milestoneId = null;
                if (!string.IsNullOrWhiteSpace(input.MilestoneClientId))
                {
                    if (!milestoneMap.TryGetValue(input.MilestoneClientId.Trim(), out var resolvedMilestoneId))
                        throw new ValidationException("A wizard task references an unknown milestone.");
                    milestoneId = resolvedMilestoneId;
                }

                if (input.StartDate > input.DueDate)
                    throw new ValidationException($"Task '{input.Title}' due date must be on or after its start date.");

                if (input.StartDate < project.PlannedStartDate ||
                    input.DueDate > project.PlannedEndDate)
                {
                    throw new ValidationException(
                        $"Task '{input.Title}' must fall inside the project planned timeline.");
                }

                if (milestoneId.HasValue)
                {
                    var milestone = request.Milestones
                        .First(item => string.Equals(
                            item.ClientId,
                            input.MilestoneClientId,
                            StringComparison.OrdinalIgnoreCase));

                    if (input.DueDate > milestone.DueDate)
                    {
                        throw new ValidationException(
                            $"Task '{input.Title}' cannot extend beyond its milestone due date.");
                    }
                }

                if (string.IsNullOrWhiteSpace(input.Title))
                    throw new ValidationException("Task title is required.");

                if (input.EstimatedHours <= 0)
                    throw new ValidationException($"Task '{input.Title}' must have positive estimated hours.");

                var assigneeIds = (input.AssignedToUserIds ?? Array.Empty<string>())
                    .Where(id => !string.IsNullOrWhiteSpace(id))
                    .Select(id => id.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();

                var parsedAssignees = new List<Guid>();
                foreach (var assignee in assigneeIds)
                {
                    if (!Guid.TryParse(assignee, out var assigneeId))
                        throw new ValidationException($"Task '{input.Title}' has an invalid assignee id.");

                    if (!await IsUserInDepartmentOrganizationsAsync(
                        assignee,
                        departmentIds,
                        ct))
                    {
                        throw new ValidationException(
                            $"Task '{input.Title}' has an assignee outside the project department organizations.");
                    }

                    parsedAssignees.Add(assigneeId);
                }

                var task = ProjectTask.Create(
                    projectId,
                    input.Title.Trim(),
                    input.Description?.Trim() ?? string.Empty,
                    input.Priority,
                    input.StartDate,
                    input.DueDate,
                    checked((int)Math.Round(input.EstimatedHours)),
                    milestoneId);
                task.SetCreatedBy(_currentUser.UserId ?? "system");

                await _db.Tasks.AddAsync(task, ct);
                await _db.SaveChangesAsync(ct);

                if (parsedAssignees.Count > 0)
                {
                    task.AssignTo(parsedAssignees[0], Guid.Parse(_currentUser.UserId!));

                    foreach (var assigneeId in parsedAssignees)
                    {
                        var assignment = TaskAssignment.Create(task.Id, assigneeId);
                        assignment.SetCreatedBy(_currentUser.UserId ?? "system");
                        await _db.TaskAssignments.AddAsync(assignment, ct);
                    }

                    await _db.SaveChangesAsync(ct);
                }

                createdTaskIds.Add(task.Id);
            }

            project.RecalculateProgressFromMilestones();
            project.RecalculateStatusFromMilestones();
            project.SetModified(_currentUser.UserId ?? "system");
            await _db.SaveChangesAsync(ct);

            await transaction.CommitAsync(ct);
        });

        // Notifications and AI enrichment happen only after the transaction commits.
        foreach (var taskId in createdTaskIds)
        {
            var task = await _db.Tasks
                .AsNoTracking()
                .Include(item => item.Assignments)
                .FirstAsync(item => item.Id == taskId, ct);

            foreach (var assignment in task.Assignments.Where(item => item.IsActive))
            {
                try
                {
                    await _notifications.SendTaskAssignmentAlertAsync(
                        task.Id,
                        assignment.UserId.ToString(),
                        ct);
                }
                catch (Exception ex)
                {
                    HttpContext.RequestServices
                        .GetRequiredService<ILogger<ProjectsController>>()
                        .LogWarning(
                            ex,
                            "Wizard-created task {TaskId} committed, but assignment notification failed.",
                            task.Id);
                }
            }

            await _aiEnrichment.QueueAsync(taskId, ct);
        }

        if (projectDto == null)
            throw new InvalidOperationException("Project wizard completed without a project result.");

        await _changes.NotifyAsync(
            DataChangeScopes.Projects,
            projectDto.Id.ToString(),
            projectDto.Id,
            ct);
        await _changes.NotifyAsync(
            DataChangeScopes.Milestones,
            projectDto.Id.ToString(),
            projectDto.Id,
            ct);
        await _changes.NotifyAsync(
            DataChangeScopes.Tasks,
            projectDto.Id.ToString(),
            projectDto.Id,
            ct);

        return CreatedAtAction(
            nameof(GetById),
            new { id = projectDto.Id },
            new ProjectWizardResultDto(projectDto, milestoneMap, createdTaskIds));
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
