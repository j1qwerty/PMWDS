using Microsoft.EntityFrameworkCore;
using PMWDS.Application.Security;
using PMWDS.Domain.Entities;
using PMWDS.Persistence.Context;

namespace PMWDS.Persistence.Migrations.Seeders;

internal static class RolesAndPermissionsSeeder
{
    internal static async Task SeedAsync(ApplicationDbContext context, CancellationToken ct)
    {
        await SeedPermissionsAsync(context, ct);
        await SeedRolesAsync(context, ct);
    }

    private static async Task SeedPermissionsAsync(ApplicationDbContext context, CancellationToken ct)
    {
        // Permissions are declared once, in PermissionCatalog, and seeded from
        // there. Adding a code anywhere else without adding it to the catalog would
        // leave the roles UI unable to describe it.
        foreach (var definition in PermissionCatalog.Definitions)
        {
            var isGlobal = IsGlobal(definition.Code);
            var permission = await context.Permissions
                .FirstOrDefaultAsync(p => p.Code == definition.Code, ct);

            if (permission is null)
            {
                permission = Permission.Create(
                    definition.Code,
                    definition.Name,
                    definition.Description,
                    definition.Module,
                    isGlobal);
                permission.SetCreatedBy(SeedConstants.SeedUser);
                await context.Permissions.AddAsync(permission, ct);
                continue;
            }

            // Keep the stored copy in step with the catalog so a wording change in
            // code reaches the roles UI without a manual migration.
            permission.Update(
                definition.Name,
                definition.Description,
                definition.Module,
                isGlobal);
            permission.SetModified(SeedConstants.SeedUser);
        }

        await CleanupLegacyPermissionsAsync(context, ct);
        await RemoveOrphanedPermissionsAsync(context, ct);
        await context.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Permissions that are no longer part of the catalog are removed so they cannot
    /// be assigned to a role and then silently do nothing. Their links are dropped
    /// first, otherwise the foreign keys refuse the delete.
    /// </summary>
    private static async Task RemoveOrphanedPermissionsAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var known = PermissionCatalog.Definitions.Select(definition => definition.Code).ToList();
        var orphans = await context.Permissions
            .Where(permission => !known.Contains(permission.Code))
            .ToListAsync(ct);

        if (orphans.Count == 0)
        {
            return;
        }

        var orphanIds = orphans.Select(permission => permission.Id).ToList();
        var roles = await context.Roles
            .Include(role => role.Permissions)
            .Where(role => role.Permissions.Any(permission => orphanIds.Contains(permission.Id)))
            .ToListAsync(ct);

        foreach (var role in roles)
        {
            foreach (var permissionId in orphanIds)
            {
                role.RemovePermission(permissionId);
            }
        }

        context.Permissions.RemoveRange(orphans);
    }

    /// <summary>
    /// Grants a system-wide nature to the elevated permissions so the roles UI can
    /// badge them. Deliberately a small, hand-maintained set: this drives a visual
    /// hint, not authorization.
    /// </summary>
    private static bool IsGlobal(string code) => code switch
    {
        PermissionCodes.SystemAdmin => true,
        PermissionCodes.SystemDatabaseView => true,
        PermissionCodes.AuthManage => true,
        PermissionCodes.OrganizationManage => true,
        PermissionCodes.RoleManage => true,
        PermissionCodes.PermissionManage => true,
        PermissionCodes.NotificationManage => true,
        PermissionCodes.NotificationTemplateManage => true,
        PermissionCodes.NotificationRuleManage => true,
        PermissionCodes.ActivityLogManage => true,
        PermissionCodes.ActivityLogView => true,
        PermissionCodes.AiManage => true,
        PermissionCodes.DocumentManage => true,
        PermissionCodes.UtilizationCertificateManage => true,
        _ => false
    };

    private static async Task CleanupLegacyPermissionsAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var replacements = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["AUTH.MANAGE"] = PermissionCodes.AuthManage,
            ["USERS.MANAGE"] = PermissionCodes.UserManage,
            ["ROLES.MANAGE"] = PermissionCodes.RoleManage,
            ["ORGS.MANAGE"] = PermissionCodes.OrganizationManage,
            ["PROJECTS.MANAGE"] = PermissionCodes.ProjectManage,
            ["TASKS.MANAGE"] = PermissionCodes.TaskManage,
            ["SYSTEM.ADMIN"] = PermissionCodes.SystemAdmin,
            ["SYSTEM.DATABASE.VIEW"] = PermissionCodes.SystemDatabaseView,
            ["USERS.PROFILE_PICTURE.MANAGE"] = PermissionCodes.UserProfilePictureManage,
            ["USERS.DEPARTMENTS.MANAGE"] = PermissionCodes.UserDepartmentManage,
            ["ACTIVITY_LOGS.VIEW"] = PermissionCodes.ActivityLogView
        };

        var legacyCodes = replacements.Keys.ToList();
        var targetCodes = replacements.Values.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var permissions = await context.Permissions
            .Where(permission => legacyCodes.Contains(permission.Code) || targetCodes.Contains(permission.Code))
            .ToListAsync(ct);
        var byCode = permissions.ToDictionary(permission => permission.Code, StringComparer.OrdinalIgnoreCase);
        var roles = await context.Roles
            .Include(role => role.Permissions)
            .Where(role => role.Permissions.Any(permission => legacyCodes.Contains(permission.Code)))
            .ToListAsync(ct);

        foreach (var role in roles)
        {
            foreach (var (legacyCode, targetCode) in replacements)
            {
                if (!byCode.TryGetValue(legacyCode, out var legacyPermission) ||
                    !role.Permissions.Any(permission => permission.Id == legacyPermission.Id))
                    continue;

                if (byCode.TryGetValue(targetCode, out var targetPermission))
                    role.AddPermission(targetPermission);

                role.RemovePermission(legacyPermission.Id);
            }
        }

        context.Permissions.RemoveRange(permissions.Where(permission => legacyCodes.Contains(permission.Code)));
    }

    private static async Task SeedRolesAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var permissions = await context.Permissions.ToDictionaryAsync(p => p.Code, ct);
        var allPermissionCodes = permissions.Keys.ToArray();

        // Roles hold the "all departments" flavour wherever their access is meant to
        // span the organization, and the own-department flavour where it is not.
        // An ALL grant already implies its own-scope counterpart, so granting the
        // ALL code alone is sufficient and keeps each list short.
        string All(string code) => PermissionCodes.ToAllScope(code);

        var directorPermissionCodes = new[]
        {
            // A Director administers one organization, so their working reach is
            // every department inside it.
            All(PermissionCodes.DepartmentManage),
            All(PermissionCodes.ProjectManage),
            All(PermissionCodes.MilestoneManage),
            All(PermissionCodes.TaskManage),
            All(PermissionCodes.SubtaskManage),
            All(PermissionCodes.UserManage),
            All(PermissionCodes.DocumentManage),
            All(PermissionCodes.UtilizationCertificateManage),
            All(PermissionCodes.ReportManage),
            PermissionCodes.NotificationManage,
            PermissionCodes.ActivityLogManage,
            PermissionCodes.RoleManage,
            PermissionCodes.PermissionManage,
            PermissionCodes.AiView,
            PermissionCodes.AiManage
        };
        var projectManagerPermissionCodes = new[]
        {
            // A Project Manager works on their own projects and the teams on them,
            // so document uploads are open at all three levels but stay department
            // scoped.
            PermissionCodes.DepartmentView,
            PermissionCodes.ProjectManage,
            PermissionCodes.ProjectPrimaryDepartmentManage,
            PermissionCodes.MilestoneManage,
            PermissionCodes.TaskManage,
            PermissionCodes.SubtaskManage,
            PermissionCodes.DocumentManage,
            PermissionCodes.UserView,
            PermissionCodes.NotificationView,
            PermissionCodes.ActivityLogCreate,
            PermissionCodes.UtilizationCertificateView,
            PermissionCodes.UtilizationCertificateCreate,
            PermissionCodes.UtilizationCertificateEdit
        };
        var departmentHeadPermissionCodes = new[]
        {
            // A Department Head owns their department: manage within it, not across
            // the organization.
            PermissionCodes.DepartmentManage,
            PermissionCodes.ProjectManage,
            PermissionCodes.ProjectPrimaryDepartmentManage,
            PermissionCodes.MilestoneManage,
            PermissionCodes.TaskManage,
            PermissionCodes.SubtaskManage,
            PermissionCodes.DocumentManage,
            PermissionCodes.UserManage,
            PermissionCodes.NotificationView,
            PermissionCodes.ActivityLogView,
            PermissionCodes.ActivityLogCreate,
            PermissionCodes.UtilizationCertificateView,
            PermissionCodes.UtilizationCertificateCreate,
            PermissionCodes.UtilizationCertificateEdit,
            // A department head owns their department's projects (they are the
            // primary department), so they carry the same finance sign-off
            // authority as a Director for those projects.
            PermissionCodes.UtilizationCertificateReview,
            PermissionCodes.UtilizationCertificateDelete
        };
        var teamMemberPermissionCodes = new[]
        {
            PermissionCodes.ProjectView,
            PermissionCodes.MilestoneView,
            PermissionCodes.TaskView, PermissionCodes.TaskEdit, PermissionCodes.TaskCommentCreate, PermissionCodes.TaskAttachmentCreate, PermissionCodes.TaskTimeTrack,
            PermissionCodes.SubtaskView, PermissionCodes.SubtaskCreate, PermissionCodes.SubtaskEdit,
            // A team member contributes to their own work, so documents are
            // uploadable at task level only.
            PermissionCodes.DocumentView,
            PermissionCodes.DocumentUploadTask,
            PermissionCodes.NotificationView,
            PermissionCodes.ActivityLogCreate,
            PermissionCodes.UtilizationCertificateView,
            PermissionCodes.UtilizationCertificateCreate,
            PermissionCodes.UtilizationCertificateEdit
        };
        var viewerPermissionCodes = new[]
        {
            PermissionCodes.OrganizationView,
            PermissionCodes.DepartmentView,
            PermissionCodes.ProjectView,
            PermissionCodes.MilestoneView,
            PermissionCodes.TaskView,
            PermissionCodes.SubtaskView,
            PermissionCodes.DocumentView,
            PermissionCodes.NotificationView,
            PermissionCodes.ActivityLogView,
            PermissionCodes.UtilizationCertificateView
        };
        var specs = new[]
        {
            new SeedConstants.RoleSpec(RoleKeys.SuperAdmin, "SuperAdmin", "Full administrative access.", 100, allPermissionCodes),
            new SeedConstants.RoleSpec(RoleKeys.Director, "Director", "Organization administrator with full access inside one organization.", 90, directorPermissionCodes),
            new SeedConstants.RoleSpec(RoleKeys.ProjectManager, "ProjectManager", "Manages assigned projects and project teams.", 80, projectManagerPermissionCodes),
            new SeedConstants.RoleSpec(RoleKeys.DepartmentHead, "DepartmentHead", "Manages department capacity and planning.", 70, departmentHeadPermissionCodes),
            new SeedConstants.RoleSpec(RoleKeys.TeamMember, "TeamMember", "Contributes to project execution.", 40, teamMemberPermissionCodes),
            new SeedConstants.RoleSpec(RoleKeys.Viewer, "Viewer", "Read-only access.", 10, viewerPermissionCodes)
        };

        foreach (var spec in specs)
        {
            var role = await context.Roles
                .Include(r => r.Permissions)
                .FirstOrDefaultAsync(r => r.Key == spec.Key || r.Name == spec.Name, ct);
            if (role == null)
            {
                role = Role.Create(spec.Key, spec.Name, spec.Description, spec.Level);
                role.SetCreatedBy(SeedConstants.SeedUser);
                await context.Roles.AddAsync(role, ct);
            }
            else
            {
                role.EnsureKey(spec.Key);
            }

            role.UpdatePaginationPageSize(spec.Key == RoleKeys.SuperAdmin ? 50 : 10);

            role.Permissions.Clear();
            foreach (var code in spec.PermissionCodes)
            {
                if (permissions.TryGetValue(code, out var permission) && role.Permissions.All(p => p.Id != permission.Id))
                    role.AddPermission(permission);
            }
        }

        await context.SaveChangesAsync(ct);
    }
}
