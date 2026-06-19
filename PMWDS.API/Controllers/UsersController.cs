using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PMWDS.API.Services;
using PMWDS.Application.DTOs.Common;
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
    private readonly ILocalFileStorageService _localFiles;
    private readonly RoleScopeService _scope;

    public UsersController(
        IUnitOfWork uow,
        ICurrentUserService currentUser,
        ApplicationDbContext db,
        ILocalFileStorageService localFiles,
        RoleScopeService scope)
    {
        _uow = uow;
        _currentUser = currentUser;
        _db = db;
        _localFiles = localFiles;
        _scope = scope;
    }

    [HttpGet]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? departmentId,
        [FromQuery] PaginationQuery pagination,
        CancellationToken ct)
    {
        if (departmentId.HasValue && !await _scope.CanAccessDepartmentAsync(departmentId.Value, ct))
        {
            return Forbid();
        }

        var query = UserGraph(includeSkills: true);
        if (departmentId.HasValue)
        {
            query = query.Where(u =>
                u.DepartmentId == departmentId.Value ||
                u.DepartmentAssignments.Any(assignment => assignment.DepartmentId == departmentId.Value));
        }

        query = await _scope.ScopeUsersAsync(query, ct);
        var totalCount = await query.CountAsync(ct);
        var users = await query
            .OrderBy(u => u.FirstName)
            .ThenBy(u => u.LastName)
            .Skip(pagination.Skip)
            .Take(pagination.NormalizedPageSize)
            .ToListAsync(ct);

        return Ok(PaginatedResponse<UserDto>.Create(
            users.Select(u => UserDto.FromEntityWithSkills(u, UserRoleResolver.Resolve(u))).ToList(),
            pagination,
            totalCount));
    }

    [HttpGet("{id}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetById(string id, CancellationToken ct)
    {
        if (!Guid.TryParse(id, out var parsedId))
        {
            return BadRequest("Invalid user id.");
        }

        if (!await _scope.CanAccessUserAsync(parsedId, ct))
        {
            return Forbid();
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

        if (!await _scope.CanManageUserAsync(parsedId, ct))
        {
            return Forbid();
        }

        if (!await AreDepartmentsInScopeAsync(dto.DepartmentIds, dto.DepartmentId, ct))
        {
            return Forbid();
        }

        if (!await IsOrganizationInScopeAsync(dto.OrganizationId, ct))
        {
            return Forbid();
        }

        user.UpdateProfile(
            dto.FirstName,
            dto.LastName,
            dto.PhoneNumber ?? string.Empty,
            dto.JobTitle ?? string.Empty,
            dto.ProfilePictureUrl);

        await AssignDepartmentsAsync(user, dto.DepartmentIds, dto.DepartmentId, dto.OrganizationId, ct);

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

        user.UpdateAvailability(dto.AvailabilityStatus ?? user.AvailabilityStatus, dto.AvailabilityPercentage);
        if (dto.RoleNames is { Count: > 0 } && (User.IsInRole("SuperAdmin") || User.IsInRole("Director")))
        {
            var requestedRoles = dto.RoleNames
                .Where(role => !string.IsNullOrWhiteSpace(role))
                .Select(role => role.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (!User.IsInRole("SuperAdmin") && requestedRoles.Any(role => role.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase)))
            {
                return Forbid();
            }

            requestedRoles = requestedRoles
                .Where(role => !role.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase))
                .ToList();

            var isCurrentlySuperAdmin = user.Roles.Any(r => r.Name.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase));
            if (isCurrentlySuperAdmin && !requestedRoles.Contains("SuperAdmin", StringComparer.OrdinalIgnoreCase))
            {
                requestedRoles.Add("SuperAdmin");
            }

            if (requestedRoles.Count == 0)
            {
                requestedRoles.Add("Viewer");
            }

            var roles = await _uow.Roles.FindAsync(r => requestedRoles.Contains(r.Name), ct);
            user.Roles.Clear();
            foreach (var role in roles)
            {
                user.Roles.Add(role);
            }
        }
        user.SetModified(_currentUser.UserId ?? "system");

        await _uow.Users.UpdateAsync(user, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(UserDto.FromEntityWithSkills(user, UserRoleResolver.Resolve(user)));
    }

    [HttpPost("register")]
    [Authorize(Policy = "Director")]
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

        if (!await AreDepartmentsInScopeAsync(dto.DepartmentIds, dto.DepartmentId, ct))
        {
            return Forbid();
        }

        if (!await IsOrganizationInScopeAsync(dto.OrganizationId, ct))
        {
            return Forbid();
        }

        var roleName = string.IsNullOrWhiteSpace(dto.Role) ? "Viewer" : dto.Role.Trim();
        if (!_scope.IsSuperAdmin && roleName.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        var role = (await _uow.Roles.FindAsync(r => r.Name == roleName, ct)).FirstOrDefault();
        if (role == null)
        {
            return BadRequest(new { message = $"Role '{roleName}' was not found." });
        }

        var user = ApplicationUser.Create(
            dto.Email,
            dto.FirstName,
            dto.LastName,
            Guid.NewGuid().ToString("N")[..8].ToUpperInvariant(),
            dto.JobTitle ?? roleName,
            dto.DepartmentId);
        user.SetCreatedBy(_currentUser.UserId ?? "system");
        user.Roles.Add(role);

        user.SetPassword(new PasswordHasher<ApplicationUser>().HashPassword(user, dto.Password.Trim()));

        await _uow.Users.AddAsync(user, ct);
        await _uow.SaveChangesAsync(ct);
        var requestedOrganizationId = dto.OrganizationId ?? await GetOrganizationForDepartmentAsync(dto.DepartmentId, ct);
        if (requestedOrganizationId.HasValue)
        {
            user.AssignToOrganization(requestedOrganizationId.Value);
        }
        await AssignDepartmentsAsync(user, dto.DepartmentIds, dto.DepartmentId, dto.OrganizationId, ct);

        var profile = UserProfile.Create(
            user.Id,
            null,
            dto.JobTitle ?? roleName,
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
    [Authorize(Policy = "Director")]
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

        if (!await _scope.CanManageUserAsync(parsedId, ct))
        {
            return Forbid();
        }

        if (!await AreDepartmentsInScopeAsync(req.DepartmentIds, req.PrimaryDepartmentId, ct))
        {
            return Forbid();
        }

        await AssignDepartmentsAsync(user, req.DepartmentIds, req.PrimaryDepartmentId, null, ct);
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

        if (_currentUser.UserId != id && !await _scope.CanManageUserAsync(parsedId, ct))
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
        var url = await _localFiles.UploadAvatarAsync(stream, user.EmployeeCode, extension, ct);
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

        if (_currentUser.UserId != parsedId.ToString() && !await _scope.CanManageUserAsync(parsedId, ct))
        {
            return Forbid();
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

        if (_currentUser.UserId != parsedId.ToString() && !await _scope.CanManageUserAsync(parsedId, ct))
        {
            return Forbid();
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

        if (_currentUser.UserId != parsedId.ToString() && !await _scope.CanManageUserAsync(parsedId, ct))
        {
            return Forbid();
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

        if (_currentUser.UserId != parsedId.ToString() && !await _scope.CanManageUserAsync(parsedId, ct))
        {
            return Forbid();
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
    public async Task<IActionResult> GetAvailable([FromQuery] PaginationQuery pagination, CancellationToken ct)
    {
        var query = await _scope.ScopeUsersAsync(
            UserGraph(includeSkills: true)
                .Where(u => u.IsActive && u.AvailabilityStatus == PMWDS.Domain.Enums.AvailabilityStatus.Available),
            ct);
        var totalCount = await query.CountAsync(ct);
        var users = await query
            .OrderBy(u => u.FirstName)
            .ThenBy(u => u.LastName)
            .Skip(pagination.Skip)
            .Take(pagination.NormalizedPageSize)
            .ToListAsync(ct);
        return Ok(PaginatedResponse<UserDto>.Create(
            users.Select(u => UserDto.FromEntityWithSkills(u, UserRoleResolver.Resolve(u))).ToList(),
            pagination,
            totalCount));
    }

    [HttpGet("workload")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetWorkload(
        [FromQuery] Guid? departmentId,
        CancellationToken ct)
    {
        if (departmentId.HasValue && !await _scope.CanAccessDepartmentAsync(departmentId.Value, ct))
        {
            return Forbid();
        }

        var scopedUsers = await (await _scope.ScopeUsersAsync(UserGraph(includeSkills: true), ct))
            .Select(user => user.Id)
            .ToListAsync(ct);
        return Ok(await Mediator.Send(new GetWorkloadDistributionQuery(departmentId, scopedUsers), ct));
    }

    [HttpPatch("{id}/deactivate")]
    [Authorize(Policy = "Director")]
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

        if (!await _scope.CanManageUserAsync(parsedId, ct))
        {
            return Forbid();
        }

        user.Deactivate();
        await _uow.Users.UpdateAsync(user, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok();
    }

    [HttpPatch("{id}/reactivate")]
    [Authorize(Policy = "Director")]
    public async Task<IActionResult> Reactivate(string id, CancellationToken ct)
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

        if (!await _scope.CanManageUserAsync(parsedId, ct))
        {
            return Forbid();
        }

        user.Activate();
        await _uow.Users.UpdateAsync(user, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(UserDto.FromEntityWithSkills(user, UserRoleResolver.Resolve(user)));
    }

    private async Task AssignDepartmentsAsync(
        ApplicationUser user,
        IReadOnlyCollection<Guid>? departmentIds,
        Guid? primaryDepartmentId,
        Guid? organizationId,
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
            if (organizationId.HasValue)
            {
                user.AssignToOrganization(organizationId.Value);
            }
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
            var primaryOrganizationId = await GetOrganizationForDepartmentAsync(primary, ct);
            if (primaryOrganizationId.HasValue)
            {
                user.AssignToOrganization(primaryOrganizationId.Value);
            }
        }
        else if (organizationId.HasValue)
        {
            user.AssignToOrganization(organizationId.Value);
        }
    }

    private IQueryable<ApplicationUser> UserGraph(bool includeSkills)
    {
        var query = _db.Users
            .Include(u => u.Department)
            .Include(u => u.Organization)
            .Include(u => u.DepartmentAssignments)
            .ThenInclude(d => d.Department)
            .ThenInclude(d => d!.Organization)
            .Include(u => u.Profile)
            .Include(u => u.Roles)
            .AsQueryable();

        if (includeSkills)
        {
            query = query
                .Include(u => u.Skills)
                .ThenInclude(s => s.Skill);
        }

        return query;
    }

    private async Task<bool> AreDepartmentsInScopeAsync(
        IReadOnlyCollection<Guid>? departmentIds,
        Guid? primaryDepartmentId,
        CancellationToken ct)
    {
        if (_scope.IsSuperAdmin)
        {
            return true;
        }

        var requested = (departmentIds ?? Array.Empty<Guid>())
            .Append(primaryDepartmentId ?? Guid.Empty)
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();

        if (requested.Count == 0)
        {
            return true;
        }

        var organizationIds = await _scope.GetOrganizationIdsAsync(ct);
        var validCount = await _db.Departments
            .CountAsync(department =>
                requested.Contains(department.Id) &&
                department.OrganizationId.HasValue &&
                organizationIds.Contains(department.OrganizationId.Value),
                ct);

        return validCount == requested.Count;
    }

    private async Task<bool> IsOrganizationInScopeAsync(Guid? organizationId, CancellationToken ct)
    {
        if (!organizationId.HasValue || _scope.IsSuperAdmin)
        {
            return true;
        }

        return await _scope.CanAccessOrganizationAsync(organizationId.Value, ct);
    }

    private async Task<Guid?> GetOrganizationForDepartmentAsync(Guid? departmentId, CancellationToken ct)
    {
        if (!departmentId.HasValue)
        {
            return null;
        }

        return await _db.Departments
            .Where(department => department.Id == departmentId.Value)
            .Select(department => department.OrganizationId)
            .FirstOrDefaultAsync(ct);
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
