using Microsoft.Extensions.Options;
using PMWDS.AI.Models;
using PMWDS.Application.DTOs.AI;
using PMWDS.Application.Interfaces.Services;
namespace PMWDS.AI.Services;
public class AIService : IAIService
{
 private readonly IUnitOfWork _uow;
 private readonly ITaskAllocationEngine _allocation;
 private readonly IDelayPredictionEngine _delay;
 private readonly IChatEngine _chat;
 private readonly AISettings _settings;
 public AIService(
 IUnitOfWork uow,
 ITaskAllocationEngine allocation,
 IDelayPredictionEngine delay,
 IChatEngine chat,
 IOptions<AISettings> settings)
 {
 _uow = uow;
 _allocation = allocation;
 _delay = delay;
 _chat = chat;
 _settings = settings.Value;
 }
 public async Task<AssigneeRecommendationDto>
 GetOptimalAssigneeAsync(
 Guid taskId,
 CancellationToken ct = default)
 {
 var task = await _uow.Tasks
 .GetWithDetailsAsync(taskId, ct)
 ?? throw new NotFoundException(
 "Task", taskId);
 var candidates = await _uow.Users
 .GetAvailableUsersAsync(ct);
 var recommendation = await _allocation
 .RecommendAsync(task, candidates.ToList(), ct);
 return new AssigneeRecommendationDto(
 recommendation.TaskId,
 recommendation.RecommendedUserId,
 recommendation.RecommendedUserName,
 recommendation.ConfidenceScore,
 recommendation.Rationale,
 recommendation.Alternatives,
 recommendation.FeatureScores,
 recommendation.GeneratedAt);
 }
 public async Task<DelayPredictionDto>
 PredictTaskDelayAsync(
 Guid taskId,
 CancellationToken ct = default)
 {
 var task = await _uow.Tasks
 .GetWithDetailsAsync(taskId, ct)
 ?? throw new NotFoundException(
 "Task", taskId);
 return await _delay.PredictAsync(task, ct);
 }
 public async Task<ProjectHealthDto>
 AnalyzeProjectHealthAsync(
 Guid projectId,
 CancellationToken ct = default)
 {
 var project = await _uow.Projects
 .GetWithDetailsAsync(projectId, ct)
 ?? throw new NotFoundException(
 "Project", projectId);
 var tasks = project.Tasks.ToList();
 var completed = tasks.Count(t =>
 t.Status == Domain.Enums.TaskStatus.Completed);
 var overdue = tasks.Count(t => t.IsOverdue());
 var scheduleHealth = tasks.Count == 0
 ? 100
 : Math.Max(0, 100 - ((double)overdue / tasks.Count * 100));
 var budgetHealth = project.PlannedBudget == 0
 ? 100
 : Math.Max(0, 100 - ((double)project.ActualCost / (double)project.PlannedBudget * 100));
 var overall = Math.Round((scheduleHealth + budgetHealth + project.AIHealthScore) / 3, 2);
 return new ProjectHealthDto(
 project.Id,
 project.Name,
 overall,
 scheduleHealth,
 budgetHealth,
 100 - Math.Min(100, tasks.Sum(t => t.AIDelayProbability * 10)),
 completed == tasks.Count && tasks.Count > 0 ? 100 : 75,
 overall >= 75 ? "Healthy" : overall >= 50 ? "At Risk" : "Critical",
 new() { "AI scoring available" },
 overdue > 0 ? new() { $"{overdue} overdue task(s)" } : new(),
 await GenerateProjectInsightsAsync(projectId, ct),
 BuildRisks(project, overdue),
 DateTime.UtcNow);
 }
 public async Task<List<string>>
 GenerateProjectInsightsAsync(
 Guid projectId,
 CancellationToken ct = default)
 {
 var project = await _uow.Projects
 .GetWithDetailsAsync(projectId, ct);
 if (project == null) return new();
 var insights = new List<string>();
 if (project.GetDelayDays() > 0)
 insights.Add($"Project is delayed by {project.GetDelayDays()} day(s).");
 if (project.IsOverBudget())
 insights.Add($"Project is over budget by {project.ActualCost - project.PlannedBudget:C}.");
 if (!string.IsNullOrWhiteSpace(project.AIInsightsSummary))
 insights.Add(project.AIInsightsSummary);
 if (!string.IsNullOrWhiteSpace(_settings.OpenAIApiKey))
 {
 var summary = await _chat.GenerateSummaryAsync(
 $"Project={project.Name}; Progress={project.ProgressPercentage}; DelayDays={project.GetDelayDays()}; BudgetVariance={project.GetBudgetVariance()}",
 ct);
 insights.Add(summary);
 }
 return insights;
 }
 public async Task<ResourceOptimizationDto>
 OptimizeResourceAllocationAsync(
 Guid projectId,
 CancellationToken ct = default)
 {
 var project = await _uow.Projects
 .GetWithDetailsAsync(projectId, ct)
 ?? throw new NotFoundException(
 "Project", projectId);
 var tasksAtRisk = project.Tasks.Count(t =>
 t.AIDelayProbability >= _settings.RiskThreshold);
 var suggestions = new List<ReallocationSuggestion>();
 foreach (var task in project.Tasks.Where(t => t.AssignedToUserId == null).Take(5))
 {
 suggestions.Add(new ReallocationSuggestion(
 task.Id,
 task.Title,
 string.Empty,
 string.Empty,
 string.Empty,
 "Unassigned",
 "Assign to an available team member.",
 10));
 }
 return new ResourceOptimizationDto(
 projectId,
 suggestions,
 suggestions.Any() ? 15 : 5,
 tasksAtRisk,
 new() { "Review at-risk tasks", "Rebalance unassigned work" },
 DateTime.UtcNow);
 }
 public Task<string>
 GenerateNaturalLanguageSummaryAsync(
 string context,
 CancellationToken ct = default)
 => _chat.GenerateSummaryAsync(context, ct);
 public Task<ChatResponseDto> ProcessChatMessageAsync(
 string userId, string message,
 CancellationToken ct = default)
 => _chat.ProcessAsync(userId, message, ct);
 public async Task TrainModelsAsync(
 CancellationToken ct = default)
 {
 await _allocation.TrainAsync(ct);
 await _delay.TrainAsync(ct);
 }
 private static List<RiskItem> BuildRisks(
 Domain.Entities.Project project,
 int overdue)
 {
 var risks = new List<RiskItem>();
 if (overdue > 0)
 risks.Add(new RiskItem(
 "Schedule",
 $"{overdue} overdue task(s)",
 Math.Min(1, overdue * 0.1),
 "High",
 "Reprioritize overdue tasks."));
 if (project.IsOverBudget())
 risks.Add(new RiskItem(
 "Budget",
 "Project is over budget.",
 0.8,
 "High",
 "Review spending and scope."));
 return risks;
 }
}
