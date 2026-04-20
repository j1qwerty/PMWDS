using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMWDS.Application.Features.AI.Commands;
using PMWDS.Application.Features.AI.Queries;
namespace PMWDS.API.Controllers;

public class AIController : BaseApiController
{
    /// <summary>
    /// Get AI optimal assignee recommendation for a task
    /// </summary>
    [HttpGet("recommend-assignee/{taskId:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> RecommendAssignee(
    Guid taskId, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetAIAssigneeRecommendationQuery(taskId), ct));
    /// <summary>Predict delay probability for a task</summary>
    [HttpGet("predict-delay/{taskId:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> PredictDelay(
    Guid taskId, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetTaskDelayPredictionQuery(taskId), ct));
    /// <summary>Analyse project health with AI</summary>
    [HttpGet("project-health/{projectId:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> ProjectHealth(
    Guid projectId, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetProjectHealthQuery(projectId), ct));
    /// <summary>
    /// Get AI resource optimisation plan for a project
    /// </summary>
    [HttpPost("optimize-resources/{projectId:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> OptimizeResources(
    Guid projectId, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new OptimizeResourcesCommand(projectId), ct));
    /// <summary>
    /// Get burnout risk scores across a department
    /// </summary>
    [HttpGet("burnout-risk")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> BurnoutRisk(
    [FromQuery] Guid? departmentId,
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetBurnoutRiskQuery(departmentId), ct));
    /// <summary>
    /// Get AI-generated project insights
    /// </summary>
    [HttpGet("insights/{projectId:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Insights(
    Guid projectId, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetProjectInsightsQuery(projectId), ct));
    /// <summary>
    /// Send a message to the PMWDS AI assistant
    /// </summary>
    [HttpPost("chat")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> Chat(
    [FromBody] ChatRequest req,
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new ProcessAIChatCommand(req.Message), ct));
    /// <summary>
    /// Trigger manual AI model re-training (Admin)
    /// </summary>
    [HttpPost("train")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> TriggerTraining(
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new TriggerAITrainingCommand(), ct));
}
public record ChatRequest(string Message);