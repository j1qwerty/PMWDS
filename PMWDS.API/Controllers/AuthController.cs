using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using PMWDS.API.Middleware;
using PMWDS.API.Services;
using PMWDS.Application.DTOs.Users;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Application.Security;
using PMWDS.Domain.Entities;
using PMWDS.Infrastructure.Settings;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Net;

namespace PMWDS.API.Controllers;

public class AuthController : BaseApiController
{
    private readonly IUnitOfWork _uow;
    private readonly JwtSettings _jwt;
    private readonly EmailSettings _email;
    private readonly IEmailService _emailService;

    public AuthController(
        IUnitOfWork uow,
        IOptions<JwtSettings> jwt,
        IOptions<EmailSettings> email,
        IEmailService emailService)
    {
        _uow = uow;
        _jwt = jwt.Value;
        _email = email.Value;
        _emailService = emailService;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest req,
        CancellationToken ct)
    {
        var user = await _uow.Users.GetByEmailAsync(req.Email, ct);
        var passwordVerification = user == null
            ? PasswordVerificationResult.Failed
            : VerifyPassword(user, req.Password);
        if (user == null || passwordVerification == PasswordVerificationResult.Failed)
        {
            return Unauthorized(new { Message = "Invalid credentials." });
        }

        if (!user.IsActive)
        {
            return Unauthorized(new { Message = "Your account has been deactivated. Please contact your administrator." });
        }

        var roles = UserRoleResolver.Resolve(user);
        var permissions = ResolvePermissions(user);
        if (passwordVerification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.SetPassword(HashPassword(user, req.Password));
            await _uow.SaveChangesAsync(ct);
        }

        var token = GenerateToken(user, roles, permissions);

        var log = ActivityLog.Create(
            user.Id,
            "Login",
            $"{user.FullName} logged in",
            new Dictionary<string, object>());
        log.SetCreatedBy(user.Id.ToString());
        await _uow.ActivityLogs.AddAsync(log, ct);
        await _uow.SaveChangesAsync(ct);

        return Ok(new
        {
            Token = token,
            Expiry = DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes),
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            ProfilePictureUrl = user.ProfilePictureUrl,
            Roles = roles,
            Permissions = permissions
        });
    }

    [AllowAnonymous]
    [HttpPost("signup")]
    public async Task<IActionResult> Signup([FromBody] SignupRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password) || req.Password.Length < 6)
        {
            return BadRequest(new { message = "Email and a password of at least 6 characters are required." });
        }

        var email = req.Email.ToLower().Trim();
        if ((await _uow.Users.FindAsync(u => u.Email == email, ct)).Any())
        {
            return Conflict(new { message = $"A user with email '{email}' already exists." });
        }

        var viewer = (await _uow.Roles.FindAsync(r => r.Name == "Viewer", ct)).FirstOrDefault();
        if (viewer == null)
        {
            return BadRequest(new { message = "Viewer role was not found." });
        }

        var user = ApplicationUser.Create(
            email,
            req.FirstName,
            req.LastName,
            Guid.NewGuid().ToString("N")[..8].ToUpperInvariant(),
            req.JobTitle ?? "Viewer");
        user.SetCreatedBy("signup");
        user.Roles.Add(viewer);
        user.SetPassword(HashPassword(user, req.Password));

        await _uow.Users.AddAsync(user, ct);
        await _uow.SaveChangesAsync(ct);

        var log = ActivityLog.Create(
            user.Id,
            "Signup",
            $"{user.FullName} signed up",
            new Dictionary<string, object>
            {
                ["newUserId"] = user.Id,
                ["newUserEmail"] = user.Email
            });
        log.SetCreatedBy(user.Id.ToString());
        await _uow.ActivityLogs.AddAsync(log, ct);
        await _uow.SaveChangesAsync(ct);

        return Ok(UserDto.FromEntity(user, new List<string> { "Viewer" }));
    }

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest req, CancellationToken ct)
    {
        var email = req.Email.ToLower().Trim();
        var user = await _uow.Users.GetByEmailAsync(email, ct);
        if (user is { IsActive: true })
        {
            var tokenBytes = RandomNumberGenerator.GetBytes(32);
            var token = WebEncoders.Base64UrlEncode(tokenBytes);
            var tokenHash = HashToken(token);
            var expires = DateTime.UtcNow.AddMinutes(Math.Max(_email.PasswordResetMinutes, 5));
            user.SetPasswordResetToken(tokenHash, expires);
            await _uow.SaveChangesAsync(ct);

            var resetUrl = $"{_email.ClientBaseUrl.TrimEnd('/')}/reset-password?email={WebUtility.UrlEncode(email)}&token={WebUtility.UrlEncode(token)}";
            await _emailService.SendEmailAsync(email, "Reset your PMWDS password", BuildPasswordResetEmail(user.FullName, resetUrl, expires), ct);
        }

        return Ok(new { message = "If the email exists, a password reset link has been sent." });
    }

    [AllowAnonymous]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.NewPassword) || req.NewPassword.Length < 6)
        {
            return BadRequest(new { message = "New password must be at least 6 characters." });
        }

        var user = await _uow.Users.GetByEmailAsync(req.Email.ToLower().Trim(), ct);
        if (user == null || !user.IsPasswordResetTokenValid(HashToken(req.Token)))
        {
            return BadRequest(new { message = "Password reset link is invalid or expired." });
        }

        user.SetPassword(HashPassword(user, req.NewPassword));
        await _uow.SaveChangesAsync(ct);
        return Ok(new { message = "Password reset successfully." });
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

        var passwordVerification = VerifyPassword(user, req.OldPassword);
        if (passwordVerification == PasswordVerificationResult.Failed)
        {
            return BadRequest(new { message = "Current password is incorrect." });
        }

        if (string.IsNullOrWhiteSpace(req.NewPassword) || req.NewPassword.Length < 6)
        {
            return BadRequest(new { message = "New password must be at least 6 characters." });
        }

        var newHash = HashPassword(user, req.NewPassword);
        user.SetPassword(newHash);

        await _uow.SaveChangesAsync(ct);

        HttpContext.Items["ActivityLog"] = new ActivityLogContext(
            ActivityType: "Password Changed",
            Description: $"{user.FullName} changed their password",
            Metadata: new Dictionary<string, object>
            {
                ["userId"] = user.Id
            }
        );

        return Ok(new { message = "Password changed successfully." });
    }

    [HttpPost("refresh")]
    [Authorize]
    public async Task<IActionResult> RefreshToken(CancellationToken ct)
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

        var token = GenerateToken(user, UserRoleResolver.Resolve(user), ResolvePermissions(user));
        return Ok(new
        {
            Token = token,
            Expiry = DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes)
        });
    }

    private static PasswordVerificationResult VerifyPassword(ApplicationUser user, string password)
    {
        var normalized = password?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(normalized))
        {
            return PasswordVerificationResult.Failed;
        }

        if (!string.IsNullOrEmpty(user.PasswordHash))
        {
            var hasher = new PasswordHasher<ApplicationUser>();
            var result = hasher.VerifyHashedPassword(user, user.PasswordHash, normalized);
            if (result != PasswordVerificationResult.Failed)
            {
                return result;
            }

            return LegacyHashPassword(normalized, user.Id) == user.PasswordHash
                ? PasswordVerificationResult.SuccessRehashNeeded
                : PasswordVerificationResult.Failed;
        }

        return PasswordVerificationResult.Failed;
    }

    private string GenerateToken(
        ApplicationUser user,
        IEnumerable<string> roles,
        IEnumerable<string> permissions)
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
        claims.AddRange(permissions.Select(p => new Claim(PermissionCodes.PermissionClaimType, p)));

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

    private static List<string> ResolvePermissions(ApplicationUser user)
        => user.Roles
            .SelectMany(role => role.Permissions)
            .Select(permission => permission.Code)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(code => code)
            .ToList();

    private static string HashPassword(ApplicationUser user, string password)
        => new PasswordHasher<ApplicationUser>().HashPassword(user, password.Trim());

    private static string LegacyHashPassword(string password, Guid userId)
        => Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(password.Trim() + userId)));

    private static string HashToken(string token)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token.Trim())));

    private static string BuildPasswordResetEmail(string fullName, string resetUrl, DateTime expiresAtUtc)
        => $$"""
        <div style="font-family:Inter,Segoe UI,Arial,sans-serif;line-height:1.5;color:#1f2937">
          <h2 style="margin:0 0 12px">Reset your PMWDS password</h2>
          <p>Hello {{WebUtility.HtmlEncode(fullName)}},</p>
          <p>Use the link below to set a new password. This link expires at {{expiresAtUtc:yyyy-MM-dd HH:mm}} UTC.</p>
          <p><a href="{{WebUtility.HtmlEncode(resetUrl)}}" style="display:inline-block;background:#4f46e5;color:white;padding:10px 14px;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a></p>
          <p style="font-size:12px;color:#64748b">If you did not request this, you can ignore this email.</p>
        </div>
        """;
}

public record LoginRequest(string Email, string Password);
public record ChangePasswordRequest(string OldPassword, string NewPassword);
public record SignupRequest(string FirstName, string LastName, string Email, string Password, string? JobTitle);
public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Email, string Token, string NewPassword);
