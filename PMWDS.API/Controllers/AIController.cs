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
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        return Ok(await _ai.ProcessChatMessageAsync(userId, req.Message, req.Provider, req.Model, ct));
    }

    [HttpGet("providers")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetProviders(CancellationToken ct)
        => Ok(await _ai.GetProvidersAsync(ct));

    [HttpGet("providers/{provider}/models")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> SearchModels(
        string provider,
        [FromQuery] string? search,
        [FromQuery] int limit,
        CancellationToken ct)
        => Ok(await _ai.SearchModelsAsync(provider, search, limit <= 0 ? 25 : limit, ct));

    [HttpPost("providers/{provider}/test")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> TestProvider(
        string provider,
        [FromBody] ProviderTestRequest? req,
        CancellationToken ct)
        => Ok(await _ai.TestProviderAsync(provider, req?.Model, req?.Prompt, ct));

    [HttpPost("train")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> TriggerTraining(CancellationToken ct)
        => Ok(await Mediator.Send(new TriggerAITrainingCommand(), ct));
}

public record ChatRequest(
    string Message,
    string? Provider = null,
    string? Model = null);

public record ProviderTestRequest(
    string? Model = null,
    string? Prompt = null);
