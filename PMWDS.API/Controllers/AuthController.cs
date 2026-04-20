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
[AllowAnonymous]
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
    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest req,
        CancellationToken ct)
    {
        var user = await _uow.Users.GetByEmailAsync(req.Email, ct);
        if (user == null || !user.IsActive)
        {
            return Unauthorized(new { Message = "Invalid credentials." });
        }
        var token = GenerateToken(user, Array.Empty<string>());
        return Ok(new
        {
            Token = token,
            Expiry = DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes),
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Roles = Array.Empty<string>()
        });
    }
    [HttpPost("change-password")]
    [Authorize]
    public IActionResult ChangePassword(
        [FromBody] ChangePasswordRequest req)
        => Ok(new { Message = "Password change is not available in the current setup." });
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
        var token = GenerateToken(user, Array.Empty<string>());
        return Ok(new
        {
            Token = token,
            Expiry = DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes)
        });
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
