using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using PMWDS.Application.Features.AI.Commands;
using PMWDS.Application.Features.AI.Queries;
using PMWDS.Application.Features.Projects.Queries;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Infrastructure.Settings;

namespace PMWDS.API.Controllers;

public class AIController : BaseApiController
{
    private readonly IAIService _ai;
    private readonly AISettings _aiSettings;
    private readonly IConfiguration _configuration;
    private readonly string _settingsFilePath;

    public AIController(IAIService ai, IOptions<AISettings> aiSettings, IConfiguration configuration)
    {
        _ai = ai;
        _aiSettings = aiSettings.Value;
        _configuration = configuration;
        _settingsFilePath = Path.Combine(AppContext.BaseDirectory, "ai-settings.json");
    }

    [HttpGet("settings")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> GetAISettings(CancellationToken ct)
    {
        var loadedSettings = LoadSettingsFromFile();
        var settings = loadedSettings ?? _aiSettings;
        
        return Ok(new AISettingsDto
        {
            DefaultProvider = settings.DefaultProvider,
            DefaultModel = settings.DefaultModel,
            RiskThreshold = settings.RiskThreshold,
            UseLocalModel = settings.UseLocalModel,
            MLModelPath = settings.MLModelPath,
            Providers = new List<AIProviderSettingsDto>
            {
                new() { Provider = "OpenAI", DisplayName = "OpenAI", Enabled = settings.OpenAI.Enabled, BaseUrl = settings.OpenAI.BaseUrl, ApiKey = "", DefaultModel = settings.OpenAI.DefaultModel },
                new() { Provider = "OpenRouter", DisplayName = "OpenRouter", Enabled = settings.OpenRouter.Enabled, BaseUrl = settings.OpenRouter.BaseUrl, ApiKey = "", DefaultModel = settings.OpenRouter.DefaultModel },
                new() { Provider = "OpenCode", DisplayName = "OpenCode", Enabled = settings.OpenCode.Enabled, BaseUrl = settings.OpenCode.BaseUrl, ApiKey = "", DefaultModel = settings.OpenCode.DefaultModel }
            }
        });
    }

    [HttpPost("settings")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> SaveAISettings([FromBody] AISettingsDto dto, CancellationToken ct)
    {
        var settings = new Dictionary<string, object>
        {
            ["AI"] = new
            {
                DefaultProvider = dto.DefaultProvider,
                DefaultModel = dto.DefaultModel,
                RiskThreshold = dto.RiskThreshold,
                UseLocalModel = dto.UseLocalModel,
                MLModelPath = dto.MLModelPath,
                OpenAI = new { Enabled = dto.Providers.FirstOrDefault(p => p.Provider == "OpenAI")?.Enabled ?? false, BaseUrl = dto.Providers.FirstOrDefault(p => p.Provider == "OpenAI")?.BaseUrl ?? "https://api.openai.com/v1", DefaultModel = dto.Providers.FirstOrDefault(p => p.Provider == "OpenAI")?.DefaultModel ?? "gpt-4o" },
                OpenRouter = new { Enabled = dto.Providers.FirstOrDefault(p => p.Provider == "OpenRouter")?.Enabled ?? false, BaseUrl = dto.Providers.FirstOrDefault(p => p.Provider == "OpenRouter")?.BaseUrl ?? "https://openrouter.ai/api/v1", DefaultModel = dto.Providers.FirstOrDefault(p => p.Provider == "OpenRouter")?.DefaultModel ?? "openai/gpt-4o-mini" },
                OpenCode = new { Enabled = dto.Providers.FirstOrDefault(p => p.Provider == "OpenCode")?.Enabled ?? false, BaseUrl = dto.Providers.FirstOrDefault(p => p.Provider == "OpenCode")?.BaseUrl ?? "https://opencode.ai/zen/v1", DefaultModel = dto.Providers.FirstOrDefault(p => p.Provider == "OpenCode")?.DefaultModel ?? "bigpickle" }
            }
        };

        foreach (var provider in dto.Providers.Where(p => !string.IsNullOrEmpty(p.ApiKey)))
        {
            var aiSection = ((dynamic)settings["AI"]);
            switch (provider.Provider)
            {
                case "OpenAI":
                    ((dynamic)aiSection.OpenAI).ApiKey = provider.ApiKey;
                    break;
                case "OpenRouter":
                    ((dynamic)aiSection.OpenRouter).ApiKey = provider.ApiKey;
                    break;
                case "OpenCode":
                    ((dynamic)aiSection.OpenCode).ApiKey = provider.ApiKey;
                    break;
            }
        }

        var json = System.Text.Json.JsonSerializer.Serialize(settings, new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
        await System.IO.File.WriteAllTextAsync(_settingsFilePath, json, ct);

        return Ok(new { success = true, message = "AI settings saved successfully. Restart the application for changes to take effect." });
    }

    private AISettings? LoadSettingsFromFile()
    {
        if (!System.IO.File.Exists(_settingsFilePath)) return null;
        try
        {
            var json = System.IO.File.ReadAllText(_settingsFilePath);
            return System.Text.Json.JsonSerializer.Deserialize<AISettings>(json);
        }
        catch
        {
            return null;
        }
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
    public string BaseUrl { get; set; } = "";
    public string ApiKey { get; set; } = "";
    public string DefaultModel { get; set; } = "";
}
