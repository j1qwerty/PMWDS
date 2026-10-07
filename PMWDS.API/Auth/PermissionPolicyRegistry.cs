using Microsoft.AspNetCore.Authorization;
using PMWDS.Application.Security;

namespace PMWDS.API.Auth;

public static class PermissionPolicyRegistry
{
    public static void AddPolicies(AuthorizationOptions options)
    {
        options.AddPolicy(AuthorizationPolicies.Authenticated, policy => policy.RequireAuthenticatedUser());
        options.AddPolicy(AuthorizationPolicies.SuperAdmin, policy => RequireAny(policy, PermissionCodes.SystemAdmin));
        options.AddPolicy(AuthorizationPolicies.Director, policy => RequireAny(
            policy,
            PermissionCodes.SystemAdmin,
            PermissionCodes.OrganizationManage,
            PermissionCodes.OrganizationView,
            PermissionCodes.OrganizationEdit,
            PermissionCodes.ActivityLogManage,
            PermissionCodes.ActivityLogView));
        options.AddPolicy(AuthorizationPolicies.Manager, policy => RequireAny(
            policy,
            PermissionCodes.SystemAdmin,
            PermissionCodes.ProjectManage,
            PermissionCodes.ProjectPrimaryDepartmentManage,
            PermissionCodes.ProjectCreate,
            PermissionCodes.ProjectEdit,
            PermissionCodes.TaskManage,
            PermissionCodes.TaskCreate,
            PermissionCodes.TaskEdit,
            PermissionCodes.MilestoneManage,
            PermissionCodes.SubtaskManage));
        options.AddPolicy(AuthorizationPolicies.TaskEditor, policy => RequireAny(
            policy,
            PermissionCodes.SystemAdmin,
            PermissionCodes.TaskManage,
            PermissionCodes.TaskCreate,
            PermissionCodes.TaskEdit,
            PermissionCodes.TaskAssign,
            PermissionCodes.SubtaskManage,
            PermissionCodes.SubtaskCreate,
            PermissionCodes.SubtaskEdit));

        AddCrud(options, "Organizations", PermissionCodes.OrganizationManage, PermissionCodes.OrganizationView, PermissionCodes.OrganizationCreate, PermissionCodes.OrganizationEdit, PermissionCodes.OrganizationDelete);
        AddCrud(options, "Departments", PermissionCodes.DepartmentManage, PermissionCodes.DepartmentView, PermissionCodes.DepartmentCreate, PermissionCodes.DepartmentEdit, PermissionCodes.DepartmentDelete);
        AddCrud(options, "Projects", PermissionCodes.ProjectManage, PermissionCodes.ProjectView, PermissionCodes.ProjectCreate, PermissionCodes.ProjectEdit, PermissionCodes.ProjectDelete);
        AddCrud(options, "Milestones", PermissionCodes.MilestoneManage, PermissionCodes.MilestoneView, PermissionCodes.MilestoneCreate, PermissionCodes.MilestoneEdit, PermissionCodes.MilestoneDelete);
        AddCrud(options, "Tasks", PermissionCodes.TaskManage, PermissionCodes.TaskView, PermissionCodes.TaskCreate, PermissionCodes.TaskEdit, PermissionCodes.TaskDelete);
        AddCrud(options, "Subtasks", PermissionCodes.SubtaskManage, PermissionCodes.SubtaskView, PermissionCodes.SubtaskCreate, PermissionCodes.SubtaskEdit, PermissionCodes.SubtaskDelete);
        AddCrud(options, "Users", PermissionCodes.UserManage, PermissionCodes.UserView, PermissionCodes.UserCreate, PermissionCodes.UserEdit, PermissionCodes.UserDelete);
        AddCrud(options, "Roles", PermissionCodes.RoleManage, PermissionCodes.RoleView, PermissionCodes.RoleCreate, PermissionCodes.RoleEdit, PermissionCodes.RoleDelete);
        AddCrud(options, "Permissions", PermissionCodes.PermissionManage, PermissionCodes.PermissionView, PermissionCodes.PermissionCreate, PermissionCodes.PermissionEdit, PermissionCodes.PermissionDelete);
        AddCrud(options, "Notifications", PermissionCodes.NotificationManage, PermissionCodes.NotificationView, PermissionCodes.NotificationBroadcast, PermissionCodes.NotificationTemplateManage, PermissionCodes.NotificationRuleManage);
        AddCrud(options, "UtilizationCertificates", PermissionCodes.UtilizationCertificateManage, PermissionCodes.UtilizationCertificateView, PermissionCodes.UtilizationCertificateCreate, PermissionCodes.UtilizationCertificateEdit, PermissionCodes.UtilizationCertificateDelete);
        AddCrud(options, AuthorizationPolicies.DocumentsPrefix, PermissionCodes.DocumentManage, PermissionCodes.DocumentView, PermissionCodes.DocumentCreate, PermissionCodes.DocumentEdit, PermissionCodes.DocumentDelete);

        // Which levels of the hierarchy a role may upload into. Held as individual
        // permissions rather than one flag so the upload dialog can offer exactly
        // the levels the holder is entitled to, with no extra round trip.
        AddUploadLevelPolicy(
            options,
            AuthorizationPolicies.DocumentUpload,
            PermissionCodes.DocumentUploadProject,
            PermissionCodes.DocumentUploadMilestone,
            PermissionCodes.DocumentUploadTask);

        AddUploadLevelPolicy(
            options,
            AuthorizationPolicies.UtilizationCertificateDocumentUpload,
            PermissionCodes.UtilizationCertificateDocumentUploadProject,
            PermissionCodes.UtilizationCertificateDocumentUploadMilestone,
            PermissionCodes.UtilizationCertificateDocumentUploadTask);

        // Review is deliberately NOT part of AddCrud: a contributor must never be able
        // to approve their own utilization certificate.
        options.AddPolicy(AuthorizationPolicies.UtilizationCertificateReview, policy => RequireAny(
            policy,
            PermissionCodes.SystemAdmin,
            PermissionCodes.UtilizationCertificateManage,
            PermissionCodes.UtilizationCertificateReview));

        options.AddPolicy(AuthorizationPolicies.ActivityLogsView, policy => RequireAny(policy, PermissionCodes.SystemAdmin, PermissionCodes.ActivityLogManage, PermissionCodes.ActivityLogView));
        options.AddPolicy(AuthorizationPolicies.ActivityLogsCreate, policy => RequireAny(policy, PermissionCodes.SystemAdmin, PermissionCodes.ActivityLogManage, PermissionCodes.ActivityLogCreate));
        options.AddPolicy(AuthorizationPolicies.ActivityLogsManage, policy => RequireAny(policy, PermissionCodes.SystemAdmin, PermissionCodes.ActivityLogManage));
    }

    private static void AddCrud(
        AuthorizationOptions options,
        string prefix,
        string manage,
        string view,
        string create,
        string edit,
        string delete)
    {
        options.AddPolicy($"{prefix}.View", policy => RequireAny(policy, PermissionCodes.SystemAdmin, manage, view));
        options.AddPolicy($"{prefix}.Create", policy => RequireAny(policy, PermissionCodes.SystemAdmin, manage, create));
        options.AddPolicy($"{prefix}.Edit", policy => RequireAny(policy, PermissionCodes.SystemAdmin, manage, edit));
        options.AddPolicy($"{prefix}.Delete", policy => RequireAny(policy, PermissionCodes.SystemAdmin, manage, delete));
        options.AddPolicy($"{prefix}.Manage", policy => RequireAny(policy, PermissionCodes.SystemAdmin, manage));
    }

    /// <summary>
    /// Registers one policy per upload level, plus the umbrella that admits any
    /// level. <paramref name="featureManage"/> is the umbrella for the feature, so a
    /// full manager is never blocked from uploading at a level that has no separate
    /// grant.
    /// </summary>
    private static void AddUploadLevelPolicy(
        AuthorizationOptions options,
        string prefix,
        string featureManage,
        params string[] levels)
    {
        options.AddPolicy($"{prefix}.Any", policy =>
            RequireAny(policy, [PermissionCodes.SystemAdmin, featureManage, .. levels]));

        foreach (var level in levels)
        {
            options.AddPolicy($"{prefix}.{LevelName(level)}", policy =>
                RequireAny(policy, PermissionCodes.SystemAdmin, featureManage, level));
        }
    }

    /// <summary>
    /// Derives the trailing segment of a per-level policy name from its permission
    /// code — DOCUMENT_UPLOAD_MILESTONE becomes "Milestone".
    /// </summary>
    private static string LevelName(string levelCode)
    {
        var segments = levelCode.Split('_', StringSplitOptions.RemoveEmptyEntries);
        return segments.Length == 0 ? levelCode : segments[^1];
    }

    private static void RequireAny(AuthorizationPolicyBuilder policy, params string[] permissionCodes)
    {
        policy.RequireAuthenticatedUser();
        policy.AddRequirements(new PermissionAuthorizationRequirement(permissionCodes));
    }
}
