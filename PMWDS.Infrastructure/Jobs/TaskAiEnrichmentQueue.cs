using System.Threading.Channels;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PMWDS.Application.Interfaces.Services;

namespace PMWDS.Infrastructure.Jobs;

public sealed class TaskAiEnrichmentQueue : BackgroundService, ITaskAiEnrichmentQueue
{
    private readonly Channel<Guid> _channel = Channel.CreateUnbounded<Guid>(
        new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false,
            AllowSynchronousContinuations = false
        });

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TaskAiEnrichmentQueue> _logger;

    public TaskAiEnrichmentQueue(
        IServiceScopeFactory scopeFactory,
        ILogger<TaskAiEnrichmentQueue> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public ValueTask QueueAsync(Guid taskId, CancellationToken ct = default)
        => _channel.Writer.WriteAsync(taskId, ct);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var taskId in _channel.Reader.ReadAllAsync(stoppingToken))
        {
            await EnrichWithRetryAsync(taskId, stoppingToken);
        }
    }

    private async Task EnrichWithRetryAsync(Guid taskId, CancellationToken ct)
    {
        const int maxAttempts = 3;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var uow = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
                var prediction = scope.ServiceProvider.GetRequiredService<IPredictionService>();

                var task = await uow.Tasks.GetByIdAsync(taskId, ct);
                if (task == null)
                {
                    _logger.LogDebug("Skipping AI enrichment for deleted/missing task {TaskId}.", taskId);
                    return;
                }

                var result = await prediction.PredictTaskDelayAsync(taskId, ct);
                task.UpdateAIPrediction(
                    result.DelayProbability,
                    result.PredictedCompletionDate ?? task.DueDate,
                    string.Join("; ", result.ContributingFactors));

                await uow.Tasks.UpdateAsync(task, ct);
                await uow.SaveChangesAsync(ct);

                _logger.LogDebug(
                    "AI enrichment completed for task {TaskId} on attempt {Attempt}.",
                    taskId,
                    attempt);

                return;
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex) when (attempt < maxAttempts)
            {
                var delay = TimeSpan.FromSeconds(Math.Pow(2, attempt));
                _logger.LogWarning(
                    ex,
                    "AI enrichment attempt {Attempt}/{MaxAttempts} failed for task {TaskId}; retrying in {Delay}.",
                    attempt,
                    maxAttempts,
                    taskId,
                    delay);
                await Task.Delay(delay, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "AI enrichment permanently failed for task {TaskId} after {Attempts} attempts.",
                    taskId,
                    maxAttempts);
            }
        }
    }
}
