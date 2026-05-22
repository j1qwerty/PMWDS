using PMWDS.Domain.Entities;

namespace PMWDS.API.Services;

public static class UserRoleResolver
{
    public static IList<string> Resolve(ApplicationUser user)
    {
        var roles = user.Roles
            .Select(r => r.Name)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (roles.Count > 0)
        {
            return roles;
        }

        var fallback = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        if (user.Email.Equals("admin@pmwds.com", StringComparison.OrdinalIgnoreCase) ||
            user.JobTitle.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase))
        {
            fallback.Add("SuperAdmin");
        }

        if (user.JobTitle.Contains("Director", StringComparison.OrdinalIgnoreCase))
        {
            fallback.Add("Director");
        }

        if (user.JobTitle.Contains("ProjectManager", StringComparison.OrdinalIgnoreCase) ||
            user.JobTitle.Contains("Manager", StringComparison.OrdinalIgnoreCase))
        {
            fallback.Add("ProjectManager");
        }

        if (user.JobTitle.Contains("DepartmentHead", StringComparison.OrdinalIgnoreCase) ||
            user.JobTitle.Contains("Head", StringComparison.OrdinalIgnoreCase))
        {
            fallback.Add("DepartmentHead");
        }

        if (fallback.Count == 0)
        {
            fallback.Add("TeamMember");
        }

        return fallback.ToList();
    }
}
