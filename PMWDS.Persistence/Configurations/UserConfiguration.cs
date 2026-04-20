using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PMWDS.Domain.Entities;
namespace PMWDS.Persistence.Configurations;

public class UserConfiguration
 : IEntityTypeConfiguration<ApplicationUser>
{
    public void Configure(EntityTypeBuilder<ApplicationUser> b)
    {
        b.Property(e => e.FirstName)
        .HasMaxLength(100).IsRequired();
        b.Property(e => e.LastName)
        .HasMaxLength(100).IsRequired();
        b.Property(e => e.JobTitle)
        .HasMaxLength(200);
        b.Property(e => e.EmployeeCode)
        .HasMaxLength(50);
        b.Property(e => e.TimeZone)
        .HasMaxLength(100);
        b.Property(e => e.AvailabilityStatus)
        .HasConversion<string>().HasMaxLength(30);
        b.Property(e => e.AvailabilityPercentage)
        .HasColumnType("decimal(5,2)");
        b.Property(e => e.AIPerformanceScore)
        .HasColumnType("decimal(5,2)");
        b.Property(e => e.AIWorkloadScore)
        .HasColumnType("decimal(5,2)");
        b.Property(e => e.AIBurnoutRiskScore)
        .HasColumnType("decimal(5,4)");
        b.Ignore(e => e.Skills);
        b.HasIndex(e => e.EmployeeCode).IsUnique();
        b.HasIndex(e => e.DepartmentId);
    }
}
