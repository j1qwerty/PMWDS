using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMWDS.Application.DTOs.Tasks;
using PMWDS.Application.Features.Tasks.Commands;
using PMWDS.Application.Features.Tasks.Queries;
namespace PMWDS.API.Controllers;

public class TasksController : BaseApiController
{
    /// <summary>Get all tasks for a project</summary>
    [HttpGet("by-project/{projectId:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetByProject(
    Guid projectId, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetTasksByProjectQuery(projectId), ct));
    /// <summary>Get tasks assigned to current user</summary>
    [HttpGet("my-tasks")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetMyTasks(
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetMyTasksQuery(), ct));
    /// <summary>Get task by ID with full details</summary>
    [HttpGet("{id:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetById(
    Guid id, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetTaskDetailsQuery(id), ct));
    /// <summary>Create a new task</summary>
    [HttpPost]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Create(
    [FromBody] CreateTaskDto dto,
    CancellationToken ct)
    {
        var result = await Mediator.Send(
        new CreateTaskCommand(dto), ct);
        return CreatedAtAction(
        nameof(GetById),
        new { id = result.Id },
        result);
    }
    /// <summary>Update task details</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = "TeamLead")]
    public async Task<IActionResult> Update(
    Guid id,
    [FromBody] UpdateTaskDto dto,
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new UpdateTaskCommand(id, dto), ct));
    /// <summary>Update task progress</summary>
    [HttpPatch("{id:guid}/progress")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> UpdateProgress(
    Guid id,
    [FromBody] UpdateTaskProgressDto dto,
    CancellationToken ct)


    => HandleResult(await Mediator.Send(
    new UpdateTaskProgressCommand(id, dto), ct));
    /// <summary>Update task status</summary>
    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> UpdateStatus(
    Guid id,
    [FromBody] UpdateTaskStatusRequest req,
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new UpdateTaskStatusCommand(
    id, req.NewStatus), ct));
    /// <summary>Assign task to a user</summary>
    [HttpPost("{id:guid}/assign")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Assign(
    Guid id,
    [FromBody] AssignTaskRequest req,
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new AssignTaskCommand(
    id,
    req.AssigneeId,
    req.UseAIRecommendation), ct));
    /// <summary>Get AI optimal assignee recommendation</summary>
    [HttpGet("{id:guid}/ai/recommend-assignee")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetAIAssignee(
    Guid id, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetAIAssigneeRecommendationQuery(id), ct));
    /// <summary>Get AI delay prediction for a task</summary>
    [HttpGet("{id:guid}/ai/delay-prediction")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetDelayPrediction(
    Guid id, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetTaskDelayPredictionQuery(id), ct));
    /// <summary>Manually escalate a task</summary>
    [HttpPost("{id:guid}/escalate")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Escalate(
    Guid id, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new EscalateTaskCommand(id), ct));
    /// <summary>Add a comment to a task</summary>
    [HttpPost("{id:guid}/comments")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> AddComment(
    Guid id,
    [FromBody] AddCommentRequest req,
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new AddTaskCommentCommand(id, req.Comment), ct));
    /// <summary>Upload attachment to a task</summary>
    [HttpPost("{id:guid}/attachments")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> UploadAttachment(
    Guid id, IFormFile file,
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new UploadTaskAttachmentCommand(id, file), ct));
    /// <summary>Start time tracking for a task</summary>
    [HttpPost("{id:guid}/time/start")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> StartTimer(
    Guid id,
    [FromBody] StartTimerRequest req,
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new StartTaskTimerCommand(
    id, req.Description, req.IsBillable), ct));
    /// <summary>Stop time tracking for a task</summary>
    [HttpPost("{id:guid}/time/stop")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> StopTimer(
    Guid id, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new StopTaskTimerCommand(id), ct));
    /// <summary>Get overdue tasks</summary>
    [HttpGet("overdue")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetOverdue(
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetOverdueTasksQuery(), ct));
    /// <summary>Get escalated tasks</summary>
    [HttpGet("escalated")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetEscalated(
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetEscalatedTasksQuery(), ct));
    /// <summary>Get unassigned tasks</summary>
    [HttpGet("unassigned")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetUnassigned(
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetUnassignedTasksQuery(), ct));
    /// <summary>Delete a task</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Delete(
    Guid id, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new DeleteTaskCommand(id), ct));
}
public record UpdateTaskStatusRequest(
 Domain.Enums.TaskStatus NewStatus);
public record AssignTaskRequest(
 string AssigneeId,


 bool UseAIRecommendation = false);
public record AddCommentRequest(string Comment);
public record StartTimerRequest(
 string Description, bool IsBillable = false);