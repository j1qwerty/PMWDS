using PMWDS.Persistence.Context;
using PMWDS.Persistence.Migrations.Seeders;

namespace PMWDS.Persistence.Migrations;

public static class SeedData
{
    public static async Task SeedAsync(ApplicationDbContext context, CancellationToken ct = default)
    {
        await OrganizationsSeeder.SeedAsync(context, ct);
        await DepartmentsSeeder.SeedAsync(context, ct);
        await RolesAndPermissionsSeeder.SeedAsync(context, ct);
        await UsersSeeder.SeedAsync(context, ct);
        await ProfilesSeeder.SeedAsync(context, ct);
        await ProjectsSeeder.SeedAsync(context, ct);
        await MilestonesSeeder.SeedAsync(context, ct);
        await TasksSeeder.SeedAsync(context, ct);
        await NotificationsSeeder.SeedAsync(context, ct);
        await ActivityLogsSeeder.SeedAsync(context, ct);
        await MiscSeeder.SeedAsync(context, ct);
    }
}
