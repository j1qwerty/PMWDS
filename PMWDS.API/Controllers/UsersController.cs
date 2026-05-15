using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PMWDS.API.Services;
using PMWDS.Application.DTOs.Users;
using PMWDS.Application.Features.Users.Queries;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;
using PMWDS.Infrastructure.Services;
using PMWDS.Persistence.Context;

namespace PMWDS.API.Controllers;

public class UsersController : BaseApiController
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;
    private readonly ApplicationDbContext _db;
    private readonly IFileStorageService _files;

    public UsersController(
        IUnitOfWork uow,
        ICurrentUserService currentUser,
        ApplicationDbContext db,
        IFileStorageService files)
    {
        _uow = uow;
        _currentUser = currentUser;
        _db = db;
        _files = files;
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

        return Ok(users.Select(u => UserDto.FromEntity(u, UserRoleResolver.Resolve(u))));
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
        return user == null ? NotFound() : Ok(UserDto.FromEntityWithSkills(user, UserRoleResolver.Resolve(user)));
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
        return user == null ? NotFound() : Ok(UserDto.FromEntityWithSkills(user, UserRoleResolver.Resolve(user)));
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

        await AssignDepartmentsAsync(user, dto.DepartmentIds, dto.DepartmentId, ct);

        var profile = user.Profile ?? UserProfile.Create(user.Id, null, dto.JobTitle, null, null, null, null);
        profile.UpdateProfileDetails(
            user.Profile?.Bio,
            dto.JobTitle ?? user.JobTitle,
            user.Profile?.DateOfBirth,
            user.Profile?.Address,
            user.Profile?.EmergencyContact,
            user.Profile?.LinkedInUrl);

        if (user.Profile == null)
        {
            profile.SetCreatedBy(_currentUser.UserId ?? "system");
            await _uow.UserProfiles.AddAsync(profile, ct);
            user.SetProfile(profile);
        }

        user.UpdateAvailability(user.AvailabilityStatus, dto.AvailabilityPercentage);
        user.SetModified(_currentUser.UserId ?? "system");

        await _uow.Users.UpdateAsync(user, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(UserDto.FromEntityWithSkills(user, UserRoleResolver.Resolve(user)));
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

        var role = (await _uow.Roles.FindAsync(r => r.Name == dto.Role, ct)).FirstOrDefault();
        if (role == null)
        {
            return BadRequest(new { message = $"Role '{dto.Role}' was not found." });
        }

        var user = ApplicationUser.Create(
            dto.Email,
            dto.FirstName,
            dto.LastName,
            Guid.NewGuid().ToString("N")[..8].ToUpperInvariant(),
            dto.JobTitle ?? dto.Role,
            dto.DepartmentId);
        user.SetCreatedBy(_currentUser.UserId ?? "system");
        user.Roles.Add(role);

        var passwordHash = Convert.ToBase64String(
            System.Security.Cryptography.SHA256.HashData(
                System.Text.Encoding.UTF8.GetBytes(dto.Password + user.Id)));
        user.SetPassword(passwordHash);

        await _uow.Users.AddAsync(user, ct);
        await _uow.SaveChangesAsync(ct);
        await AssignDepartmentsAsync(user, dto.DepartmentIds, dto.DepartmentId, ct);

        var profile = UserProfile.Create(
            user.Id,
            null,
            dto.JobTitle ?? dto.Role,
            null,
            null,
            null,
            null);
        profile.SetCreatedBy(_currentUser.UserId ?? "system");
        await _uow.UserProfiles.AddAsync(profile, ct);

        await _uow.SaveChangesAsync(ct);

        var created = await _uow.Users.GetByIdWithSkillsAsync(user.Id, ct);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, UserDto.FromEntityWithSkills(created!, UserRoleResolver.Resolve(created!)));
    }

    [HttpPut("{id}/departments")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> AssignDepartments(
        string id,
        [FromBody] AssignUserDepartmentsRequest req,
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

        await AssignDepartmentsAsync(user, req.DepartmentIds, req.PrimaryDepartmentId, ct);
        await _uow.SaveChangesAsync(ct);

        var refreshed = await _uow.Users.GetByIdWithSkillsAsync(parsedId, ct);
        return Ok(UserDto.FromEntityWithSkills(refreshed!, UserRoleResolver.Resolve(refreshed!)));
    }

    [HttpPost("{id}/profile-picture")]
    [Authorize(Policy = "Authenticated")]
    [RequestSizeLimit(2_000_000)]
    public async Task<IActionResult> UploadProfilePicture(
        string id,
        [FromForm] IFormFile file,
        CancellationToken ct)
    {
        if (!Guid.TryParse(id, out var parsedId))
        {
            return BadRequest("Invalid user id.");
        }

        if (_currentUser.UserId != id && !User.IsInRole("SuperAdmin"))
        {
            return Forbid();
        }

        if (file.Length == 0 || file.Length > 1_500_000)
        {
            return BadRequest(new { message = "Profile picture must be between 1 byte and 1.5 MB." });
        }

        var allowed = new[] { "image/jpeg", "image/png", "image/webp" };
        if (!allowed.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Only JPEG, PNG, and WebP images are supported." });
        }

        var user = await _uow.Users.GetByIdWithSkillsAsync(parsedId, ct);
        if (user == null)
        {
            return NotFound();
        }

        await using var stream = file.OpenReadStream();
        var extension = Path.GetExtension(file.FileName);
        var url = await _files.UploadAsync(stream, $"profile-{parsedId:N}{extension}", file.ContentType, ct);
        user.UpdateProfile(user.FirstName, user.LastName, user.PhoneNumber, user.JobTitle, url);
        user.SetModified(_currentUser.UserId ?? "system");
        await _uow.Users.UpdateAsync(user, ct);
        await _uow.SaveChangesAsync(ct);

        return Ok(new { profilePictureUrl = url, user = UserDto.FromEntityWithSkills(user, UserRoleResolver.Resolve(user)) });
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
        return Ok(UserDto.FromEntityWithSkills(user, UserRoleResolver.Resolve(user)));
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

        var existing = user.Skills.FirstOrDefault(s => s.SkillId == req.SkillId);

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
            User = UserDto.FromEntityWithSkills(refreshed, UserRoleResolver.Resolve(refreshed)),
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

        var existing = user.Skills.FirstOrDefault(s => s.SkillId == skillId);
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
            User = UserDto.FromEntityWithSkills(refreshed, UserRoleResolver.Resolve(refreshed)),
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

        var existing = user.Skills.FirstOrDefault(s => s.SkillId == skillId);
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
            User = UserDto.FromEntityWithSkills(refreshed, UserRoleResolver.Resolve(refreshed)),
            Skills = skillDtos
        });
    }

    [HttpGet("available")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetAvailable(CancellationToken ct)
    {
        var users = await _uow.Users.GetAvailableUsersAsync(ct);
        return Ok(users.Select(u => UserDto.FromEntityWithSkills(u, UserRoleResolver.Resolve(u))));
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

    private async Task AssignDepartmentsAsync(
        ApplicationUser user,
        IReadOnlyCollection<Guid>? departmentIds,
        Guid? primaryDepartmentId,
        CancellationToken ct)
    {
        var requested = (departmentIds ?? Array.Empty<Guid>())
            .Append(primaryDepartmentId ?? Guid.Empty)
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();

        var existing = await _db.UserDepartments
            .Where(d => d.UserId == user.Id)
            .ToListAsync(ct);

        if (requested.Count == 0)
        {
            _db.UserDepartments.RemoveRange(existing);
            user.ClearPrimaryDepartment();
            return;
        }

        var validDepartments = await _db.Departments
            .Where(d => requested.Contains(d.Id))
            .Select(d => d.Id)
            .ToListAsync(ct);

        foreach (var assignment in existing.Where(e => !validDepartments.Contains(e.DepartmentId)))
        {
            _db.UserDepartments.Remove(assignment);
        }

        var primary = primaryDepartmentId.HasValue && validDepartments.Contains(primaryDepartmentId.Value)
            ? primaryDepartmentId.Value
            : validDepartments.FirstOrDefault();

        foreach (var assignment in existing)
        {
            if (assignment.DepartmentId == primary)
            {
                assignment.MarkPrimary();
            }
            else
            {
                assignment.ClearPrimary();
            }
        }

        foreach (var departmentId in validDepartments.Where(id => existing.All(e => e.DepartmentId != id)))
        {
            var assignment = UserDepartment.Create(user.Id, departmentId, departmentId == primary);
            assignment.SetCreatedBy(_currentUser.UserId ?? "system");
            await _db.UserDepartments.AddAsync(assignment, ct);
        }

        if (primary != Guid.Empty)
        {
            user.AssignToDepartment(primary);
        }
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

public record AssignUserDepartmentsRequest(
    List<Guid> DepartmentIds,
    Guid? PrimaryDepartmentId);
