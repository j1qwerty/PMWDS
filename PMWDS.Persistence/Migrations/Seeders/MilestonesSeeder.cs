using Microsoft.EntityFrameworkCore;
using PMWDS.Domain.Entities;
using PMWDS.Persistence.Context;

namespace PMWDS.Persistence.Migrations.Seeders;

internal static class MilestonesSeeder
{
    internal static async Task SeedAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var projects = await context.Projects.ToListAsync(ct);

        foreach (var project in projects)
            await SeedMilestonesForProjectAsync(context, project, ct);

        await context.SaveChangesAsync(ct);
    }

    private static async Task SeedMilestonesForProjectAsync(ApplicationDbContext context, Project project, CancellationToken ct)
    {
        var specs = GetMilestoneSpecs(project);

        foreach (var spec in specs)
        {
            if (await context.Milestones.AnyAsync(m => m.ProjectId == project.Id && m.Name == spec.Name, ct))
                continue;

            var milestone = Milestone.Create(project.Id, spec.Name, spec.Description, spec.Date, spec.Order, spec.IsActive);
            milestone.AssignDepartments(new List<Guid> { project.DepartmentId });
            milestone.SetCreatedBy(SeedConstants.SeedUser);
            milestone.UpdateProgress(spec.Progress);
            await context.Milestones.AddAsync(milestone, ct);
        }
    }

    private static MilestoneSpec[] GetMilestoneSpecs(Project project) => project.Name switch
    {
        "AI Delivery Control Tower" => new[]
        {
            new MilestoneSpec("Data Pipeline Established", "Core data ingestion and aggregation pipelines operational", project.PlannedStartDate.AddDays(25), 1, true, 100),
            new MilestoneSpec("Dashboard V1 Launched", "First version of operational cockpit released to project managers", project.PlannedStartDate.AddDays(50), 2, true, 40),
            new MilestoneSpec("AI Risk Engine Live", "Predictive risk scoring and alerting activated", project.PlannedEndDate.AddDays(-7), 3, false, 10)
        },
        "Northwind Client Portal" => new[]
        {
            new MilestoneSpec("Design Prototype Approved", "UX mockups and system architecture approved by stakeholders", project.PlannedStartDate.AddDays(20), 1, true, 100),
            new MilestoneSpec("Core Portal Features Delivered", "Self-service dashboard, ticket tracking, and reporting live", project.PlannedStartDate.AddDays(52), 2, true, 50),
            new MilestoneSpec("Client Onboarding Complete", "Pilot clients onboarded with feedback incorporated", project.PlannedEndDate.AddDays(-5), 3, false, 15)
        },
        "Contoso Transformation Hub" => new[]
        {
            new MilestoneSpec("Knowledge Base Populated", "Content migration and knowledge taxonomy finalized", project.PlannedStartDate.AddDays(30), 1, true, 100),
            new MilestoneSpec("Workspace V1 Released", "Initial version of reporting and collaboration workspace deployed", project.PlannedStartDate.AddDays(65), 2, true, 35),
            new MilestoneSpec("Training and Rollout Complete", "Staff trained and hub adopted across the office", project.PlannedEndDate.AddDays(-10), 3, false, 5)
        },
        "Service Operations Automation" => new[]
        {
            new MilestoneSpec("Ingestion Pipeline Built", "Automated incident intake from email, chat, and webhook channels", project.PlannedStartDate.AddDays(18), 1, true, 100),
            new MilestoneSpec("Escalation Workflow Automated", "Tier-based routing and escalation logic operational", project.PlannedStartDate.AddDays(38), 2, true, 55),
            new MilestoneSpec("Runbook and Handoff Complete", "Operational runbooks delivered and support team trained", project.PlannedEndDate.AddDays(-8), 3, false, 20)
        },
        _ => Array.Empty<MilestoneSpec>()
    };

    private sealed record MilestoneSpec(string Name, string Description, DateTime Date, int Order, bool IsActive, double Progress);
}
