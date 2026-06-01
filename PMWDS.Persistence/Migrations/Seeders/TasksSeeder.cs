using Microsoft.EntityFrameworkCore;
using PMWDS.Domain.Entities;
using PMWDS.Domain.Enums;
using PMWDS.Persistence.Context;
using TaskStatus = PMWDS.Domain.Enums.TaskStatus;

namespace PMWDS.Persistence.Migrations.Seeders;

internal static class TasksSeeder
{
    internal static async Task SeedAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var projects = await context.Projects.ToListAsync(ct);
        var users = await context.Users.ToListAsync(ct);

        foreach (var project in projects)
            await SeedTasksForProjectAsync(context, project, users, ct);

        await context.SaveChangesAsync(ct);
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
            await SeedSubtasksAsync(context, task, spec, project.ProjectManagerId, ct);
        }
    }

    private static async Task<ProjectTask> UpsertTaskAsync(ApplicationDbContext context, SeedConstants.TaskSpec spec, CancellationToken ct)
    {
        var task = await context.Tasks.FirstOrDefaultAsync(t => t.ProjectId == spec.ProjectId && t.Title == spec.Title, ct);
        if (task != null)
            return task;

        task = ProjectTask.Create(spec.ProjectId, spec.Title, spec.Description, spec.Priority, spec.Start, spec.Due, spec.EstimatedHours, spec.MilestoneId, spec.ParentTaskId);
        task.SetCreatedBy(SeedConstants.SeedUser);
        task.AssignTo(spec.AssigneeId.ToString(), spec.AssignedById);
        task.UpdateStatus(spec.Status);
        task.UpdateProgress(spec.Progress, spec.Notes);
        task.UpdateAIPrediction(spec.DelayProbability, spec.Due.AddDays(spec.ExpectedDelayDays), "[\"Scope variance\",\"Dependency wait\"]", spec.AssigneeId.ToString());
        await context.Tasks.AddAsync(task, ct);
        return task;
    }

    private static async Task SeedSubtasksAsync(ApplicationDbContext context, ProjectTask parent, SeedConstants.TaskSpec spec, string assignedById, CancellationToken ct)
    {
        var subtaskSpecs = GetSubtaskSpecs(spec.Title);

        foreach (var sub in subtaskSpecs)
        {
            if (await context.Tasks.AnyAsync(t => t.ParentTaskId == parent.Id && t.Title == sub.Title, ct))
                continue;

            var subtask = ProjectTask.Create(parent.ProjectId, sub.Title, sub.Description, TaskPriority.Medium, DateTime.UtcNow.Date.AddDays(-3), parent.DueDate, sub.Hours, parent.MilestoneId, parent.Id);
            subtask.SetCreatedBy(SeedConstants.SeedUser);
            subtask.AssignTo(spec.AssigneeId.ToString(), assignedById);
            subtask.UpdateProgress(sub.Progress, "Seeded subtask progress");
            await context.Tasks.AddAsync(subtask, ct);
        }
    }

    private static SubtaskSpec[] GetSubtaskSpecs(string parentTitle) => parentTitle switch
    {
        "Design data pipeline architecture" => new[]
        {
            new SubtaskSpec("Define metric aggregation strategy", "Choose rollup windows and normalization approach", 6, 40d),
            new SubtaskSpec("Validate against historical projects", "Cross-check pipeline design with past project data", 4, 75d)
        },
        "Build health score algorithm" => new[]
        {
            new SubtaskSpec("Weight calibration workshop", "Facilitate SME session to calibrate scoring weights", 8, 60d),
            new SubtaskSpec("Backtest against past projects", "Run algorithm on historical data to validate accuracy", 6, 35d)
        },
        "Implement SSO login flow" => new[]
        {
            new SubtaskSpec("Configure identity provider", "Set up Azure AD / OIDC provider integration", 6, 50d),
            new SubtaskSpec("Write authentication middleware", "Implement token validation and session handling", 8, 20d)
        },
        "Build ticket tracking UI" => new[]
        {
            new SubtaskSpec("Build ticket list with search and filters", "Implement sortable, filterable ticket data table", 10, 40d),
            new SubtaskSpec("Test with sample ticket data", "Verify CRUD and state transitions with mock data", 6, 70d)
        },
        "Migrate existing knowledge docs" => new[]
        {
            new SubtaskSpec("Build taxonomy and tagging scheme", "Design folder structure and metadata tags", 6, 80d),
            new SubtaskSpec("Run content import script", "Execute and verify bulk import from legacy sources", 8, 55d)
        },
        "Build workspace reporting module" => new[]
        {
            new SubtaskSpec("Create report template engine", "Build parameterized template rendering", 12, 30d),
            new SubtaskSpec("Set up permission boundaries by org", "Implement org-scoped data isolation for reports", 8, 15d)
        },
        "Build email-to-ticket pipeline" => new[]
        {
            new SubtaskSpec("Set up email ingestion handler", "Parse inbound emails into structured ticket fields", 8, 60d),
            new SubtaskSpec("Implement deduplication logic", "Detect and merge duplicate incident reports", 4, 80d)
        },
        "Implement escalation rules engine" => new[]
        {
            new SubtaskSpec("Define SLA escalation thresholds", "Configure tier-based response time policies", 6, 50d),
            new SubtaskSpec("Test with mock incident scenarios", "Validate routing correctness for each escalation path", 8, 25d)
        },
        _ => new[]
        {
            new SubtaskSpec("Prepare acceptance checklist", "Checklist for completion criteria", 4, 30d),
            new SubtaskSpec("Review implementation notes", "Confirm delivery notes and blockers", 3, 75d)
        }
    };

    private static SeedConstants.TaskSpec[] BuildTaskSpecs(Project project, List<Milestone> milestones, List<ApplicationUser> users)
    {
        Guid User(int index) => users.ElementAtOrDefault(index)?.Id ?? users.First().Id;
        Guid? Milestone(int index) => milestones.ElementAtOrDefault(index)?.Id;
        var start = DateTime.UtcNow.Date.AddDays(-7);

        return project.Name switch
        {
            "AI Delivery Control Tower" => new[]
            {
                new SeedConstants.TaskSpec(project.Id, Milestone(0), null, "Design data pipeline architecture", "Define data sources, ingestion strategy, and aggregation pipeline for health metrics", TaskPriority.High, start, start.AddDays(12), 32, User(0), project.ProjectManagerId, TaskStatus.Completed, 100, 0.10, 0, "Architecture approved"),
                new SeedConstants.TaskSpec(project.Id, Milestone(1), null, "Build health score algorithm", "Develop weighted scoring algorithm combining delay, budget, and capacity signals", TaskPriority.Critical, start.AddDays(3), start.AddDays(28), 40, User(1), project.ProjectManagerId, TaskStatus.InProgress, 60, 0.35, 2, "Algorithm being validated")
            },
            "Northwind Client Portal" => new[]
            {
                new SeedConstants.TaskSpec(project.Id, Milestone(0), null, "Implement SSO login flow", "Configure identity provider and implement OIDC-based single sign-on", TaskPriority.Critical, start, start.AddDays(15), 36, User(0), project.ProjectManagerId, TaskStatus.Completed, 100, 0.08, 0, "SSO flow verified"),
                new SeedConstants.TaskSpec(project.Id, Milestone(1), null, "Build ticket tracking UI", "Build sortable data table with filters, detail panel, and state management", TaskPriority.High, start.AddDays(5), start.AddDays(30), 44, User(1), project.ProjectManagerId, TaskStatus.InProgress, 45, 0.30, 3, "Table component in progress")
            },
            "Contoso Transformation Hub" => new[]
            {
                new SeedConstants.TaskSpec(project.Id, Milestone(0), null, "Migrate existing knowledge docs", "Extract, transform, and load legacy documents into new knowledge base", TaskPriority.High, start, start.AddDays(20), 40, User(0), project.ProjectManagerId, TaskStatus.Completed, 100, 0.15, 0, "Migration complete"),
                new SeedConstants.TaskSpec(project.Id, Milestone(1), null, "Build workspace reporting module", "Create parameterized report engine with org-scoped data isolation", TaskPriority.Medium, start.AddDays(8), start.AddDays(35), 48, User(1), project.ProjectManagerId, TaskStatus.InProgress, 30, 0.25, 4, "Template rendering built")
            },
            "Service Operations Automation" => new[]
            {
                new SeedConstants.TaskSpec(project.Id, Milestone(0), null, "Build email-to-ticket pipeline", "Parse inbound emails into structured ticket fields with deduplication", TaskPriority.Critical, start, start.AddDays(14), 32, User(0), project.ProjectManagerId, TaskStatus.Completed, 100, 0.12, 0, "Pipeline verified"),
                new SeedConstants.TaskSpec(project.Id, Milestone(1), null, "Implement escalation rules engine", "Build configurable SLA-based escalation with tiered routing logic", TaskPriority.High, start.AddDays(4), start.AddDays(24), 38, User(1), project.ProjectManagerId, TaskStatus.InProgress, 50, 0.40, 2, "Rule engine wired")
            },
            _ => Array.Empty<SeedConstants.TaskSpec>()
        };
    }

    private static async Task EnsureAssignmentAsync(ApplicationDbContext context, ProjectTask task, Guid userId, string assignedById, CancellationToken ct)
    {
        var exists = await context.TaskAssignments.AnyAsync(a => a.TaskId == task.Id && a.UserId == userId.ToString(), ct);
        if (exists)
            return;

        var assignment = TaskAssignment.Create(task.Id, userId.ToString(), 0.82, "Seeded based on capacity and skills", true);
        await context.TaskAssignments.AddAsync(assignment, ct);
    }

    private sealed record SubtaskSpec(string Title, string Description, int Hours, double Progress);
}
