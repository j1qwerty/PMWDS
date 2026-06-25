using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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

    public MilestonesController(IUnitOfWork uow, ApplicationDbContext db, RoleScopeService scope, INotificationService notifications)
    {
        _uow = uow;
        _db = db;
        _scope = scope;
        _notifications = notifications;
    }

    [HttpGet("by-project/{projectId:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetByProject(Guid projectId, CancellationToken ct)
    {
        if (!await _scope.CanAccessProjectAsync(projectId, ct))
        {
            return Forbid();
        }

        var milestones = await _db.Milestones
            .Include(m => m.Tasks)
            .Include(m => m.Department)
            .Where(m => m.ProjectId == projectId)
            .ToListAsync(ct);
        milestones = await ScopeMilestonesForCurrentUserAsync(milestones, ct);
        return Ok(milestones.Select(MilestoneDto.FromEntity));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "Authenticated")]
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
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Create([FromBody] CreateMilestoneDto dto, CancellationToken ct)
    {
        if (!await _scope.CanManageProjectAsync(dto.ProjectId, ct))
        {
            return Forbid();
        }

        if (dto.DepartmentId.HasValue && !await IsDepartmentAssignedToProjectAsync(dto.ProjectId, dto.DepartmentId.Value, ct))
        {
            return BadRequest(new { message = "Milestone department must be assigned to the project." });
        }

        var milestone = Milestone.Create(dto.ProjectId, dto.Name, dto.Description, dto.DueDate, dto.Order, dto.IsCritical, dto.DepartmentId);
        milestone.SetCreatedBy("system");
        await _uow.Milestones.AddAsync(milestone, ct);
        await _uow.SaveChangesAsync(ct);
        await RecalculateProjectFromMilestonesAsync(milestone.ProjectId, ct);
        await SendProjectAssignedNotificationAsync(milestone.ProjectId, dto.DepartmentId, ct);
        return CreatedAtAction(nameof(GetById), new { id = milestone.Id }, MilestoneDto.FromEntity(milestone));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "Manager")]
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

        if (dto.DepartmentId.HasValue && !await IsDepartmentAssignedToProjectAsync(milestone.ProjectId, dto.DepartmentId.Value, ct))
        {
            return BadRequest(new { message = "Milestone department must be assigned to the project." });
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
        return Ok(MilestoneDto.FromEntity(refreshed ?? milestone));
    }

    [HttpPatch("{id:guid}/complete")]
    [Authorize(Policy = "Manager")]
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
        return Ok(MilestoneDto.FromEntity(refreshed ?? milestone));
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "Manager")]
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
        return Ok(MilestoneDto.FromEntity(refreshed ?? milestone));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "Manager")]
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

        await _uow.Tasks.DeleteTasksByMilestoneAsync(id, ct);
        await _uow.Milestones.DeleteAsync(id, ct);
        await _uow.SaveChangesAsync(ct);
        await RecalculateProjectFromMilestonesAsync(projectId, ct);
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
        return milestones
            .Where(m => m.DepartmentId.HasValue && departmentIds.Contains(m.DepartmentId.Value))
            .ToList();
    }

    private async Task<bool> CanAccessMilestoneAsync(Milestone milestone, CancellationToken ct)
    {
        if (!_scope.IsDepartmentHead || _scope.IsDirector || _scope.IsSuperAdmin)
        {
            return true;
        }

        var departmentIds = await _scope.GetDepartmentIdsAsync(ct);
        return milestone.DepartmentId.HasValue && departmentIds.Contains(milestone.DepartmentId.Value);
    }

    private Task<bool> IsDepartmentAssignedToProjectAsync(Guid projectId, Guid departmentId, CancellationToken ct)
        => _db.Projects.AnyAsync(project =>
            project.Id == projectId &&
            (project.DepartmentId == departmentId ||
             project.ProjectDepartments.Any(assignment => assignment.DepartmentId == departmentId)),
            ct);

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
                ActionUrl: $"/projects/{projectId}/milestones",
                RelatedEntityId: projectId.ToString(),
                RelatedEntityType: "Project"),
                ct);
        }
    }
}

public record SetMilestoneStatusDto(string Status, bool ForceComplete = false);

public record CreateMilestoneDto(
    Guid ProjectId,
    string Name,
    string Description,
    DateTime DueDate,
    int Order,
    Guid? DepartmentId = null,
    bool IsCritical = false);

public record UpdateMilestoneDto(
    string Name,
    string Description,
    DateTime DueDate,
    int Order,
    bool IsCritical,
    Guid? DepartmentId,
    double ProgressPercentage);
