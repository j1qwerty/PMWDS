using System.Security.Claims;
using PMWDS.Application.Interfaces.Services;
namespace PMWDS.API.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _http;
    public CurrentUserService(
    IHttpContextAccessor http)
    => _http = http;
    public string? UserId =>
    _http.HttpContext?.User
    .FindFirstValue(ClaimTypes.NameIdentifier);
    public string? UserName =>
    _http.HttpContext?.User
    .FindFirstValue(ClaimTypes.Name);
    public string? Email =>
    _http.HttpContext?.User
    .FindFirstValue(ClaimTypes.Email);
    public Guid? DepartmentId
    {
        get
        {
            var val = _http.HttpContext?.User
            .FindFirstValue("DepartmentId");
            return Guid.TryParse(val, out var id)
            ? id : null;
        }
    }
    public bool IsAuthenticated =>
    _http.HttpContext?.User
    .Identity?.IsAuthenticated == true;
    public bool IsInRole(string role) =>
    _http.HttpContext?.User
    .IsInRole(role) == true;
    public IEnumerable<string> Roles =>
    _http.HttpContext?.User
    .FindAll(ClaimTypes.Role)
    .Select(c => c.Value)
    ?? Enumerable.Empty<string>();
}