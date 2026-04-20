using PMWDS.Application.DTOs.AI;
using PMWDS.Domain.Entities;
namespace PMWDS.Application.Interfaces.Services;

public interface IAIService
{
   Task<AssigneeRecommendationDto> GetOptimalAssigneeAsync(
   Guid taskId,
   CancellationToken ct = default);
   Task<DelayPredictionDto> PredictTaskDelayAsync(
      Guid taskId,
   CancellationToken ct = default);
   Task<ProjectHealthDto> AnalyzeProjectHealthAsync(
   Guid projectId,
   CancellationToken ct = default);
   Task<List<string>> GenerateProjectInsightsAsync(
   Guid projectId,
   CancellationToken ct = default);
   Task<ResourceOptimizationDto> OptimizeResourceAllocationAsync(
   Guid projectId,
   CancellationToken ct = default);
   Task<string> GenerateNaturalLanguageSummaryAsync(
   string context,
   CancellationToken ct = default);
   Task<IReadOnlyList<AIProviderInfoDto>> GetProvidersAsync(
   CancellationToken ct = default);
   Task<IReadOnlyList<AIModelInfoDto>> SearchModelsAsync(
   string provider,
   string? search = null,
   int limit = 25,
   CancellationToken ct = default);
   Task<AIProviderTestResultDto> TestProviderAsync(
   string provider,
   string? model = null,
   string? prompt = null,
   CancellationToken ct = default);
   Task<ChatResponseDto> ProcessChatMessageAsync(
   string userId, string message,
   string? provider = null,
   string? model = null,
   CancellationToken ct = default);
   Task TrainModelsAsync(
   CancellationToken ct = default);
}
