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
        var now = DateTime.UtcNow;
        var tasks = (await _uow.Tasks.GetDeadlineReminderCandidatesAsync(
            now,
            now.AddHours(48),
            ct)).ToList();
        foreach (var task in tasks)
        {
            try
            {
                await _notifications
                .SendDeadlineReminderAsync(
                task.Id,
                Math.Max(0, (int)Math.Ceiling(
                (task.DueDate - DateTime.UtcNow).TotalDays)),
                ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                "Failed to send deadline " +
                "reminder for task {TaskId}",
                task.Id);
            }
        }
        var overdue = (await _uow.Tasks.GetOverdueUnescalatedTasksAsync(ct)).ToList();
        foreach (var task in overdue)
        {
            try
            {
                task.Escalate();
                await _uow.Tasks.UpdateAsync(task, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                "Failed to prepare escalation for overdue task {TaskId}", task.Id);
            }
        }

        await _uow.SaveChangesAsync(ct);

        foreach (var task in overdue.Where(task => task.IsEscalated))
        {
            try
            {
                await _notifications.SendEscalationAlertAsync(
                    task.Id,
                    task.EscalationLevel,
                    ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Failed to send escalation alert for task {TaskId}",
                    task.Id);
            }
        }
        _logger.LogInformation(
        "DeadlineCheckerJob completed. " +
        "Reminders: {Reminders}, " +
        "Auto-escalated: {Escalated}",
        tasks.Count(), overdue.Count());
    }
}
