using Microsoft.EntityFrameworkCore;
using PMWDS.Domain.Entities;
using PMWDS.Persistence.Context;

namespace PMWDS.Persistence.Migrations.Seeders;

internal static class DepartmentsSeeder
{
    internal static async Task SeedAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var orgs = await context.Organizations.ToDictionaryAsync(o => o.Name, ct);
        var specs = new[]
        {
            new SeedConstants.DepartmentSpec("PMWDS Global", "Engineering", "ENG", "Product engineering and platform delivery", 38),
            new SeedConstants.DepartmentSpec("PMWDS Global", "Program Management", "PMO", "Portfolio governance and execution health", 14),
            new SeedConstants.DepartmentSpec("Northwind Delivery Labs", "Client Engineering", "CENG", "Client-specific implementation and integration squads", 24),
            new SeedConstants.DepartmentSpec("Northwind Delivery Labs", "Operations", "OPS", "Service operations and support", 18),
            new SeedConstants.DepartmentSpec("Contoso Transformation Office", "Business Strategy", "BSTR", "Transformation strategy, organizational design, and change management", 12)
        };

        foreach (var spec in specs)
        {
            if (!orgs.TryGetValue(spec.OrganizationName, out var org))
                continue;

            if (await context.Departments.AnyAsync(d => d.OrganizationId == org.Id && d.Code == spec.Code, ct))
                continue;

            var department = Department.Create(spec.Name, spec.Code, spec.Description);
            department.AssignToOrganization(org.Id);
            department.SetMaxCapacity(spec.Capacity);
            department.SetCreatedBy(SeedConstants.SeedUser);
            await context.Departments.AddAsync(department, ct);
        }

        await context.SaveChangesAsync(ct);
        await AssignDepartmentHeadsAsync(context, ct);
    }

    private static async Task AssignDepartmentHeadsAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var head = await context.Users.FirstOrDefaultAsync(u => u.Email == "head@pmwds.com", ct);
        var lead = await context.Users.FirstOrDefaultAsync(u => u.Email == "vikram.singh@northwind-labs.example", ct);
        var departments = await context.Departments.ToListAsync(ct);

        foreach (var department in departments)
        {
            var userId = department.Code == "OPS" ? lead?.Id.ToString() : head?.Id.ToString();
            if (!string.IsNullOrWhiteSpace(userId))
                department.AssignHead(userId);
        }

        await context.SaveChangesAsync(ct);
    }
}
