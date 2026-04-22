using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMWDS.Application.DTOs.Users;
using PMWDS.Application.Features.Users.Queries;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;

namespace PMWDS.API.Controllers;

public class UsersController : BaseApiController
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public UsersController(
        IUnitOfWork uow,
        ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    [HttpGet]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? departmentId,
        CancellationToken ct)
    {
        var users = departmentId.HasValue
            ? await _uow.Users.GetByDepartmentAsync(departmentId.Value, ct)
            : await _uow.Users.GetAllAsync(ct);

        return Ok(users.Select(u => UserDto.FromEntity(u, ResolveRoles(u))));
    }

    [HttpGet("{id}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetById(string id, CancellationToken ct)
    {
        if (!Guid.TryParse(id, out var parsedId))
        {
            return BadRequest("Invalid user id.");
        }

        var user = await _uow.Users.GetByIdWithSkillsAsync(parsedId, ct);
        return user == null ? NotFound() : Ok(UserDto.FromEntityWithSkills(user, ResolveRoles(user)));
    }

    [HttpGet("me")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetMe(CancellationToken ct)
    {
        var userId = _currentUser.UserId;
        if (!Guid.TryParse(userId, out var parsedId))
        {
            return Unauthorized();
        }

        var user = await _uow.Users.GetByIdWithSkillsAsync(parsedId, ct);
        return user == null ? NotFound() : Ok(UserDto.FromEntityWithSkills(user, ResolveRoles(user)));
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> Update(
        string id,
        [FromBody] UpdateUserDto dto,
        CancellationToken ct)
    {
        if (!Guid.TryParse(id, out var parsedId))
        {
            return BadRequest("Invalid user id.");
        }

        var user = await _uow.Users.GetByIdWithSkillsAsync(parsedId, ct);
        if (user == null)
        {
            return NotFound();
        }

        user.UpdateProfile(
            dto.FirstName,
            dto.LastName,
            dto.PhoneNumber ?? string.Empty,
            dto.JobTitle ?? string.Empty);

        if (dto.DepartmentId.HasValue)
        {
            user.AssignToDepartment(dto.DepartmentId.Value);
        }

        user.UpdateAvailability(user.AvailabilityStatus, dto.AvailabilityPercentage);
        user.SetModified(_currentUser.UserId ?? "system");

        await _uow.Users.UpdateAsync(user, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(UserDto.FromEntityWithSkills(user, ResolveRoles(user)));
    }

    [HttpPost("register")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> Register(
        [FromBody] RegisterUserDto dto,
        CancellationToken ct)
    {
        var existingEmail = await _uow.Users.FindAsync(
            u => u.Email == dto.Email.ToLower().Trim(),
            ct);
        if (existingEmail.Any())
        {
            return Conflict(new { message = $"A user with email '{dto.Email}' already exists." });
        }

        var user = ApplicationUser.Create(
            dto.Email,
            dto.FirstName,
            dto.LastName,
            Guid.NewGuid().ToString("N")[..8].ToUpperInvariant(),
            dto.JobTitle ?? dto.Role,
            dto.DepartmentId);
        user.SetCreatedBy(_currentUser.UserId ?? "system");

        await _uow.Users.AddAsync(user, ct);
        await _uow.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = user.Id }, UserDto.FromEntityWithSkills(user, ResolveRoles(user)));
    }

    [HttpPatch("{id}/availability")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> UpdateAvailability(
        string id,
        [FromBody] UpdateAvailabilityRequest req,
        CancellationToken ct)
    {
        if (!Guid.TryParse(id, out var parsedId))
        {
            return BadRequest("Invalid user id.");
        }

        var user = await _uow.Users.GetByIdWithSkillsAsync(parsedId, ct);
        if (user == null)
        {
            return NotFound();
        }

        user.UpdateAvailability(req.Status, req.AvailabilityPercentage);
        await _uow.Users.UpdateAsync(user, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(UserDto.FromEntityWithSkills(user, ResolveRoles(user)));
    }

    [HttpPost("{id}/skills")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> AddSkill(
        string id,
        [FromBody] AddUserSkillRequest req,
        CancellationToken ct)
    {
        if (!Guid.TryParse(id, out var parsedId))
        {
            return BadRequest("Invalid user id.");
        }

        var user = await _uow.Users.GetByIdWithSkillsAsync(parsedId, ct);
        if (user == null)
        {
            return NotFound();
        }

        var existing = user.Skills
            .FirstOrDefault(s => s.SkillId == req.SkillId);

        if (existing != null)
        {
            existing.UpdateProficiency(req.ProficiencyLevel);
            existing.UpdateExperience(req.ExperienceMonths);
        }
        else
        {
            var skill = UserSkill.Create(
                user.Id,
                req.SkillId,
                req.ProficiencyLevel,
                req.ExperienceMonths);
            await _uow.UserSkills.AddAsync(skill, ct);
        }

        await _uow.SaveChangesAsync(ct);

        var refreshed = await _uow.Users.GetByIdWithSkillsAsync(parsedId, ct);
        var skillDtos = refreshed!.Skills
            .Select(s => new UserSkillDto(
                s.SkillId,
                s.Skill?.Name ?? "",
                s.ProficiencyLevel,
                s.ExperienceMonths,
                s.LastUsed))
            .ToList();
        return Ok(new
        {
            User = UserDto.FromEntityWithSkills(refreshed, ResolveRoles(refreshed)),
            Skills = skillDtos
        });
    }

    [HttpPut("{id}/skills/{skillId:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> UpdateSkill(
        string id,
        Guid skillId,
        [FromBody] UpdateUserSkillRequest req,
        CancellationToken ct)
    {
        if (!Guid.TryParse(id, out var parsedId))
        {
            return BadRequest("Invalid user id.");
        }

        var user = await _uow.Users.GetByIdWithSkillsAsync(parsedId, ct);
        if (user == null)
        {
            return NotFound();
        }

        var existing = user.Skills
            .FirstOrDefault(s => s.SkillId == skillId);
        if (existing == null)
        {
            return NotFound(new { message = "User does not have this skill." });
        }

        existing.UpdateProficiency(req.ProficiencyLevel);
        existing.UpdateExperience(req.ExperienceMonths);
        await _uow.SaveChangesAsync(ct);

        var refreshed = await _uow.Users.GetByIdWithSkillsAsync(parsedId, ct);
        var skillDtos = refreshed!.Skills
            .Select(s => new UserSkillDto(
                s.SkillId,
                s.Skill?.Name ?? "",
                s.ProficiencyLevel,
                s.ExperienceMonths,
                s.LastUsed))
            .ToList();
        return Ok(new
        {
            User = UserDto.FromEntityWithSkills(refreshed, ResolveRoles(refreshed)),
            Skills = skillDtos
        });
    }

    [HttpDelete("{id}/skills/{skillId:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> RemoveSkill(
        string id,
        Guid skillId,
        CancellationToken ct)
    {
        if (!Guid.TryParse(id, out var parsedId))
        {
            return BadRequest("Invalid user id.");
        }

        var user = await _uow.Users.GetByIdWithSkillsAsync(parsedId, ct);
        if (user == null)
        {
            return NotFound();
        }

        var existing = user.Skills
            .FirstOrDefault(s => s.SkillId == skillId);
        if (existing == null)
        {
            return NotFound(new { message = "User does not have this skill." });
        }

        await _uow.UserSkills.DeleteAsync(existing.Id, ct);
        await _uow.SaveChangesAsync(ct);

        var refreshed = await _uow.Users.GetByIdWithSkillsAsync(parsedId, ct);
        var skillDtos = refreshed!.Skills
            .Select(s => new UserSkillDto(
                s.SkillId,
                s.Skill?.Name ?? "",
                s.ProficiencyLevel,
                s.ExperienceMonths,
                s.LastUsed))
            .ToList();
        return Ok(new
        {
            User = UserDto.FromEntityWithSkills(refreshed, ResolveRoles(refreshed)),
            Skills = skillDtos
        });
    }

    [HttpGet("available")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetAvailable(CancellationToken ct)
    {
        var users = await _uow.Users.GetAvailableUsersAsync(ct);
        return Ok(users.Select(u => UserDto.FromEntityWithSkills(u, ResolveRoles(u))));
    }

    [HttpGet("workload")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetWorkload(
        [FromQuery] Guid? departmentId,
        CancellationToken ct)
        => Ok(await Mediator.Send(new GetWorkloadDistributionQuery(departmentId), ct));

    [HttpPatch("{id}/deactivate")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> Deactivate(string id, CancellationToken ct)
    {
        if (!Guid.TryParse(id, out var parsedId))
        {
            return BadRequest("Invalid user id.");
        }

        var user = await _uow.Users.GetByIdAsync(parsedId, ct);
        if (user == null)
        {
            return NotFound();
        }

        user.Deactivate();
        await _uow.Users.UpdateAsync(user, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok();
    }

    private static IList<string> ResolveRoles(ApplicationUser user)
    {
        var roles = new List<string>();
        if (user.Email.Equals("admin@pmwds.com", StringComparison.OrdinalIgnoreCase) || user.JobTitle == "SuperAdmin")
            roles.Add("SuperAdmin");
        if (user.JobTitle.Contains("ProjectManager", StringComparison.OrdinalIgnoreCase) || user.JobTitle.Contains("Manager", StringComparison.OrdinalIgnoreCase))
            roles.Add("ProjectManager");
        if (user.JobTitle.Contains("Lead", StringComparison.OrdinalIgnoreCase))
            roles.Add("TeamLead");
        if (roles.Count == 0)
            roles.Add("TeamMember");
        return roles;
    }
}

public record UpdateAvailabilityRequest(
    PMWDS.Domain.Enums.AvailabilityStatus Status,
    double AvailabilityPercentage);

public record AddUserSkillRequest(
    Guid SkillId,
    int ProficiencyLevel,
    int ExperienceMonths);

public record UpdateUserSkillRequest(
    int ProficiencyLevel,
    int ExperienceMonths);
