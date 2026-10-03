using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PMWDS.Domain.Entities;

namespace PMWDS.Persistence.Configurations;

public class GoalConfiguration : IEntityTypeConfiguration<Goal>
{
    public void Configure(EntityTypeBuilder<Goal> b)
    {
        b.ToTable("Goals");
        b.HasKey(e => e.Id);
        b.Property(e => e.Title).HasMaxLength(300).IsRequired();
        b.Property(e => e.Description).HasMaxLength(4000);
        b.Property(e => e.Priority).HasConversion<string>().HasMaxLength(20);
        b.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
        b.Property(e => e.ProgressPercentage).HasColumnType("decimal(5,2)");

        b.HasOne(e => e.Project).WithMany().HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(e => e.AssignedDepartment).WithMany().HasForeignKey(e => e.AssignedDepartmentId).OnDelete(DeleteBehavior.Restrict);

        b.HasIndex(e => e.ProjectId);
        b.HasIndex(e => new { e.ProjectId, e.AssignedDepartmentId });
        b.HasIndex(e => e.Status);
        b.HasIndex(e => e.DueDate);
    }
}
