using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PMWDS.Domain.Entities;
namespace PMWDS.Persistence.Configurations;

public class MilestoneConfiguration
 : IEntityTypeConfiguration<Milestone>
{
    public void Configure(EntityTypeBuilder<Milestone> b)
    {
        b.ToTable("Milestones");
        b.HasKey(e => e.Id);
        b.Property(e => e.Name)
        .HasMaxLength(300).IsRequired();
        b.Property(e => e.Description)
        .HasMaxLength(2000);
        b.Property(e => e.Status)
        .HasConversion<string>().HasMaxLength(20);
        b.Property(e => e.ProgressPercentage)
        .HasColumnType("decimal(5,2)");
        b.HasMany(e => e.Tasks)
        .WithOne(t => t.Milestone)
        .HasForeignKey(t => t.MilestoneId)
        .OnDelete(DeleteBehavior.SetNull);
        b.HasIndex(e => e.ProjectId);
        b.HasIndex(e => e.Status);
        b.HasIndex(e => e.DueDate);
    }
}
