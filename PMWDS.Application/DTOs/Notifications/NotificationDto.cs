using PMWDS.Domain.Enums;
namespace PMWDS.Application.DTOs.Notifications;

public record NotificationDto(
  Guid Id,
  string Title,
  string Message,
  string Type,
  string Priority,
  bool IsRead,
  DateTime CreatedDate,
  DateTime? ReadDate,
  string? ActionUrl,
  string? RelatedEntityId,
  string? RelatedEntityType,
  bool IsAIGenerated
);

public record SendNotificationDto(
  string UserId,
  string Title,
  string Message,
  NotificationType Type,
  NotificationPriority Priority = NotificationPriority.Normal,
  string? ActionUrl = null,
  string? RelatedEntityId = null,
  string? RelatedEntityType = null,
  bool IsAIGenerated = false
);

/// <summary>
/// Single source of truth for the in-app URL a notification should open.
/// The client router only exposes /projects/:projectId/:tab, so a task
/// notification has to carry its project id - "/tasks/{taskId}" resolves to
/// nothing and silently drops the user on the not-found page.
/// </summary>
public static class NotificationLinks
{
    public const string TaskEntityType = "Task";
    public const string ProjectEntityType = "Project";
    public const string MilestoneEntityType = "Milestone";
    public const string UserEntityType = "User";
    public const string ReportEntityType = "Report";

    public const string AITab = "ai";
    public const string NotificationsTab = "notificationsPage";
    public const string ReportsTab = "reports";
    public const string UsersTab = "users";

    public static string? ForProject(Guid projectId, string tab = "overview")
        => tab == "overview" ? $"/projects/{projectId}" : $"/projects/{projectId}/{tab}";

    /// <summary>Task deep link. <paramref name="taskId"/> is highlighted after the tasks tab mounts.</summary>
    public static string? ForTask(Guid projectId, Guid taskId)
        => $"/projects/{projectId}/tasks?task={taskId}";

    public static string? ForMilestone(Guid projectId)
        => ForProject(projectId, "milestones");

    public static string? ForAi(Guid? projectId = null)
        => projectId.HasValue ? $"/{AITab}?projectId={projectId.Value}" : $"/{AITab}";

    public static string? ForNotifications() => $"/{NotificationsTab}";

    public static string? ForReports() => $"/{ReportsTab}";

    public static string? ForUser(Guid userId) => $"/{UsersTab}?userId={userId}";

    /// <summary>
    /// Last-resort target for a notification whose ActionUrl was never set
    /// (older rows, and AI insights that are not project-scoped).
    /// </summary>
    public static string? FallbackFor(NotificationType type) => type switch
    {
        NotificationType.AIInsight => ForAi(),
        NotificationType.SystemAlert => ForNotifications(),
        _ => null
    };
}
