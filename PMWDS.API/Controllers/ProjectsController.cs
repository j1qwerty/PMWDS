using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMWDS.Application.DTOs.Projects;
using PMWDS.Application.Features.Projects.Commands;
using PMWDS.Application.Features.Projects.Queries;
using PMWDS.Domain.Enums;
namespace PMWDS.API.Controllers;

public class ProjectsController : BaseApiController
{
    /// <summary>Get project dashboard summary</summary>
    [HttpGet("dashboard")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetDashboard(
    [FromQuery] Guid? departmentId,
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetProjectDashboardQuery(departmentId), ct));
    /// <summary>Get all projects</summary>
    [HttpGet]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetAll(
    [FromQuery] Guid? departmentId,
    [FromQuery] ProjectStatus? status,
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetAllProjectsQuery(departmentId, status), ct));
    /// <summary>Get project by ID with full details</summary>
    [HttpGet("{id:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetById(
    Guid id, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetProjectDetailsQuery(id), ct));
    /// <summary>Create a new project</summary>
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
    /// <summary>Update project details</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Update(
    Guid id,
    [FromBody] UpdateProjectDto dto,
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new UpdateProjectCommand(id, dto), ct));
    /// <summary>Update project status</summary>
    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> UpdateStatus(
    Guid id,
    [FromBody] UpdateProjectStatusRequest req,
    CancellationToken ct)


    => HandleResult(await Mediator.Send(
    new UpdateProjectStatusCommand(
    id, req.NewStatus, req.Justification), ct));
    /// <summary>Get project progress details</summary>
    [HttpGet("{id:guid}/progress")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetProgress(
    Guid id, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetProjectProgressQuery(id), ct));
    /// <summary>Get AI health analysis for a project</summary>
    [HttpGet("{id:guid}/ai/health")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetAIHealth(
    Guid id, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetProjectHealthQuery(id), ct));
    /// <summary>Get AI insights for a project</summary>
    [HttpGet("{id:guid}/ai/insights")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetAIInsights(
    Guid id, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetProjectInsightsQuery(id), ct));
    /// <summary>Optimize resource allocation with AI</summary>
    [HttpPost("{id:guid}/ai/optimize-resources")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> OptimizeResources(
    Guid id, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new OptimizeResourcesCommand(id), ct));
    /// <summary>Upload a project document</summary>
    [HttpPost("{id:guid}/documents")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> UploadDocument(
    Guid id, IFormFile file,
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new UploadProjectDocumentCommand(
    id, file), ct));
    /// <summary>Delete a project (soft delete)</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> Delete(
    Guid id, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new DeleteProjectCommand(id), ct));
}
public record UpdateProjectStatusRequest(
 ProjectStatus NewStatus,
 string? Justification = null);