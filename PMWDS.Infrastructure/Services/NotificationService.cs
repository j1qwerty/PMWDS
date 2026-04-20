using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using PMWDS.Application.DTOs.Notifications;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;
using PMWDS.Domain.Enums;
namespace PMWDS.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly IUnitOfWork _uow;
    private readonly IHubContext<Hub> _hub;
    private readonly IEmailService _email;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        IUnitOfWork uow,
        IHubContext<Hub> hub,
        IEmailService email,
        ILogger<NotificationService> logger)
    {
        _uow = uow;
        _hub = hub;
        _email = email;
        _logger = logger;
    }

    public async Task SendAsync(
        SendNotificationDto dto,
        CancellationToken ct = default)
    {
        var notification = Notification.Create(
            dto.UserId,
            dto.Title,
            dto.Message,
            dto.Type,
            dto.Priority,
            dto.ActionUrl,
            dto.RelatedEntityId,
            dto.RelatedEntityType,
            dto.IsAIGenerated);

        notification.SetCreatedBy("system");
        await _uow.Notifications.AddAsync(notification, ct);
        await _uow.SaveChangesAsync(ct);
        await PushToUserAsync(dto.UserId, notification, ct);
    }

    public async Task SendBulkAsync(
        IEnumerable<SendNotificationDto> dtos,
        CancellationToken ct = default)
    {
        foreach (var dto in dtos)
        {
            await SendAsync(dto, ct);
        }
    }

    public Task SendEmailAsync(
        string to,
        string subject,
        string body,
        CancellationToken ct = default)
        => _email.SendEmailAsync(to, subject, body, ct);

    public async Task SendTaskAssignmentAlertAsync(
        Guid taskId,
        string assigneeId,
        CancellationToken ct = default)
    {
        var task = await _uow.Tasks.GetByIdAsync(taskId, ct);
        if (task == null)
        {
            return;
        }

        await SendAsync(new SendNotificationDto(
            assigneeId,
            "New Task Assigned",
            $"You have been assigned \"{task.Title}\".",
            NotificationType.TaskAssigned,
            NotificationPriority.Normal,
            $"/tasks/{taskId}",
            taskId.ToString(),
            "Task"), ct);
    }

    public async Task SendDeadlineReminderAsync(
        Guid taskId,
        int daysRemaining,
        CancellationToken ct = default)
    {
        var task = await _uow.Tasks.GetByIdAsync(taskId, ct);
        if (task?.AssignedToUserId == null)
        {
            return;
        }

        await SendAsync(new SendNotificationDto(
            task.AssignedToUserId,
            "Deadline Approaching",
            $"\"{task.Title}\" is due in {daysRemaining} day(s).",
            NotificationType.TaskDeadline,
            daysRemaining <= 1 ? NotificationPriority.High : NotificationPriority.Normal,
            $"/tasks/{taskId}",
            taskId.ToString(),
            "Task"), ct);
    }

    public async Task SendEscalationAlertAsync(
        Guid taskId,
        int escalationLevel,
        CancellationToken ct = default)
    {
        var task = await _uow.Tasks.GetByIdAsync(taskId, ct);
        if (task == null)
        {
            return;
        }

        var project = await _uow.Projects.GetByIdAsync(task.ProjectId, ct);
        if (project == null)
        {
            return;
        }

        await SendAsync(new SendNotificationDto(
            project.ProjectManagerId,
            "Task Escalated",
            $"\"{task.Title}\" was escalated to level {escalationLevel}.",
            NotificationType.TaskEscalated,
            NotificationPriority.Urgent,
            $"/tasks/{taskId}",
            taskId.ToString(),
            "Task"), ct);
    }

    public async Task SendAIInsightAsync(
        string userId,
        string insight,
        CancellationToken ct = default)
    {
        await SendAsync(new SendNotificationDto(
            userId,
            "AI Insight",
            insight,
            NotificationType.AIInsight,
            NotificationPriority.Normal,
            "/dashboard"), ct);
    }

    private async Task PushToUserAsync(
        string userId,
        Notification notification,
        CancellationToken ct)
    {
        try
        {
            await _hub.Clients
                .Group($"user-{userId}")
                .SendAsync("NotificationReceived", new
                {
                    notification.Id,
                    notification.Title,
                    notification.Message,
                    notification.Type,
                    notification.Priority,
                    notification.ActionUrl,
                    notification.CreatedDate
                }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Failed to push SignalR notification to user {UserId}", userId);
        }
    }
}
