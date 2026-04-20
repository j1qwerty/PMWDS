namespace PMWDS.Application.DTOs.AI;
public record AssigneeRecommendationDto(
 Guid TaskId,
 string RecommendedUserId,
 string RecommendedUserName,
 double ConfidenceScore,
 List<string> Rationale,
 List<AlternativeAssignee> Alternatives,
 Dictionary<string, double> FeatureScores,
 DateTime GeneratedAt);
public record AlternativeAssignee(
 string UserId,
 string UserName,
 double Score,
 string Reason);
public record DelayPredictionDto(
 Guid TaskId,
 double DelayProbability,
 int ExpectedDelayDays,
 DateTime PredictedCompletionDate,
 string RiskLevel,
 List<string> ContributingFactors,
 List<string> MitigationStrategies,
 bool ShouldEscalate);
public record AllocationRecommendationDto(
 Guid TaskId,
 string RecommendedUserId,
 string RecommendedUserName,
 double ConfidenceScore,
 List<string> Rationale,
 List<AlternativeAssignee> Alternatives,
 Dictionary<string, double> FeatureScores,
 DateTime GeneratedAt);
public record ProjectHealthDto(
 Guid ProjectId,
 string ProjectName,
 double OverallHealthScore,
 double ScheduleHealth,
 double BudgetHealth,
 double TeamHealth,
 double QualityHealth,
 string HealthStatus,
 List<string> Strengths,
 List<string> Weaknesses,
 List<string> Recommendations,
 List<RiskItem> Risks,
 DateTime GeneratedAt);
public record RiskItem(
 string Category,
 string Description,
 double Probability,
 string Severity,
 string MitigationStrategy);
public record ChatResponseDto(
 string Message,
 string Intent,
 List<string> SuggestedActions,
 object? ContextData,
 bool RequiresConfirmation);
public record BurnoutRiskDto(
 string UserId,
 string FullName,
 double BurnoutRisk,
 double WorkloadScore,
 int ActiveTasks,
 string RiskLevel,
 List<string> Recommendations);
public record ResourceOptimizationDto(
 Guid ProjectId,
 List<ReallocationSuggestion> Suggestions,
 double ExpectedEfficiencyGain,
 int TasksAtRisk,
 List<string> ActionPlan,
 DateTime GeneratedAt);
public record ReallocationSuggestion(
 Guid TaskId,
 string TaskTitle,
 string CurrentAssigneeId,
 string CurrentAssigneeName,
 string SuggestedAssigneeId,
 string SuggestedAssigneeName,
 string Reason,
 double ImprovementScore);
