using Microsoft.AspNetCore.Identity;
using PMWDS.Domain.Entities;
using PMWDS.Persistence.Context;
namespace PMWDS.Persistence.Migrations;

public static class SeedData
{
    public static async Task SeedAsync(
    ApplicationDbContext context,
    UserManager<ApplicationUser> userManager,
    RoleManager<IdentityRole> roleManager)
    {
        // ── Roles ─────────────────────────────────────────
        string[] roles =
        {
            "SuperAdmin",
            "DepartmentHead",
            "ProjectManager",
            "TeamLead",
            "TeamMember",
            "Viewer"
            };
        foreach (var role in roles)
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(
                new IdentityRole(role));
        // ── Super Admin User ──────────────────────────────
        const string adminEmail = "admin@pmwds.com";
        if (await userManager
        .FindByEmailAsync(adminEmail) == null)
        {
            var admin = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                FirstName = "System",
                LastName = "Administrator",
                JobTitle = "Super Administrator",
                IsActive = true,
                EmailConfirmed = true,
                AvailabilityStatus =
            Domain.Enums.AvailabilityStatus.Available,
                AvailabilityPercentage = 100
            };
            var result = await userManager
            .CreateAsync(admin, "Admin@12345!");
            if (result.Succeeded)
                await userManager.AddToRoleAsync(
                admin, "SuperAdmin");
        }
        // ── Default Department ────────────────────────────
        if (!context.Departments.Any())
        {
            var dept = new Department
            {
                Id = Guid.NewGuid(),


                Name = "Information Technology",
                Code = "IT",
                Description =
            "IT Department — PMWDS Default",
                Budget = 500000m,
                IsActive = true
            };
            dept.SetCreated("system");
            context.Departments.Add(dept);
            await context.SaveChangesAsync();
        }
        // ── Skills ────────────────────────────────────────
        if (!context.Skills.Any())
        {
            var skills = new[]
            {
                "C#", ".NET", "Angular", "React",
                "SQL Server", "Azure", "Python",
                "Project Management", "Agile", "DevOps",
                "UI/UX Design", "Business Analysis",
                "Testing & QA", "Docker", "Kubernetes"
                };
            foreach (var name in skills)
            {
                var skill = new Skill
                {
                    Id = Guid.NewGuid(),
                    Name = name,
                    Category = name is
                "C#" or ".NET" or "Angular" or
                "React" or "Python" or "Docker" or
                "Kubernetes"
                ? "Technical"
               : "Professional"
                };
                skill.SetCreated("system");
                context.Skills.Add(skill);
            }
            await context.SaveChangesAsync();
        }
    }
}