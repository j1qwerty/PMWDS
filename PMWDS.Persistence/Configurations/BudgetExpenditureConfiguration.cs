using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PMWDS.Domain.Entities;

namespace PMWDS.Persistence.Configurations;

public class BudgetExpenditureConfiguration : IEntityTypeConfiguration<BudgetExpenditure>
{
    public void Configure(EntityTypeBuilder<BudgetExpenditure> b)
    {
        b.ToTable("BudgetExpenditures");
        b.HasKey(e => e.Id);
        b.Property(e => e.Amount).HasColumnType("decimal(18,2)");
        b.Property(e => e.Description).HasMaxLength(4000).IsRequired();
        b.Property(e => e.InvoiceNumber).HasMaxLength(200);
        b.Property(e => e.EnteredByUserId).HasMaxLength(100).IsRequired();

        b.HasOne(e => e.GoalBudgetAllocation).WithMany().HasForeignKey(e => e.GoalBudgetAllocationId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(e => e.BudgetRelease).WithMany().HasForeignKey(e => e.BudgetReleaseId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne(e => e.Document).WithMany().HasForeignKey(e => e.DocumentId).OnDelete(DeleteBehavior.SetNull);

        b.HasIndex(e => e.GoalBudgetAllocationId);
        b.HasIndex(e => e.BudgetReleaseId);
        b.HasIndex(e => e.DocumentId);
        b.HasIndex(e => e.SpentOn);
    }
}
