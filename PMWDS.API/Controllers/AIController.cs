using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;
using PMWDS.API.Services;
using PMWDS.Application.DTOs.AI;
using PMWDS.Application.Features.AI.Commands;
using PMWDS.Application.Features.AI.Queries;
using PMWDS.Application.Features.Projects.Queries;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;
using PMWDS.Infrastructure.Settings;
using PMWDS.Persistence.Context;

namespace PMWDS.API.Controllers;

public class AIController : BaseApiController
{
    private readonly IAIService _ai;
    private readonly AISettings _aiSettings;
    private readonly ApplicationDbContext _db;
    private readonly IUnitOfWork _uow;
    private readonly RoleScopeService _scope;

    public AIController(
        IAIService ai,
        IOptions<AISettings> aiSettings,
        ApplicationDbContext db,
        IUnitOfWork uow,
        RoleScopeService scope)
    {
        _ai = ai;
        _aiSettings = aiSettings.Value;
        _db = db;
        _uow = uow;
        _scope = scope;
    }

    [HttpGet("settings")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetAISettings(CancellationToken ct)
    {
        var stored = (await _db.AIProviderCredentials.AsNoTracking().ToListAsync(ct))
            .ToDictionary(p => p.Provider, StringComparer.OrdinalIgnoreCase);
        
        return Ok(new AISettingsDto
        {
            DefaultProvider = _aiSettings.DefaultProvider,
            DefaultModel = _aiSettings.DefaultModel,
            RiskThreshold = _aiSettings.RiskThreshold,
            UseLocalModel = _aiSettings.UseLocalModel,
            MLModelPath = _aiSettings.MLModelPath,
            Providers = new List<AIProviderSettingsDto>
            {
                CreateProviderDto("OpenAI", "OpenAI", _aiSettings.OpenAI, stored),
                CreateProviderDto("OpenRouter", "OpenRouter", _aiSettings.OpenRouter, stored)
            }
        });
    }

    [HttpPost("settings")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> SaveAISettings([FromBody] AISettingsDto dto, CancellationToken ct)
    {
        if (dto.Providers.Count == 0)
        {
            return BadRequest(new { message = "At least one AI provider is required." });
        }

        foreach (var provider in dto.Providers)
        {
            if (string.IsNullOrWhiteSpace(provider.Provider))
            {
                return BadRequest(new { message = "Provider code is required." });
            }

            if (provider.Enabled && string.IsNullOrWhiteSpace(provider.BaseUrl))
            {
                return BadRequest(new { message = $"{provider.Provider} base URL is required when enabled." });
            }

            var existing = await _db.AIProviderCredentials.FirstOrDefaultAsync(
                p => p.Provider == provider.Provider,
                ct);

            if (existing == null)
            {
                existing = AIProviderCredential.Create(
                    provider.Provider,
                    provider.DisplayName,
                    provider.Enabled,
                    provider.UseEnvironmentDefault,
                    provider.BaseUrl,
                    provider.ApiKey,
                    provider.DefaultModel);
                existing.SetCreatedBy(User.Identity?.Name ?? "system");
                await _db.AIProviderCredentials.AddAsync(existing, ct);
            }
            else
            {
                existing.Update(
                    provider.Provider,
                    provider.DisplayName,
                    provider.Enabled,
                    provider.UseEnvironmentDefault,
                    provider.BaseUrl,
                    provider.ApiKey,
                    provider.DefaultModel);
            }
        }

        await _db.SaveChangesAsync(ct);

        return Ok(new { success = true, message = "AI provider settings saved to the database." });
    }

    private static AIProviderSettingsDto CreateProviderDto(
        string provider,
        string displayName,
        AIProviderOptions options,
        IReadOnlyDictionary<string, AIProviderCredential> stored)
        => stored.TryGetValue(provider, out var credential)
            ? new AIProviderSettingsDto
            {
                Provider = credential.Provider,
                DisplayName = credential.DisplayName,
                Enabled = credential.Enabled,
                UseEnvironmentDefault = credential.UseEnvironmentDefault,
                BaseUrl = credential.BaseUrl,
                ApiKey = "",
                HasStoredKey = !string.IsNullOrWhiteSpace(credential.ApiKey),
                DefaultModel = credential.DefaultModel
            }
            : new AIProviderSettingsDto
            {
                Provider = provider,
                DisplayName = displayName,
                Enabled = options.Enabled,
                UseEnvironmentDefault = true,
                BaseUrl = options.BaseUrl,
                ApiKey = "",
                HasStoredKey = !string.IsNullOrWhiteSpace(options.ApiKey),
                DefaultModel = options.DefaultModel
            };

    [HttpGet("recommend-assignee/{taskId:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> RecommendAssignee(Guid taskId, CancellationToken ct)
        => Ok(await Mediator.Send(new GetAIAssigneeRecommendationQuery(taskId), ct));

    [HttpPost("recommendations/{taskId:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GenerateRecommendation(Guid taskId, CancellationToken ct)
        => Ok(await _ai.GenerateRecommendationAsync(taskId, ct));

    [HttpGet("recommendations/{taskId:guid}/history")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetRecommendationHistory(Guid taskId, CancellationToken ct)
        => Ok(await _ai.GetRecommendationHistoryAsync(taskId, ct));

    [HttpPost("recommendations/{recommendationId:guid}/accept")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> AcceptRecommendation(Guid recommendationId, CancellationToken ct)
        => Ok(await _ai.AcceptRecommendationAsync(recommendationId, ct));

    [HttpPost("recommendations/{recommendationId:guid}/reject")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> RejectRecommendation(
        Guid recommendationId,
        [FromBody] RejectRecommendationRequest request,
        CancellationToken ct)
        => Ok(await _ai.RejectRecommendationAsync(recommendationId, request.Reason, ct));

    [HttpGet("recommendations/{recommendationId:guid}/explanation")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> ExplainRecommendation(Guid recommendationId, CancellationToken ct)
        => Ok(new { explanation = await _ai.ExplainRecommendationAsync(recommendationId, ct) });

    [HttpGet("tasks/{taskId:guid}/analysis")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> AnalyzeTask(Guid taskId, CancellationToken ct)
        => Ok(await _ai.AnalyzeTaskForAllocationAsync(taskId, ct));

    [HttpGet("predict-delay/{taskId:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> PredictDelay(Guid taskId, CancellationToken ct)
    {
        var task = await _uow.Tasks.GetByIdAsync(taskId, ct);
        if (task == null)
        {
            return NotFound();
        }

        if (!await _scope.CanAccessProjectAsync(task.ProjectId, ct))
        {
            return Forbid();
        }

        return Ok(await Mediator.Send(new GetTaskDelayPredictionQuery(taskId), ct));
    }

    [HttpPost("predictions/{taskId:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GenerateDelayPrediction(Guid taskId, CancellationToken ct)
        => Ok(await _ai.GenerateDelayPredictionAsync(taskId, ct));

    [HttpGet("predictions/{taskId:guid}/history")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetPredictionHistory(Guid taskId, CancellationToken ct)
        => Ok(await _ai.GetPredictionHistoryAsync(taskId, ct));

    [HttpPost("projects/{projectId:guid}/predictions")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> PredictProjectDelays(Guid projectId, CancellationToken ct)
        => Ok(await _ai.PredictProjectDelaysAsync(projectId, ct));

    [HttpGet("prediction-results")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetPredictionResults(
        [FromQuery] Guid? taskId,
        [FromQuery] Guid? modelId,
        CancellationToken ct)
        => Ok(await _ai.GetPredictionResultsAsync(taskId, modelId, ct));

    [HttpGet("project-health/{projectId:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> ProjectHealth(Guid projectId, CancellationToken ct)
    {
        if (!await _scope.CanAccessProjectAsync(projectId, ct))
        {
            return Forbid();
        }

        return Ok(await Mediator.Send(new GetProjectHealthQuery(projectId), ct));
    }

    [HttpPost("optimize-resources/{projectId:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> OptimizeResources(Guid projectId, CancellationToken ct)
        => Ok(await _ai.OptimizeResourceAllocationAsync(projectId, ct));

    [HttpGet("burnout-risk")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> BurnoutRisk([FromQuery] Guid? departmentId, CancellationToken ct)
    {
        if (departmentId.HasValue && !await _scope.CanAccessDepartmentAsync(departmentId.Value, ct))
        {
            return Forbid();
        }

        var candidateUsers = departmentId.HasValue
            ? await _uow.Users.GetByDepartmentAsync(departmentId.Value, ct)
            : await _uow.Users.GetAllAsync(ct);
        var scopedUsers = await _scope.ScopeUsersAsync(candidateUsers.AsQueryable(), ct);
        var users = scopedUsers.ToList();

        return Ok(users
            .OrderByDescending(u => u.AIBurnoutRiskScore)
            .Select(u => new BurnoutRiskDto(
                UserId: u.Id.ToString(),
                FullName: u.FullName,
                BurnoutRisk: u.AIBurnoutRiskScore,
                WorkloadScore: u.AIWorkloadScore,
                ActiveTasks: u.GetActiveTaskCount(),
                RiskLevel: u.AIBurnoutRiskScore switch
                {
                    >= 0.8 => "Critical",
                    >= 0.6 => "High",
                    >= 0.4 => "Medium",
                    _ => "Low"
                },
                Recommendations: GetBurnoutRecommendations(u.AIBurnoutRiskScore)))
            .ToList());
    }

    [HttpGet("insights/{projectId:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> Insights(Guid projectId, CancellationToken ct)
    {
        if (!await _scope.CanAccessProjectAsync(projectId, ct))
        {
            return Forbid();
        }

        return Ok(await _ai.GenerateProjectInsightsAsync(projectId, ct));
    }

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

    [HttpGet("models")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> GetModels([FromQuery] string? modelType, CancellationToken ct)
        => Ok(await _ai.GetModelsAsync(modelType, ct));

    [HttpGet("models/{modelId:guid}")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> GetModel(Guid modelId, CancellationToken ct)
    {
        var model = await _ai.GetModelByIdAsync(modelId, ct);
        return model == null ? NotFound() : Ok(model);
    }

    [HttpPost("models")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> CreateModel([FromBody] UpsertAIModelDto dto, CancellationToken ct)
        => Ok(await _ai.UpsertModelAsync(null, dto, ct));

    [HttpPut("models/{modelId:guid}")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> UpdateModel(Guid modelId, [FromBody] UpsertAIModelDto dto, CancellationToken ct)
        => Ok(await _ai.UpsertModelAsync(modelId, dto, ct));

    [HttpDelete("models/{modelId:guid}")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> DeleteModel(Guid modelId, CancellationToken ct)
    {
        await _ai.DeleteModelAsync(modelId, ct);
        return NoContent();
    }

    [HttpGet("training-data")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> GetTrainingData([FromQuery] string? dataType, CancellationToken ct)
        => Ok(await _ai.GetTrainingDataAsync(dataType, ct));

    [HttpPost("training-data")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> AddTrainingData([FromBody] CreateTrainingDataPointDto dto, CancellationToken ct)
        => Ok(await _ai.AddTrainingDataPointAsync(dto, ct));

    [HttpGet("performance")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> GetModelPerformance(CancellationToken ct)
        => Ok(await _ai.GetModelPerformanceAsync(ct));

    private static List<string> GetBurnoutRecommendations(double burnoutRisk)
        => burnoutRisk switch
        {
            >= 0.8 => new()
            {
                "Immediately reassign tasks.",
                "Schedule mandatory rest period.",
                "HR intervention recommended."
            },
            >= 0.6 => new()
            {
                "Reduce task load by 30%.",
                "No new task assignments.",
                "Weekly check-in required."
            },
            >= 0.4 => new()
            {
                "Monitor workload closely.",
                "Avoid overtime assignments."
            },
            _ => new()
            {
                "Continue standard monitoring."
            }
        };
}

public record ChatRequest(
    string Message,
    string? Provider = null,
    string? Model = null);

public record ProviderTestRequest(
    string? Model = null,
    string? Prompt = null);

public record RejectRecommendationRequest(
    string Reason);

public record AISettingsDto
{
    public string DefaultProvider { get; set; } = "OpenAI";
    public string DefaultModel { get; set; } = "";
    public double RiskThreshold { get; set; } = 0.7;
    public bool UseLocalModel { get; set; } = false;
    public string MLModelPath { get; set; } = "";
    public List<AIProviderSettingsDto> Providers { get; set; } = new();
}

public record AIProviderSettingsDto
{
    public string Provider { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public bool Enabled { get; set; }
    public bool UseEnvironmentDefault { get; set; } = true;
    public string BaseUrl { get; set; } = "";
    public string ApiKey { get; set; } = "";
    public bool HasStoredKey { get; set; }
    public string DefaultModel { get; set; } = "";
}
