using Microsoft.AspNetCore.Authorization;
using PMWDS.Application.Security;

namespace PMWDS.API.Auth;

public static class PermissionPolicyRegistry
{
    public static void AddPolicies(AuthorizationOptions options)
    {
        options.AddPolicy("Authenticated", policy => policy.RequireAuthenticatedUser());
        options.AddPolicy("SuperAdmin", policy => RequireAny(policy, PermissionCodes.SystemAdmin));
        options.AddPolicy("Director", policy => RequireAny(
            policy,
            PermissionCodes.SystemAdmin,
            PermissionCodes.OrganizationView,
            PermissionCodes.OrganizationEdit,
            PermissionCodes.ActivityLogView));
        options.AddPolicy("Manager", policy => RequireAny(
            policy,
            PermissionCodes.SystemAdmin,
            PermissionCodes.ProjectCreate,
            PermissionCodes.ProjectEdit,
            PermissionCodes.TaskCreate,
            PermissionCodes.TaskEdit,
            PermissionCodes.ReportCreate,
            PermissionCodes.KnowledgeCreate));
        options.AddPolicy("TaskEditor", policy => RequireAny(
            policy,
            PermissionCodes.SystemAdmin,
            PermissionCodes.TaskCreate,
            PermissionCodes.TaskEdit,
            PermissionCodes.TaskAssign,
            PermissionCodes.SubtaskCreate,
            PermissionCodes.SubtaskEdit));

        AddCrud(options, "Organizations", PermissionCodes.OrganizationView, PermissionCodes.OrganizationCreate, PermissionCodes.OrganizationEdit, PermissionCodes.OrganizationDelete);
        AddCrud(options, "Departments", PermissionCodes.DepartmentView, PermissionCodes.DepartmentCreate, PermissionCodes.DepartmentEdit, PermissionCodes.DepartmentDelete);
        AddCrud(options, "Projects", PermissionCodes.ProjectView, PermissionCodes.ProjectCreate, PermissionCodes.ProjectEdit, PermissionCodes.ProjectDelete);
        AddCrud(options, "Milestones", PermissionCodes.MilestoneView, PermissionCodes.MilestoneCreate, PermissionCodes.MilestoneEdit, PermissionCodes.MilestoneDelete);
        AddCrud(options, "Tasks", PermissionCodes.TaskView, PermissionCodes.TaskCreate, PermissionCodes.TaskEdit, PermissionCodes.TaskDelete);
        AddCrud(options, "Subtasks", PermissionCodes.SubtaskView, PermissionCodes.SubtaskCreate, PermissionCodes.SubtaskEdit, PermissionCodes.SubtaskDelete);
        AddCrud(options, "Users", PermissionCodes.UserView, PermissionCodes.UserCreate, PermissionCodes.UserEdit, PermissionCodes.UserDelete);
        AddCrud(options, "Roles", PermissionCodes.RoleView, PermissionCodes.RoleCreate, PermissionCodes.RoleEdit, PermissionCodes.RoleDelete);
        AddCrud(options, "Permissions", PermissionCodes.PermissionView, PermissionCodes.PermissionCreate, PermissionCodes.PermissionEdit, PermissionCodes.PermissionDelete);
    }

    private static void AddCrud(
        AuthorizationOptions options,
        string prefix,
        string view,
        string create,
        string edit,
        string delete)
    {
        options.AddPolicy($"{prefix}.View", policy => RequireAny(policy, PermissionCodes.SystemAdmin, view));
        options.AddPolicy($"{prefix}.Create", policy => RequireAny(policy, PermissionCodes.SystemAdmin, create));
        options.AddPolicy($"{prefix}.Edit", policy => RequireAny(policy, PermissionCodes.SystemAdmin, edit));
        options.AddPolicy($"{prefix}.Delete", policy => RequireAny(policy, PermissionCodes.SystemAdmin, delete));
        options.AddPolicy($"{prefix}.Manage", policy => RequireAny(policy, PermissionCodes.SystemAdmin, create, edit, delete));
    }

    private static void RequireAny(AuthorizationPolicyBuilder policy, params string[] permissionCodes)
    {
        policy.RequireAuthenticatedUser();
        policy.AddRequirements(new PermissionAuthorizationRequirement(permissionCodes));
    }
}
