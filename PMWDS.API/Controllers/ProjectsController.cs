using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMWDS.Application.DTOs.Projects;
using PMWDS.Application.Features.Projects.Commands;
using PMWDS.Application.Features.Projects.Queries;
using PMWDS.Domain.Enums;
namespace PMWDS.API.Controllers;
public class ProjectsController : BaseApiController
{
 [HttpGet("dashboard")]
 [Authorize(Policy = "Authenticated")]
 public async Task<IActionResult> GetDashboard(
 [FromQuery] Guid? departmentId,
 CancellationToken ct)
 => HandleResult(await Mediator.Send(
 new GetProjectDashboardQuery(departmentId), ct));
 [HttpGet("{id:guid}")]
 [Authorize(Policy = "Authenticated")]
 public async Task<IActionResult> GetById(
 Guid id, CancellationToken ct)
 => HandleResult(await Mediator.Send(
 new GetProjectDetailsQuery(id), ct));
 [HttpPost]
 [Authorize(Policy = "Manager")]
 public async Task<IActionResult> Create(
 [FromBody] CreateProjectDto dto,
 CancellationToken ct)
 {
 var result = await Mediator.Send(
 new CreateProjectCommand(dto), ct);
 return CreatedAtAction(
 nameof(GetById),
 new { id = result.Id },
 result);
 }
 [HttpPut("{id:guid}")]
 [Authorize(Policy = "Manager")]
 public async Task<IActionResult> Update(
 Guid id,
 [FromBody] UpdateProjectDto dto,
 CancellationToken ct)
 => HandleResult(await Mediator.Send(
 new UpdateProjectCommand(id, dto), ct));
 [HttpPatch("{id:guid}/status")]
 [Authorize(Policy = "Manager")]
 public async Task<IActionResult> UpdateStatus(
 Guid id,
 [FromBody] UpdateProjectStatusRequest req,
 CancellationToken ct)
 => HandleResult(await Mediator.Send(
 new UpdateProjectStatusCommand(
 id, req.NewStatus, req.Justification), ct));
 [HttpGet("{id:guid}/ai/health")]
 [Authorize(Policy = "Manager")]
 public async Task<IActionResult> GetAIHealth(
 Guid id, CancellationToken ct)
 => HandleResult(await Mediator.Send(
 new GetProjectHealthQuery(id), ct));
}
public record UpdateProjectStatusRequest(
 ProjectStatus NewStatus,
 string? Justification = null);
