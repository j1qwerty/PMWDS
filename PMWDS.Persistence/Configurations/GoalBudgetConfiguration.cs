using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PMWDS.Domain.Entities;

namespace PMWDS.Persistence.Configurations;

public class GoalBudgetAllocationConfiguration : IEntityTypeConfiguration<GoalBudgetAllocation>
{
    public void Configure(EntityTypeBuilder<GoalBudgetAllocation> b)
    {
        b.ToTable("GoalBudgetAllocations");
        b.HasKey(e => e.Id);
        b.Property(e => e.Amount).HasColumnType("decimal(18,2)");
        b.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
        b.Property(e => e.Reason).HasMaxLength(2000);

        b.HasOne(e => e.Goal).WithMany().HasForeignKey(e => e.GoalId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(e => e.Department).WithMany().HasForeignKey(e => e.DepartmentId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(e => e.SupersedesAllocation).WithMany().HasForeignKey(e => e.SupersedesAllocationId).OnDelete(DeleteBehavior.Restrict);

        b.HasIndex(e => e.GoalId);
        b.HasIndex(e => new { e.GoalId, e.Status });
    }
}
