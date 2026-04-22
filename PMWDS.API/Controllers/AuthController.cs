using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;
using PMWDS.Infrastructure.Settings;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace PMWDS.API.Controllers;

public class AuthController : BaseApiController
{
    private readonly IUnitOfWork _uow;
    private readonly JwtSettings _jwt;

    public AuthController(
        IUnitOfWork uow,
        IOptions<JwtSettings> jwt)
    {
        _uow = uow;
        _jwt = jwt.Value;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest req,
        CancellationToken ct)
    {
        var user = await _uow.Users.GetByEmailAsync(req.Email, ct);
        if (user == null || !user.IsActive || !IsPasswordValid(user, req.Password))
        {
            return Unauthorized(new { Message = "Invalid credentials." });
        }

        var roles = ResolveRoles(user);
        var token = GenerateToken(user, roles);

        return Ok(new
        {
            Token = token,
            Expiry = DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes),
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Roles = roles
        });
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest req,
        CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var parsedUserId))
        {
            return Unauthorized();
        }

        var user = await _uow.Users.GetByIdAsync(parsedUserId, ct);
        if (user == null)
        {
            return NotFound();
        }

        // Validate old password
        if (!IsPasswordValid(user, req.OldPassword))
        {
            return BadRequest(new { message = "Current password is incorrect." });
        }

        // Validate new password requirements
        if (string.IsNullOrWhiteSpace(req.NewPassword) || req.NewPassword.Length < 6)
        {
            return BadRequest(new { message = "New password must be at least 6 characters." });
        }

        // Simple hash (in production, use proper password hashing library)
        var newHash = Convert.ToBase64String(
            System.Security.Cryptography.SHA256.HashData(
                System.Text.Encoding.UTF8.GetBytes(req.NewPassword + parsedUserId.ToString())));
        user.SetPassword(newHash);

        await _uow.SaveChangesAsync(ct);

        return Ok(new { message = "Password changed successfully." });
    }

    [HttpPost("refresh")]
    [Authorize]
    public async Task<IActionResult> RefreshToken(
        CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var parsedUserId))
        {
            return Unauthorized();
        }

        var user = await _uow.Users.GetByIdAsync(parsedUserId, ct);
        if (user == null)
        {
            return Unauthorized();
        }

        var token = GenerateToken(user, ResolveRoles(user));
        return Ok(new
        {
            Token = token,
            Expiry = DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes)
        });
    }

    private bool IsPasswordValid(ApplicationUser user, string password)
    {
        var normalized = password?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(normalized))
        {
            return false;
        }

        // Check if user has a custom password set
        if (!string.IsNullOrEmpty(user.PasswordHash))
        {
            var hash = Convert.ToBase64String(
                System.Security.Cryptography.SHA256.HashData(
                    System.Text.Encoding.UTF8.GetBytes(normalized + user.Id.ToString())));
            return hash == user.PasswordHash;
        }

        // Fallback to legacy hardcoded passwords
        return normalized == "Pmwds@123"
            || normalized == "Admin@12345!"
            || normalized == user.EmployeeCode
            || normalized == $"{user.EmployeeCode}@123";
    }

    private static IList<string> ResolveRoles(ApplicationUser user)
    {
        var roles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        if (user.Email.Equals("admin@pmwds.com", StringComparison.OrdinalIgnoreCase) ||
            user.JobTitle.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase))
        {
            roles.Add("SuperAdmin");
        }

        if (user.JobTitle.Contains("ProjectManager", StringComparison.OrdinalIgnoreCase) ||
            user.JobTitle.Contains("Manager", StringComparison.OrdinalIgnoreCase))
        {
            roles.Add("ProjectManager");
        }

        if (user.JobTitle.Contains("DepartmentHead", StringComparison.OrdinalIgnoreCase) ||
            user.JobTitle.Contains("Head", StringComparison.OrdinalIgnoreCase))
        {
            roles.Add("DepartmentHead");
        }

        if (user.JobTitle.Contains("Lead", StringComparison.OrdinalIgnoreCase))
        {
            roles.Add("TeamLead");
        }

        if (roles.Count == 0)
        {
            roles.Add("TeamMember");
        }

        return roles.ToList();
    }

    private string GenerateToken(
        ApplicationUser user,
        IEnumerable<string> roles)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.FullName),
            new("DepartmentId", user.DepartmentId?.ToString() ?? string.Empty),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_jwt.Secret ?? string.Empty));
        var creds = new SigningCredentials(
            key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public record LoginRequest(string Email, string Password);
public record ChangePasswordRequest(string OldPassword, string NewPassword);
