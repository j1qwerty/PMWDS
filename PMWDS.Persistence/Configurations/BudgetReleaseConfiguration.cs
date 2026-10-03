using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PMWDS.Domain.Entities;

namespace PMWDS.Persistence.Configurations;

public class BudgetReleaseConfiguration : IEntityTypeConfiguration<BudgetRelease>
{
    public void Configure(EntityTypeBuilder<BudgetRelease> b)
    {
        b.ToTable("BudgetReleases");
        b.HasKey(e => e.Id);
        b.Property(e => e.AmountRequested).HasColumnType("decimal(18,2)");
        b.Property(e => e.AmountApproved).HasColumnType("decimal(18,2)");
        b.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
        b.Property(e => e.RequiredConditionsJson).HasColumnType("TEXT");
        b.Property(e => e.SatisfiedConditionsJson).HasColumnType("TEXT");
        b.Property(e => e.Justification).HasMaxLength(2000);
        b.Property(e => e.RequestedByUserId).HasMaxLength(100).IsRequired();
        b.Property(e => e.ReviewedByUserId).HasMaxLength(100);
        b.Property(e => e.ReviewNotes).HasMaxLength(2000);

        b.HasOne(e => e.GoalBudgetAllocation).WithMany().HasForeignKey(e => e.GoalBudgetAllocationId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(e => e.GoalBudgetAllocationId);
        b.HasIndex(e => new { e.GoalBudgetAllocationId, e.Status });
        b.HasIndex(e => e.RequestedOn);
    }
}
