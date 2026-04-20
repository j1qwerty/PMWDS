using Microsoft.Extensions.Logging;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;
namespace PMWDS.Infrastructure.Jobs;

public interface IDeadlineCheckerJob
{
    Task ExecuteAsync(CancellationToken ct);
}
public class DeadlineCheckerJob : IDeadlineCheckerJob
{
    private readonly IUnitOfWork _uow;
    private readonly INotificationService _notifications;


    private readonly ILogger<DeadlineCheckerJob> _logger;
    public DeadlineCheckerJob(
    IUnitOfWork uow,
    INotificationService notifications,
    ILogger<DeadlineCheckerJob> logger)
    {
        _uow = uow;
        _notifications = notifications;
        _logger = logger;
    }
    public async Task ExecuteAsync(CancellationToken ct)
    {
        _logger.LogInformation(
        "DeadlineCheckerJob started at {Time}",
        DateTime.UtcNow);
        var tasks = (await _uow.Tasks
        .GetAllAsync(ct))
        .Where(t =>
        !t.IsEscalated &&
        t.Status != Domain.Enums.TaskStatus.Completed &&
        t.DueDate >= DateTime.UtcNow &&
        t.DueDate <= DateTime.UtcNow.AddHours(48))
        .ToList();
        foreach (var task in tasks)
        {
            try
            {
                var daysRemaining = Math.Max(0,
                (int)Math.Ceiling((task.DueDate - DateTime.UtcNow).TotalDays));
                await _notifications
                .SendDeadlineReminderAsync(
                task.Id, daysRemaining, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                "Failed to send deadline " +
                "reminder for task {TaskId}",
                task.Id);
            }
        }
        var overdue = await _uow.Tasks
        .GetOverdueTasksAsync(ct);
        foreach (var task in overdue
        .Where(t => !t.IsEscalated))
        {
            try
            {
                task.Escalate();
                await _uow.Tasks.UpdateAsync(task, ct);
                await _notifications
                .SendEscalationAlertAsync(
                task.Id,
               task.EscalationLevel, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                "Failed to escalate overdue " +
                "task {TaskId}", task.Id);
            }
        }
        await _uow.SaveChangesAsync(ct);
        _logger.LogInformation(
        "DeadlineCheckerJob completed. " +
        "Reminders: {Reminders}, " +
        "Auto-escalated: {Escalated}",
        tasks.Count(), overdue.Count());
    }
}
