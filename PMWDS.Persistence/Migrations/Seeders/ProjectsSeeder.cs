using Microsoft.EntityFrameworkCore;
using PMWDS.Domain.Entities;
using PMWDS.Domain.Enums;
using PMWDS.Persistence.Context;

namespace PMWDS.Persistence.Migrations.Seeders;

internal static class ProjectsSeeder
{
    internal static async Task SeedAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var departments = await context.Departments.ToListAsync(ct);
        var users = await context.Users.ToListAsync(ct);
        var specs = BuildProjectSpecs(departments, users);

        foreach (var spec in specs)
        {
            if (await context.Projects.AnyAsync(p => p.Name == spec.Name, ct))
                continue;

            var project = Project.Create(spec.Name, spec.Description, spec.Category, spec.Priority, spec.DepartmentId, spec.ManagerId.ToString(), spec.Start, spec.End, spec.Budget, spec.Client);
            project.SetCreatedBy(SeedConstants.SeedUser);
            project.UpdateStatus(ProjectStatus.InProgress);
            project.UpdateProgress(spec.Progress);
            project.AddActualCost(spec.ActualCost);
            project.UpdateAIAnalysis(spec.Health, spec.DelayRisk, spec.BudgetRisk, spec.Insight);
            await context.Projects.AddAsync(project, ct);
        }

        await context.SaveChangesAsync(ct);
    }

    private static SeedConstants.ProjectSpec[] BuildProjectSpecs(List<Department> departments, List<ApplicationUser> users)
    {
        var managers = users.Where(u => u.JobTitle.Contains("Manager") || u.JobTitle.Contains("Lead") || u.JobTitle.Contains("Head")).ToList();
        Guid Dept(string code) => departments.FirstOrDefault(d => d.Code == code)?.Id ?? departments.First().Id;
        Guid Manager(int index) => managers.ElementAtOrDefault(index)?.Id ?? users.First().Id;
        var today = DateTime.UtcNow.Date;

        return new[]
        {
            new SeedConstants.ProjectSpec("AI Delivery Control Tower", "Operational cockpit for project health and risk signals", "Platform", ProjectPriority.Critical, Dept("ENG"), Manager(0), today.AddDays(-20), today.AddDays(80), 185000, 72000, "PMWDS Internal", 44, 82, 0.31, 0.22, "Health is stable with capacity watchpoints."),
            new SeedConstants.ProjectSpec("Northwind Client Portal", "Self-service portal for delivery stakeholders", "Client", ProjectPriority.High, Dept("CENG"), Manager(1), today.AddDays(-35), today.AddDays(65), 140000, 61000, "Northwind", 52, 76, 0.38, 0.29, "Milestone dependencies need active follow-up."),
            new SeedConstants.ProjectSpec("Contoso Transformation Hub", "Knowledge and reporting workspace for transformation office", "Transformation", ProjectPriority.Medium, Dept("BSTR"), Manager(2), today.AddDays(-10), today.AddDays(100), 98000, 22000, "Contoso", 25, 88, 0.18, 0.14, "Early delivery is on track."),
            new SeedConstants.ProjectSpec("Service Operations Automation", "Automated incident intake and escalation workflow", "Operations", ProjectPriority.High, Dept("OPS"), Manager(1), today.AddDays(-28), today.AddDays(50), 76000, 41000, "Northwind", 58, 71, 0.46, 0.35, "Reviewer load is the main risk.")
        };
    }
}
