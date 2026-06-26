using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PMWDS.Domain.Entities;

namespace PMWDS.Persistence.Configurations;

public class MilestoneDepartmentConfiguration : IEntityTypeConfiguration<MilestoneDepartment>
{
    public void Configure(EntityTypeBuilder<MilestoneDepartment> b)
    {
        b.ToTable("MilestoneDepartments");
        b.HasKey(e => e.Id);
        b.HasIndex(e => new { e.MilestoneId, e.DepartmentId }).IsUnique();
        b.HasIndex(e => e.DepartmentId);

        b.HasOne(e => e.Milestone)
            .WithMany(m => m.MilestoneDepartments)
            .HasForeignKey(e => e.MilestoneId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(e => e.Department)
            .WithMany(d => d.MilestoneDepartments)
            .HasForeignKey(e => e.DepartmentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
