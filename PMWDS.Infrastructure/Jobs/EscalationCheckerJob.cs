using Microsoft.Extensions.Logging;
using PMWDS.Application.Interfaces.Services;
namespace PMWDS.Infrastructure.Jobs;

public interface IEscalationCheckerJob
{
    Task ExecuteAsync(CancellationToken ct);
}
public class EscalationCheckerJob : IEscalationCheckerJob
{
    private readonly IUnitOfWork _uow;
    private readonly IPredictionService _ai;
    private readonly INotificationService _notifications;
    private readonly ILogger<EscalationCheckerJob> _logger;
    public EscalationCheckerJob(
    IUnitOfWork uow,
    IPredictionService ai,
    INotificationService notifications,
    ILogger<EscalationCheckerJob> logger)
    {
        _uow = uow;
        _ai = ai;
        _notifications = notifications;
        _logger = logger;
    }
    public async Task ExecuteAsync(CancellationToken ct)
    {
        _logger.LogInformation(
        "EscalationCheckerJob started at {Time}",
        DateTime.UtcNow);
        const batchSize = 100;
        var skip = 0;

        while (true)
        {
            var activeTasks = await _uow.Tasks.GetActiveTasksBatchAsync(skip, batchSize, ct);
            if (activeTasks.Count == 0)
                break;

            var batchEscalations = new List<ProjectTask>();

            foreach (var task in activeTasks)
            {
                try
                {
                    var prediction = await _ai.PredictTaskDelayAsync(task.Id, ct);
                    if (prediction.ShouldEscalate)
                    {
                        task.Escalate();
                        task.UpdateAIPrediction(
                            prediction.DelayProbability,
                            prediction.PredictedCompletionDate ?? task.DueDate,
                            string.Join("; ", prediction.ContributingFactors),
                            task.AIRecommendedAssigneeId);
                        await _uow.Tasks.UpdateAsync(task, ct);
                        batchEscalations.Add(task);
                        escalatedCount++;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "Error checking escalation for task {TaskId}", task.Id);
                }
            }

            await _uow.SaveChangesAsync(ct);

            foreach (var task in batchEscalations)
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

            skip += activeTasks.Count;
            if (activeTasks.Count < batchSize)
                break;
        }
        _logger.LogInformation(
        "EscalationCheckerJob completed. " +
        "AI-escalated: {Count} tasks.",
        escalatedCount);
    }
}
