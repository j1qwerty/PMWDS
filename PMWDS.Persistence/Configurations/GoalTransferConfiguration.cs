using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PMWDS.Domain.Entities;

namespace PMWDS.Persistence.Configurations;

public class GoalTransferConfiguration : IEntityTypeConfiguration<GoalTransfer>
{
    public void Configure(EntityTypeBuilder<GoalTransfer> b)
    {
        b.ToTable("GoalTransfers");
        b.HasKey(e => e.Id);
        b.Property(e => e.RequestedByUserId).HasMaxLength(100).IsRequired();
        b.Property(e => e.ReviewedByUserId).HasMaxLength(100);
        b.Property(e => e.Reason).HasMaxLength(2000);
        b.Property(e => e.ReviewNotes).HasMaxLength(2000);
        b.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);

        b.HasOne(e => e.Goal).WithMany().HasForeignKey(e => e.GoalId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(e => e.FromDepartment).WithMany().HasForeignKey(e => e.FromDepartmentId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(e => e.ToDepartment).WithMany().HasForeignKey(e => e.ToDepartmentId).OnDelete(DeleteBehavior.Restrict);

        b.HasIndex(e => e.GoalId);
        b.HasIndex(e => new { e.GoalId, e.Status });
    }
}
