using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PMWDS.Domain.Entities;

namespace PMWDS.Persistence.Configurations;

public class TimeEntryConfiguration
    : IEntityTypeConfiguration<TimeEntry>
{
    public void Configure(EntityTypeBuilder<TimeEntry> b)
    {
        b.ToTable("TimeEntries");
        b.HasKey(e => e.Id);

        b.Property(e => e.UserId)
            .HasMaxLength(64)
            .IsRequired();

        b.Property(e => e.Description)
            .HasMaxLength(2000)
            .IsRequired();

        b.HasOne(e => e.Task)
            .WithMany(t => t.TimeEntries)
            .HasForeignKey(e => e.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        // The domain still tracks time entry users via string ids.
        b.Ignore(e => e.User);

        b.HasIndex(e => e.TaskId);
        b.HasIndex(e => e.UserId);
        b.HasIndex(e => e.StartTime);
        b.HasIndex(e => e.IsDeleted);
        b.HasIndex(e => new { e.IsDeleted, e.TaskId, e.UserId, e.StartTime });
    }
}
