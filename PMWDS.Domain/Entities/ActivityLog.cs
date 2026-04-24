using PMWDS.Domain.Common;
using System.Text.Json;

namespace PMWDS.Domain.Entities;

public class ActivityLog : AuditableEntity
{
    public Guid UserId { get; private set; }
    public string ActivityType { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public DateTime Timestamp { get; private set; } = DateTime.UtcNow;
    public string MetadataJson { get; private set; } = "{}";

    protected ActivityLog() { }

    public static ActivityLog Create(Guid userId, string activityType, string description, object? metadata)
    {
        return new ActivityLog
        {
            UserId = userId,
            ActivityType = activityType.Trim(),
            Description = description,
            Timestamp = DateTime.UtcNow,
            MetadataJson = JsonSerializer.Serialize(metadata ?? new Dictionary<string, object>())
        };
    }

    public void Update(string activityType, string description, object? metadata)
    {
        ActivityType = activityType.Trim();
        Description = description;
        MetadataJson = JsonSerializer.Serialize(metadata ?? new Dictionary<string, object>());
        Timestamp = DateTime.UtcNow;
    }
}
