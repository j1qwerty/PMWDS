using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMWDS.Application.Features.Milestones.Commands;
using PMWDS.Application.Features.Milestones.Queries;
namespace PMWDS.API.Controllers;

public class MilestonesController : BaseApiController
{
    /// <summary>Get milestones for a project</summary>
    [HttpGet("by-project/{projectId:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetByProject(
    Guid projectId, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetMilestonesByProjectQuery(projectId), ct));
    /// <summary>Get milestone by ID</summary>
    [HttpGet("{id:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetById(
    Guid id, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetMilestoneDetailsQuery(id), ct));
    /// <summary>Create a new milestone</summary>
    [HttpPost]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Create(
    [FromBody] CreateMilestoneDto dto,
    CancellationToken ct)
    {
        var result = await Mediator.Send(
        new CreateMilestoneCommand(dto), ct);
        return CreatedAtAction(
        nameof(GetById),
        new { id = result.Id },
        result);
    }
    /// <summary>Update milestone</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Update(
    Guid id,
    [FromBody] UpdateMilestoneDto dto,
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new UpdateMilestoneCommand(id, dto), ct));
    /// <summary>Complete a milestone</summary>
    [HttpPatch("{id:guid}/complete")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Complete(
    Guid id, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new CompleteMilestoneCommand(id), ct));
    /// <summary>Delete a milestone</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Delete(
    Guid id, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new DeleteMilestoneCommand(id), ct));
}