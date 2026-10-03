namespace PMWDS.Application.Interfaces.Services;

public interface ITaskAiEnrichmentQueue
{
    ValueTask QueueAsync(Guid taskId, CancellationToken ct = default);
}
