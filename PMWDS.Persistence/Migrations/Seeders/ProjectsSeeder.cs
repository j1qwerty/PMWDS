using Microsoft.EntityFrameworkCore;
using PMWDS.Domain.Entities;
using PMWDS.Domain.Enums;
using PMWDS.Persistence.Context;

namespace PMWDS.Persistence.Migrations.Seeders;

internal static class ProjectsSeeder
{
    internal static async Task SeedAsync(ApplicationDbContext context, CancellationToken ct)
    {
        await ClearExistingProjectsAsync(context, ct);

        var departments = await context.Departments.ToListAsync(ct);
        var users = await context.Users.ToListAsync(ct);
        var spec = BuildProjectSpec(departments, users);

        var project = Project.Create(spec.Name, spec.Description, spec.Category, spec.Priority, spec.DepartmentId, spec.ManagerId.ToString(), spec.Start, spec.End, spec.Budget, spec.Client, spec.ProjectCode);
        project.SetCreatedBy(SeedConstants.SeedUser);
        project.UpdateStatus(ProjectStatus.InProgress);
        project.UpdateProgress(spec.Progress);
        project.AddActualCost(spec.ActualCost);
        project.UpdateAIAnalysis(spec.Health, spec.DelayRisk, spec.BudgetRisk, spec.Insight);
        await context.Projects.AddAsync(project, ct);

        await context.SaveChangesAsync(ct);
    }

    private static async Task ClearExistingProjectsAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var existingProjects = await context.Projects.Select(p => p.Id).ToListAsync(ct);
        if (existingProjects.Count == 0) return;

        // Delete in FK-safe order
        var projectIds = existingProjects.ToHashSet();

        // 1. MilestoneDependencies (RESTRICT FK to Milestones)
        var milestoneDeps = await context.MilestoneDependencies
            .Where(d => projectIds.Contains(d.ProjectId))
            .ToListAsync(ct);
        context.MilestoneDependencies.RemoveRange(milestoneDeps);
        await context.SaveChangesAsync(ct);

        // 2. TaskDependencies (RESTRICT FK to Tasks)
        var allTaskIds = await context.Tasks
            .Where(t => projectIds.Contains(t.ProjectId))
            .Select(t => t.Id)
            .ToListAsync(ct);
        var taskIdSet = allTaskIds.ToHashSet();
        var allTaskDeps = await context.TaskDependencies
            .Where(d => taskIdSet.Contains(d.PredecessorTaskId) || taskIdSet.Contains(d.SuccessorTaskId))
            .ToListAsync(ct);
        context.TaskDependencies.RemoveRange(allTaskDeps);
        await context.SaveChangesAsync(ct);

        // 3. TaskAssignments (FK to Tasks)
        var assignments = await context.TaskAssignments
            .Where(a => taskIdSet.Contains(a.TaskId))
            .ToListAsync(ct);
        context.TaskAssignments.RemoveRange(assignments);
        await context.SaveChangesAsync(ct);

        // 4. Tasks (delete subtasks first due to RESTRICT self-FK on ParentTaskId)
        var subtasks = await context.Tasks
            .Where(t => projectIds.Contains(t.ProjectId) && t.ParentTaskId != null)
            .ToListAsync(ct);
        context.Tasks.RemoveRange(subtasks);
        await context.SaveChangesAsync(ct);

        var parentTasks = await context.Tasks
            .Where(t => projectIds.Contains(t.ProjectId))
            .ToListAsync(ct);
        context.Tasks.RemoveRange(parentTasks);
        await context.SaveChangesAsync(ct);

        // 5. Milestones (FK to Projects is CASCADE, but we explicitly remove)
        var milestones = await context.Milestones
            .Where(m => projectIds.Contains(m.ProjectId))
            .ToListAsync(ct);
        context.Milestones.RemoveRange(milestones);
        await context.SaveChangesAsync(ct);

        // 6. ProjectDepartments
        var projectDepts = await context.ProjectDepartments
            .Where(pd => projectIds.Contains(pd.ProjectId))
            .ToListAsync(ct);
        context.ProjectDepartments.RemoveRange(projectDepts);
        await context.SaveChangesAsync(ct);

        // 7. Projects
        var projects = await context.Projects
            .Where(p => projectIds.Contains(p.Id))
            .ToListAsync(ct);
        context.Projects.RemoveRange(projects);
        await context.SaveChangesAsync(ct);
    }

    private static SeedConstants.ProjectSpec BuildProjectSpec(List<Department> departments, List<ApplicationUser> users)
    {
        var chiefEngineer = users.FirstOrDefault(u => u.EmployeeCode == "CE001") ?? users.First();
        return new SeedConstants.ProjectSpec(
            Name: "Construction of Government Residential Colony ",
            Description: "Development of a government residential colony in Lucknow including land acquisition, planning, construction of residential units, utilities, roads, landscaping, and quality handover.",
            Category: "Infrastructure",
            Priority: ProjectPriority.Critical,
            DepartmentId: departments.First(d => d.Code == "PWD").Id,
            ManagerId: chiefEngineer.Id,
            Start: new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc),
            End: new DateTime(2027, 12, 31, 0, 0, 0, DateTimeKind.Utc),
            Budget: 1850000000m,
            ActualCost: 0m,
            Client: "Government of Uttar Pradesh",
            Progress: 5,
            Health: 85,
            DelayRisk: 0.15,
            BudgetRisk: 0.10,
            Insight: "Project in early stages. Land acquisition phase ongoing.",
            ProjectCode: "UPPWD-COLONY-2026-001");
    }
}
