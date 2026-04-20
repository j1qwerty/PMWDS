using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMWDS.Application.Features.AI.Commands;
using PMWDS.Application.Features.AI.Queries;
using PMWDS.Application.Features.Projects.Queries;
using PMWDS.Application.Interfaces.Services;

namespace PMWDS.API.Controllers;

public class AIController : BaseApiController
{
    private readonly IAIService _ai;

    public AIController(IAIService ai)
    {
        _ai = ai;
    }

    [HttpGet("recommend-assignee/{taskId:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> RecommendAssignee(Guid taskId, CancellationToken ct)
        => Ok(await Mediator.Send(new GetAIAssigneeRecommendationQuery(taskId), ct));

    [HttpGet("predict-delay/{taskId:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> PredictDelay(Guid taskId, CancellationToken ct)
        => Ok(await Mediator.Send(new GetTaskDelayPredictionQuery(taskId), ct));

    [HttpGet("project-health/{projectId:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> ProjectHealth(Guid projectId, CancellationToken ct)
        => Ok(await Mediator.Send(new GetProjectHealthQuery(projectId), ct));

    [HttpPost("optimize-resources/{projectId:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> OptimizeResources(Guid projectId, CancellationToken ct)
        => Ok(await _ai.OptimizeResourceAllocationAsync(projectId, ct));

    [HttpGet("burnout-risk")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> BurnoutRisk([FromQuery] Guid? departmentId, CancellationToken ct)
        => Ok(await Mediator.Send(new GetBurnoutRiskQuery(departmentId), ct));

    [HttpGet("insights/{projectId:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Insights(Guid projectId, CancellationToken ct)
        => Ok(await _ai.GenerateProjectInsightsAsync(projectId, ct));

    [HttpPost("chat")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> Chat([FromBody] ChatRequest req, CancellationToken ct)
        => Ok(await Mediator.Send(new ProcessAIChatCommand(req.Message), ct));

    [HttpPost("train")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> TriggerTraining(CancellationToken ct)
        => Ok(await Mediator.Send(new TriggerAITrainingCommand(), ct));
}

public record ChatRequest(string Message);
