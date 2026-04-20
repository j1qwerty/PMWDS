using Microsoft.Extensions.Logging;
using PMWDS.Application.Interfaces.Services;
using PMWDS.AI.Services;
namespace PMWDS.Infrastructure.Jobs;

public interface IEscalationCheckerJob
{
    Task ExecuteAsync(CancellationToken ct);
}
public class EscalationCheckerJob : IEscalationCheckerJob
{
    private readonly IUnitOfWork _uow;
    private readonly IDelayPredictionEngine _predictor;
    private readonly INotificationService _notifications;
    private readonly ILogger<EscalationCheckerJob> _logger;
    public EscalationCheckerJob(
    IUnitOfWork uow,
    IDelayPredictionEngine predictor,
    INotificationService notifications,
    ILogger<EscalationCheckerJob> logger)
    {
        _uow = uow;
        _predictor = predictor;
        _notifications = notifications;
        _logger = logger;
    }
    public async Task ExecuteAsync(CancellationToken ct)
    {
        _logger.LogInformation(
        "EscalationCheckerJob started at {Time}",
        DateTime.UtcNow);
        int escalatedCount = 0;
        var activeTasks = await _uow.Tasks
        .GetActiveTasksAsync(ct);
        foreach (var task in activeTasks
        .Where(t => !t.IsEscalated))
        {
            try
            {
                var prediction =
                await _predictor.PredictAsync(task, ct);
                if (prediction.ShouldEscalate)
                {
                    task.Escalate();
                    task.UpdateAIScores(
                     prediction.DelayProbability,
                    task.AIOptimalAssigneeScore,
                    string.Join("; ",


                    prediction.ContributingFactors));
                    await _uow.Tasks.UpdateAsync(task, ct);
                    await _notifications
                    .SendEscalationAlertAsync(
                    task.Id,
                   task.EscalationLevel, ct);
                    escalatedCount++;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                "Error checking escalation " +
                "for task {TaskId}", task.Id);
            }
        }
        await _uow.SaveChangesAsync(ct);
        _logger.LogInformation(
        "EscalationCheckerJob completed. " +
        "AI-escalated: {Count} tasks.",
        escalatedCount);
    }
}