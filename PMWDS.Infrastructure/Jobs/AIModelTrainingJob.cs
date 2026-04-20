using Microsoft.Extensions.Logging;
using PMWDS.Application.Interfaces.Services;
namespace PMWDS.Infrastructure.Jobs;

public interface IAIModelTrainingJob
{
    Task ExecuteAsync(CancellationToken ct);
}
public class AIModelTrainingJob : IAIModelTrainingJob
{
    private readonly IAIService _aiService;
    private readonly ILogger<AIModelTrainingJob> _logger;
    public AIModelTrainingJob(
    IAIService aiService,
    ILogger<AIModelTrainingJob> logger)
    {
        _aiService = aiService;
        _logger = logger;
    }
    public async Task ExecuteAsync(CancellationToken ct)
    {
        _logger.LogInformation(
        "AI Model Training started at {Time}",
        DateTime.UtcNow);
        try
        {
            await _aiService.TrainModelsAsync(ct);
            _logger.LogInformation(
            "AI models re-trained.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
            "Failed to re-train AI models.");
        }
        _logger.LogInformation(
        "AI Model Training completed at {Time}",
        DateTime.UtcNow);
    }
}
