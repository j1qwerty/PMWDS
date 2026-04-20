using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using PMWDS.Domain.Entities;
using PMWDS.Infrastructure.Settings;
namespace PMWDS.API.Controllers;

[AllowAnonymous]
public class AuthController : BaseApiController
{
    private readonly UserManager<ApplicationUser> _users;
    private readonly SignInManager<ApplicationUser> _signIn;
    private readonly JwtSettings _jwt;
    public AuthController(
    UserManager<ApplicationUser> users,
    SignInManager<ApplicationUser> signIn,
    IOptions<JwtSettings> jwt)
    {
        _users = users;
        _signIn = signIn;
        _jwt = jwt.Value;
    }
    /// <summary>Login and receive JWT token</summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login(
    [FromBody] LoginRequest req)
    {
        var user = await _users
        .FindByEmailAsync(req.Email);
        if (user == null || !user.IsActive)
            return Unauthorized(
            new { Message = "Invalid credentials." });
        var result = await _signIn
        .CheckPasswordSignInAsync(
        user, req.Password, lockoutOnFailure: true);
        if (result.IsLockedOut)
            return Unauthorized(new
            {
                Message = "Account locked. " +
            "Try again in 15 minutes."
            });
        if (!result.Succeeded)
            return Unauthorized(
            new { Message = "Invalid credentials." });
        user.UpdateLastLogin();
        await _users.UpdateAsync(user);
        var roles = await _users.GetRolesAsync(user);
        var token = GenerateToken(user, roles);
        return Ok(new
        {
            Token = token,
            Expiry = DateTime.UtcNow
        .AddMinutes(_jwt.ExpiryMinutes),
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Roles = roles
        });
    }
    /// <summary>Change password</summary>
    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(
    [FromBody] ChangePasswordRequest req)
    {
        var user = await _users
        .GetUserAsync(User);
        if (user == null) return Unauthorized();
        var result = await _users
        .ChangePasswordAsync(
        user, req.OldPassword, req.NewPassword);
        if (!result.Succeeded)
            return BadRequest(new
            {
                Errors = result.Errors
            .Select(e => e.Description)
            });
        return Ok(new
        {
            Message = "Password changed successfully."
        });
    }
    /// <summary>Refresh token</summary>
    [HttpPost("refresh")]
    [Authorize]
    public async Task<IActionResult> RefreshToken()
    {
        var userId = User.FindFirstValue(


       ClaimTypes.NameIdentifier);
        var user = await _users.FindByIdAsync(userId!);
        if (user == null) return Unauthorized();
        var roles = await _users.GetRolesAsync(user);
        var token = GenerateToken(user, roles);
        return Ok(new
        {
            Token = token,
            Expiry = DateTime.UtcNow
        .AddMinutes(_jwt.ExpiryMinutes)
        });
    }
    private string GenerateToken(
    ApplicationUser user,
    IList<string> roles)
    {
        var claims = new List<Claim>
 {
 new(ClaimTypes.NameIdentifier, user.Id),
 new(ClaimTypes.Email, user.Email!),
 new(ClaimTypes.Name, user.FullName),
 new("DepartmentId",
 user.DepartmentId?.ToString() ?? ""),
 new(JwtRegisteredClaimNames.Jti,
 Guid.NewGuid().ToString())
 };
        claims.AddRange(
        roles.Select(r =>
        new Claim(ClaimTypes.Role, r)));
        var key = new SymmetricSecurityKey(
        Encoding.UTF8.GetBytes(_jwt.Secret));
        var creds = new SigningCredentials(
        key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
        issuer: _jwt.Issuer,
        audience: _jwt.Audience,
        claims: claims,
        expires: DateTime.UtcNow
        .AddMinutes(_jwt.ExpiryMinutes),
        signingCredentials: creds);
        return new JwtSecurityTokenHandler()
        .WriteToken(token);
    }
}
public record LoginRequest(string Email, string Password);
public record ChangePasswordRequest(
 string OldPassword, string NewPassword);