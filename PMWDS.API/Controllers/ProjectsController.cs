using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMWDS.Application.DTOs.Projects;
using PMWDS.Application.Features.Projects.Commands;
using PMWDS.Application.Features.Projects.Queries;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;
using PMWDS.Domain.Enums;
using PMWDS.Infrastructure.Services;

namespace PMWDS.API.Controllers;

public class ProjectsController : BaseApiController
{
    private readonly IUnitOfWork _uow;
    private readonly IAIService _ai;
    private readonly ICurrentUserService _currentUser;
    private readonly IFileStorageService _files;

    public ProjectsController(
        IUnitOfWork uow,
        IAIService ai,
        ICurrentUserService currentUser,
        IFileStorageService files)
    {
        _uow = uow;
        _ai = ai;
        _currentUser = currentUser;
        _files = files;
    }

    [HttpGet("dashboard")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetDashboard([FromQuery] Guid? departmentId, CancellationToken ct)
        => Ok(await Mediator.Send(new GetProjectDashboardQuery(departmentId), ct));

    [HttpGet]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetAll([FromQuery] Guid? departmentId, [FromQuery] ProjectStatus? status, CancellationToken ct)
    {
        IEnumerable<Project> projects = departmentId.HasValue
            ? await _uow.Projects.GetByDepartmentAsync(departmentId.Value, ct)
            : await _uow.Projects.GetAllAsync(ct);

        if (status.HasValue)
            projects = projects.Where(p => p.Status == status.Value);

        return Ok(projects.Select(ProjectDto.FromEntity));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
        => Ok(await Mediator.Send(new GetProjectDetailsQuery(id), ct));

    [HttpPost]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Create([FromBody] CreateProjectDto dto, CancellationToken ct)
    {
        var result = await Mediator.Send(new CreateProjectCommand(dto), ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProjectDto dto, CancellationToken ct)
        => Ok(await Mediator.Send(new UpdateProjectCommand(id, dto), ct));

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateProjectStatusRequest req, CancellationToken ct)
        => Ok(await Mediator.Send(new UpdateProjectStatusCommand(id, req.NewStatus, req.Justification), ct));

    [HttpGet("{id:guid}/progress")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetProgress(Guid id, CancellationToken ct)
    {
        var project = await _uow.Projects.GetWithDetailsAsync(id, ct);
        if (project == null)
            return NotFound();

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
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetAIHealth(Guid id, CancellationToken ct)
        => Ok(await Mediator.Send(new GetProjectHealthQuery(id), ct));

    [HttpGet("{id:guid}/ai/insights")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetAIInsights(Guid id, CancellationToken ct)
        => Ok(await _ai.GenerateProjectInsightsAsync(id, ct));

    [HttpPost("{id:guid}/ai/optimize-resources")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> OptimizeResources(Guid id, CancellationToken ct)
        => Ok(await _ai.OptimizeResourceAllocationAsync(id, ct));

    [HttpPost("{id:guid}/documents")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> UploadDocument(Guid id, IFormFile file, CancellationToken ct)
    {
        var project = await _uow.Projects.GetWithDetailsAsync(id, ct);
        if (project == null)
            return NotFound();

        await using var stream = file.OpenReadStream();
        var filePath = await _files.UploadAsync(stream, file.FileName, file.ContentType, ct);
        project.AddDocument(ProjectDocument.Create(
            id,
            file.FileName,
            filePath,
            file.ContentType,
            file.Length,
            _currentUser.UserId ?? "system"));

        await _uow.Projects.UpdateAsync(project, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _uow.Projects.DeleteAsync(id, ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }
}

public record UpdateProjectStatusRequest(ProjectStatus NewStatus, string? Justification = null);
