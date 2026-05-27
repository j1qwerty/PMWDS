using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using PMWDS.Application.Security;
using PMWDS.Domain.Entities;
using PMWDS.Domain.Enums;
using PMWDS.Persistence.Context;
using TaskStatus = PMWDS.Domain.Enums.TaskStatus;

namespace PMWDS.Persistence.Migrations;

public static class SeedData
{
    private const string SeedUser = "system-seed";
    private const string DefaultPassword = "Pmwds@123";

    public static async Task SeedAsync(ApplicationDbContext context, CancellationToken ct = default)
    {
        await SeedOrganizationsAsync(context, ct);
        await SeedDepartmentsAsync(context, ct);
        await SeedPermissionsAsync(context, ct);
        await SeedRolesAsync(context, ct);
        await SeedSkillsAsync(context, ct);
        await SeedUsersAsync(context, ct);
        await SeedProfilesAndSkillsAsync(context, ct);
        await SeedProjectsAsync(context, ct);
        await SeedProjectWorkAsync(context, ct);
        await SeedCollaborationAsync(context, ct);
        await SeedNotificationsAsync(context, ct);
        await SeedAnalyticsAsync(context, ct);
        await SeedIntegrationsAsync(context, ct);
        await SeedKnowledgeAsync(context, ct);
        await SeedActivityAsync(context, ct);
        await SeedAiAsync(context, ct);
        await SeedAiProviderCredentialsAsync(context, ct);
        await SeedAiProviderCredentialsAsync(context, ct);
    }

    private static async Task SeedOrganizationsAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var organizations = new[]
        {
            Organization.Create("PMWDS Global", "PMWDS-001", "12 Delivery Avenue, Bengaluru", "contact@pmwds.com", "+91-080-5555-0101", DateTime.UtcNow.Date.AddYears(-8)),
            Organization.Create("Northwind Delivery Labs", "NDL-2026", "400 Lakeview Drive, Austin", "ops@northwind-labs.example", "+1-512-555-0198", DateTime.UtcNow.Date.AddYears(-5)),
            Organization.Create("Contoso Transformation Office", "CTO-7781", "9 Market Street, London", "hello@contoso-transform.example", "+44-20-5555-0142", DateTime.UtcNow.Date.AddYears(-3))
        };

        foreach (var organization in organizations)
        {
            if (await context.Organizations.AnyAsync(o => o.Name == organization.Name || o.TaxId == organization.TaxId, ct))
            {
                continue;
            }

            organization.SetCreatedBy(SeedUser);
            await context.Organizations.AddAsync(organization, ct);
        }

        await context.SaveChangesAsync(ct);
    }

    private static async Task SeedDepartmentsAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var orgs = await context.Organizations.ToDictionaryAsync(o => o.Name, ct);
        var specs = new[]
        {
            new DepartmentSpec("PMWDS Global", "Engineering", "ENG", "Product engineering and platform delivery", 38),
            new DepartmentSpec("PMWDS Global", "Program Management", "PMO", "Portfolio governance and execution health", 14),
            new DepartmentSpec("Northwind Delivery Labs", "Engineering", "ENG", "Client implementation squads", 24),
            new DepartmentSpec("Northwind Delivery Labs", "Operations", "OPS", "Service operations and support", 18),
            new DepartmentSpec("Contoso Transformation Office", "Strategy", "STR", "Transformation strategy and business change", 12)
        };

        foreach (var spec in specs)
        {
            if (!orgs.TryGetValue(spec.OrganizationName, out var org))
            {
                continue;
            }

            var exists = await context.Departments.AnyAsync(
                d => d.OrganizationId == org.Id && d.Code == spec.Code,
                ct);
            if (exists)
            {
                continue;
            }

            var department = Department.Create(spec.Name, spec.Code, spec.Description);
            department.AssignToOrganization(org.Id);
            department.SetMaxCapacity(spec.Capacity);
            department.SetCreatedBy(SeedUser);
            await context.Departments.AddAsync(department, ct);
        }

        await context.SaveChangesAsync(ct);
    }

    private static async Task SeedPermissionsAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var specs = new[]
        {
            ("AUTH.MANAGE", "Manage Authentication", "Manage authentication and access policies.", "Authentication", true),
            ("USERS.MANAGE", "Manage Users", "Create and update users.", "Users", true),
            ("ROLES.MANAGE", "Manage Roles", "Manage roles and permission assignments.", "Authentication", true),
            ("ORGS.MANAGE", "Manage Organizations", "Manage organizations and department ownership.", "Organization", true),
            ("PROJECTS.MANAGE", "Manage Projects", "Create and update projects.", "Projects", false),
            ("TASKS.MANAGE", "Manage Tasks", "Create and update tasks.", "Tasks", false),
            ("KNOWLEDGE.MANAGE", "Manage Knowledge", "Publish articles and lessons learned.", "Knowledge", false),
            ("INTEGRATIONS.MANAGE", "Manage Integrations", "Configure integrations and webhooks.", "Integrations", true),
            ("REPORTS.MANAGE", "Manage Reports", "Generate and schedule reports.", "Reports", false),
            ("SYSTEM.ADMIN", "System Administration", "Full system administration access.", "System", true),
            ("SYSTEM.DATABASE.VIEW", "View Database Status", "View active database provider and fallback status.", "System", true),
            ("AI.SETTINGS.MANAGE", "Manage AI Settings", "Manage AI providers, models, and API keys.", "AI", true),
            ("USERS.PROFILE_PICTURE.MANAGE", "Manage Profile Pictures", "Upload and update user profile pictures.", "Users", false),
            ("USERS.DEPARTMENTS.MANAGE", "Manage User Departments", "Assign users to departments and organizations.", "Users", false),
            ("ACTIVITY_LOGS.VIEW", "View Activity Logs", "View user and team activity logs.", "Audit", true),
            (PermissionCodes.SystemAdmin, "System Administration", "Full system administration access.", "System", true),
            (PermissionCodes.SystemDatabaseView, "View Database Status", "View active database provider and fallback status.", "System", true),
            (PermissionCodes.OrganizationView, "View Organizations", "View organization records.", "Organization", true),
            (PermissionCodes.OrganizationCreate, "Create Organizations", "Create organization records.", "Organization", true),
            (PermissionCodes.OrganizationEdit, "Edit Organizations", "Update organization records.", "Organization", true),
            (PermissionCodes.OrganizationDelete, "Delete Organizations", "Delete organization records.", "Organization", true),
            (PermissionCodes.DepartmentView, "View Departments", "View department records.", "Departments", false),
            (PermissionCodes.DepartmentCreate, "Create Departments", "Create department records.", "Departments", false),
            (PermissionCodes.DepartmentEdit, "Edit Departments", "Update department records.", "Departments", false),
            (PermissionCodes.DepartmentDelete, "Delete Departments", "Delete department records.", "Departments", false),
            (PermissionCodes.ProjectView, "View Projects", "View project records.", "Projects", false),
            (PermissionCodes.ProjectCreate, "Create Projects", "Create project records.", "Projects", false),
            (PermissionCodes.ProjectEdit, "Edit Projects", "Update project records.", "Projects", false),
            (PermissionCodes.ProjectDelete, "Delete Projects", "Delete project records.", "Projects", false),
            (PermissionCodes.MilestoneView, "View Milestones", "View milestone records.", "Milestones", false),
            (PermissionCodes.MilestoneCreate, "Create Milestones", "Create milestone records.", "Milestones", false),
            (PermissionCodes.MilestoneEdit, "Edit Milestones", "Update milestone records.", "Milestones", false),
            (PermissionCodes.MilestoneDelete, "Delete Milestones", "Delete milestone records.", "Milestones", false),
            (PermissionCodes.TaskView, "View Tasks", "View task records.", "Tasks", false),
            (PermissionCodes.TaskCreate, "Create Tasks", "Create task records.", "Tasks", false),
            (PermissionCodes.TaskEdit, "Edit Tasks", "Update task records.", "Tasks", false),
            (PermissionCodes.TaskDelete, "Delete Tasks", "Delete task records.", "Tasks", false),
            (PermissionCodes.TaskAssign, "Assign Tasks", "Assign task ownership.", "Tasks", false),
            (PermissionCodes.TaskCommentCreate, "Create Task Comments", "Add comments to tasks.", "Tasks", false),
            (PermissionCodes.TaskAttachmentCreate, "Create Task Attachments", "Upload task attachments.", "Tasks", false),
            (PermissionCodes.TaskTimeTrack, "Track Task Time", "Start and stop task timers.", "Tasks", false),
            (PermissionCodes.SubtaskView, "View Subtasks", "View subtask records.", "Subtasks", false),
            (PermissionCodes.SubtaskCreate, "Create Subtasks", "Create subtask records.", "Subtasks", false),
            (PermissionCodes.SubtaskEdit, "Edit Subtasks", "Update subtask records.", "Subtasks", false),
            (PermissionCodes.SubtaskDelete, "Delete Subtasks", "Delete subtask records.", "Subtasks", false),
            (PermissionCodes.UserView, "View Users", "View user records.", "Users", false),
            (PermissionCodes.UserCreate, "Create Users", "Create user records.", "Users", false),
            (PermissionCodes.UserEdit, "Edit Users", "Update user records.", "Users", false),
            (PermissionCodes.UserDelete, "Delete Users", "Deactivate or delete users.", "Users", false),
            (PermissionCodes.UserDepartmentManage, "Manage User Departments", "Assign users to departments and organizations.", "Users", false),
            (PermissionCodes.UserProfilePictureManage, "Manage Profile Pictures", "Upload and update user profile pictures.", "Users", false),
            (PermissionCodes.RoleView, "View Roles", "View role records.", "Authorization", true),
            (PermissionCodes.RoleCreate, "Create Roles", "Create role records.", "Authorization", true),
            (PermissionCodes.RoleEdit, "Edit Roles", "Update role records.", "Authorization", true),
            (PermissionCodes.RoleDelete, "Delete Roles", "Delete role records.", "Authorization", true),
            (PermissionCodes.PermissionView, "View Permissions", "View permission records.", "Authorization", true),
            (PermissionCodes.PermissionCreate, "Create Permissions", "Create permission records.", "Authorization", true),
            (PermissionCodes.PermissionEdit, "Edit Permissions", "Update permission records.", "Authorization", true),
            (PermissionCodes.PermissionDelete, "Delete Permissions", "Delete permission records.", "Authorization", true),
            (PermissionCodes.NotificationView, "View Notifications", "View notifications.", "Notifications", false),
            (PermissionCodes.NotificationBroadcast, "Broadcast Notifications", "Broadcast notifications to users or groups.", "Notifications", false),
            (PermissionCodes.NotificationTemplateManage, "Manage Notification Templates", "Create and update notification templates.", "Notifications", true),
            (PermissionCodes.NotificationRuleManage, "Manage Alert Rules", "Create and update alert rules.", "Notifications", true),
            (PermissionCodes.ActivityLogView, "View Activity Logs", "View activity logs.", "Audit", true),
            (PermissionCodes.ActivityLogCreate, "Create Activity Logs", "Create activity log entries.", "Audit", false),
            (PermissionCodes.ReportView, "View Reports", "View reports.", "Reports", false),
            (PermissionCodes.ReportCreate, "Create Reports", "Create reports.", "Reports", false),
            (PermissionCodes.ReportEdit, "Edit Reports", "Update reports.", "Reports", false),
            (PermissionCodes.ReportDelete, "Delete Reports", "Delete reports.", "Reports", false),
            (PermissionCodes.KnowledgeView, "View Knowledge", "View knowledge articles and lessons.", "Knowledge", false),
            (PermissionCodes.KnowledgeCreate, "Create Knowledge", "Create knowledge articles and lessons.", "Knowledge", false),
            (PermissionCodes.KnowledgeEdit, "Edit Knowledge", "Update knowledge articles and lessons.", "Knowledge", false),
            (PermissionCodes.KnowledgeDelete, "Delete Knowledge", "Delete knowledge articles and lessons.", "Knowledge", false),
            (PermissionCodes.IntegrationView, "View Integrations", "View integrations and webhooks.", "Integrations", true),
            (PermissionCodes.IntegrationCreate, "Create Integrations", "Create integrations and webhooks.", "Integrations", true),
            (PermissionCodes.IntegrationEdit, "Edit Integrations", "Update integrations and webhooks.", "Integrations", true),
            (PermissionCodes.IntegrationDelete, "Delete Integrations", "Delete integrations and webhooks.", "Integrations", true),
            (PermissionCodes.AiView, "View AI", "View AI insights and predictions.", "AI", false),
            (PermissionCodes.AiManage, "Manage AI", "Manage AI providers, models, and training data.", "AI", true)
        };

        foreach (var spec in specs)
        {
            if (await context.Permissions.AnyAsync(p => p.Code == spec.Item1, ct))
            {
                continue;
            }

            var permission = Permission.Create(spec.Item1, spec.Item2, spec.Item3, spec.Item4, spec.Item5);
            permission.SetCreatedBy(SeedUser);
            await context.Permissions.AddAsync(permission, ct);
        }

        await context.SaveChangesAsync(ct);
    }

    private static async Task SeedRolesAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var permissions = await context.Permissions.ToDictionaryAsync(p => p.Code, ct);
        var allPermissionCodes = permissions.Keys.ToArray();
        var directorPermissionCodes = new[]
        {
            "USERS.MANAGE", "ORGS.MANAGE", "PROJECTS.MANAGE", "TASKS.MANAGE", "KNOWLEDGE.MANAGE", "REPORTS.MANAGE", "USERS.PROFILE_PICTURE.MANAGE", "USERS.DEPARTMENTS.MANAGE", "ACTIVITY_LOGS.VIEW",
            PermissionCodes.OrganizationView, PermissionCodes.OrganizationEdit,
            PermissionCodes.DepartmentView, PermissionCodes.DepartmentCreate, PermissionCodes.DepartmentEdit, PermissionCodes.DepartmentDelete,
            PermissionCodes.ProjectView, PermissionCodes.ProjectCreate, PermissionCodes.ProjectEdit, PermissionCodes.ProjectDelete,
            PermissionCodes.MilestoneView, PermissionCodes.MilestoneCreate, PermissionCodes.MilestoneEdit, PermissionCodes.MilestoneDelete,
            PermissionCodes.TaskView, PermissionCodes.TaskCreate, PermissionCodes.TaskEdit, PermissionCodes.TaskDelete, PermissionCodes.TaskAssign, PermissionCodes.TaskCommentCreate, PermissionCodes.TaskAttachmentCreate, PermissionCodes.TaskTimeTrack,
            PermissionCodes.SubtaskView, PermissionCodes.SubtaskCreate, PermissionCodes.SubtaskEdit, PermissionCodes.SubtaskDelete,
            PermissionCodes.UserView, PermissionCodes.UserCreate, PermissionCodes.UserEdit, PermissionCodes.UserDelete, PermissionCodes.UserDepartmentManage, PermissionCodes.UserProfilePictureManage,
            PermissionCodes.NotificationView, PermissionCodes.NotificationBroadcast,
            PermissionCodes.ActivityLogView, PermissionCodes.ActivityLogCreate,
            PermissionCodes.ReportView, PermissionCodes.ReportCreate, PermissionCodes.ReportEdit, PermissionCodes.ReportDelete,
            PermissionCodes.KnowledgeView, PermissionCodes.KnowledgeCreate, PermissionCodes.KnowledgeEdit, PermissionCodes.KnowledgeDelete,
            PermissionCodes.AiView
        };
        var projectManagerPermissionCodes = new[]
        {
            "PROJECTS.MANAGE", "TASKS.MANAGE", "REPORTS.MANAGE", "KNOWLEDGE.MANAGE",
            PermissionCodes.DepartmentView,
            PermissionCodes.ProjectView, PermissionCodes.ProjectCreate, PermissionCodes.ProjectEdit,
            PermissionCodes.MilestoneView, PermissionCodes.MilestoneCreate, PermissionCodes.MilestoneEdit, PermissionCodes.MilestoneDelete,
            PermissionCodes.TaskView, PermissionCodes.TaskCreate, PermissionCodes.TaskEdit, PermissionCodes.TaskDelete, PermissionCodes.TaskAssign, PermissionCodes.TaskCommentCreate, PermissionCodes.TaskAttachmentCreate, PermissionCodes.TaskTimeTrack,
            PermissionCodes.SubtaskView, PermissionCodes.SubtaskCreate, PermissionCodes.SubtaskEdit, PermissionCodes.SubtaskDelete,
            PermissionCodes.UserView,
            PermissionCodes.ReportView, PermissionCodes.ReportCreate, PermissionCodes.ReportEdit, PermissionCodes.ReportDelete,
            PermissionCodes.KnowledgeView, PermissionCodes.KnowledgeCreate, PermissionCodes.KnowledgeEdit, PermissionCodes.KnowledgeDelete,
            PermissionCodes.NotificationView,
            PermissionCodes.ActivityLogCreate,
            PermissionCodes.AiView
        };
        var departmentHeadPermissionCodes = new[]
        {
            "USERS.MANAGE", "PROJECTS.MANAGE", "REPORTS.MANAGE",
            PermissionCodes.DepartmentView, PermissionCodes.DepartmentEdit,
            PermissionCodes.ProjectView, PermissionCodes.ProjectCreate, PermissionCodes.ProjectEdit,
            PermissionCodes.MilestoneView, PermissionCodes.MilestoneCreate, PermissionCodes.MilestoneEdit,
            PermissionCodes.TaskView, PermissionCodes.TaskCreate, PermissionCodes.TaskEdit, PermissionCodes.TaskAssign, PermissionCodes.TaskCommentCreate,
            PermissionCodes.SubtaskView, PermissionCodes.SubtaskCreate, PermissionCodes.SubtaskEdit,
            PermissionCodes.UserView, PermissionCodes.UserEdit, PermissionCodes.UserDepartmentManage,
            PermissionCodes.ReportView, PermissionCodes.ReportCreate,
            PermissionCodes.NotificationView, PermissionCodes.ActivityLogView, PermissionCodes.ActivityLogCreate,
            PermissionCodes.AiView
        };
        var teamMemberPermissionCodes = new[]
        {
            "TASKS.MANAGE",
            PermissionCodes.ProjectView,
            PermissionCodes.MilestoneView,
            PermissionCodes.TaskView, PermissionCodes.TaskEdit, PermissionCodes.TaskCommentCreate, PermissionCodes.TaskAttachmentCreate, PermissionCodes.TaskTimeTrack,
            PermissionCodes.SubtaskView, PermissionCodes.SubtaskCreate, PermissionCodes.SubtaskEdit,
            PermissionCodes.NotificationView,
            PermissionCodes.ActivityLogCreate
        };
        var viewerPermissionCodes = new[]
        {
            PermissionCodes.OrganizationView,
            PermissionCodes.DepartmentView,
            PermissionCodes.ProjectView,
            PermissionCodes.MilestoneView,
            PermissionCodes.TaskView,
            PermissionCodes.SubtaskView,
            PermissionCodes.NotificationView,
            PermissionCodes.ReportView,
            PermissionCodes.KnowledgeView,
            PermissionCodes.AiView
        };
        var specs = new[]
        {
            new RoleSpec("SuperAdmin", "Full administrative access.", 100, allPermissionCodes),
            new RoleSpec("Director", "Organization administrator with full access inside one organization.", 90, directorPermissionCodes),
            new RoleSpec("ProjectManager", "Manages assigned projects and project teams.", 80, projectManagerPermissionCodes),
            new RoleSpec("DepartmentHead", "Manages department capacity and planning.", 70, departmentHeadPermissionCodes),
            new RoleSpec("TeamMember", "Contributes to project execution.", 40, teamMemberPermissionCodes),
            new RoleSpec("Viewer", "Read-only access.", 10, viewerPermissionCodes)
        };

        foreach (var spec in specs)
        {
            var role = await context.Roles.Include(r => r.Permissions).FirstOrDefaultAsync(r => r.Name == spec.Name, ct);
            if (role == null)
            {
                role = Role.Create(spec.Name, spec.Description, spec.Level);
                role.SetCreatedBy(SeedUser);
                await context.Roles.AddAsync(role, ct);
            }

            foreach (var code in spec.PermissionCodes)
            {
                if (permissions.TryGetValue(code, out var permission) && role.Permissions.All(p => p.Id != permission.Id))
                {
                    role.AddPermission(permission);
                }
            }
        }

        await context.SaveChangesAsync(ct);
    }

    private static async Task SeedSkillsAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var specs = new[]
        {
            ("C#", "Technical", "Backend development with C# and .NET"),
            (".NET", "Technical", "ASP.NET Core services and clean architecture"),
            ("React", "Technical", "Client-side application development"),
            ("SQL Server", "Technical", "Relational database design and tuning"),
            ("SQLite", "Technical", "Local development database support"),
            ("Azure", "Technical", "Cloud services and deployment"),
            ("Project Management", "Professional", "Delivery planning and stakeholder management"),
            ("Agile", "Professional", "Iterative delivery and ceremonies"),
            ("Testing", "Quality", "Automated and exploratory testing"),
            ("DevOps", "Technical", "CI/CD and operational practices"),
            ("Data Analysis", "Analytics", "Operational reporting and insight generation"),
            ("Security Review", "Security", "Risk, access, and secure delivery review")
        };

        foreach (var spec in specs)
        {
            if (await context.Skills.AnyAsync(s => s.Name == spec.Item1, ct))
            {
                continue;
            }

            var skill = Skill.Create(spec.Item1, spec.Item2, spec.Item3);
            skill.SetCreatedBy(SeedUser);
            await context.Skills.AddAsync(skill, ct);
        }

        await context.SaveChangesAsync(ct);
    }

    private static async Task SeedUsersAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var departments = await context.Departments.ToListAsync(ct);
        var roles = await context.Roles.ToDictionaryAsync(r => r.Name, ct);
        var specs = BuildUserSpecs(departments);
        var imagePaths = await SeedProfileImagesAsync(ct);

        foreach (var spec in specs)
        {
            var user = await context.Users
                .Include(u => u.Roles)
                .FirstOrDefaultAsync(
                    u => u.Email == spec.Email || u.EmployeeCode == spec.EmployeeCode,
                    ct);
            if (user == null)
            {
                user = ApplicationUser.Create(spec.Email, spec.FirstName, spec.LastName, spec.EmployeeCode, spec.JobTitle, spec.DepartmentId);
                user.SetCreatedBy(SeedUser);
                user.SetPassword(HashPassword(user, DefaultPassword));
                user.UpdateAvailability(spec.Availability, spec.AvailabilityPercent);
                user.UpdateAIScores(spec.Performance, spec.Workload, spec.Burnout);
                await context.Users.AddAsync(user, ct);
            }
            else
            {
                user.UpdateProfile(
                    spec.FirstName,
                    spec.LastName,
                    user.PhoneNumber,
                    spec.JobTitle,
                    user.ProfilePictureUrl);
            user.UpdateAvailability(spec.Availability, spec.AvailabilityPercent);
            user.UpdateAIScores(spec.Performance, spec.Workload, spec.Burnout);

            if (spec.Role.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase))
            {
                user.ClearPrimaryDepartment();
                user.ClearOrganization();
                var assignments = await context.UserDepartments
                    .Where(assignment => assignment.UserId == user.Id)
                    .ToListAsync(ct);
                if (assignments.Count > 0)
                {
                    context.UserDepartments.RemoveRange(assignments);
                }
            }
        }

            var profilePicUrl = imagePaths.TryGetValue(spec.EmployeeCode, out var path)
                ? path
                : $"https://api.dicebear.com/9.x/initials/svg?seed={user.EmployeeCode}";

            user.UpdateProfile(
                user.FirstName,
                user.LastName,
                user.PhoneNumber,
                user.JobTitle,
                profilePicUrl);

            if (roles.TryGetValue(spec.Role, out var role) && user.Roles.All(r => r.Id != role.Id))
            {
                user.Roles.Add(role);
            }
        }

        await context.SaveChangesAsync(ct);
        await SeedUserDepartmentsAsync(context, ct);
        await AssignDepartmentHeadsAsync(context, ct);
    }

    private static async Task<Dictionary<string, string>> SeedProfileImagesAsync(CancellationToken ct)
    {
        var result = new Dictionary<string, string>();
        var seedImagesDir = Path.Combine(AppContext.BaseDirectory, "SeedData", "Images");
        if (!Directory.Exists(seedImagesDir))
        {
            return result;
        }

        var storageBase = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "Data"));
        Directory.CreateDirectory(storageBase);

        var extensions = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
        var files = Directory.GetFiles(seedImagesDir)
            .Where(f => extensions.Contains(Path.GetExtension(f).ToLowerInvariant()));

        foreach (var file in files)
        {
            var employeeCode = Path.GetFileNameWithoutExtension(file).ToUpperInvariant();
            var ext = Path.GetExtension(file);
            var folderName = employeeCode[..Math.Min(4, employeeCode.Length)];
            var destFolder = Path.Combine(storageBase, folderName);
            Directory.CreateDirectory(destFolder);
            var destFile = Path.Combine(destFolder, $"{employeeCode.ToLowerInvariant()}{ext}");

            if (!File.Exists(destFile))
            {
                File.Copy(file, destFile, overwrite: false);
            }

            result[employeeCode] = $"/files/pmwds-files/{folderName}/{employeeCode.ToLowerInvariant()}{ext}";
        }

        return result;
    }

    private static async Task SeedUserDepartmentsAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var users = await context.Users.ToListAsync(ct);
        foreach (var user in users.Where(u => u.DepartmentId.HasValue))
        {
            var exists = await context.UserDepartments.AnyAsync(
                d => d.UserId == user.Id && d.DepartmentId == user.DepartmentId!.Value,
                ct);
            if (exists)
            {
                continue;
            }

            var assignment = UserDepartment.Create(user.Id, user.DepartmentId!.Value, isPrimary: true);
            assignment.SetCreatedBy(SeedUser);
            await context.UserDepartments.AddAsync(assignment, ct);
        }

        await context.SaveChangesAsync(ct);
    }

    private static async Task SeedProfilesAndSkillsAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var users = await context.Users.ToListAsync(ct);
        var skills = await context.Skills.ToDictionaryAsync(s => s.Name, ct);

        foreach (var user in users)
        {
            if (!await context.UserProfiles.AnyAsync(p => p.UserId == user.Id, ct))
            {
                var profile = UserProfile.Create(user.Id, $"Delivery profile for {user.FullName}", user.JobTitle, null, "Hybrid delivery center", "+91-90000-00000", $"https://linkedin.example/{user.EmployeeCode.ToLowerInvariant()}");
                profile.SetCreatedBy(SeedUser);
                await context.UserProfiles.AddAsync(profile, ct);
            }

            await AddUserSkillAsync(context, user.Id, skills, "Project Management", 4, 48, ct);
            await AddUserSkillAsync(context, user.Id, skills, user.JobTitle.Contains("Engineer") ? "React" : "Agile", 3, 30, ct);
            await AddUserSkillAsync(context, user.Id, skills, user.JobTitle.Contains("Engineer") ? ".NET" : "Data Analysis", 4, 42, ct);
        }

        await context.SaveChangesAsync(ct);
    }

    private static async Task SeedProjectsAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var departments = await context.Departments.ToListAsync(ct);
        var users = await context.Users.ToListAsync(ct);
        var specs = BuildProjectSpecs(departments, users);

        foreach (var spec in specs)
        {
            if (await context.Projects.AnyAsync(p => p.Name == spec.Name, ct))
            {
                continue;
            }

            var project = Project.Create(spec.Name, spec.Description, spec.Category, spec.Priority, spec.DepartmentId, spec.ManagerId.ToString(), spec.Start, spec.End, spec.Budget, spec.Client);
            project.SetCreatedBy(SeedUser);
            project.UpdateStatus(ProjectStatus.InProgress);
            project.UpdateProgress(spec.Progress);
            project.AddActualCost(spec.ActualCost);
            project.UpdateAIAnalysis(spec.Health, spec.DelayRisk, spec.BudgetRisk, spec.Insight);
            await context.Projects.AddAsync(project, ct);
        }

        await context.SaveChangesAsync(ct);
    }

    private static async Task SeedProjectWorkAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var projects = await context.Projects.ToListAsync(ct);
        var users = await context.Users.ToListAsync(ct);

        foreach (var project in projects)
        {
            await SeedMilestonesForProjectAsync(context, project, ct);
            await SeedTasksForProjectAsync(context, project, users, ct);
        }

        await context.SaveChangesAsync(ct);
    }

    private static async Task SeedMilestonesForProjectAsync(ApplicationDbContext context, Project project, CancellationToken ct)
    {
        var specs = new[]
        {
            ("Discovery Complete", "Scope, risks, and solution assumptions approved", project.PlannedStartDate.AddDays(21), 1, true),
            ("MVP Release", "Core usable workflow released to pilot users", project.PlannedStartDate.AddDays(55), 2, true),
            ("Operational Handoff", "Runbooks, training, and support ownership completed", project.PlannedEndDate.AddDays(-10), 3, false)
        };

        foreach (var spec in specs)
        {
            if (await context.Milestones.AnyAsync(m => m.ProjectId == project.Id && m.Name == spec.Item1, ct))
            {
                continue;
            }

            var milestone = Milestone.Create(project.Id, spec.Item1, spec.Item2, spec.Item3, spec.Item4, spec.Item5);
            milestone.SetCreatedBy(SeedUser);
            milestone.UpdateProgress(spec.Item4 == 1 ? 100 : spec.Item4 == 2 ? 45 : 10);
            await context.Milestones.AddAsync(milestone, ct);
        }
    }

    private static async Task SeedTasksForProjectAsync(ApplicationDbContext context, Project project, List<ApplicationUser> users, CancellationToken ct)
    {
        var milestones = await context.Milestones.Where(m => m.ProjectId == project.Id).OrderBy(m => m.Order).ToListAsync(ct);
        var assignees = users.Where(u => u.DepartmentId == project.DepartmentId).DefaultIfEmpty(users.First()).ToList();
        var taskSpecs = BuildTaskSpecs(project, milestones, assignees);

        foreach (var spec in taskSpecs)
        {
            var task = await UpsertTaskAsync(context, spec, ct);
            await EnsureAssignmentAsync(context, task, spec.AssigneeId, project.ProjectManagerId, ct);
            await SeedSubtasksAsync(context, task, spec.AssigneeId, project.ProjectManagerId, ct);
        }
    }

    private static async Task<ProjectTask> UpsertTaskAsync(ApplicationDbContext context, TaskSpec spec, CancellationToken ct)
    {
        var task = await context.Tasks.FirstOrDefaultAsync(t => t.ProjectId == spec.ProjectId && t.Title == spec.Title, ct);
        if (task != null)
        {
            return task;
        }

        task = ProjectTask.Create(spec.ProjectId, spec.Title, spec.Description, spec.Priority, spec.Start, spec.Due, spec.EstimatedHours, spec.MilestoneId, spec.ParentTaskId);
        task.SetCreatedBy(SeedUser);
        task.AssignTo(spec.AssigneeId.ToString(), spec.AssignedById);
        task.UpdateStatus(spec.Status);
        task.UpdateProgress(spec.Progress, spec.Notes);
        task.UpdateAIPrediction(spec.DelayProbability, spec.Due.AddDays(spec.ExpectedDelayDays), "[\"Scope variance\",\"Dependency wait\"]", spec.AssigneeId.ToString());
        await context.Tasks.AddAsync(task, ct);
        return task;
    }

    private static async Task SeedSubtasksAsync(ApplicationDbContext context, ProjectTask parent, Guid assigneeId, string assignedById, CancellationToken ct)
    {
        var specs = new[]
        {
            ("Prepare acceptance checklist", "Checklist for completion criteria", 4, 30d),
            ("Review implementation notes", "Confirm delivery notes and blockers", 3, 75d)
        };

        foreach (var spec in specs)
        {
            if (await context.Tasks.AnyAsync(t => t.ParentTaskId == parent.Id && t.Title == spec.Item1, ct))
            {
                continue;
            }

            var subtask = ProjectTask.Create(parent.ProjectId, spec.Item1, spec.Item2, TaskPriority.Medium, DateTime.UtcNow.Date.AddDays(-3), parent.DueDate, spec.Item3, parent.MilestoneId, parent.Id);
            subtask.SetCreatedBy(SeedUser);
            subtask.AssignTo(assigneeId.ToString(), assignedById);
            subtask.UpdateProgress(spec.Item4, "Seeded subtask progress");
            await context.Tasks.AddAsync(subtask, ct);
        }
    }

    private static async Task SeedCollaborationAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var tasks = await context.Tasks.Where(t => t.ParentTaskId == null).Take(10).ToListAsync(ct);
        var users = await context.Users.Take(5).ToListAsync(ct);

        foreach (var task in tasks)
        {
            await SeedTimeEntriesAsync(context, task, users, ct);
            await SeedCommentsAsync(context, task, users, ct);
        }

        await SeedDependenciesAsync(context, tasks, ct);
        await context.SaveChangesAsync(ct);
    }

    private static async Task SeedTimeEntriesAsync(ApplicationDbContext context, ProjectTask task, List<ApplicationUser> users, CancellationToken ct)
    {
        if (await context.TimeEntries.AnyAsync(t => t.TaskId == task.Id, ct))
        {
            return;
        }

        foreach (var user in users.Take(2))
        {
            var entry = TimeEntry.ManualEntry(
                task.Id,
                user.Id.ToString(),
                DateTime.UtcNow.AddHours(-3),
                DateTime.UtcNow.AddHours(-1),
                $"Focused delivery work on {task.Title}",
                true);
            await context.TimeEntries.AddAsync(entry, ct);
        }
    }

    private static async Task SeedCommentsAsync(ApplicationDbContext context, ProjectTask task, List<ApplicationUser> users, CancellationToken ct)
    {
        if (await context.TaskComments.AnyAsync(c => c.TaskId == task.Id, ct))
        {
            return;
        }

        foreach (var user in users.Take(2))
        {
            var comment = TaskComment.Create(task.Id, user.Id.ToString(), $"Seed update from {user.FullName}: progress is tracking against plan.");
            await context.TaskComments.AddAsync(comment, ct);
        }
    }

    private static async Task SeedDependenciesAsync(ApplicationDbContext context, List<ProjectTask> tasks, CancellationToken ct)
    {
        for (var i = 1; i < tasks.Count; i++)
        {
            var predecessor = tasks[i - 1];
            var successor = tasks[i];
            var exists = await context.TaskDependencies.AnyAsync(d => d.PredecessorTaskId == predecessor.Id && d.SuccessorTaskId == successor.Id, ct);
            if (exists)
            {
                continue;
            }

            await context.TaskDependencies.AddAsync(TaskDependency.Create(predecessor.Id, successor.Id, DependencyType.FinishToStart, 1), ct);
        }
    }

    private static async Task SeedNotificationsAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var users = await context.Users.Take(5).ToListAsync(ct);
        await SeedNotificationTemplatesAsync(context, ct);
        await SeedAlertRulesAsync(context, ct);

        foreach (var user in users)
        {
            if (await context.Notifications.AnyAsync(n => n.UserId == user.Id.ToString(), ct))
            {
                continue;
            }

            await context.Notifications.AddAsync(Notification.Create(user.Id.ToString(), "Task assigned", "A seeded delivery task is ready for review.", NotificationType.TaskAssigned, NotificationPriority.Normal, "/tasks"), ct);
            await context.Notifications.AddAsync(Notification.Create(user.Id.ToString(), "AI insight available", "Project risk signals have been refreshed.", NotificationType.AIInsight, NotificationPriority.High, "/ai", null, null, true), ct);
        }

        await context.SaveChangesAsync(ct);
    }

    private static async Task SeedNotificationTemplatesAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var specs = new[]
        {
            ("TaskAssigned", "Task {{title}} assigned", "Hello {{user}}, task {{title}} is ready.", new[] { "user", "title" }, new[] { "Email", "InApp" }),
            ("MilestoneRisk", "Milestone {{name}} at risk", "Milestone {{name}} needs attention by {{dueDate}}.", new[] { "name", "dueDate" }, new[] { "Email", "InApp" }),
            ("ReportReady", "Report {{reportName}} ready", "Your scheduled report is available.", new[] { "reportName" }, new[] { "Email" })
        };

        foreach (var spec in specs)
        {
            if (await context.NotificationTemplates.AnyAsync(t => t.TemplateType == spec.Item1, ct))
            {
                continue;
            }

            var template = NotificationTemplate.Create(spec.Item1, spec.Item2, spec.Item3, spec.Item4, spec.Item5);
            template.SetCreatedBy(SeedUser);
            await context.NotificationTemplates.AddAsync(template, ct);
        }
    }

    private static async Task SeedAlertRulesAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var specs = new AlertRuleSpec[]
        {
            new("High delay probability", "TaskRisk", "delayProbability >= 0.70", "NotifyManager", new Dictionary<string, object> { ["priority"] = "High", ["template"] = "MilestoneRisk" }),
            new("Budget nearing threshold", "ProjectBudget", "actualCost / plannedBudget >= 0.85", "CreateNotification", new Dictionary<string, object> { ["priority"] = "High" }),
            new("Unassigned task backlog", "TaskQueue", "unassignedCount > 3", "NotifyDepartmentHead", new Dictionary<string, object> { ["priority"] = "Normal" })
        };

        foreach (var spec in specs)
        {
            if (await context.AlertRules.AnyAsync(r => r.Name == spec.Name, ct))
            {
                continue;
            }

            var rule = AlertRule.Create(spec.Name, spec.ConditionType, spec.Expression, spec.ActionType, spec.Parameters);
            rule.SetCreatedBy(SeedUser);
            await context.AlertRules.AddAsync(rule, ct);
        }
    }

    private static async Task SeedAnalyticsAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var users = await context.Users.Take(3).ToListAsync(ct);

        foreach (var user in users)
        {
            if (await context.Dashboards.AnyAsync(d => d.UserId == user.Id, ct))
            {
                continue;
            }

            var dashboard = Dashboard.Create(user.Id, $"{user.FirstName}'s Delivery Board", "three-column", true);
            dashboard.SetCreatedBy(SeedUser);
            await context.Dashboards.AddAsync(dashboard, ct);
            await context.SaveChangesAsync(ct);
            await SeedDashboardWidgetsAsync(context, dashboard.Id, ct);
        }

        await SeedReportsAsync(context, users, ct);
    }

    private static async Task SeedDashboardWidgetsAsync(ApplicationDbContext context, Guid dashboardId, CancellationToken ct)
    {
        var widgets = new[]
        {
            DashboardWidget.Create(dashboardId, "ProjectHealth", "Project Health", new { scope = "assigned" }, 300, new[] { "PROJECTS.MANAGE" }, 1),
            DashboardWidget.Create(dashboardId, "TaskBacklog", "Task Backlog", new { groupBy = "status" }, 180, new[] { "TASKS.MANAGE" }, 2),
            DashboardWidget.Create(dashboardId, "RiskSignals", "Risk Signals", new { threshold = 0.7 }, 600, new[] { "REPORTS.MANAGE" }, 3)
        };

        foreach (var widget in widgets)
        {
            widget.SetCreatedBy(SeedUser);
            await context.DashboardWidgets.AddAsync(widget, ct);
        }

        await context.SaveChangesAsync(ct);
    }

    private static async Task SeedReportsAsync(ApplicationDbContext context, List<ApplicationUser> users, CancellationToken ct)
    {
        var owner = users.FirstOrDefault() ?? await context.Users.FirstAsync(ct);
        var reportSpecs = new[]
        {
            ("Weekly Delivery Health", "ProjectHealth", "pdf"),
            ("Capacity Forecast", "Workload", "xlsx"),
            ("Risk Register Export", "Risk", "pdf")
        };

        foreach (var spec in reportSpecs)
        {
            var report = await context.Reports.FirstOrDefaultAsync(r => r.Name == spec.Item1, ct);
            if (report == null)
            {
                report = Report.Create(spec.Item1, spec.Item2, new { seeded = true, period = "weekly" }, spec.Item3, Encoding.UTF8.GetBytes($"Seed report: {spec.Item1}"), owner.Id);
                report.SetCreatedBy(SeedUser);
                await context.Reports.AddAsync(report, ct);
                await context.SaveChangesAsync(ct);
            }

            await SeedReportScheduleAsync(context, report.Id, owner.Email, ct);
        }
    }

    private static async Task SeedReportScheduleAsync(ApplicationDbContext context, Guid reportId, string email, CancellationToken ct)
    {
        if (await context.ReportSchedules.AnyAsync(s => s.ReportId == reportId, ct))
        {
            return;
        }

        var schedule = ReportSchedule.Create(reportId, "Weekly", DateTime.UtcNow.Date.AddDays(7).AddHours(9), new[] { email, "delivery-office@example.com" }, new { channel = "Email", format = "pdf" });
        schedule.SetCreatedBy(SeedUser);
        await context.ReportSchedules.AddAsync(schedule, ct);
        await context.SaveChangesAsync(ct);
    }

    private static async Task SeedIntegrationsAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var specs = new IntegrationSpec[]
        {
            new("Jira", "Jira Cloud Delivery Sync", new Dictionary<string, object> { ["projectKey"] = "PMWDS", ["mode"] = "pull" }, true),
            new("Slack", "Slack Delivery Alerts", new Dictionary<string, object> { ["channel"] = "#delivery-alerts" }, true),
            new("GitHub", "GitHub Repository Events", new Dictionary<string, object> { ["organization"] = "pmwds" }, false)
        };

        foreach (var spec in specs)
        {
            var integration = await context.Integrations.FirstOrDefaultAsync(i => i.Name == spec.Name, ct);
            if (integration == null)
            {
                integration = Integration.Create(spec.Type, spec.Name, spec.Configuration, spec.Enabled);
                integration.SetCreatedBy(SeedUser);
                integration.MarkSynced(spec.Enabled ? "Healthy" : "Pending");
                await context.Integrations.AddAsync(integration, ct);
                await context.SaveChangesAsync(ct);
            }

            await SeedWebhooksAsync(context, integration.Id, ct);
        }
    }

    private static async Task SeedWebhooksAsync(ApplicationDbContext context, Guid integrationId, CancellationToken ct)
    {
        var specs = new[]
        {
            ("task.created", "https://hooks.example.com/pmwds/task-created"),
            ("project.updated", "https://hooks.example.com/pmwds/project-updated")
        };

        foreach (var spec in specs)
        {
            var webhook = await context.Webhooks.FirstOrDefaultAsync(w => w.IntegrationId == integrationId && w.EventType == spec.Item1, ct);
            if (webhook == null)
            {
                webhook = Webhook.Create(integrationId, spec.Item1, spec.Item2, "seed-secret-change-me", new[] { "X-PMWDS-Source: seed" }, true);
                webhook.SetCreatedBy(SeedUser);
                await context.Webhooks.AddAsync(webhook, ct);
                await context.SaveChangesAsync(ct);
            }

            await SeedWebhookDeliveryAsync(context, webhook.Id, ct);
        }
    }

    private static async Task SeedWebhookDeliveryAsync(ApplicationDbContext context, Guid webhookId, CancellationToken ct)
    {
        if (await context.WebhookDeliveries.AnyAsync(d => d.WebhookId == webhookId, ct))
        {
            return;
        }

        await context.WebhookDeliveries.AddAsync(WebhookDelivery.Create(webhookId, 200, "{\"ok\":true}", true, null), ct);
        await context.WebhookDeliveries.AddAsync(WebhookDelivery.Create(webhookId, 503, "{\"error\":\"temporary\"}", false, "Temporary upstream failure"), ct);
        await context.SaveChangesAsync(ct);
    }

    private static async Task SeedKnowledgeAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var projects = await context.Projects.Take(4).ToListAsync(ct);
        var author = await context.Users.FirstAsync(ct);

        foreach (var project in projects)
        {
            if (!await context.KnowledgeArticles.AnyAsync(a => a.ProjectId == project.Id, ct))
            {
                var article = KnowledgeArticle.Create(project.Id, $"{project.Name} delivery playbook", "Seeded guidance for planning, delivery checkpoints, and support handoff.", "Delivery", new[] { "playbook", "delivery", project.Category }, author.Id, 0.82);
                article.SetCreatedBy(SeedUser);
                article.IncrementViewCount();
                await context.KnowledgeArticles.AddAsync(article, ct);
            }

            if (!await context.LessonsLearned.AnyAsync(l => l.ProjectId == project.Id, ct))
            {
                var lesson = LessonLearned.Create(project.Id, $"{project.Name} dependency lesson", "Early dependency mapping reduced late-cycle rework.", "Planning", "Reduced schedule risk", new[] { "dependency", "planning", "risk" });
                lesson.SetCreatedBy(SeedUser);
                await context.LessonsLearned.AddAsync(lesson, ct);
            }
        }

        await context.SaveChangesAsync(ct);
    }

    private static async Task SeedActivityAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var users = await context.Users.Take(5).ToListAsync(ct);
        var activities = new[] { "ProjectViewed", "TaskUpdated", "ReportGenerated", "KnowledgePublished", "IntegrationSynced" };

        foreach (var user in users)
        {
            foreach (var activity in activities.Take(3))
            {
                var exists = await context.ActivityLogs.AnyAsync(a => a.UserId == user.Id && a.ActivityType == activity, ct);
                if (exists)
                {
                    continue;
                }

                var log = ActivityLog.Create(user.Id, activity, $"{user.FullName} performed {activity}.", new { source = "seed", user.EmployeeCode });
                log.SetCreatedBy(SeedUser);
                await context.ActivityLogs.AddAsync(log, ct);
            }
        }

        await context.SaveChangesAsync(ct);
    }

    private static async Task SeedAiAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var allocationModel = await EnsureAiModelAsync(context, "Default Task Allocation Model", "TaskAllocation", ct);
        var delayModel = await EnsureAiModelAsync(context, "Default Delay Prediction Model", "DelayPrediction", ct);
        var tasks = await context.Tasks.Where(t => t.ParentTaskId == null).Take(5).ToListAsync(ct);
        var users = await context.Users.Take(5).ToListAsync(ct);

        await SeedTrainingDataAsync(context, ct);
        foreach (var task in tasks)
        {
            var assignee = users.FirstOrDefault(u => u.Id.ToString() == task.AssignedToUserId) ?? users.First();
            await SeedPredictionResultAsync(context, allocationModel.Id, delayModel.Id, task, ct);
            await SeedRecommendationAsync(context, allocationModel.Id, task.Id, assignee.Id, ct);
            await SeedDelayPredictionAsync(context, delayModel.Id, task.Id, task.DueDate, ct);
        }

        await context.SaveChangesAsync(ct);
    }

    private static async Task SeedAiProviderCredentialsAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var specs = new[]
        {
            new AIProviderCredentialSpec("OpenAI", "OpenAI", true, "https://api.openai.com/v1", "gpt-4o"),
            new AIProviderCredentialSpec("OpenRouter", "OpenRouter", false, "https://openrouter.ai/api/v1", "openai/gpt-oss-120b:free")
        };

        foreach (var spec in specs)
        {
            if (await context.AIProviderCredentials.AnyAsync(p => p.Provider == spec.Provider, ct))
            {
                continue;
            }

            var credential = AIProviderCredential.Create(
                spec.Provider,
                spec.DisplayName,
                spec.Enabled,
                useEnvironmentDefault: true,
                spec.BaseUrl,
                apiKey: null,
                spec.DefaultModel);
            credential.SetCreatedBy(SeedUser);
            await context.AIProviderCredentials.AddAsync(credential, ct);
        }

        await context.SaveChangesAsync(ct);
    }

    private static async Task<AIModel> EnsureAiModelAsync(ApplicationDbContext context, string name, string type, CancellationToken ct)
    {
        var model = await context.AIModels.FirstOrDefaultAsync(m => m.Name == name && m.ModelType == type, ct);
        if (model != null)
        {
            return model;
        }

        model = type == "TaskAllocation"
            ? TaskAllocationModel.Create(name, "1.0.0", "Models/task-allocation.zip", new Dictionary<string, double> { ["riskThreshold"] = 0.7 }, new[] { "Availability", "Performance", "Workload", "BurnoutRisk" })
            : DelayPredictionModel.Create(name, "1.0.0", "Models/delay-prediction.zip", new Dictionary<string, double> { ["riskThreshold"] = 0.7 }, new[] { "EstimatedHours", "ActualHours", "ProgressPercentage", "DaysUntilDue" });
        model.SetCreatedBy(SeedUser);
        model.UpdateMetrics(type == "TaskAllocation" ? 0.79 : 0.74, type == "TaskAllocation" ? 0.76 : 0.71, type == "TaskAllocation" ? 0.73 : 0.69);
        await context.AIModels.AddAsync(model, ct);
        await context.SaveChangesAsync(ct);
        return model;
    }

    private static async Task SeedTrainingDataAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var specs = new[]
        {
            ("TaskAllocation", new Dictionary<string, object?> { ["estimatedHours"] = 32, ["workload"] = 62 }, new Dictionary<string, object?> { ["accepted"] = true }, "Seed allocation history"),
            ("TaskAllocation", new Dictionary<string, object?> { ["estimatedHours"] = 18, ["workload"] = 44 }, new Dictionary<string, object?> { ["accepted"] = true }, "Seed assignment history"),
            ("DelayPrediction", new Dictionary<string, object?> { ["progress"] = 35, ["daysUntilDue"] = 8 }, new Dictionary<string, object?> { ["delayed"] = true }, "Seed delivery history"),
            ("DelayPrediction", new Dictionary<string, object?> { ["progress"] = 80, ["daysUntilDue"] = 14 }, new Dictionary<string, object?> { ["delayed"] = false }, "Seed completion history")
        };

        foreach (var spec in specs)
        {
            if (await context.TrainingDataPoints.AnyAsync(t => t.DataType == spec.Item1 && t.Source == spec.Item4, ct))
            {
                continue;
            }

            var data = TrainingDataPoint.Create(spec.Item1, spec.Item2, spec.Item3, spec.Item4);
            data.SetCreatedBy(SeedUser);
            await context.TrainingDataPoints.AddAsync(data, ct);
        }
    }

    private static async Task SeedPredictionResultAsync(ApplicationDbContext context, Guid allocationModelId, Guid delayModelId, ProjectTask task, CancellationToken ct)
    {
        if (await context.PredictionResults.AnyAsync(p => p.TaskId == task.Id, ct))
        {
            return;
        }

        await context.PredictionResults.AddAsync(PredictionResult.Create(allocationModelId, task.Id, new Dictionary<string, object?> { ["task"] = task.Title, ["estimatedHours"] = task.EstimatedHours }, new Dictionary<string, object?> { ["matchScore"] = 0.81 }, 0.81, "Assign to the current seeded owner."), ct);
        await context.PredictionResults.AddAsync(PredictionResult.Create(delayModelId, task.Id, new Dictionary<string, object?> { ["progress"] = task.ProgressPercentage, ["dueDate"] = task.DueDate }, new Dictionary<string, object?> { ["delayProbability"] = task.AIDelayProbability }, 0.74, "Monitor dependency and workload signals."), ct);
    }

    private static async Task SeedRecommendationAsync(ApplicationDbContext context, Guid modelId, Guid taskId, Guid userId, CancellationToken ct)
    {
        if (await context.AllocationRecommendations.AnyAsync(r => r.TaskId == taskId, ct))
        {
            return;
        }

        var recommendation = AllocationRecommendation.Create(taskId, modelId, userId, 0.84, new[] { "Relevant seeded skills", "Available capacity", "Prior project context" }, new Dictionary<string, double> { ["skill"] = 0.87, ["capacity"] = 0.78, ["performance"] = 0.82 }, new[] { new { userId, score = 0.73, reason = "Backup candidate" } });
        recommendation.SetCreatedBy(SeedUser);
        await context.AllocationRecommendations.AddAsync(recommendation, ct);
    }

    private static async Task SeedDelayPredictionAsync(ApplicationDbContext context, Guid modelId, Guid taskId, DateTime dueDate, CancellationToken ct)
    {
        if (await context.DelayPredictions.AnyAsync(p => p.TaskId == taskId, ct))
        {
            return;
        }

        var prediction = DelayPrediction.Create(taskId, modelId, 0.42, 3, dueDate.AddDays(3), new[] { "Dependency wait", "Reviewer capacity" }, new Dictionary<string, double> { ["dependency"] = 0.45, ["capacity"] = 0.31 });
        prediction.SetCreatedBy(SeedUser);
        await context.DelayPredictions.AddAsync(prediction, ct);
    }

    private static UserSpec[] BuildUserSpecs(List<Department> departments)
    {
        Guid Dept(string code) => departments.FirstOrDefault(d => d.Code == code)?.Id ?? departments.First().Id;
        return new[]
        {
            new UserSpec("admin@pmwds.com", "Aarav", "Sharma", "ADMIN001", "SuperAdmin", "SuperAdmin", null, AvailabilityStatus.Available, 100, 92, 26, 0.08),
            new UserSpec("director@pmwds.com", "Priya", "Menon", "DIR001", "Director", "Director", Dept("PMO"), AvailabilityStatus.PartiallyBusy, 72, 86, 58, 0.24),
            new UserSpec("manager@pmwds.com", "Dev", "Kapoor", "PM001", "ProjectManager", "ProjectManager", Dept("PMO"), AvailabilityStatus.PartiallyBusy, 72, 86, 58, 0.24),
            new UserSpec("head@pmwds.com", "Rohan", "Iyer", "DH001", "DepartmentHead", "DepartmentHead", Dept("ENG"), AvailabilityStatus.Busy, 64, 84, 66, 0.31),
            new UserSpec("member@pmwds.com", "Karan", "Verma", "TM001", "TeamMember", "TeamMember", Dept("ENG"), AvailabilityStatus.Available, 88, 73, 38, 0.12),
            new UserSpec("viewer@pmwds.com", "Meera", "Nair", "VW001", "Viewer", "Viewer", Dept("STR"), AvailabilityStatus.Available, 100, 60, 18, 0.05),
            new UserSpec("ananya.patel@pmwds.com", "Ananya", "Patel", "ENG101", "Senior Engineer", "TeamMember", Dept("ENG"), AvailabilityStatus.PartiallyBusy, 70, 88, 61, 0.25),
            new UserSpec("vikram.singh@northwind-labs.example", "Vikram", "Singh", "NDL201", "Director", "Director", Dept("OPS"), AvailabilityStatus.Available, 84, 79, 44, 0.16),
            new UserSpec("sneha.kulkarni@contoso-transform.example", "Sneha", "Kulkarni", "CTO301", "Strategy Analyst", "TeamMember", Dept("STR"), AvailabilityStatus.Available, 92, 76, 35, 0.11)
        };
    }

    private static ProjectSpec[] BuildProjectSpecs(List<Department> departments, List<ApplicationUser> users)
    {
        var managers = users.Where(u => u.JobTitle.Contains("Manager") || u.JobTitle.Contains("Lead") || u.JobTitle.Contains("Head")).ToList();
        Guid Dept(string code) => departments.FirstOrDefault(d => d.Code == code)?.Id ?? departments.First().Id;
        Guid Manager(int index) => managers.ElementAtOrDefault(index)?.Id ?? users.First().Id;
        var today = DateTime.UtcNow.Date;

        return new[]
        {
            new ProjectSpec("AI Delivery Control Tower", "Operational cockpit for project health and risk signals", "Platform", ProjectPriority.Critical, Dept("ENG"), Manager(0), today.AddDays(-20), today.AddDays(80), 185000, 72000, "PMWDS Internal", 44, 82, 0.31, 0.22, "Health is stable with capacity watchpoints."),
            new ProjectSpec("Northwind Client Portal", "Self-service portal for delivery stakeholders", "Client", ProjectPriority.High, Dept("ENG"), Manager(1), today.AddDays(-35), today.AddDays(65), 140000, 61000, "Northwind", 52, 76, 0.38, 0.29, "Milestone dependencies need active follow-up."),
            new ProjectSpec("Contoso Transformation Hub", "Knowledge and reporting workspace for transformation office", "Transformation", ProjectPriority.Medium, Dept("STR"), Manager(2), today.AddDays(-10), today.AddDays(100), 98000, 22000, "Contoso", 25, 88, 0.18, 0.14, "Early delivery is on track."),
            new ProjectSpec("Service Operations Automation", "Automated incident intake and escalation workflow", "Operations", ProjectPriority.High, Dept("OPS"), Manager(1), today.AddDays(-28), today.AddDays(50), 76000, 41000, "Northwind", 58, 71, 0.46, 0.35, "Reviewer load is the main risk.")
        };
    }

    private static TaskSpec[] BuildTaskSpecs(Project project, List<Milestone> milestones, List<ApplicationUser> users)
    {
        Guid User(int index) => users.ElementAtOrDefault(index)?.Id ?? users.First().Id;
        Guid? Milestone(int index) => milestones.ElementAtOrDefault(index)?.Id;
        var start = DateTime.UtcNow.Date.AddDays(-7);

        return new[]
        {
            new TaskSpec(project.Id, Milestone(0), null, "Map workflow and ownership", "Document current-state workflow and accountable owners", TaskPriority.High, start, start.AddDays(10), 24, User(0), project.ProjectManagerId, TaskStatus.Completed, 100, 0.12, 0, "Discovery complete"),
            new TaskSpec(project.Id, Milestone(1), null, "Build primary API integration", "Connect the main operational API to the workflow", TaskPriority.Critical, start.AddDays(4), start.AddDays(25), 48, User(1), project.ProjectManagerId, TaskStatus.InProgress, 55, 0.44, 3, "Integration in progress"),
            new TaskSpec(project.Id, null, null, "Prepare stakeholder demo", "Create a standalone demo task outside milestones", TaskPriority.Medium, start.AddDays(8), start.AddDays(18), 16, User(2), project.ProjectManagerId, TaskStatus.Assigned, 20, 0.24, 1, "Demo outline ready")
        };
    }

    private static async Task AssignDepartmentHeadsAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var head = await context.Users.FirstOrDefaultAsync(u => u.Email == "head@pmwds.com", ct);
        var lead = await context.Users.FirstOrDefaultAsync(u => u.Email == "vikram.singh@northwind-labs.example", ct);
        var departments = await context.Departments.ToListAsync(ct);

        foreach (var department in departments)
        {
            var userId = department.Code == "OPS" ? lead?.Id.ToString() : head?.Id.ToString();
            if (!string.IsNullOrWhiteSpace(userId))
            {
                department.AssignHead(userId);
            }
        }

        await context.SaveChangesAsync(ct);
    }

    private static async Task AddUserSkillAsync(ApplicationDbContext context, Guid userId, Dictionary<string, Skill> skills, string skillName, int level, int months, CancellationToken ct)
    {
        if (!skills.TryGetValue(skillName, out var skill))
        {
            return;
        }

        var exists = await context.UserSkills.AnyAsync(s => s.UserId == userId && s.SkillId == skill.Id, ct);
        if (exists)
        {
            return;
        }

        var userSkill = UserSkill.Create(userId, skill.Id, level, months);
        userSkill.SetAIConfidenceScore(Math.Clamp(level / 5d, 0, 1));
        await context.UserSkills.AddAsync(userSkill, ct);
    }

    private static async Task EnsureAssignmentAsync(ApplicationDbContext context, ProjectTask task, Guid userId, string assignedById, CancellationToken ct)
    {
        var exists = await context.TaskAssignments.AnyAsync(a => a.TaskId == task.Id && a.UserId == userId.ToString(), ct);
        if (exists)
        {
            return;
        }

        var assignment = TaskAssignment.Create(task.Id, userId.ToString(), 0.82, "Seeded based on capacity and skills", true);
        await context.TaskAssignments.AddAsync(assignment, ct);
    }

    private static string HashPassword(ApplicationUser user, string password)
        => new PasswordHasher<ApplicationUser>().HashPassword(user, password.Trim());

    private sealed record DepartmentSpec(string OrganizationName, string Name, string Code, string Description, int Capacity);
    private sealed record AlertRuleSpec(string Name, string ConditionType, string Expression, string ActionType, object Parameters);
    private sealed record IntegrationSpec(string Type, string Name, object Configuration, bool Enabled);
    private sealed record AIProviderCredentialSpec(string Provider, string DisplayName, bool Enabled, string BaseUrl, string DefaultModel);
    private sealed record RoleSpec(string Name, string Description, int Level, IReadOnlyCollection<string> PermissionCodes);
    private sealed record UserSpec(string Email, string FirstName, string LastName, string EmployeeCode, string JobTitle, string Role, Guid? DepartmentId, AvailabilityStatus Availability, double AvailabilityPercent, double Performance, double Workload, double Burnout);
    private sealed record ProjectSpec(string Name, string Description, string Category, ProjectPriority Priority, Guid DepartmentId, Guid ManagerId, DateTime Start, DateTime End, decimal Budget, decimal ActualCost, string Client, double Progress, double Health, double DelayRisk, double BudgetRisk, string Insight);
    private sealed record TaskSpec(Guid ProjectId, Guid? MilestoneId, Guid? ParentTaskId, string Title, string Description, TaskPriority Priority, DateTime Start, DateTime Due, int EstimatedHours, Guid AssigneeId, string AssignedById, TaskStatus Status, double Progress, double DelayProbability, int ExpectedDelayDays, string Notes);
}
