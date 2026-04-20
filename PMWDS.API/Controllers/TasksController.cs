using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMWDS.Application.DTOs.Tasks;
using PMWDS.Application.Features.AI.Queries;
using PMWDS.Application.Features.Tasks.Commands;
namespace PMWDS.API.Controllers;
public class TasksController : BaseApiController
{
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
 [HttpGet("{id:guid}")]
 [Authorize(Policy = "Authenticated")]
 public IActionResult GetById(Guid id)
 => StatusCode(StatusCodes.Status501NotImplemented);
 [HttpPatch("{id:guid}/progress")]
 [Authorize(Policy = "Authenticated")]
 public async Task<IActionResult> UpdateProgress(
 Guid id,
 [FromBody] UpdateTaskProgressDto dto,
 CancellationToken ct)
 => HandleResult(await Mediator.Send(
 new UpdateTaskProgressCommand(id, dto), ct));
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
 [HttpGet("{id:guid}/ai/recommend-assignee")]
 [Authorize(Policy = "Manager")]
 public async Task<IActionResult> GetAIAssignee(
 Guid id, CancellationToken ct)
 => HandleResult(await Mediator.Send(
 new GetAIAssigneeRecommendationQuery(id), ct));
 [HttpGet("{id:guid}/ai/delay-prediction")]
 [Authorize(Policy = "Authenticated")]
 public async Task<IActionResult> GetDelayPrediction(
 Guid id, CancellationToken ct)
 => HandleResult(await Mediator.Send(
 new GetTaskDelayPredictionQuery(id), ct));
 [HttpPost("{id:guid}/escalate")]
 [Authorize(Policy = "Manager")]
 public async Task<IActionResult> Escalate(
 Guid id, CancellationToken ct)
 => HandleResult(await Mediator.Send(
 new EscalateTaskCommand(id), ct));
}
public record AssignTaskRequest(
 string AssigneeId,
 bool UseAIRecommendation = false);
