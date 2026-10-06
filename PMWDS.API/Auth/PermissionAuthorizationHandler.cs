using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using PMWDS.Application.Security;
using PMWDS.Persistence.Context;

namespace PMWDS.API.Auth;

public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionAuthorizationRequirement>
{
    /// <summary>Key the expanded permission set is cached under for the request.</summary>
    public const string CacheKey = "__pmwds_permissions";

    private readonly ApplicationDbContext _db;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public PermissionAuthorizationHandler(ApplicationDbContext db, IHttpContextAccessor httpContextAccessor)
    {
        _db = db;
        _httpContextAccessor = httpContextAccessor;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionAuthorizationRequirement requirement)
    {
        if (requirement.PermissionCodes.Count == 0)
        {
            context.Succeed(requirement);
            return;
        }

        var permissions = await GetPermissionsForCurrentUserAsync(context.User);
        if (permissions.Overlaps(requirement.PermissionCodes))
        {
            context.Succeed(requirement);
        }
    }

    private async Task<HashSet<string>> GetPermissionsForCurrentUserAsync(ClaimsPrincipal principal)
    {
        var httpContext = _httpContextAccessor.HttpContext;

        if (httpContext?.Items[CacheKey] is HashSet<string> cached)
        {
            return cached;
        }

        var userIdClaim = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            return new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        }

        var permissions = await _db.Users
            .Where(user => user.Id == userId && user.IsActive)
            .SelectMany(user => user.Roles)
            .SelectMany(role => role.Permissions)
            .Select(permission => permission.Code)
            .Distinct()
            .ToListAsync();

        return Expand(permissions, httpContext);
    }

    /// <summary>
    /// Expands raw role permissions into the effective set, applying both
    /// expansions the catalog defines: an umbrella "manage" grant covers the rest
    /// of its feature, and an "all departments" grant covers its own-department
    /// equivalent (plus everything that equivalent already covers).
    /// </summary>
    public static HashSet<string> Expand(
        IEnumerable<string> permissions,
        HttpContext? httpContext = null)
    {
        var result = permissions.ToHashSet(StringComparer.OrdinalIgnoreCase);

        // Iterate to a fixed point: an ALL-scope umbrella implies an own-scope
        // umbrella, which in turn covers the own-scope actions. One pass over the
        // catalog map would miss the second hop.
        var frontier = new List<string>(result);
        var visited = new HashSet<string>(result, StringComparer.OrdinalIgnoreCase);

        while (frontier.Count > 0)
        {
            var current = frontier[^1];
            frontier.RemoveAt(frontier.Count - 1);

            if (!PermissionCatalog.EffectiveCoverage.TryGetValue(current, out var covered))
            {
                continue;
            }

            foreach (var coveredPermission in covered)
            {
                if (!visited.Add(coveredPermission))
                {
                    continue;
                }

                result.Add(coveredPermission);
                frontier.Add(coveredPermission);
            }
        }

        if (httpContext != null)
        {
            httpContext.Items[CacheKey] = result;
        }

        return result;
    }
}
