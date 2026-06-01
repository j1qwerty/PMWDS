using Microsoft.EntityFrameworkCore;
using PMWDS.Domain.Entities;
using PMWDS.Persistence.Context;

namespace PMWDS.Persistence.Migrations.Seeders;

internal static class OrganizationsSeeder
{
    internal static async Task SeedAsync(ApplicationDbContext context, CancellationToken ct)
    {
        var organizations = new[]
        {
            Organization.Create("PMWDS Global", "PMWDS-001", "12 Delivery Avenue, Bengaluru", "contact@pmwds.com", "+91-080-5555-0101", DateTime.UtcNow.Date.AddYears(-8)),
            Organization.Create("Northwind Delivery Labs", "NDL-2026", "400 Lakeview Drive, Austin", "ops@northwind-labs.example", "+1-512-555-0198", DateTime.UtcNow.Date.AddYears(-5)),
            Organization.Create("Contoso Transformation Office", "CTO-7781", "9 Market Street, London", "hello@contoso-transform.example", "+44-20-5555-0142", DateTime.UtcNow.Date.AddYears(-3))
        };

        foreach (var organization in organizations)
        {
            if (await context.Organizations.AnyAsync(o => o.Name == organization.Name || o.TaxId == organization.TaxId, ct))
                continue;

            organization.SetCreatedBy(SeedConstants.SeedUser);
            await context.Organizations.AddAsync(organization, ct);
        }

        await context.SaveChangesAsync(ct);
    }
}
