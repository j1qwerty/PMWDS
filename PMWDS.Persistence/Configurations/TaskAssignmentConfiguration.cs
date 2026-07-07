using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PMWDS.Domain.Entities;

namespace PMWDS.Persistence.Configurations;

public class TaskAssignmentConfiguration
    : IEntityTypeConfiguration<TaskAssignment>
{
    public void Configure(EntityTypeBuilder<TaskAssignment> b)
    {
        b.ToTable("TaskAssignments");
        b.HasKey(e => e.Id);

        b.Property(e => e.UserId)
            .HasMaxLength(64)
            .IsRequired();

        b.Property(e => e.AIRationale)
            .HasMaxLength(2000);

        b.HasOne(e => e.Task)
            .WithMany(t => t.Assignments)
            .HasForeignKey(e => e.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        // The current domain model stores assignee references as string ids,
        // while ApplicationUser uses Guid primary keys. Ignore the navigation
        // until the model is normalized to a single user id type.
        b.Ignore(e => e.User);

        b.HasIndex(e => e.TaskId);
        b.HasIndex(e => e.UserId);
        b.HasIndex(e => e.IsActive);
        b.HasIndex(e => e.IsDeleted);
        b.HasIndex(e => new { e.IsDeleted, e.TaskId, e.UserId, e.IsActive });
    }
}
