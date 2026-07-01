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
            new SeedConstants.DepartmentSpec("org1", "Engineering", "ENG", "Product engineering and platform delivery", 38),
            new SeedConstants.DepartmentSpec("org1", "Program Management", "PMO", "Portfolio governance and execution health", 14),
            new SeedConstants.DepartmentSpec("org1", "Operations", "OPS", "Service operations and support", 18),
            new SeedConstants.DepartmentSpec("org1", "Business Strategy", "BSTR", "Transformation strategy, organizational design, and change management", 12),
            new SeedConstants.DepartmentSpec("org1", "Client Services", "CSV", "Client-specific implementation and support", 24)
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
        var users = await context.Users.ToListAsync(ct);
        var departments = await context.Departments.ToListAsync(ct);

        var headMap = new Dictionary<string, string>
        {
            ["ENG"] = users.FirstOrDefault(u => u.Email == "head.eng@org1.com")?.Id.ToString() ?? "",
            ["PMO"] = users.FirstOrDefault(u => u.Email == "head.pmo@org1.com")?.Id.ToString() ?? "",
            ["OPS"] = users.FirstOrDefault(u => u.Email == "head.ops@org1.com")?.Id.ToString() ?? "",
            ["BSTR"] = users.FirstOrDefault(u => u.Email == "head.bstr@org1.com")?.Id.ToString() ?? "",
            ["CSV"] = users.FirstOrDefault(u => u.Email == "head.csv@org1.com")?.Id.ToString() ?? "",
        };

        foreach (var department in departments)
        {
            if (headMap.TryGetValue(department.Code, out var userId) && !string.IsNullOrWhiteSpace(userId))
                department.AssignHead(userId);
        }

        await context.SaveChangesAsync(ct);
    }
}
