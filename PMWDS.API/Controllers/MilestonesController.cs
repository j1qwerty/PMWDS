using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMWDS.Application.DTOs.Projects;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;

namespace PMWDS.API.Controllers;

public class MilestonesController : BaseApiController
{
    private readonly IUnitOfWork _uow;

    public MilestonesController(IUnitOfWork uow)
    {
        _uow = uow;
    }

    [HttpGet("by-project/{projectId:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetByProject(Guid projectId, CancellationToken ct)
    {
        var milestones = await _uow.Milestones.FindAsync(m => m.ProjectId == projectId, ct);
        return Ok(milestones.Select(MilestoneDto.FromEntity));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var milestone = await _uow.Milestones.GetByIdAsync(id, ct);
        return milestone == null ? NotFound() : Ok(MilestoneDto.FromEntity(milestone));
    }

    [HttpPost]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Create([FromBody] CreateMilestoneDto dto, CancellationToken ct)
    {
        var milestone = Milestone.Create(dto.ProjectId, dto.Name, dto.Description, dto.DueDate, dto.Order, dto.IsCritical);
        milestone.SetCreatedBy("system");
        await _uow.Milestones.AddAsync(milestone, ct);
        await _uow.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetById), new { id = milestone.Id }, MilestoneDto.FromEntity(milestone));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMilestoneDto dto, CancellationToken ct)
    {
        var milestone = await _uow.Milestones.GetByIdAsync(id, ct);
        if (milestone == null)
        {
            return NotFound();
        }

        milestone.Update(dto.Name, dto.Description, dto.DueDate, dto.Order, dto.IsCritical);
        milestone.UpdateProgress(dto.ProgressPercentage);
        milestone.SetModified("system");

        await _uow.Milestones.UpdateAsync(milestone, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(MilestoneDto.FromEntity(milestone));
    }

    [HttpPatch("{id:guid}/complete")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Complete(Guid id, CancellationToken ct)
    {
        var milestone = await _uow.Milestones.GetByIdAsync(id, ct);
        if (milestone == null)
        {
            return NotFound();
        }

        milestone.MarkComplete();
        await _uow.Milestones.UpdateAsync(milestone, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(MilestoneDto.FromEntity(milestone));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _uow.Milestones.DeleteAsync(id, ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }
}

public record CreateMilestoneDto(
    Guid ProjectId,
    string Name,
    string Description,
    DateTime DueDate,
    int Order,
    bool IsCritical = false);

public record UpdateMilestoneDto(
    string Name,
    string Description,
    DateTime DueDate,
    int Order,
    bool IsCritical,
    double ProgressPercentage);
