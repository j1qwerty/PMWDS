using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PMWDS.API.Services;
using PMWDS.Application.DTOs.Common;
using PMWDS.Application.DTOs.Tasks;
using PMWDS.Application.Features.AI.Queries;
using PMWDS.Application.Features.Tasks.Commands;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;
using PMWDS.Infrastructure.Services;
using PMWDS.Persistence.Context;
using TaskDependency = PMWDS.Domain.Entities.TaskDependency;

namespace PMWDS.API.Controllers;

public class TasksController : BaseApiController
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;
    private readonly INotificationService _notifications;
    private readonly IFileStorageService _files;
    private readonly RoleScopeService _scope;
    private readonly ApplicationDbContext _db;

    public TasksController(
        IUnitOfWork uow,
        ICurrentUserService currentUser,
        INotificationService notifications,
        IFileStorageService files,
        RoleScopeService scope,
        ApplicationDbContext db)
    {
        _uow = uow;
        _currentUser = currentUser;
        _notifications = notifications;
        _files = files;
        _scope = scope;
        _db = db;
    }

    [HttpGet("by-project/{projectId:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetByProject(Guid projectId, [FromQuery] PaginationQuery pagination, CancellationToken ct)
    {
        if (!await _scope.CanAccessProjectAsync(projectId, ct))
        {
            return Forbid();
        }

        var tasks = (await _uow.Tasks.GetByProjectAsync(projectId, ct))
            .OrderByDescending(task => task.CreatedDate)
            .ToList();
        var items = tasks
            .Skip(pagination.Skip)
            .Take(pagination.NormalizedPageSize)
            .Select(TaskDto.FromEntity)
            .ToList();
        return Ok(PaginatedResponse<TaskDto>.Create(items, pagination, tasks.Count));
    }

    [HttpGet("my-tasks")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetMyTasks([FromQuery] PaginationQuery pagination, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_currentUser.UserId))
            return Unauthorized();

        var tasks = await _uow.Tasks.GetByAssigneeAsync(_currentUser.UserId, ct);
        var allowedProjectIds = await GetAccessibleProjectIdsAsync(ct);
        tasks = tasks.Where(task => allowedProjectIds.Contains(task.ProjectId)).ToList();
        var visibleTasks = tasks.OrderByDescending(task => task.CreatedDate).ToList();
        var items = visibleTasks
            .Skip(pagination.Skip)
            .Take(pagination.NormalizedPageSize)
            .Select(TaskDto.FromEntity)
            .ToList();
        return Ok(PaginatedResponse<TaskDto>.Create(items, pagination, visibleTasks.Count));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        try
        {
            var task = await _uow.Tasks.GetWithDetailsAsync(id, ct);
            if (task == null)
            {
                return NotFound();
            }

            if (!await _scope.CanAccessProjectAsync(task.ProjectId, ct))
            {
                return Forbid();
            }

            return Ok(TaskDto.FromEntity(task));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to load task", error = ex.Message, stackTrace = ex.StackTrace });
        }
    }

    [HttpPost]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Create([FromBody] CreateTaskDto dto, CancellationToken ct)
    {
        if (!await _scope.CanManageProjectAsync(dto.ProjectId, ct))
        {
            return Forbid();
        }

        if (!string.IsNullOrWhiteSpace(dto.AssignedToUserId) &&
            !await IsUserInProjectOrganizationAsync(dto.AssignedToUserId, dto.ProjectId, ct))
        {
            return BadRequest(new { message = "Assignee must belong to the selected project organization." });
        }

        var result = await Mediator.Send(new CreateTaskCommand(dto), ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "TaskEditor")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTaskDto dto, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetByIdAsync(id, ct);
        if (task == null)
            return NotFound();

        if (!await _scope.CanManageProjectAsync(task.ProjectId, ct))
        {
            return Forbid();
        }

        task.UpdateDetails(
            dto.Title,
            dto.Description ?? string.Empty,
            dto.Priority,
            dto.StartDate,
            dto.DueDate,
            (int)dto.EstimatedHours,
            dto.MilestoneId);
        task.SetModified(_currentUser.UserId ?? "system");
        await _uow.SaveChangesAsync(ct);
        return Ok(TaskDto.FromEntity(task));
    }

    [HttpPatch("{id:guid}/progress")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> UpdateProgress(Guid id, [FromBody] UpdateTaskProgressDto dto, CancellationToken ct)
    {
        if (!await CanWorkOnTaskAsync(id, ct))
        {
            return Forbid();
        }

        return Ok(await Mediator.Send(new UpdateTaskProgressCommand(id, dto), ct));
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateTaskStatusRequest req, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetByIdAsync(id, ct);
        if (task == null)
            return NotFound();

        if (!await _scope.CanAccessProjectAsync(task.ProjectId, ct))
        {
            return Forbid();
        }

        task.UpdateStatus(req.NewStatus);
        task.SetModified(_currentUser.UserId ?? "system");
        await _uow.Tasks.UpdateAsync(task, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(TaskDto.FromEntity(task));
    }

    [HttpPost("{id:guid}/assign")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Assign(Guid id, [FromBody] AssignTaskRequest req, CancellationToken ct)
    {
        var assigneeIds = req.AssigneeIds?.Where(value => !string.IsNullOrWhiteSpace(value)).Distinct().ToList();
        if (assigneeIds is not { Count: > 0 })
        {
            if (string.IsNullOrWhiteSpace(req.AssigneeId))
            {
                return BadRequest(new { message = "At least one assignee is required." });
            }

            var assigneeId = req.AssigneeId!;
            var singleTask = await _uow.Tasks.GetByIdAsync(id, ct);
            if (singleTask == null)
            {
                return NotFound();
            }

            if (!await _scope.CanManageProjectAsync(singleTask.ProjectId, ct))
            {
                return Forbid();
            }

            if (!await IsUserInProjectOrganizationAsync(assigneeId, singleTask.ProjectId, ct))
            {
                return BadRequest(new { message = "Assignee must belong to the selected project organization." });
            }

            return Ok(await Mediator.Send(new AssignTaskCommand(id, assigneeId, req.UseAIRecommendation), ct));
        }

        var task = await _uow.Tasks.GetWithDetailsAsync(id, ct);
        if (task == null)
        {
            return NotFound();
        }

        if (!await _scope.CanManageProjectAsync(task.ProjectId, ct))
        {
            return Forbid();
        }

        foreach (var userId in assigneeIds)
        {
            if (!Guid.TryParse(userId, out var parsedUserId) ||
                await _uow.Users.GetByIdAsync(parsedUserId, ct) == null ||
                !await IsUserInProjectOrganizationAsync(userId, task.ProjectId, ct))
            {
                return BadRequest(new { message = $"Invalid assignee '{userId}'." });
            }
        }

        foreach (var active in task.Assignments.Where(a => a.IsActive && !assigneeIds.Contains(a.UserId)))
        {
            active.Release();
        }

        var assignedBy = _currentUser.UserId ?? "system";
        task.AssignTo(assigneeIds[0], assignedBy);

        foreach (var userId in assigneeIds.Where(userId => task.Assignments.All(a => a.UserId != userId || !a.IsActive)))
        {
            await _uow.TaskAssignments.AddAsync(TaskAssignment.Create(task.Id, userId), ct);
            await _notifications.SendTaskAssignmentAlertAsync(task.Id, userId, ct);
        }

        task.SetModified(assignedBy);
        await _uow.SaveChangesAsync(ct);

        var refreshed = await _uow.Tasks.GetWithDetailsAsync(id, ct);
        return Ok(TaskDto.FromEntity(refreshed!));
    }

    [HttpGet("{id:guid}/ai/recommend-assignee")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetAIAssignee(Guid id, CancellationToken ct)
        => Ok(await Mediator.Send(new GetAIAssigneeRecommendationQuery(id), ct));

    [HttpGet("{id:guid}/ai/delay-prediction")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetDelayPrediction(Guid id, CancellationToken ct)
    {
        if (!await CanAccessTaskAsync(id, ct))
        {
            return Forbid();
        }

        return Ok(await Mediator.Send(new GetTaskDelayPredictionQuery(id), ct));
    }

    [HttpPost("{id:guid}/escalate")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Escalate(Guid id, CancellationToken ct)
    {
        if (!await CanManageTaskAsync(id, ct))
        {
            return Forbid();
        }

        return Ok(await Mediator.Send(new EscalateTaskCommand(id), ct));
    }

    [HttpPost("{id:guid}/comments")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> AddComment(Guid id, [FromBody] AddCommentRequest req, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetByIdAsync(id, ct);
        if (task == null)
            return NotFound();

        if (!await _scope.CanManageProjectAsync(task.ProjectId, ct))
        {
            return Forbid();
        }

        var comment = TaskComment.Create(
            id,
            _currentUser.UserId ?? "system",
            req.Comment);
        await _uow.TaskComments.AddAsync(comment, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(new { Message = "Comment added.", Comment = comment.Content });
    }

    [HttpPost("{id:guid}/attachments")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> UploadAttachment(Guid id, IFormFile file, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetByIdAsync(id, ct);
        if (task == null)
            return NotFound();

        if (!await _scope.CanManageProjectAsync(task.ProjectId, ct))
        {
            return Forbid();
        }

        await using var stream = file.OpenReadStream();
        var filePath = await _files.UploadAsync(stream, file.FileName, file.ContentType, ct);

        var attachment = TaskAttachment.Create(
            id,
            file.FileName,
            filePath,
            file.ContentType,
            file.Length,
            _currentUser.UserId ?? "system");
        await _uow.TaskAttachments.AddAsync(attachment, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(new { Message = "Attachment uploaded.", FileName = file.FileName });
    }

    [HttpPost("{id:guid}/time/start")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> StartTimer(Guid id, [FromBody] StartTimerRequest req, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetByIdAsync(id, ct);
        if (task == null)
            return NotFound();

        if (!await _scope.CanManageProjectAsync(task.ProjectId, ct))
        {
            return Forbid();
        }

        task.Start();
        var entry = TimeEntry.StartTimer(
            id,
            _currentUser.UserId ?? "system",
            req.Description,
            req.IsBillable);
        await _uow.TimeEntries.AddAsync(entry, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(new { Message = "Timer started.", EntryId = entry.Id });
    }

    [HttpPost("{id:guid}/time/stop")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> StopTimer(Guid id, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetByIdAsync(id, ct);
        if (task == null)
            return NotFound();

        if (!await _scope.CanManageProjectAsync(task.ProjectId, ct))
        {
            return Forbid();
        }

        var entry = _uow.TimeEntries.FindAsync(
            e => e.TaskId == id
                && e.UserId == (_currentUser.UserId ?? "system")
                && !e.EndTime.HasValue,
            ct).Result.FirstOrDefault();
        if (entry == null)
            return NotFound("No running timer found.");

        entry.StopTimer();
        await _uow.SaveChangesAsync(ct);
        return Ok(new { Message = "Timer stopped.", DurationMinutes = entry.Duration.TotalMinutes });
    }

    [HttpGet("overdue")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetOverdue([FromQuery] PaginationQuery pagination, CancellationToken ct)
    {
        var allowedProjectIds = await GetAccessibleProjectIdsAsync(ct);
        var tasks = (await _uow.Tasks.GetOverdueTasksAsync(ct))
            .Where(task => allowedProjectIds.Contains(task.ProjectId))
            .OrderBy(task => task.DueDate)
            .ToList();
        var items = tasks.Skip(pagination.Skip).Take(pagination.NormalizedPageSize).Select(TaskDto.FromEntity).ToList();
        return Ok(PaginatedResponse<TaskDto>.Create(items, pagination, tasks.Count));
    }

    [HttpGet("escalated")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetEscalated([FromQuery] PaginationQuery pagination, CancellationToken ct)
    {
        var allowedProjectIds = await GetAccessibleProjectIdsAsync(ct);
        var tasks = (await _uow.Tasks.GetEscalatedTasksAsync(ct))
            .Where(task => allowedProjectIds.Contains(task.ProjectId))
            .OrderByDescending(task => task.ModifiedDate ?? task.CreatedDate)
            .ToList();
        var items = tasks.Skip(pagination.Skip).Take(pagination.NormalizedPageSize).Select(TaskDto.FromEntity).ToList();
        return Ok(PaginatedResponse<TaskDto>.Create(items, pagination, tasks.Count));
    }

    [HttpGet("unassigned")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetUnassigned([FromQuery] PaginationQuery pagination, CancellationToken ct)
    {
        var allowedProjectIds = await GetAccessibleProjectIdsAsync(ct);
        var tasks = (await _uow.Tasks.GetUnassignedTasksAsync(ct))
            .Where(task => allowedProjectIds.Contains(task.ProjectId))
            .OrderByDescending(task => task.CreatedDate)
            .ToList();
        var items = tasks.Skip(pagination.Skip).Take(pagination.NormalizedPageSize).Select(TaskDto.FromEntity).ToList();
        return Ok(PaginatedResponse<TaskDto>.Create(items, pagination, tasks.Count));
    }

    [HttpGet("{id:guid}/subtasks")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetSubtasks(Guid id, [FromQuery] PaginationQuery pagination, CancellationToken ct)
    {
        try
        {
            var parentTask = await _uow.Tasks.GetByIdAsync(id, ct);
            if (parentTask == null) return NotFound();
            if (!await _scope.CanAccessProjectAsync(parentTask.ProjectId, ct)) return Forbid();
            var subtasks = (await _uow.Tasks.GetSubtasksByParentIdAsync(id, ct))
                .OrderByDescending(task => task.CreatedDate)
                .ToList();
            var items = subtasks.Skip(pagination.Skip).Take(pagination.NormalizedPageSize).Select(TaskDto.FromEntity).ToList();
            return Ok(PaginatedResponse<TaskDto>.Create(items, pagination, subtasks.Count));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to load subtasks", error = ex.Message, stackTrace = ex.StackTrace });
        }
    }

    [HttpPost("{id:guid}/subtasks")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> CreateSubtask(Guid id, [FromBody] CreateSubtaskDto dto, CancellationToken ct)
    {
        var parentTask = await _uow.Tasks.GetByIdAsync(id, ct);
        if (parentTask == null)
            return NotFound();

        if (!await CanWorkOnTaskAsync(parentTask.Id, ct))
        {
            return Forbid();
        }

        if (dto.ProjectId != parentTask.ProjectId)
        {
            return BadRequest(new { message = "Subtask project must match the parent task project." });
        }

        if (!string.IsNullOrWhiteSpace(dto.AssignedToUserId) &&
            !await IsUserInProjectOrganizationAsync(dto.AssignedToUserId, parentTask.ProjectId, ct))
        {
            return BadRequest(new { message = "Assignee must belong to the selected project organization." });
        }

        var dueDate = dto.DueDate ?? DateTime.UtcNow.AddDays(7);
        var createDto = new CreateTaskDto(
            dto.Title,
            dto.Description ?? string.Empty,
            dto.StartDate,
            dueDate,
            dto.EstimatedHours,
            dto.ProjectId,
            dto.MilestoneId,
            id,
            dto.AssignedToUserId,
            dto.Priority);
        var result = await Mediator.Send(new CreateTaskCommand(createDto), ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpGet("subtasks/{id:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetSubtaskById(Guid id, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetWithDetailsAsync(id, ct);
        if (task == null || task.ParentTaskId == null)
            return NotFound();
        if (!await _scope.CanAccessProjectAsync(task.ProjectId, ct)) return Forbid();
        return Ok(TaskDto.FromEntity(task));
    }

    [HttpPut("subtasks/{id:guid}")]
    [Authorize(Policy = "TaskEditor")]
    public async Task<IActionResult> UpdateSubtask(Guid id, [FromBody] UpdateTaskDto dto, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetByIdAsync(id, ct);
        if (task == null || task.ParentTaskId == null)
            return NotFound();

        if (!await _scope.CanManageProjectAsync(task.ProjectId, ct))
        {
            return Forbid();
        }

        task.UpdateDetails(
            dto.Title,
            dto.Description ?? string.Empty,
            dto.Priority,
            dto.StartDate,
            dto.DueDate,
            (int)dto.EstimatedHours,
            dto.MilestoneId);
        task.SetModified(_currentUser.UserId ?? "system");
        await _uow.SaveChangesAsync(ct);
        return Ok(TaskDto.FromEntity(task));
    }

    [HttpPatch("subtasks/{id:guid}/progress")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> UpdateSubtaskProgress(Guid id, [FromBody] UpdateTaskProgressDto dto, CancellationToken ct)
    {
        if (!await CanWorkOnTaskAsync(id, ct))
        {
            return Forbid();
        }

        return Ok(await Mediator.Send(new UpdateTaskProgressCommand(id, dto), ct));
    }

    [HttpPatch("subtasks/{id:guid}/status")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> UpdateSubtaskStatus(Guid id, [FromBody] UpdateTaskStatusRequest req, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetByIdAsync(id, ct);
        if (task == null || task.ParentTaskId == null)
            return NotFound();

        if (!await _scope.CanManageProjectAsync(task.ProjectId, ct))
        {
            return Forbid();
        }

        task.UpdateStatus(req.NewStatus);
        task.SetModified(_currentUser.UserId ?? "system");
        await _uow.Tasks.UpdateAsync(task, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(TaskDto.FromEntity(task));
    }

    [HttpPost("subtasks/{id:guid}/assign")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> AssignSubtask(Guid id, [FromBody] AssignTaskRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.AssigneeId))
        {
            return BadRequest(new { message = "Assignee is required." });
        }

        if (!await CanManageTaskAsync(id, ct))
        {
            return Forbid();
        }

        var task = await _uow.Tasks.GetByIdAsync(id, ct);
        if (task == null || !await IsUserInProjectOrganizationAsync(req.AssigneeId, task.ProjectId, ct))
        {
            return BadRequest(new { message = "Assignee must belong to the selected project organization." });
        }

        return Ok(await Mediator.Send(new AssignTaskCommand(id, req.AssigneeId, req.UseAIRecommendation), ct));
    }

    [HttpDelete("subtasks/{id:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> DeleteSubtask(Guid id, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetByIdAsync(id, ct);
        if (task == null || task.ParentTaskId == null)
            return NotFound();

        if (!await _scope.CanManageProjectAsync(task.ProjectId, ct))
        {
            return Forbid();
        }

        await _uow.Tasks.DeleteTaskGraphAsync(id, ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetByIdAsync(id, ct);
        if (task == null) return NotFound();
        if (!await _scope.CanManageProjectAsync(task.ProjectId, ct)) return Forbid();
        await _uow.Tasks.DeleteTaskGraphAsync(id, ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpGet("{id:guid}/dependencies")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetDependencies(Guid id, CancellationToken ct)
    {
        try
        {
            var task = await _uow.Tasks.GetByIdAsync(id, ct);
            if (task == null) return NotFound();
            if (!await _scope.CanAccessProjectAsync(task.ProjectId, ct)) return Forbid();
            var dependencies = (await _uow.Tasks.GetDependenciesForTaskAsync(id, ct))
                .Select(TaskDependencyDto.FromEntity)
                .ToList();
            return Ok(dependencies);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to load dependencies", error = ex.Message, stackTrace = ex.StackTrace });
        }
    }

    [HttpPost("{id:guid}/dependencies")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> CreateDependency(Guid id, [FromBody] CreateDependencyDto dto, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetByIdAsync(id, ct);
        if (task == null)
            return NotFound();

        if (!await _scope.CanAccessProjectAsync(task.ProjectId, ct))
        {
            return Forbid();
        }

        var predecessor = await _uow.Tasks.GetByIdAsync(dto.PredecessorTaskId, ct);
        if (predecessor == null)
            return BadRequest(new { message = "Predecessor task not found." });

        var successor = await _uow.Tasks.GetByIdAsync(dto.SuccessorTaskId, ct);
        if (successor == null)
            return BadRequest(new { message = "Successor task not found." });

        if (!await _scope.CanManageProjectAsync(predecessor.ProjectId, ct) ||
            !await _scope.CanManageProjectAsync(successor.ProjectId, ct))
        {
            return Forbid();
        }

        var dependency = TaskDependency.Create(dto.PredecessorTaskId, dto.SuccessorTaskId, dto.Type, dto.LagDays);
        await _uow.TaskDependencies.AddAsync(dependency, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(TaskDependencyDto.FromEntity(dependency));
    }

    [HttpPut("dependencies/{depId:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> UpdateDependency(Guid depId, [FromBody] UpdateDependencyDto dto, CancellationToken ct)
    {
        var dependency = await _uow.TaskDependencies.GetByIdAsync(depId, ct);
        if (dependency == null)
            return NotFound();

        if (!await CanManageTaskAsync(dependency.PredecessorTaskId, ct) ||
            !await CanManageTaskAsync(dependency.SuccessorTaskId, ct))
        {
            return Forbid();
        }

        dependency.UpdateType(dto.Type);
        dependency.UpdateLag(dto.LagDays);
        await _uow.SaveChangesAsync(ct);
        return Ok(TaskDependencyDto.FromEntity(dependency));
    }

    [HttpDelete("dependencies/{depId:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> DeleteDependency(Guid depId, CancellationToken ct)
    {
        var dependency = await _uow.TaskDependencies.GetByIdAsync(depId, ct);
        if (dependency == null)
            return NotFound();

        if (!await CanManageTaskAsync(dependency.PredecessorTaskId, ct) ||
            !await CanManageTaskAsync(dependency.SuccessorTaskId, ct))
        {
            return Forbid();
        }

        await _uow.TaskDependencies.DeleteAsync(depId, ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task<bool> CanAccessTaskAsync(Guid taskId, CancellationToken ct)
    {
        var projectId = await _db.Tasks
            .Where(task => task.Id == taskId)
            .Select(task => task.ProjectId)
            .FirstOrDefaultAsync(ct);
        return projectId != Guid.Empty && await _scope.CanAccessProjectAsync(projectId, ct);
    }

    private async Task<bool> CanManageTaskAsync(Guid taskId, CancellationToken ct)
    {
        var projectId = await _db.Tasks
            .Where(task => task.Id == taskId)
            .Select(task => task.ProjectId)
            .FirstOrDefaultAsync(ct);
        return projectId != Guid.Empty && await _scope.CanManageProjectAsync(projectId, ct);
    }

    private async Task<bool> CanWorkOnTaskAsync(Guid taskId, CancellationToken ct)
    {
        var currentUserId = _currentUser.UserId;
        var task = await _db.Tasks
            .Where(item => item.Id == taskId)
            .Select(item => new
            {
                item.ProjectId,
                item.AssignedToUserId,
                HasAssignment = currentUserId != null && item.Assignments.Any(assignment => assignment.UserId == currentUserId)
            })
            .FirstOrDefaultAsync(ct);

        if (task == null)
        {
            return false;
        }

        if (await _scope.CanManageProjectAsync(task.ProjectId, ct))
        {
            return true;
        }

        return !string.IsNullOrWhiteSpace(currentUserId) &&
            (task.AssignedToUserId == currentUserId || task.HasAssignment);
    }

    private async Task<HashSet<Guid>> GetAccessibleProjectIdsAsync(CancellationToken ct)
    {
        var scopedProjects = await _scope.ScopeProjectsAsync(
            _db.Projects.Include(project => project.Department).AsQueryable(),
            ct);
        return (await scopedProjects.Select(project => project.Id).ToListAsync(ct)).ToHashSet();
    }

    private async Task<bool> IsUserInProjectOrganizationAsync(string userId, Guid projectId, CancellationToken ct)
    {
        if (!Guid.TryParse(userId, out var parsedUserId))
        {
            return false;
        }

        var organizationIds = await _db.Projects
            .Where(project => project.Id == projectId)
            .Select(project => new
            {
                PrimaryOrganizationId = project.Department != null ? project.Department.OrganizationId : null,
                AssignedOrganizationIds = project.ProjectDepartments
                    .Where(assignment => assignment.Department != null && assignment.Department.OrganizationId.HasValue)
                    .Select(assignment => assignment.Department!.OrganizationId!.Value)
                    .ToList()
            })
            .FirstOrDefaultAsync(ct);

        if (organizationIds == null)
        {
            return false;
        }

        var validOrganizationIds = organizationIds.AssignedOrganizationIds.ToHashSet();
        if (organizationIds.PrimaryOrganizationId.HasValue)
        {
            validOrganizationIds.Add(organizationIds.PrimaryOrganizationId.Value);
        }

        if (validOrganizationIds.Count == 0)
        {
            return false;
        }

        return await _db.Users.AnyAsync(user =>
            user.Id == parsedUserId &&
            ((user.OrganizationId.HasValue && validOrganizationIds.Contains(user.OrganizationId.Value)) ||
             user.DepartmentAssignments.Any(assignment =>
                assignment.Department.OrganizationId.HasValue &&
                validOrganizationIds.Contains(assignment.Department.OrganizationId.Value)) ||
             user.Department != null &&
                user.Department.OrganizationId.HasValue &&
                validOrganizationIds.Contains(user.Department.OrganizationId.Value)),
            ct);
    }
}

public record UpdateTaskStatusRequest(PMWDS.Domain.Enums.TaskStatus NewStatus);
public record AssignTaskRequest(string? AssigneeId, bool UseAIRecommendation = false, List<string>? AssigneeIds = null);
public record AddCommentRequest(string Comment);
public record StartTimerRequest(string Description, bool IsBillable = false);
