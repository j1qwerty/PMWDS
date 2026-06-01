using Microsoft.EntityFrameworkCore;
using PMWDS.Domain.Entities;
using PMWDS.Persistence.Context;

namespace PMWDS.Persistence.Migrations.Seeders;

internal static class ActivityLogsSeeder
{
    internal static async Task SeedAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var users = await context.Users.Take(5).ToListAsync(ct);
        var activities = new[] { "ProjectViewed", "TaskUpdated", "ReportGenerated", "KnowledgePublished", "IntegrationSynced" };

        foreach (var user in users)
        {
            foreach (var activity in activities.Take(3))
            {
                var exists = await context.ActivityLogs.AnyAsync(a => a.UserId == user.Id && a.ActivityType == activity, ct);
                if (exists)
                    continue;

                var log = ActivityLog.Create(user.Id, activity, $"{user.FullName} performed {activity}.", new { source = "seed", user.EmployeeCode });
                log.SetCreatedBy(SeedConstants.SeedUser);
                await context.ActivityLogs.AddAsync(log, ct);
            }
        }

        await context.SaveChangesAsync(ct);
    }
}
