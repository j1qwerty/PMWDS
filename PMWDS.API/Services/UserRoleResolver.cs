using PMWDS.Domain.Entities;

namespace PMWDS.API.Services;

public static class UserRoleResolver
{
    public static IList<string> Resolve(ApplicationUser user)
    {
        var roles = user.Roles
            .OrderByDescending(r => r.PermissionLevel)
            .Select(r => r.Name)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (roles.Count > 0)
        {
            return roles;
        }

        return new List<string> { "Viewer" };
    }
}
