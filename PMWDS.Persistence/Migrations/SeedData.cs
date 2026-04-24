using Microsoft.EntityFrameworkCore;
using PMWDS.Domain.Entities;
using PMWDS.Persistence.Context;

namespace PMWDS.Persistence.Migrations;

public static class SeedData
{
    public static async Task SeedAsync(
        ApplicationDbContext context,
        CancellationToken ct = default)
    {
        if (!context.Organizations.Any())
        {
            var organization = Organization.Create(
                "PMWDS",
                "PMWDS-001",
                "Default PMWDS Address",
                "contact@pmwds.com",
                "+91-0000000000",
                DateTime.UtcNow.Date);
            organization.SetCreatedBy("system");
            await context.Organizations.AddAsync(organization, ct);
            await context.SaveChangesAsync(ct);
        }

        if (!context.Departments.Any())
        {
            var organizationId = await context.Organizations.Select(o => o.Id).FirstAsync(ct);
            var department = Department.Create(
                "Information Technology",
                "IT",
                "Default PMWDS department");
            department.AssignToOrganization(organizationId);
            department.SetCreatedBy("system");

            await context.Departments.AddAsync(department, ct);
            await context.SaveChangesAsync(ct);
        }

        if (!context.Permissions.Any())
        {
            var permissions = new[]
            {
                Permission.Create("AUTH.MANAGE", "Manage Authentication", "Manage authentication and access policies.", "Authentication", true),
                Permission.Create("USERS.MANAGE", "Manage Users", "Create and update users.", "Users", true),
                Permission.Create("PROJECTS.MANAGE", "Manage Projects", "Create and update projects.", "Projects"),
                Permission.Create("TASKS.MANAGE", "Manage Tasks", "Create and update tasks.", "Tasks"),
                Permission.Create("REPORTS.MANAGE", "Manage Reports", "Generate and schedule reports.", "Reports"),
                Permission.Create("SYSTEM.ADMIN", "System Administration", "Full system administration access.", "System", true)
            };

            foreach (var permission in permissions)
            {
                permission.SetCreatedBy("system");
                await context.Permissions.AddAsync(permission, ct);
            }

            await context.SaveChangesAsync(ct);
        }

        if (!context.Roles.Any())
        {
            var permissionMap = await context.Permissions.ToDictionaryAsync(p => p.Code, ct);
            var roles = new[]
            {
                Role.Create("SuperAdmin", "Full administrative access.", 100),
                Role.Create("ProjectManager", "Manages projects and project teams.", 80),
                Role.Create("DepartmentHead", "Manages department capacity and planning.", 70),
                Role.Create("TeamLead", "Coordinates delivery for a team.", 60),
                Role.Create("TeamMember", "Contributes to project execution.", 40),
                Role.Create("Viewer", "Read-only access.", 10)
            };

            foreach (var role in roles)
            {
                role.SetCreatedBy("system");
            }

            roles[0].AddPermission(permissionMap["AUTH.MANAGE"]);
            roles[0].AddPermission(permissionMap["USERS.MANAGE"]);
            roles[0].AddPermission(permissionMap["PROJECTS.MANAGE"]);
            roles[0].AddPermission(permissionMap["TASKS.MANAGE"]);
            roles[0].AddPermission(permissionMap["REPORTS.MANAGE"]);
            roles[0].AddPermission(permissionMap["SYSTEM.ADMIN"]);

            roles[1].AddPermission(permissionMap["PROJECTS.MANAGE"]);
            roles[1].AddPermission(permissionMap["TASKS.MANAGE"]);
            roles[1].AddPermission(permissionMap["REPORTS.MANAGE"]);

            roles[2].AddPermission(permissionMap["USERS.MANAGE"]);
            roles[2].AddPermission(permissionMap["PROJECTS.MANAGE"]);
            roles[2].AddPermission(permissionMap["REPORTS.MANAGE"]);

            roles[3].AddPermission(permissionMap["TASKS.MANAGE"]);
            roles[4].AddPermission(permissionMap["TASKS.MANAGE"]);

            foreach (var role in roles)
            {
                await context.Roles.AddAsync(role, ct);
            }

            await context.SaveChangesAsync(ct);
        }

        if (!context.Skills.Any())
        {
            var skills = new[]
            {
                "C#",
                ".NET",
                "React",
                "SQL Server",
                "SQLite",
                "Azure",
                "Project Management",
                "Agile",
                "Testing",
                "DevOps"
            };

            foreach (var name in skills)
            {
                var skill = Skill.Create(
                    name,
                    name is "Project Management" or "Agile" ? "Professional" : "Technical",
                    $"{name} skill");
                skill.SetCreatedBy("system");
                await context.Skills.AddAsync(skill, ct);
            }

            await context.SaveChangesAsync(ct);
        }

        if (!context.Users.Any())
        {
            var departmentId = await context.Departments.Select(d => d.Id).FirstAsync(ct);
            var roles = await context.Roles.ToDictionaryAsync(r => r.Name, ct);

            var users = new[]
            {
                ApplicationUser.Create("admin@pmwds.com", "System", "Administrator", "ADMIN001", "SuperAdmin", departmentId),
                ApplicationUser.Create("manager@pmwds.com", "Project", "Manager", "PM001", "ProjectManager", departmentId),
                ApplicationUser.Create("head@pmwds.com", "Department", "Head", "DH001", "DepartmentHead", departmentId),
                ApplicationUser.Create("lead@pmwds.com", "Team", "Lead", "TL001", "TeamLead", departmentId),
                ApplicationUser.Create("member@pmwds.com", "Team", "Member", "TM001", "TeamMember", departmentId),
                ApplicationUser.Create("viewer@pmwds.com", "Read", "Only", "VW001", "Viewer", departmentId)
            };

            foreach (var user in users)
            {
                user.SetCreatedBy("system");
                if (roles.TryGetValue(user.JobTitle, out var role))
                {
                    user.Roles.Add(role);
                }

                await context.Users.AddAsync(user, ct);
            }

            await context.SaveChangesAsync(ct);
        }

        if (!context.UserProfiles.Any())
        {
            var users = await context.Users.ToListAsync(ct);
            foreach (var user in users)
            {
                var profile = UserProfile.Create(
                    user.Id,
                    $"Profile for {user.FullName}",
                    user.JobTitle,
                    null,
                    null,
                    null,
                    null);
                profile.SetCreatedBy("system");
                await context.UserProfiles.AddAsync(profile, ct);
            }

            await context.SaveChangesAsync(ct);
        }
    }
}
