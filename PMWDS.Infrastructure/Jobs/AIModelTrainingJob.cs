using Microsoft.Extensions.Logging;
using PMWDS.AI.Services;
namespace PMWDS.Infrastructure.Jobs;

public interface IAIModelTrainingJob
{
    Task ExecuteAsync(CancellationToken ct);
}
public class AIModelTrainingJob : IAIModelTrainingJob
{
    private readonly IDelayPredictionEngine _engine;
    private readonly ITaskAllocationEngine _allocation;
    private readonly ILogger<AIModelTrainingJob> _logger;
    public AIModelTrainingJob(
    IDelayPredictionEngine engine,
    ITaskAllocationEngine allocation,
    ILogger<AIModelTrainingJob> logger)
    {
        _engine = engine;
        _allocation = allocation;
        _logger = logger;
    }
    public async Task ExecuteAsync(CancellationToken ct)
    {
        _logger.LogInformation(
        "AI Model Training started at {Time}",
        DateTime.UtcNow);
        try
        {
            await _engine.TrainAsync(ct);
            _logger.LogInformation(
            "DelayPredictionEngine re-trained.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
            "Failed to re-train " +
            "DelayPredictionEngine.");
        }
        _logger.LogInformation(
        "AI Model Training completed at {Time}",
        DateTime.UtcNow);
    }
}