using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using PMWDS.API.Hubs;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;
using PMWDS.Domain.Enums;
namespace PMWDS.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly IUnitOfWork _uow;
    private readonly IHubContext<NotificationHub> _hub;
    private readonly IEmailService _email;
    private readonly ILogger<NotificationService> _logger;
    public NotificationService(
    IUnitOfWork uow,
    IHubContext<NotificationHub> hub,
    IEmailService email,
    ILogger<NotificationService> logger)
    {
        _uow = uow;
        _hub = hub;
        _email = email;
        _logger = logger;
    }
    public async Task SendTaskAssignedAsync(
    Guid taskId, string assigneeId,
    CancellationToken ct = default)
    {
        var task = await _uow.Tasks
        .GetByIdAsync(taskId, ct);
        if (task == null) return;
        var notification = Notification.Create(
        title: "New Task Assigned",
        message: $"You have been assigned: " +
        $"\"{task.Title}\" " +
        $"due {task.DueDate:dd MMM yyyy}.",
        type: NotificationType.TaskAssigned,
        priority: NotificationPriority.Normal,
        userId: assigneeId,
        actionUrl: $"/tasks/{taskId}",
        relatedEntityId: taskId.ToString(),
        relatedEntityType: "Task");
        notification.SetCreated("system");
        await _uow.Notifications.AddAsync(notification, ct);
        await _uow.SaveChangesAsync(ct);
        await PushToUserAsync(assigneeId, notification, ct);
        // Email notification
        var user = await _uow.Users
        .GetByIdAsync(Guid.Parse(assigneeId), ct);
        if (user?.Email != null)
            await _email.SendEmailAsync(
            user.Email,
            "New Task Assigned — PMWDS",
            BuildTaskAssignedEmailBody(
            user.FirstName, task), ct);
    }
    public async Task SendDeadlineReminderAsync(
    Guid taskId,
    CancellationToken ct = default)
    {
        var task = await _uow.Tasks
        .GetByIdAsync(taskId, ct);
        if (task?.AssignedToUserId == null) return;
        var hoursLeft = (task.DueDate - DateTime.UtcNow)
        .TotalHours;
        var priority = hoursLeft <= 24
        ? NotificationPriority.High
        : NotificationPriority.Normal;
        var notification = Notification.Create(
        title: "�Deadline Approaching",
        message: $"\"{task.Title}\" is due in " +
        $"{hoursLeft:F0} hours.",
        type: NotificationType.DeadlineReminder,
        priority: priority,
        userId: task.AssignedToUserId,


        actionUrl: $"/tasks/{taskId}",
        relatedEntityId: taskId.ToString(),
        relatedEntityType: "Task");
        notification.SetCreated("system");
        await _uow.Notifications.AddAsync(notification, ct);
        await _uow.SaveChangesAsync(ct);
        await PushToUserAsync(
        task.AssignedToUserId, notification, ct);
    }
    public async Task SendEscalationAlertAsync(
    Guid taskId, int escalationLevel,
    CancellationToken ct = default)
    {
        var task = await _uow.Tasks
        .GetByIdAsync(taskId, ct);
        if (task == null) return;
        var project = await _uow.Projects
        .GetByIdAsync(task.ProjectId, ct);
        // Notify project manager
        if (project?.ProjectManagerId != null)
        {
            var notification = Notification.Create(
            title: "�Task Escalated",
            message: $"\"{task.Title}\" has been " +
            $"escalated (Level {escalationLevel}).",
            type: NotificationType.Escalation,
            priority: NotificationPriority.Urgent,
            userId: project.ProjectManagerId,
            actionUrl: $"/tasks/{taskId}",
            relatedEntityId: taskId.ToString(),
            relatedEntityType: "Task");
            notification.SetCreated("system");
            await _uow.Notifications
            .AddAsync(notification, ct);
            await PushToUserAsync(
            project.ProjectManagerId,
            notification, ct);
        }
        // Notify department managers via group
        await _hub.Clients
        .Group($"role-ProjectManager")
        .SendAsync("EscalationAlert", new
        {
            TaskId = taskId,
            TaskTitle = task.Title,
            ProjectId = task.ProjectId,
            EscalationLevel = escalationLevel,
            Timestamp = DateTime.UtcNow
        }, ct);
        await _uow.SaveChangesAsync(ct);
    }
    public async Task SendProjectCreatedAsync(
    Guid projectId,
    CancellationToken ct = default)
    {
        var project = await _uow.Projects
        .GetByIdAsync(projectId, ct);
        if (project == null) return;
        var notification = Notification.Create(
        title: "�Project Created",
        message: $"You are the project manager for " +
        $"\"{project.Name}\".",
        type: NotificationType.ProjectUpdate,
        priority: NotificationPriority.Normal,
        userId: project.ProjectManagerId,
        actionUrl: $"/projects/{projectId}",
        relatedEntityId: projectId.ToString(),
        relatedEntityType: "Project");
        notification.SetCreated("system");
        await _uow.Notifications.AddAsync(notification, ct);
        await _uow.SaveChangesAsync(ct);
        await PushToUserAsync(
        project.ProjectManagerId, notification, ct);
    }
    public async Task SendProjectStatusChangedAsync(
    Guid projectId,
    ProjectStatus oldStatus,
    ProjectStatus newStatus,
    CancellationToken ct = default)
    {
        var project = await _uow.Projects
        .GetByIdAsync(projectId, ct);
        if (project == null) return;
        var notification = Notification.Create(
        title: "�Project Status Changed",
        message: $"\"{project.Name}\" status changed " +
        $"from {oldStatus} to {newStatus}.",
        type: NotificationType.ProjectUpdate,
        priority: NotificationPriority.Normal,
        userId: project.ProjectManagerId,
        actionUrl: $"/projects/{projectId}",
        relatedEntityId: projectId.ToString(),
        relatedEntityType: "Project");
        notification.SetCreated("system");
        await _uow.Notifications.AddAsync(notification, ct);
        await _uow.SaveChangesAsync(ct);
        await PushToUserAsync(
        project.ProjectManagerId, notification, ct);
        // Push live dashboard update
        await _hub.Clients
        .Group($"dept-{project.DepartmentId}")
        .SendAsync("ProjectStatusChanged", new
        {
            ProjectId = projectId,
            ProjectName = project.Name,
            OldStatus = oldStatus.ToString(),
            NewStatus = newStatus.ToString(),
            Timestamp = DateTime.UtcNow
        }, ct);
    }

    pivate async Task PushToUserAsync(
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
            "Failed to push SignalR notification " +
            "to user {UserId}", userId);
        }
    }
    private static string BuildTaskAssignedEmailBody(
    string firstName, ProjectTask task)
    => $"""
 <html><body>
 <h2>New Task Assignment — PMWDS</h2>
 <p>Dear {firstName},</p>
 <p>You have been assigned a new task:</p>
 <table border='1' cellpadding='8'>
 <tr><td><strong>Task</strong></td>
 <td>{task.Title}</td></tr>
 <tr><td><strong>Priority</strong></td>
 <td>{task.Priority}</td></tr>
 <tr><td><strong>Due Date</strong></td>
 <td>{task.DueDate:dd MMM yyyy}</td></tr>
 <tr><td><strong>Est. Hours</strong></td>
 <td>{task.EstimatedHours}h</td></tr>
 </table>
 <p>Log in to PMWDS to view full details.</p>
 </body></html>
 """;
}