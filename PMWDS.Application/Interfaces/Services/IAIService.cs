using PMWDS.Application.DTOs.AI;
using PMWDS.Domain.Entities;
namespace PMWDS.Application.Interfaces.Services;

public interface IAIService
{
   Task<AssigneeRecommendationDto> GetOptimalAssigneeAsync(
   Guid taskId,
   CancellationToken ct = default);
   Task<AllocationRecommendationRecordDto> GenerateRecommendationAsync(
   Guid taskId,
   CancellationToken ct = default);
   Task<IReadOnlyList<AllocationRecommendationRecordDto>>
   GetRecommendationHistoryAsync(
   Guid taskId,
   CancellationToken ct = default);
   Task<AllocationRecommendationRecordDto> AcceptRecommendationAsync(
   Guid recommendationId,
   CancellationToken ct = default);
   Task<AllocationRecommendationRecordDto> RejectRecommendationAsync(
   Guid recommendationId,
   string reason,
   CancellationToken ct = default);
   Task<string> ExplainRecommendationAsync(
   Guid recommendationId,
   CancellationToken ct = default);
   Task<DelayPredictionDto> PredictTaskDelayAsync(
      Guid taskId,
   CancellationToken ct = default);
   Task<DelayPredictionRecordDto> GenerateDelayPredictionAsync(
   Guid taskId,
   CancellationToken ct = default);
   Task<IReadOnlyList<DelayPredictionRecordDto>>
   GetPredictionHistoryAsync(
   Guid taskId,
   CancellationToken ct = default);
   Task<IReadOnlyList<DelayPredictionRecordDto>>
   PredictProjectDelaysAsync(
   Guid projectId,
   CancellationToken ct = default);
   Task<TaskAnalysisDto> AnalyzeTaskForAllocationAsync(
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
   Task<IReadOnlyList<AIModelDto>> GetModelsAsync(
   string? modelType = null,
   CancellationToken ct = default);
   Task<AIModelDto?> GetModelByIdAsync(
   Guid modelId,
   CancellationToken ct = default);
   Task<AIModelDto> UpsertModelAsync(
   Guid? modelId,
   UpsertAIModelDto dto,
   CancellationToken ct = default);
   Task DeleteModelAsync(
   Guid modelId,
   CancellationToken ct = default);
   Task<IReadOnlyList<TrainingDataPointDto>> GetTrainingDataAsync(
   string? dataType = null,
   CancellationToken ct = default);
   Task<TrainingDataPointDto> AddTrainingDataPointAsync(
   CreateTrainingDataPointDto dto,
   CancellationToken ct = default);
   Task<IReadOnlyList<PredictionResultDto>> GetPredictionResultsAsync(
   Guid? taskId = null,
   Guid? modelId = null,
   CancellationToken ct = default);
   Task<IReadOnlyDictionary<string, double>>
   GetModelPerformanceAsync(
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

    Task<string> GenerateStructuredReportAsync(
        string systemPrompt,
        string userContext,
        CancellationToken ct = default);
}
