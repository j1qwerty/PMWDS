using PMWDS.Domain.Entities;
using PMWDS.Persistence.Context;

namespace PMWDS.Persistence.Migrations;

public static class SeedData
{
    public static async Task SeedAsync(
        ApplicationDbContext context,
        CancellationToken ct = default)
    {
        if (!context.Departments.Any())
        {
            var department = Department.Create(
                "Information Technology",
                "IT",
                "Default PMWDS department");
            department.SetCreatedBy("system");

            await context.Departments.AddAsync(department, ct);
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

        if (!context.Set<ApplicationUser>().Any())
        {
            var departmentId = context.Departments.Select(d => d.Id).First();

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
                await context.Set<ApplicationUser>().AddAsync(user, ct);
            }

            await context.SaveChangesAsync(ct);
        }
    }
}
