using PMWDS.Application.DTOs.Controllers;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PMWDS.API.Middleware;
using PMWDS.API.Services;
using PMWDS.Application.DTOs.Notifications;
using PMWDS.Application.DTOs.Projects;
using PMWDS.Application.Exceptions;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;
using PMWDS.Domain.Enums;
using PMWDS.Persistence.Context;

namespace PMWDS.API.Controllers;

public class MilestonesController : BaseApiController
{
    private readonly IUnitOfWork _uow;
    private readonly ApplicationDbContext _db;
    private readonly RoleScopeService _scope;
    private readonly INotificationService _notifications;
    private readonly ICurrentUserService _currentUser;
    private readonly IDataChangeNotifier _changes;

    public MilestonesController(IMediator mediator, IUnitOfWork uow, ApplicationDbContext db, RoleScopeService scope, INotificationService notifications, ICurrentUserService currentUser, IDataChangeNotifier changes) : base(mediator)
    {
        _uow = uow;
        _db = db;
        _scope = scope;
        _notifications = notifications;
        _currentUser = currentUser;
        _changes = changes;
    }

    /// <summary>
    /// What the caller is allowed to change on this project.
    ///
    /// The client needs this because "can manage milestones" is a per-project
    /// question, not a per-role one. CanManageProjectAsync resolves it to: the
    /// superadmin, the project's own project manager, the department head of the
    /// project's primary department, and a director of the owning organisation. A
    /// department head of some *other* department holds PROJECT_MANAGE and so
    /// satisfies every permission-based check, which is why a permission-code gate in
    /// the browser cannot express this rule and got it wrong in both directions.
    ///
    /// Returned from the server rather than recomputed in the browser so there is one
    /// implementation, and so the client can never offer a control that 403s or hide
    /// one that would have worked.
    /// </summary>
    [HttpGet("by-project/{projectId:guid}/access")]
    [ProducesResponseType(typeof(ProjectMilestoneAccessDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProjectAccess(Guid projectId, CancellationToken ct)
    {
        // Existence first. CanAccessProjectAsync short-circuits to true for a
        // superadmin without touching the database, so without this an unknown id
        // came back 200 claiming full manage rights for a project that is not there.
        if (!await _db.Projects.AnyAsync(p => p.Id == projectId, ct))
            return NotFound();

        if (!await _scope.CanAccessProjectAsync(projectId, ct))
            return Forbid();

        var canManage = await _scope.CanManageProjectAsync(projectId, ct);

        return Ok(new ProjectMilestoneAccessDto(
            CanManageMilestones: canManage,
            CanManageDependencies: canManage));
    }

    // ── Milestone Dependency Endpoints ──────────────────────────────────

    [HttpGet("by-project/{projectId:guid}/dependencies")]
    public async Task<IActionResult> GetDependenciesByProject(Guid projectId, CancellationToken ct)
    {
        if (!await _scope.CanAccessProjectAsync(projectId, ct))
            return Forbid();

        var depsQuery = _db.MilestoneDependencies
            .Include(d => d.PrerequisiteMilestone)
            .Include(d => d.DependentMilestone)
            .Where(d => d.ProjectId == projectId);

        if (!_scope.IsDirector && !_scope.IsSuperAdmin && _scope.IsDepartmentHead)
        {
            var departmentIds = await _scope.GetDepartmentIdsAsync(ct);
            if (!await _scope.CanAccessProjectAsPrimaryDepartmentAsync(projectId, ct))
            {
                depsQuery = depsQuery.Where(d =>
                    (d.PrerequisiteMilestone != null &&
                        d.PrerequisiteMilestone.DepartmentId.HasValue &&
                        departmentIds.Contains(d.PrerequisiteMilestone.DepartmentId.Value)) ||
                    (d.DependentMilestone != null &&
                        d.DependentMilestone.DepartmentId.HasValue &&
                        departmentIds.Contains(d.DependentMilestone.DepartmentId.Value)));
            }
        }

        var deps = await depsQuery.ToListAsync(ct);
        return Ok(deps.Select(MilestoneDependencyDto.FromEntity));
    }

    [HttpPost("dependencies")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    public async Task<IActionResult> CreateDependency([FromBody] CreateMilestoneDependencyDto dto, CancellationToken ct)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == dto.ProjectId, ct);
        if (project == null)
            return NotFound(new { message = "Project not found" });

        if (!await _scope.CanManageProjectAsync(dto.ProjectId, ct))
            return Forbid();

        if (dto.PrerequisiteMilestoneId == dto.DependentMilestoneId)
            return BadRequest(new { message = "A milestone cannot depend on itself" });

        var prerequisiteExists = await _db.Milestones.AnyAsync(m => m.Id == dto.PrerequisiteMilestoneId && m.ProjectId == dto.ProjectId, ct);
        if (!prerequisiteExists)
            return BadRequest(new { message = "Prerequisite milestone not found in this project" });

        var dependentExists = await _db.Milestones.AnyAsync(m => m.Id == dto.DependentMilestoneId && m.ProjectId == dto.ProjectId, ct);
        if (!dependentExists)
            return BadRequest(new { message = "Dependent milestone not found in this project" });

        var duplicate = await _db.MilestoneDependencies.AnyAsync(d =>
            d.PrerequisiteMilestoneId == dto.PrerequisiteMilestoneId &&
            d.DependentMilestoneId == dto.DependentMilestoneId &&
            d.ProjectId == dto.ProjectId, ct);
        if (duplicate)
            return BadRequest(new { message = "This dependency already exists" });

        // Circular dependency check: if B depends on A, A cannot depend on B
        var reverseExists = await _db.MilestoneDependencies.AnyAsync(d =>
            d.PrerequisiteMilestoneId == dto.DependentMilestoneId &&
            d.DependentMilestoneId == dto.PrerequisiteMilestoneId &&
            d.ProjectId == dto.ProjectId, ct);
        if (reverseExists)
            return BadRequest(new { message = "Circular dependency detected" });

        if (!Enum.TryParse<MilestoneDependencyType>(dto.Type, ignoreCase: true, out var depType))
            return BadRequest(new { message = "Invalid dependency type. Valid values: CompletionBased, ProgressThreshold" });

        if (depType == MilestoneDependencyType.ProgressThreshold && (dto.ThresholdPercentage == null || dto.ThresholdPercentage < 0 || dto.ThresholdPercentage > 100))
            return BadRequest(new { message = "Threshold percentage must be between 0 and 100 for ProgressThreshold type" });

        var dep = MilestoneDependency.Create(
            dto.ProjectId,
            dto.PrerequisiteMilestoneId,
            dto.DependentMilestoneId,
            depType,
            dto.ThresholdPercentage);
        dep.SetCreatedBy("system");

        await _uow.MilestoneDependencies.AddAsync(dep, ct);
        await _uow.SaveChangesAsync(ct);

        var loaded = await _db.MilestoneDependencies
            .Include(d => d.PrerequisiteMilestone)
            .Include(d => d.DependentMilestone)
            .FirstAsync(d => d.Id == dep.Id, ct);

        HttpContext.Items["ActivityLog"] = new ActivityLogContext(
            ActivityType: "Milestone Dependency Added",
            Description: $"{CurrentUserName} added dependency: \"{loaded.PrerequisiteMilestone?.Name}\" must precede \"{loaded.DependentMilestone?.Name}\" in project \"{loaded.Project?.Name ?? await ResolveProjectNameAsync(dto.ProjectId, ct)}\"",
            Metadata: new Dictionary<string, object>
            {
                ["dependencyId"] = dep.Id,
                ["prerequisiteMilestoneId"] = dto.PrerequisiteMilestoneId,
                ["prerequisiteMilestoneName"] = loaded.PrerequisiteMilestone?.Name ?? "",
                ["dependentMilestoneId"] = dto.DependentMilestoneId,
                ["dependentMilestoneName"] = loaded.DependentMilestone?.Name ?? "",
                ["projectId"] = dto.ProjectId,
                ["type"] = dto.Type
            },
            ProjectId: dto.ProjectId
        );

        await _changes.NotifyAsync(DataChangeScopes.Milestones, dep.Id.ToString(), dto.ProjectId, ct);

        return Ok(MilestoneDependencyDto.FromEntity(loaded));
    }

    [HttpPut("dependencies/{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    public async Task<IActionResult> UpdateDependency(Guid id, [FromBody] UpdateMilestoneDependencyDto dto, CancellationToken ct)
    {
        var dep = await _db.MilestoneDependencies
            .Include(d => d.PrerequisiteMilestone)
            .Include(d => d.DependentMilestone)
            .FirstOrDefaultAsync(d => d.Id == id, ct);
        if (dep == null)
            return NotFound();

        if (!await _scope.CanManageProjectAsync(dep.ProjectId, ct))
            return Forbid();

        if (!Enum.TryParse<MilestoneDependencyType>(dto.Type, ignoreCase: true, out var depType))
            return BadRequest(new { message = "Invalid dependency type" });

        if (depType == MilestoneDependencyType.ProgressThreshold && (dto.ThresholdPercentage == null || dto.ThresholdPercentage < 0 || dto.ThresholdPercentage > 100))
            return BadRequest(new { message = "Threshold percentage must be between 0 and 100" });

        // Re-wiring is optional. Omitting the ids keeps the current pair, so the older
        // payload that only changes the condition still works - the tasks tab and any
        // other caller depends on that.
        var prerequisiteId = dto.PrerequisiteMilestoneId ?? dep.PrerequisiteMilestoneId;
        var dependentId = dto.DependentMilestoneId ?? dep.DependentMilestoneId;

        if (prerequisiteId != dep.PrerequisiteMilestoneId || dependentId != dep.DependentMilestoneId)
        {
            if (prerequisiteId == dependentId)
                return BadRequest(new { message = "A milestone cannot depend on itself" });

            if (!await _db.Milestones.AnyAsync(m => m.Id == prerequisiteId && m.ProjectId == dep.ProjectId, ct))
                return BadRequest(new { message = "Prerequisite milestone not found in this project" });

            if (!await _db.Milestones.AnyAsync(m => m.Id == dependentId && m.ProjectId == dep.ProjectId, ct))
                return BadRequest(new { message = "Dependent milestone not found in this project" });

            // Excludes this row, or re-saving an unchanged dependency would collide
            // with itself and always 400.
            var duplicate = await _db.MilestoneDependencies.AnyAsync(d =>
                d.Id != id &&
                d.PrerequisiteMilestoneId == prerequisiteId &&
                d.DependentMilestoneId == dependentId &&
                d.ProjectId == dep.ProjectId, ct);
            if (duplicate)
                return BadRequest(new { message = "This dependency already exists" });

            var reverseExists = await _db.MilestoneDependencies.AnyAsync(d =>
                d.PrerequisiteMilestoneId == dependentId &&
                d.DependentMilestoneId == prerequisiteId &&
                d.ProjectId == dep.ProjectId, ct);
            if (reverseExists)
                return BadRequest(new { message = "Circular dependency detected" });
        }

        dep.Update(depType, dto.ThresholdPercentage, prerequisiteId, dependentId);
        dep.SetModified("system");

        await _uow.MilestoneDependencies.UpdateAsync(dep, ct);
        await _uow.SaveChangesAsync(ct);

        HttpContext.Items["ActivityLog"] = new ActivityLogContext(
            ActivityType: "Milestone Dependency Updated",
            Description: $"{CurrentUserName} updated dependency between \"{dep.PrerequisiteMilestone?.Name}\" and \"{dep.DependentMilestone?.Name}\" in project \"{dep.Project?.Name ?? await ResolveProjectNameAsync(dep.ProjectId, ct)}\"",
            Metadata: new Dictionary<string, object>
            {
                ["dependencyId"] = id,
                ["prerequisiteMilestoneId"] = dep.PrerequisiteMilestoneId,
                ["prerequisiteMilestoneName"] = dep.PrerequisiteMilestone?.Name ?? "",
                ["dependentMilestoneId"] = dep.DependentMilestoneId,
                ["dependentMilestoneName"] = dep.DependentMilestone?.Name ?? "",
                ["projectId"] = dep.ProjectId,
                ["type"] = dto.Type
            },
            ProjectId: dep.ProjectId
        );

        await _changes.NotifyAsync(DataChangeScopes.Milestones, id.ToString(), dep.ProjectId, ct);

        return Ok(MilestoneDependencyDto.FromEntity(dep));
    }

    [HttpDelete("dependencies/{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    public async Task<IActionResult> DeleteDependency(Guid id, CancellationToken ct)
    {
        var dep = await _db.MilestoneDependencies
            .Include(d => d.PrerequisiteMilestone)
            .Include(d => d.DependentMilestone)
            .FirstOrDefaultAsync(d => d.Id == id, ct);
        if (dep == null)
            return NotFound();

        if (!await _scope.CanManageProjectAsync(dep.ProjectId, ct))
            return Forbid();

        var prereqName = dep.PrerequisiteMilestone?.Name ?? "Unknown";
        var depName = dep.DependentMilestone?.Name ?? "Unknown";
        var projectId = dep.ProjectId;

        await _uow.MilestoneDependencies.DeleteAsync(id, ct);
        await _uow.SaveChangesAsync(ct);

        HttpContext.Items["ActivityLog"] = new ActivityLogContext(
            ActivityType: "Milestone Dependency Removed",
            Description: $"{CurrentUserName} removed dependency between \"{prereqName}\" and \"{depName}\" from project \"{await ResolveProjectNameAsync(projectId, ct)}\"",
            Metadata: new Dictionary<string, object>
            {
                ["dependencyId"] = id,
                ["prerequisiteMilestoneName"] = prereqName,
                ["dependentMilestoneName"] = depName,
                ["projectId"] = projectId
            },
            ProjectId: projectId
        );

        await _changes.NotifyAsync(DataChangeScopes.Milestones, id.ToString(), projectId, ct);

        return NoContent();
    }

    [HttpGet("{id:guid}/dependency-status")]
    public async Task<IActionResult> GetDependencyStatus(Guid id, CancellationToken ct)
    {
        var milestone = await _db.Milestones
            .Include(m => m.DependentDependencies)
                .ThenInclude(d => d.PrerequisiteMilestone)
            .FirstOrDefaultAsync(m => m.Id == id, ct);
        if (milestone == null)
            return NotFound();

        if (!await _scope.CanAccessProjectAsync(milestone.ProjectId, ct))
            return Forbid();

        var deps = milestone.DependentDependencies.Select(MilestoneDependencyDto.FromEntity).ToList();
        return Ok(new
        {
            isBlocked = milestone.IsBlocked,
            blockedByMessage = milestone.BlockedByMessage,
            dependencies = deps
        });
    }

    [HttpGet("by-project/{projectId:guid}")]
    public async Task<IActionResult> GetByProject(Guid projectId, CancellationToken ct)
    {
        if (!await _scope.CanAccessProjectAsync(projectId, ct))
        {
            return Forbid();
        }

        var query = _db.Milestones
            .Include(m => m.Department)
            .Include(m => m.DependentDependencies)
                .ThenInclude(d => d.PrerequisiteMilestone)
            .Where(m => m.ProjectId == projectId);

        if (!_scope.IsDirector && !_scope.IsSuperAdmin && _scope.IsDepartmentHead)
        {
            var departmentIds = await _scope.GetDepartmentIdsAsync(ct);
            if (!await _scope.CanAccessProjectAsPrimaryDepartmentAsync(projectId, ct))
            {
                query = query.Where(m => m.DepartmentId.HasValue && departmentIds.Contains(m.DepartmentId.Value));
            }
        }

        var milestones = await query
            .Include(m => m.Tasks)
            .ToListAsync(ct);
        return Ok(milestones.Select(MilestoneDto.FromEntity));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var milestone = await _db.Milestones
            .Include(m => m.Tasks)
            .Include(m => m.Department)
            .FirstOrDefaultAsync(m => m.Id == id, ct);
        if (milestone == null)
        {
            return NotFound();
        }

        if (!await _scope.CanAccessProjectAsync(milestone.ProjectId, ct))
        {
            return Forbid();
        }
        if (!await CanAccessMilestoneAsync(milestone, ct))
        {
            return Forbid();
        }

        return Ok(MilestoneDto.FromEntity(milestone));
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    public async Task<IActionResult> Create([FromBody] CreateMilestoneDto dto, CancellationToken ct)
    {
        if (!await _scope.CanManageProjectAsync(dto.ProjectId, ct))
        {
            return Forbid();
        }

        if (!await CanAssignDepartmentToMilestoneAsync(dto.DepartmentId, ct))
        {
            return Forbid();
        }

        var milestone = Milestone.Create(dto.ProjectId, dto.Name, dto.Description, dto.DueDate, dto.Order, dto.IsCritical, dto.DepartmentId);
        milestone.SetCreatedBy("system");
        await _uow.Milestones.AddAsync(milestone, ct);
        await _uow.SaveChangesAsync(ct);
        await RecalculateProjectFromMilestonesAsync(milestone.ProjectId, ct);
        await SendProjectAssignedNotificationAsync(milestone.ProjectId, dto.DepartmentId, ct);

        HttpContext.Items["ActivityLog"] = new ActivityLogContext(
            ActivityType: "Milestone Created",
            Description: $"{CurrentUserName} created milestone \"{milestone.Name}\" in project \"{await ResolveProjectNameAsync(milestone.ProjectId, ct)}\"",
            Metadata: new Dictionary<string, object>
            {
                ["milestoneId"] = milestone.Id,
                ["milestoneName"] = milestone.Name,
                ["projectId"] = milestone.ProjectId
            },
            ProjectId: milestone.ProjectId
        );

        // Milestone counts roll up into the project, so both scopes must refetch.
        await _changes.NotifyAsync(DataChangeScopes.Milestones, milestone.Id.ToString(), milestone.ProjectId, ct);
        await _changes.NotifyAsync(DataChangeScopes.Projects, milestone.ProjectId.ToString(), milestone.ProjectId, ct);

        return CreatedAtAction(nameof(GetById), new { id = milestone.Id }, MilestoneDto.FromEntity(milestone));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMilestoneDto dto, CancellationToken ct)
    {
        var milestone = await _db.Milestones
            .Include(m => m.Tasks)
            .Include(m => m.Department)
            .FirstOrDefaultAsync(m => m.Id == id, ct);
        if (milestone == null)
        {
            return NotFound();
        }

        if (!await _scope.CanManageProjectAsync(milestone.ProjectId, ct))
        {
            return Forbid();
        }
        if (!await CanAccessMilestoneAsync(milestone, ct))
        {
            return Forbid();
        }

        if (!await CanAssignDepartmentToMilestoneAsync(dto.DepartmentId, ct))
        {
            return Forbid();
        }

        milestone.Update(dto.Name, dto.Description, dto.DueDate, dto.Order, dto.IsCritical, dto.DepartmentId);

        if (milestone.Tasks.Count > 0)
        {
            milestone.RecalculateProgressFromTasks();
            milestone.RecalculateStatusFromTasks();
        }
        else
        {
            milestone.UpdateProgress(dto.ProgressPercentage);
        }

        milestone.SetModified("system");
        await _uow.Milestones.UpdateAsync(milestone, ct);
        await _uow.SaveChangesAsync(ct);
        await RecalculateProjectFromMilestonesAsync(milestone.ProjectId, ct);
        var refreshed = await _db.Milestones
            .Include(m => m.Tasks)
            .Include(m => m.Department)
            .FirstOrDefaultAsync(m => m.Id == id, ct);

        HttpContext.Items["ActivityLog"] = new ActivityLogContext(
            ActivityType: "Milestone Updated",
            Description: $"{CurrentUserName} updated milestone \"{milestone.Name}\" in project \"{await ResolveProjectNameAsync(milestone.ProjectId, ct)}\"",
            Metadata: new Dictionary<string, object>
            {
                ["milestoneId"] = milestone.Id,
                ["milestoneName"] = milestone.Name,
                ["projectId"] = milestone.ProjectId
            },
            ProjectId: milestone.ProjectId
        );

        await _changes.NotifyAsync(DataChangeScopes.Milestones, milestone.Id.ToString(), milestone.ProjectId, ct);
        await _changes.NotifyAsync(DataChangeScopes.Projects, milestone.ProjectId.ToString(), milestone.ProjectId, ct);

        return Ok(MilestoneDto.FromEntity(refreshed ?? milestone));
    }

    [HttpPatch("{id:guid}/complete")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    public async Task<IActionResult> Complete(Guid id, CancellationToken ct, [FromQuery] bool forceComplete = false)
    {
        var milestone = await _db.Milestones
            .Include(m => m.Tasks)
                .ThenInclude(t => t.SubTasks)
            .FirstOrDefaultAsync(m => m.Id == id, ct);
        if (milestone == null)
        {
            return NotFound();
        }

        if (!await _scope.CanManageProjectAsync(milestone.ProjectId, ct))
        {
            return Forbid();
        }
        if (!await CanAccessMilestoneAsync(milestone, ct))
        {
            return Forbid();
        }

        if (milestone.HasTasks && !milestone.AllTasksCompleted)
        {
            if (forceComplete)
            {
                milestone.CompleteAllTasks();
            }
            else
            {
                return Conflict(new
                {
                    error = $"{milestone.GetIncompleteTaskCount()} task(s) are still not completed. Use forceComplete=true to complete all tasks and subtasks.",
                    incompleteTaskCount = milestone.GetIncompleteTaskCount(),
                    totalTaskCount = milestone.Tasks.Count
                });
            }
        }
        else
        {
            milestone.MarkComplete();
        }

        await _uow.Milestones.UpdateAsync(milestone, ct);
        await _uow.SaveChangesAsync(ct);
        await RecalculateProjectFromMilestonesAsync(milestone.ProjectId, ct);
        var refreshed = await _db.Milestones
            .Include(m => m.Tasks)
            .Include(m => m.Department)
            .FirstOrDefaultAsync(m => m.Id == id, ct);

        HttpContext.Items["ActivityLog"] = new ActivityLogContext(
            ActivityType: "Milestone Status Changed",
            Description: $"{CurrentUserName} completed milestone \"{milestone.Name}\" in project \"{await ResolveProjectNameAsync(milestone.ProjectId, ct)}\"",
            Metadata: new Dictionary<string, object>
            {
                ["milestoneId"] = milestone.Id,
                ["milestoneName"] = milestone.Name,
                ["projectId"] = milestone.ProjectId,
                ["newStatus"] = "Completed"
            },
            ProjectId: milestone.ProjectId
        );

        await _changes.NotifyAsync(DataChangeScopes.Milestones, milestone.Id.ToString(), milestone.ProjectId, ct);
        await _changes.NotifyAsync(DataChangeScopes.Projects, milestone.ProjectId.ToString(), milestone.ProjectId, ct);

        return Ok(MilestoneDto.FromEntity(refreshed ?? milestone));
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    public async Task<IActionResult> SetStatus(Guid id, [FromBody] SetMilestoneStatusDto dto, CancellationToken ct)
    {
        var milestone = await _db.Milestones
            .Include(m => m.Tasks)
                .ThenInclude(t => t.SubTasks)
            .FirstOrDefaultAsync(m => m.Id == id, ct);
        if (milestone == null)
        {
            return NotFound();
        }

        if (!await _scope.CanManageProjectAsync(milestone.ProjectId, ct))
        {
            return Forbid();
        }
        if (!await CanAccessMilestoneAsync(milestone, ct))
        {
            return Forbid();
        }

        if (!Enum.TryParse<MilestoneStatus>(dto.Status, ignoreCase: true, out var status))
        {
            return BadRequest(new { error = $"Invalid status: {dto.Status}. Valid values: Pending, InProgress, Completed, Delayed" });
        }

        if (status == MilestoneStatus.Completed && milestone.HasTasks && !milestone.AllTasksCompleted)
        {
            if (dto.ForceComplete)
            {
                milestone.CompleteAllTasks();
            }
            else
            {
                return Conflict(new
                {
                    error = $"{milestone.GetIncompleteTaskCount()} task(s) are still not completed. Use forceComplete=true to complete all tasks and subtasks.",
                    incompleteTaskCount = milestone.GetIncompleteTaskCount(),
                    totalTaskCount = milestone.Tasks.Count
                });
            }
        }
        else
        {
            if (milestone.Tasks.Count > 0)
            {
                milestone.RecalculateProgressFromTasks();
                milestone.RecalculateStatusFromTasks();
            }
            milestone.SetStatus(status);
        }

        milestone.SetModified("system");
        await _uow.Milestones.UpdateAsync(milestone, ct);
        await _uow.SaveChangesAsync(ct);
        await RecalculateProjectFromMilestonesAsync(milestone.ProjectId, ct);
        var refreshed = await _db.Milestones
            .Include(m => m.Tasks)
            .Include(m => m.Department)
            .FirstOrDefaultAsync(m => m.Id == id, ct);

        HttpContext.Items["ActivityLog"] = new ActivityLogContext(
            ActivityType: "Milestone Status Changed",
            Description: $"{CurrentUserName} set milestone \"{milestone.Name}\" to \"{dto.Status}\" in project \"{await ResolveProjectNameAsync(milestone.ProjectId, ct)}\"",
            Metadata: new Dictionary<string, object>
            {
                ["milestoneId"] = milestone.Id,
                ["milestoneName"] = milestone.Name,
                ["projectId"] = milestone.ProjectId,
                ["newStatus"] = dto.Status
            },
            ProjectId: milestone.ProjectId
        );

        await _changes.NotifyAsync(DataChangeScopes.Milestones, milestone.Id.ToString(), milestone.ProjectId, ct);
        await _changes.NotifyAsync(DataChangeScopes.Projects, milestone.ProjectId.ToString(), milestone.ProjectId, ct);

        return Ok(MilestoneDto.FromEntity(refreshed ?? milestone));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.Manager)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var milestone = await _uow.Milestones.GetByIdAsync(id, ct);
        if (milestone == null)
        {
            return NotFound();
        }

        var projectId = milestone.ProjectId;

        if (!await _scope.CanManageProjectAsync(projectId, ct))
        {
            return Forbid();
        }
        if (!await CanAccessMilestoneAsync(milestone, ct))
        {
            return Forbid();
        }

        var milestoneName = milestone.Name;

        var deps = await _db.MilestoneDependencies
            .Where(d => d.PrerequisiteMilestoneId == id || d.DependentMilestoneId == id)
            .ToListAsync(ct);
        if (deps.Count > 0)
            _db.MilestoneDependencies.RemoveRange(deps);

        await _uow.Tasks.DeleteTasksByMilestoneAsync(id, ct);
        await _uow.Milestones.DeleteAsync(id, ct);
        await _uow.SaveChangesAsync(ct);
        await RecalculateProjectFromMilestonesAsync(projectId, ct);

        HttpContext.Items["ActivityLog"] = new ActivityLogContext(
            ActivityType: "Milestone Deleted",
            Description: $"{CurrentUserName} deleted milestone \"{milestoneName}\" from project \"{await ResolveProjectNameAsync(projectId, ct)}\"",
            Metadata: new Dictionary<string, object>
            {
                ["milestoneName"] = milestoneName,
                ["projectId"] = projectId
            },
            ProjectId: projectId
        );

        // Deleting a milestone cascades its subtasks.
        await _changes.NotifyAsync(DataChangeScopes.Milestones, id.ToString(), projectId, ct);
        await _changes.NotifyAsync(DataChangeScopes.Tasks, id.ToString(), projectId, ct);
        await _changes.NotifyAsync(DataChangeScopes.Projects, projectId.ToString(), projectId, ct);

        return NoContent();
    }

    private async Task RecalculateProjectFromMilestonesAsync(Guid projectId, CancellationToken ct)
    {
        var project = await _db.Projects
            .Include(p => p.Milestones)
            .FirstOrDefaultAsync(p => p.Id == projectId, ct);
        if (project == null) return;
        project.RecalculateProgressFromMilestones();
        project.RecalculateStatusFromMilestones();
        project.SetModified("system");
        await _uow.Projects.UpdateAsync(project, ct);
        await _uow.SaveChangesAsync(ct);
    }

    private async Task<List<Milestone>> ScopeMilestonesForCurrentUserAsync(List<Milestone> milestones, CancellationToken ct)
    {
        if (!_scope.IsDepartmentHead || _scope.IsDirector || _scope.IsSuperAdmin)
        {
            return milestones;
        }

        var departmentIds = await _scope.GetDepartmentIdsAsync(ct);
        var projectIds = milestones.Select(m => m.ProjectId).Distinct().ToList();
        var primaryDeptProjectIds = await _db.Projects
            .Where(p => projectIds.Contains(p.Id) && departmentIds.Contains(p.DepartmentId))
            .Select(p => p.Id)
            .ToListAsync(ct);
        var primaryDeptAllowedProjectIds = new HashSet<Guid>();
        foreach (var projectId in primaryDeptProjectIds)
        {
            if (await _scope.CanAccessProjectAsPrimaryDepartmentAsync(projectId, ct))
            {
                primaryDeptAllowedProjectIds.Add(projectId);
            }
        }

        return milestones
            .Where(m => primaryDeptAllowedProjectIds.Contains(m.ProjectId) ||
                        (m.DepartmentId.HasValue && departmentIds.Contains(m.DepartmentId.Value)))
            .ToList();
    }

    private async Task<bool> CanAccessMilestoneAsync(Milestone milestone, CancellationToken ct)
    {
        if (!_scope.IsDepartmentHead || _scope.IsDirector || _scope.IsSuperAdmin)
        {
            return true;
        }

        var departmentIds = await _scope.GetDepartmentIdsAsync(ct);
        if (milestone.DepartmentId.HasValue && departmentIds.Contains(milestone.DepartmentId.Value))
            return true;
        return await _scope.CanAccessProjectAsPrimaryDepartmentAsync(milestone.ProjectId, ct);
    }

    /// <summary>
    /// True when the caller may put this department on this project's milestone.
    ///
    /// The rule used to be stricter: a milestone's department had to already be one of
    /// the project's, enforced on both create and update, and anything else returned
    /// 400. That turned out to be a footgun with no security value behind it.
    ///
    /// Organisation scoping already limits which departments a caller can see at all,
    /// and the modal is now limited to the project's own departments, so the check was
    /// only ever rejecting a reasonable action. Worse, it made 13 of the 15 seeded
    /// milestones permanently uneditable: MilestonesSeeder had given them departments
    /// their projects did not carry, and because the form resends the current value on
    /// every save, those rows could not be saved even to rename one.
    ///
    /// What is still refused is a department the caller cannot see. That is the
    /// boundary that matters, and it is enforced by scoping the department query
    /// rather than by this method.
    /// </summary>
    private async Task<bool> CanAssignDepartmentToMilestoneAsync(
        Guid? departmentId,
        CancellationToken ct)
    {
        if (departmentId is not { } department)
        {
            // Clearing a milestone's department is always allowed.
            return true;
        }

        return await _scope.CanAccessDepartmentAsync(department, ct);
    }


    private async Task SendProjectAssignedNotificationAsync(Guid projectId, Guid? departmentId, CancellationToken ct)
    {
        if (!departmentId.HasValue)
        {
            return;
        }

        var project = await _db.Projects
            .Where(item => item.Id == projectId)
            .Select(item => new { item.Name })
            .FirstOrDefaultAsync(ct);
        if (project == null)
        {
            return;
        }

        var departmentHeadIds = await _db.Departments
            .Where(department => department.Id == departmentId.Value && department.DepartmentHeadUserId != null)
            .Select(department => department.DepartmentHeadUserId!)
            .ToListAsync(ct);

        foreach (var userId in departmentHeadIds.Distinct())
        {
            var alreadySent = await _db.Notifications.AnyAsync(notification =>
                notification.UserId == userId &&
                notification.RelatedEntityId == projectId.ToString() &&
                notification.RelatedEntityType == "Project",
                ct);
            if (alreadySent)
            {
                continue;
            }

            await _notifications.SendAsync(new SendNotificationDto(
                UserId: userId,
                Title: "New Project Assigned",
                Message: $"'{project.Name}' has been assigned to your department.",
                Type: NotificationType.ProjectAlert,
                Priority: NotificationPriority.Normal,
                ActionUrl: NotificationLinks.ForMilestone(projectId),
                RelatedEntityId: projectId.ToString(),
                RelatedEntityType: NotificationLinks.ProjectEntityType),
                ct);
        }
    }
    private string CurrentUserName => _currentUser.FullName ?? "System";

    private async Task<string> ResolveProjectNameAsync(Guid projectId, CancellationToken ct)
    {
        var project = await _db.Projects
            .Where(p => p.Id == projectId)
            .Select(p => p.Name)
            .FirstOrDefaultAsync(ct);
        return project ?? "Unknown Project";
    }
}
