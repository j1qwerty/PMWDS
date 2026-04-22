using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;

namespace PMWDS.API.Controllers;

[ApiController]
[Route("api/v1/skills")]
[Authorize(Policy = "SuperAdmin")]
public class SkillsController : BaseApiController
{
    private readonly IUnitOfWork _uow;

    public SkillsController(IUnitOfWork uow)
    {
        _uow = uow;
    }

    [HttpGet]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var skills = await _uow.Skills.GetAllAsync(ct);
        return Ok(skills.Select(SkillDto.FromEntity));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var skill = await _uow.Skills.GetByIdAsync(id, ct);
        return skill == null ? NotFound() : Ok(SkillDto.FromEntity(skill));
    }

    [HttpPost]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> Create(
        [FromBody] CreateSkillDto dto,
        CancellationToken ct)
    {
        var existing = await _uow.Skills.FindAsync(
            s => s.Name.ToLower() == dto.Name.ToLower().Trim(),
            ct);
        if (existing.Any())
        {
            return Conflict(new { message = $"Skill '{dto.Name}' already exists." });
        }

        var skill = Skill.Create(dto.Name, dto.Category, dto.Description);
        await _uow.Skills.AddAsync(skill, ct);
        await _uow.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = skill.Id }, SkillDto.FromEntity(skill));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateSkillDto dto,
        CancellationToken ct)
    {
        var skill = await _uow.Skills.GetByIdAsync(id, ct);
        if (skill == null)
        {
            return NotFound();
        }

        var existingName = await _uow.Skills.FindAsync(
            s => s.Name.ToLower() == dto.Name.ToLower().Trim() && s.Id != id,
            ct);
        if (existingName.Any())
        {
            return Conflict(new { message = $"Skill '{dto.Name}' already exists." });
        }

        skill.Update(dto.Name, dto.Category, dto.Description);
        await _uow.Skills.UpdateAsync(skill, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(SkillDto.FromEntity(skill));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _uow.Skills.DeleteAsync(id, ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }
}

public record SkillDto(
    Guid Id,
    string Name,
    string Category,
    string Description,
    int UserCount)
{
    public static SkillDto FromEntity(Skill s)
    => new(s.Id, s.Name, s.Category, s.Description, s.UserSkills.Count);
}

public record CreateSkillDto(
    string Name,
    string Category,
    string Description);

public record UpdateSkillDto(
    string Name,
    string Category,
    string Description);