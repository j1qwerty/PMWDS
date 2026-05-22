using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PMWDS.API.Services;
using PMWDS.Application.DTOs.Projects;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;
using PMWDS.Persistence.Context;

namespace PMWDS.API.Controllers;

public class MilestonesController : BaseApiController
{
    private readonly IUnitOfWork _uow;
    private readonly ApplicationDbContext _db;
    private readonly RoleScopeService _scope;

    public MilestonesController(IUnitOfWork uow, ApplicationDbContext db, RoleScopeService scope)
    {
        _uow = uow;
        _db = db;
        _scope = scope;
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
            .Where(m => m.ProjectId == projectId)
            .ToListAsync(ct);
        return Ok(milestones.Select(MilestoneDto.FromEntity));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var milestone = await _db.Milestones
            .Include(m => m.Tasks)
            .FirstOrDefaultAsync(m => m.Id == id, ct);
        if (milestone == null)
        {
            return NotFound();
        }

        if (!await _scope.CanAccessProjectAsync(milestone.ProjectId, ct))
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

        if (!await _scope.CanManageProjectAsync(milestone.ProjectId, ct))
        {
            return Forbid();
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

        if (!await _scope.CanManageProjectAsync(milestone.ProjectId, ct))
        {
            return Forbid();
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
        var milestone = await _uow.Milestones.GetByIdAsync(id, ct);
        if (milestone == null)
        {
            return NotFound();
        }

        if (!await _scope.CanManageProjectAsync(milestone.ProjectId, ct))
        {
            return Forbid();
        }

        await _uow.Tasks.DeleteTasksByMilestoneAsync(id, ct);
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
