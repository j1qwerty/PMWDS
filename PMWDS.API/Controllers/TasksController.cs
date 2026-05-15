using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMWDS.Application.DTOs.Tasks;
using PMWDS.Application.Features.AI.Queries;
using PMWDS.Application.Features.Tasks.Commands;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;
using PMWDS.Infrastructure.Services;

namespace PMWDS.API.Controllers;

public class TasksController : BaseApiController
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;
    private readonly INotificationService _notifications;
    private readonly IFileStorageService _files;

    public TasksController(
        IUnitOfWork uow,
        ICurrentUserService currentUser,
        INotificationService notifications,
        IFileStorageService files)
    {
        _uow = uow;
        _currentUser = currentUser;
        _notifications = notifications;
        _files = files;
    }

    [HttpGet("by-project/{projectId:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetByProject(Guid projectId, CancellationToken ct)
        => Ok((await _uow.Tasks.GetByProjectAsync(projectId, ct)).Select(TaskDto.FromEntity));

    [HttpGet("my-tasks")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetMyTasks(CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_currentUser.UserId))
            return Unauthorized();

        var tasks = await _uow.Tasks.GetByAssigneeAsync(_currentUser.UserId, ct);
        return Ok(tasks.Select(TaskDto.FromEntity));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetWithDetailsAsync(id, ct);
        return task == null ? NotFound() : Ok(TaskDto.FromEntity(task));
    }

    [HttpPost]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Create([FromBody] CreateTaskDto dto, CancellationToken ct)
    {
        var result = await Mediator.Send(new CreateTaskCommand(dto), ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "TeamLead")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTaskDto dto, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetByIdAsync(id, ct);
        if (task == null)
            return NotFound();

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
        => Ok(await Mediator.Send(new UpdateTaskProgressCommand(id, dto), ct));

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateTaskStatusRequest req, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetByIdAsync(id, ct);
        if (task == null)
            return NotFound();

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
            return Ok(await Mediator.Send(new AssignTaskCommand(id, assigneeId, req.UseAIRecommendation), ct));
        }

        var task = await _uow.Tasks.GetWithDetailsAsync(id, ct);
        if (task == null)
        {
            return NotFound();
        }

        foreach (var userId in assigneeIds)
        {
            if (!Guid.TryParse(userId, out var parsedUserId) ||
                await _uow.Users.GetByIdAsync(parsedUserId, ct) == null)
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
        => Ok(await Mediator.Send(new GetTaskDelayPredictionQuery(id), ct));

    [HttpPost("{id:guid}/escalate")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Escalate(Guid id, CancellationToken ct)
        => Ok(await Mediator.Send(new EscalateTaskCommand(id), ct));

    [HttpPost("{id:guid}/comments")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> AddComment(Guid id, [FromBody] AddCommentRequest req, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetByIdAsync(id, ct);
        if (task == null)
            return NotFound();

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
    public async Task<IActionResult> GetOverdue(CancellationToken ct)
        => Ok((await _uow.Tasks.GetOverdueTasksAsync(ct)).Select(TaskDto.FromEntity));

    [HttpGet("escalated")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetEscalated(CancellationToken ct)
        => Ok((await _uow.Tasks.GetEscalatedTasksAsync(ct)).Select(TaskDto.FromEntity));

    [HttpGet("unassigned")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetUnassigned(CancellationToken ct)
        => Ok((await _uow.Tasks.GetUnassignedTasksAsync(ct)).Select(TaskDto.FromEntity));

    [HttpGet("{id:guid}/subtasks")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetSubtasks(Guid id, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetWithDetailsAsync(id, ct);
        return task == null ? NotFound() : Ok(task.SubTasks.Select(TaskDto.FromEntity));
    }

    [HttpPost("{id:guid}/subtasks")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> CreateSubtask(Guid id, [FromBody] CreateSubtaskDto dto, CancellationToken ct)
    {
        var createDto = new CreateTaskDto(
            dto.Title,
            dto.Description ?? string.Empty,
            dto.StartDate,
            dto.DueDate,
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
        return Ok(TaskDto.FromEntity(task));
    }

    [HttpPut("subtasks/{id:guid}")]
    [Authorize(Policy = "TeamLead")]
    public async Task<IActionResult> UpdateSubtask(Guid id, [FromBody] UpdateTaskDto dto, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetByIdAsync(id, ct);
        if (task == null || task.ParentTaskId == null)
            return NotFound();

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
        => Ok(await Mediator.Send(new UpdateTaskProgressCommand(id, dto), ct));

    [HttpPatch("subtasks/{id:guid}/status")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> UpdateSubtaskStatus(Guid id, [FromBody] UpdateTaskStatusRequest req, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetByIdAsync(id, ct);
        if (task == null || task.ParentTaskId == null)
            return NotFound();

        task.UpdateStatus(req.NewStatus);
        task.SetModified(_currentUser.UserId ?? "system");
        await _uow.Tasks.UpdateAsync(task, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(TaskDto.FromEntity(task));
    }

    [HttpPost("subtasks/{id:guid}/assign")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> AssignSubtask(Guid id, [FromBody] AssignTaskRequest req, CancellationToken ct)
        => Ok(await Mediator.Send(new AssignTaskCommand(id, req.AssigneeId, req.UseAIRecommendation), ct));

    [HttpDelete("subtasks/{id:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> DeleteSubtask(Guid id, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetByIdAsync(id, ct);
        if (task == null || task.ParentTaskId == null)
            return NotFound();

        await _uow.Tasks.DeleteAsync(id, ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _uow.Tasks.DeleteAsync(id, ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }
}

public record UpdateTaskStatusRequest(PMWDS.Domain.Enums.TaskStatus NewStatus);
public record AssignTaskRequest(string? AssigneeId, bool UseAIRecommendation = false, List<string>? AssigneeIds = null);
public record AddCommentRequest(string Comment);
public record StartTimerRequest(string Description, bool IsBillable = false);
