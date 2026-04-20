using Microsoft.Extensions.Options;
using PMWDS.Application.DTOs.AI;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Infrastructure.Settings;
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
        return await _allocation
        .RecommendAsync(task, candidates.ToList(), ct);
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
        var totalTasks = tasks.Count;
        var completed = tasks.Count(t =>
        t.Status == Domain.Enums.TaskStatus.Completed);
        var overdue = tasks.Count(t => t.IsOverdue());
        var highRisk = tasks.Count(t =>


       t.AIDelayProbability >= _settings.RiskThreshold);
        // Health score: 0 – 100
        var health = totalTasks == 0 ? 100.0
        : Math.Max(0, 100
        - (overdue * 10)
        - (highRisk * 5)
        - (project.GetDelayDays() * 2)
        - (project.IsOverBudget() ? 15 : 0));
        var delayRisk = totalTasks == 0 ? 0
        : (double)overdue / totalTasks;
        var budgetRisk = project.PlannedBudget == 0 ? 0
        : Math.Min(1,
        (double)project.ActualCost
        / (double)project.PlannedBudget);
        var insights = await GenerateProjectInsightsAsync(
        projectId, ct);
        var strengths = new List<string>();
        var weaknesses = new List<string>();
        if (completed > 0)
            strengths.Add($"{completed} task(s) completed.");
        if (overdue > 0)
            weaknesses.Add($"{overdue} overdue task(s).");
        if (highRisk > 0)
            weaknesses.Add($"{highRisk} high-risk task(s).");
        return new ProjectHealthDto(
        ProjectId: projectId,
        ProjectName: project.Name,
        OverallHealthScore: health,
        ScheduleHealth: Math.Max(0, 100 - (delayRisk * 100)),
        BudgetHealth: Math.Max(0, 100 - (budgetRisk * 100)),
        TeamHealth: Math.Max(0, 100 - (highRisk * 10.0)),
        QualityHealth: totalTasks == 0 ? 100 : (completed / (double)totalTasks) * 100,
        HealthStatus: health >= 75 ? "Healthy"
        : health >= 50 ? "At Risk" : "Critical",
        Strengths: strengths,
        Weaknesses: weaknesses.Concat(insights).ToList(),
        Recommendations: GetRecommendations(
        health, delayRisk, budgetRisk),
        Risks: BuildRiskFactors(
        project, overdue, highRisk),
        GeneratedAt: DateTime.UtcNow
        );
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
        var tasks = project.Tasks.ToList();
        if (tasks.Any(t => t.IsOverdue()))
            insights.Add(
            $" {tasks.Count(t => t.IsOverdue())} " +
            $"task(s) are overdue and need attention.");
        if (project.IsOverBudget())
            insights.Add(
            $"�Budget exceeded by " +
            $"{project.ActualCost - project.PlannedBudget:C}.");
        if (project.GetDelayDays() > 0)
            insights.Add(
            $"�Project is {project.GetDelayDays()} " +
            $"day(s) behind schedule.");
        var highBurnout = await _uow.Users
        .FindAsync(u =>
        u.AIBurnoutRiskScore > 0.8
        && u.DepartmentId == project.DepartmentId,
        ct);
        if (highBurnout.Any())
            insights.Add(
            $"�{highBurnout.Count()} team member(s) " +
            $"show high burnout risk.");
        // AI-generated narrative via LLM
        if (!string.IsNullOrEmpty(_settings.OpenAIApiKey))
        {
            var summary = await _chat
            .GenerateSummaryAsync(
            $"Summarize project health: " +
            $"Name={project.Name}, " +
            $"Progress={project.ProgressPercentage}%, " +
            $"Delays={project.GetDelayDays()} days, " +
            $"Budget variance=" +
            $"{project.GetBudgetVariance():C}",
            ct);
            insights.Add($"�AI Summary: {summary}");
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
        var unassigned = project.Tasks
        .Where(t => t.AssignedToUserId == null
        && t.Status !=
        Domain.Enums.TaskStatus.Completed)
        .ToList();
        var available = await _uow.Users
        .GetAvailableUsersAsync(ct);
        var actionPlan = new List<string>();
        var suggestions = new List<ReallocationSuggestion>();
        foreach (var user in available)
        {
            var workload = await _uow.Users
            .GetUserWorkloadScoreAsync(
            user.Id.ToString(), ct);
            if (workload > 80)
                actionPlan.Add(
                $"Reduce workload for {user.FullName}.");
        }
        foreach (var task in unassigned)
        {
            var recommendation = await GetOptimalAssigneeAsync(
            task.Id, ct);
            suggestions.Add(new ReallocationSuggestion(
            TaskId: task.Id,
            TaskTitle: task.Title,
            CurrentAssigneeId: task.AssignedToUserId ?? string.Empty,
            CurrentAssigneeName: string.Empty,
            SuggestedAssigneeId: recommendation.RecommendedUserId,
            SuggestedAssigneeName: recommendation.RecommendedUserName,
            Reason: recommendation.Rationale.FirstOrDefault()
            ?? "AI-based allocation recommendation.",
            ImprovementScore: recommendation.ConfidenceScore));
        }
        if (unassigned.Any())
            actionPlan.Add(
            $"Assign {unassigned.Count} unassigned task(s) using AI recommendations.");
        return new ResourceOptimizationDto(
        ProjectId: projectId,
        Suggestions: suggestions,
        ExpectedEfficiencyGain: suggestions.Any() ? 20 : 5,
        TasksAtRisk: unassigned.Count,
        ActionPlan: actionPlan,
        GeneratedAt: DateTime.UtcNow
        );
    }
    public async Task<string>
    GenerateNaturalLanguageSummaryAsync(
    string context,
    CancellationToken ct = default)
    => await _chat.GenerateSummaryAsync(context, ct);
    public async Task<ChatResponseDto> ProcessChatMessageAsync(
    string userId, string message,
    CancellationToken ct = default)
    => await _chat.ProcessAsync(userId, message, ct);
    public async Task TrainModelsAsync(
    CancellationToken ct = default)
    {
        await _allocation.TrainAsync(ct);
        await _delay.TrainAsync(ct);
    }
    private static List<string> GetRecommendations(
    double health, double delayRisk, double budgetRisk)
    {
        var recs = new List<string>();
        if (health < 50)
            recs.Add("Conduct immediate project review meeting.");
        if (delayRisk > 0.5)
            recs.Add(
            "Consider adding resources or adjusting scope.");
        if (budgetRisk > 0.9)
            recs.Add(
            "Escalate budget overrun to executive sponsor.");
        return recs;
    }
    private static List<RiskItem> BuildRiskFactors(
    Domain.Entities.Project project,
    int overdue, int highRisk)
    {
        var risks = new List<RiskItem>();
        if (overdue > 0)
            risks.Add(new RiskItem(
            "Overdue Tasks",
            "Tasks are running past due dates.",
            overdue * 0.1,
            "High",
            "Reassign or reprioritize overdue tasks."));
        if (highRisk > 0)
            risks.Add(new RiskItem(
            "High-Risk Tasks",
            "Several tasks exceed the configured AI risk threshold.",
            highRisk * 0.05,
            "Medium",
            "Monitor closely and provide support."));
        if (project.IsOverBudget())
            risks.Add(new RiskItem(
            "Budget Overrun",
            "Project spend is above the planned budget.",
            0.3,
            "High",
            "Review and control spending immediately."));
        return risks;
    }
}
