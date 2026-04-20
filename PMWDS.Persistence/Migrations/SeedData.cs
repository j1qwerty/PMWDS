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
            var dept = Department.Create(
                "Information Technology",
                "IT",
                "IT Department PMWDS Default");
            dept.SetCreatedBy("system");
            context.Departments.Add(dept);
        }

        if (!context.Skills.Any())
        {
            foreach (var name in new[]
            {
                "C#", ".NET", "Angular", "React", "SQL Server",
                "Azure", "Python", "Project Management", "Agile", "DevOps"
            })
            {
                var category = name is "C#" or ".NET" or "Angular" or "React" or "Python"
                    ? "Technical"
                    : "Professional";
                var skill = Skill.Create(name, category, $"{name} skill");
                skill.SetCreatedBy("system");
                context.Skills.Add(skill);
            }
        }

        await context.SaveChangesAsync(ct);
    }
}
