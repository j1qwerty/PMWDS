using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Collections.Concurrent;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PMWDS.Application.DTOs.AI;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Application.Security;
using PMWDS.Infrastructure.Settings;
using PMWDS.Persistence.Context;

namespace PMWDS.AI.Services;

public interface IChatEngine
{
    Task<ChatResponseDto> ProcessAsync(
        string userId,
        string message,
        string? provider = null,
        string? model = null,
        CancellationToken ct = default);

    Task<string> GenerateSummaryAsync(
        string context,
        string? provider = null,
        string? model = null,
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

    bool IsConfigured(string? provider = null);

    Task<string> GenerateStructuredReportAsync(
        string systemPrompt,
        string userContext,
        CancellationToken ct = default);
}

public class OpenAICompatibleChatEngine : IChatEngine
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly HttpClient _httpClient;
    private readonly AISettings _settings;
    private readonly IUnitOfWork _uow;
    private readonly ApplicationDbContext _db;
    private readonly ISensitiveDataProtector _sensitiveData;

    // In-memory session history (production: use Redis)
    private static readonly ConcurrentDictionary<string, List<ChatMessagePayload>> Sessions = new();

    // Cached global DB defaults (refreshed per-resolve)
    private string? _globalDefaultProvider;
    private string? _globalDefaultModel;

    public OpenAICompatibleChatEngine(
        HttpClient httpClient,
        IOptions<AISettings> settings,
        IUnitOfWork uow,
        ApplicationDbContext db,
        ISensitiveDataProtector sensitiveData)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _uow = uow;
        _db = db;
        _sensitiveData = sensitiveData;
    }

    public bool IsConfigured(string? provider = null)
    {
        var config = ResolveEnvironmentProvider(provider);
        return config.Enabled &&
               !string.IsNullOrWhiteSpace(config.BaseUrl) &&
               !string.IsNullOrWhiteSpace(config.ApiKey) &&
               OutboundUrlGuard.IsAllowedAiProviderBaseUrl(config.ProviderId, config.BaseUrl, out _);
    }

    public async Task<IReadOnlyList<AIProviderInfoDto>> GetProvidersAsync(
        CancellationToken ct = default)
    {
        var openAi = await ResolveProviderAsync("OpenAI", ct);
        var openRouter = await ResolveProviderAsync("OpenRouter", ct);
        IReadOnlyList<AIProviderInfoDto> providers =
        [
            BuildProviderInfo("OpenAI", "OpenAI", openAi),
            BuildProviderInfo("OpenRouter", "OpenRouter", openRouter)
        ];

        return providers;
    }

    public async Task<IReadOnlyList<AIModelInfoDto>> SearchModelsAsync(
        string provider,
        string? search = null,
        int limit = 25,
        CancellationToken ct = default)
    {
        var config = await ResolveProviderAsync(provider, ct);
        var response = await SendAsync(
            HttpMethod.Get,
            config,
            CombineUrl(config.BaseUrl, config.ModelsPath),
            body: null,
            ct);

        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        var payload = await JsonSerializer.DeserializeAsync<ModelListResponse>(stream, JsonOptions, ct)
            ?? new ModelListResponse();

        return payload.Data
            .Where(m => !string.IsNullOrWhiteSpace(m.Id))
            .Where(m => string.IsNullOrWhiteSpace(search) ||
                        m.Id.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                        (m.Name?.Contains(search, StringComparison.OrdinalIgnoreCase) ?? false))
            .Take(Math.Clamp(limit, 1, 100))
            .Select(m => new AIModelInfoDto(
                Provider: provider,
                Id: m.Id,
                Name: string.IsNullOrWhiteSpace(m.Name) ? m.Id : m.Name,
                ContextLength: m.ContextLength,
                Description: m.Description))
            .ToList();
    }

    public async Task<AIProviderTestResultDto> TestProviderAsync(
        string provider,
        string? model = null,
        string? prompt = null,
        CancellationToken ct = default)
    {
        var resolvedProvider = await ResolveProviderAsync(provider, ct);
        var resolvedModel = ResolveModel(resolvedProvider, model, !string.IsNullOrWhiteSpace(provider));
        var testPrompt = string.IsNullOrWhiteSpace(prompt)
            ? "Reply with exactly: provider test ok"
            : prompt;

        try
        {
            var content = await CompleteChatAsync(
                resolvedProvider,
                resolvedModel,
                [
                    new ChatMessagePayload("system", "You are a concise test assistant."),
                    new ChatMessagePayload("user", testPrompt)
                ],
                ct);

            return new AIProviderTestResultDto(
                Provider: provider,
                Model: resolvedModel,
                Success: true,
                Message: "Provider call succeeded.",
                RawResponse: content,
                ExecutedAtUtc: DateTime.UtcNow);
        }
        catch (Exception ex)
        {
            return new AIProviderTestResultDto(
                Provider: provider,
                Model: resolvedModel,
                Success: false,
                Message: ex.Message,
                RawResponse: null,
                ExecutedAtUtc: DateTime.UtcNow);
        }
    }

    public async Task<ChatResponseDto> ProcessAsync(
        string userId,
        string message,
        string? provider = null,
        string? model = null,
        CancellationToken ct = default)
    {
        var session = Sessions.GetOrAdd(userId, _ =>
            [
                new ChatMessagePayload(
                    "system",
                    "You are PMWDS AI Assistant, a concise project monitoring expert. " +
                    "Help users with project status, task assignments, risk analysis, and productivity insights.")
            ]);

        var intent = DetectIntent(message);
        var contextData = await FetchContextData(userId, intent, ct);
        List<ChatMessagePayload> requestMessages;
        lock (session)
        {
            session.Add(new ChatMessagePayload("user", message));
            if (contextData != null)
            {
                session.Add(new ChatMessagePayload(
                    "system",
                    $"System Context: {JsonSerializer.Serialize(contextData, JsonOptions)}"));
            }

            requestMessages = session.ToList();
        }

        var resolvedProvider = await ResolveProviderAsync(provider, ct);
        var resolvedModel = ResolveModel(resolvedProvider, model, !string.IsNullOrWhiteSpace(provider));
        var reply = await CompleteChatAsync(resolvedProvider, resolvedModel, requestMessages, ct);

        lock (session)
        {
            session.Add(new ChatMessagePayload("assistant", reply));

            if (session.Count > 22)
            {
                var trimmed = session
                    .Take(1)
                    .Concat(session.TakeLast(20))
                    .ToList();
                session.Clear();
                session.AddRange(trimmed);
            }
        }

        return new ChatResponseDto(
            Message: reply,
            Intent: intent,
            SuggestedActions: GetSuggestedActions(intent),
            ContextData: contextData,
            RequiresConfirmation: NeedsConfirmation(intent));
    }

    public async Task<string> GenerateSummaryAsync(
        string context,
        string? provider = null,
        string? model = null,
        CancellationToken ct = default)
    {
        if (!IsConfigured(provider))
        {
            return "AI summary not available.";
        }

        var resolvedProvider = await ResolveProviderAsync(provider, ct);
        var resolvedModel = ResolveModel(resolvedProvider, model, !string.IsNullOrWhiteSpace(provider));

        return await CompleteChatAsync(
            resolvedProvider,
            resolvedModel,
            [
                new ChatMessagePayload(
                    "system",
                    "You are a concise project management analyst. Generate a brief 2-3 sentence summary."),
                new ChatMessagePayload("user", context)
            ],
            ct);
    }

    public async Task<string> GenerateStructuredReportAsync(
        string systemPrompt,
        string userContext,
        CancellationToken ct = default)
    {
        if (!IsConfigured())
        {
            throw new InvalidOperationException(
                "AI provider is not configured. Please configure AI settings first.");
        }

        var resolvedProvider = await ResolveProviderAsync(null, ct);
        var resolvedModel = ResolveModel(resolvedProvider, null, false);

        return await CompleteChatAsync(
            resolvedProvider,
            resolvedModel,
            [
                new ChatMessagePayload("system", systemPrompt),
                new ChatMessagePayload("user", userContext)
            ],
            ct);
    }

    private async Task<string> CompleteChatAsync(
        ResolvedProviderConfig provider,
        string model,
        IReadOnlyList<ChatMessagePayload> messages,
        CancellationToken ct)
    {
        var body = new ChatCompletionRequest(model, messages, Stream: false);
        var response = await SendAsync(
            HttpMethod.Post,
            provider,
            CombineUrl(provider.BaseUrl, "/chat/completions"),
            body,
            ct);

        var responseText = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"Provider '{provider.ProviderId}' returned {(int)response.StatusCode}: {responseText}");
        }

        var content = ExtractAssistantText(responseText);
        return string.IsNullOrWhiteSpace(content)
            ? "The provider returned an empty response."
            : content.Trim();
    }

    private async Task<HttpResponseMessage> SendAsync(
        HttpMethod method,
        ResolvedProviderConfig provider,
        string url,
        object? body,
        CancellationToken ct)
    {
        using var request = new HttpRequestMessage(method, url);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        if (!string.IsNullOrWhiteSpace(provider.ApiKey))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", provider.ApiKey);
        }

        foreach (var header in provider.Headers)
        {
            request.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }

        if (body != null)
        {
            request.Content = JsonContent.Create(body, options: JsonOptions);
        }

        return await _httpClient.SendAsync(request, ct);
    }

    private async Task<ResolvedProviderConfig> ResolveProviderAsync(string? provider, CancellationToken ct)
    {
        var global = await _db.AIGlobalSettings.AsNoTracking().FirstOrDefaultAsync(ct);
        _globalDefaultProvider = global?.DefaultProvider;
        _globalDefaultModel = global?.DefaultModel;

        var effectiveProvider = provider;
        if (string.IsNullOrWhiteSpace(effectiveProvider) && !string.IsNullOrWhiteSpace(_globalDefaultProvider))
        {
            effectiveProvider = _globalDefaultProvider;
        }

        var environmentProvider = ResolveEnvironmentProvider(effectiveProvider);
        var stored = await _db.AIProviderCredentials
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Provider == environmentProvider.ProviderId, ct);

        if (stored == null)
        {
            EnsureAllowedProviderUrl(environmentProvider);
            return environmentProvider;
        }

        var storedApiKey = _sensitiveData.Unprotect(stored.ApiKey);

        var resolved = stored.UseEnvironmentDefault
            ? environmentProvider with
            {
                Enabled = stored.Enabled,
                BaseUrl = string.IsNullOrWhiteSpace(stored.BaseUrl) ? environmentProvider.BaseUrl : stored.BaseUrl,
                DefaultModel = string.IsNullOrWhiteSpace(stored.DefaultModel) ? environmentProvider.DefaultModel : stored.DefaultModel
            }
            : environmentProvider with
            {
                Enabled = stored.Enabled,
                ApiKey = string.IsNullOrWhiteSpace(storedApiKey) ? environmentProvider.ApiKey : storedApiKey,
                BaseUrl = string.IsNullOrWhiteSpace(stored.BaseUrl) ? environmentProvider.BaseUrl : stored.BaseUrl,
                DefaultModel = string.IsNullOrWhiteSpace(stored.DefaultModel) ? environmentProvider.DefaultModel : stored.DefaultModel
            };
        EnsureAllowedProviderUrl(resolved);
        return resolved;
    }

    private ResolvedProviderConfig ResolveEnvironmentProvider(string? provider)
    {
        var providerId = string.IsNullOrWhiteSpace(provider)
            ? _settings.DefaultProvider
            : provider;

        if (providerId.Equals("OpenAI", StringComparison.OrdinalIgnoreCase))
        {
            var options = _settings.OpenAI ?? new AIProviderOptions();
            return new ResolvedProviderConfig(
                ProviderId: "OpenAI",
                Enabled: options.Enabled,
                ApiKey: string.IsNullOrWhiteSpace(options.ApiKey) ? _settings.OpenAIApiKey : options.ApiKey,
                BaseUrl: string.IsNullOrWhiteSpace(options.BaseUrl) ? "https://api.openai.com/v1" : options.BaseUrl,
                DefaultModel: string.IsNullOrWhiteSpace(options.DefaultModel) ? _settings.OpenAIModel : options.DefaultModel,
                ModelsPath: string.IsNullOrWhiteSpace(options.ModelsPath) ? "/models" : options.ModelsPath,
                Headers: new Dictionary<string, string>(options.Headers, StringComparer.OrdinalIgnoreCase));
        }

        if (providerId.Equals("OpenRouter", StringComparison.OrdinalIgnoreCase))
        {
            var options = _settings.OpenRouter ?? new AIProviderOptions();
            var headers = new Dictionary<string, string>(options.Headers, StringComparer.OrdinalIgnoreCase);
            if (!headers.ContainsKey("HTTP-Referer"))
            {
                headers["HTTP-Referer"] = _settings.AppUrl;
            }

            if (!headers.ContainsKey("X-OpenRouter-Title"))
            {
                headers["X-OpenRouter-Title"] = _settings.AppName;
            }

            return new ResolvedProviderConfig(
                ProviderId: "OpenRouter",
                Enabled: options.Enabled,
                ApiKey: options.ApiKey,
                BaseUrl: string.IsNullOrWhiteSpace(options.BaseUrl) ? "https://openrouter.ai/api/v1" : options.BaseUrl,
                DefaultModel: options.DefaultModel,
                ModelsPath: string.IsNullOrWhiteSpace(options.ModelsPath) ? "/models" : options.ModelsPath,
                Headers: headers);
        }

        throw new InvalidOperationException($"Unsupported AI provider '{providerId}'.");
    }

    private string ResolveModel(
        ResolvedProviderConfig provider,
        string? requestedModel,
        bool providerExplicitlySelected)
    {
        var envDefault = !string.IsNullOrWhiteSpace(_globalDefaultModel)
            ? _globalDefaultModel
            : _settings.DefaultModel;

        var model = string.IsNullOrWhiteSpace(requestedModel)
            ? (providerExplicitlySelected || string.IsNullOrWhiteSpace(envDefault)
                ? provider.DefaultModel
                : envDefault)
            : requestedModel;

        if (string.IsNullOrWhiteSpace(model))
        {
            throw new InvalidOperationException(
                $"No default model is configured for provider '{provider.ProviderId}'.");
        }

        return model;
    }

    private static string DetectIntent(string message)
    {
        var lower = message.ToLowerInvariant();
        if (lower.Contains("assign") || lower.Contains("who should"))
            return "TaskAssignment";
        if (lower.Contains("delay") || lower.Contains("at risk") || lower.Contains("overdue"))
            return "DelayAnalysis";
        if (lower.Contains("status") || lower.Contains("progress") || lower.Contains("health"))
            return "ProjectStatus";
        if (lower.Contains("report") || lower.Contains("summary") || lower.Contains("analytics"))
            return "Reporting";
        if (lower.Contains("workload") || lower.Contains("capacity") || lower.Contains("resource"))
            return "ResourceManagement";
        return "General";
    }

    private async Task<object?> FetchContextData(
        string userId,
        string intent,
        CancellationToken ct)
    {
        return intent switch
        {
            "DelayAnalysis" => new
            {
                OverdueTasks = (await _uow.Tasks.GetOverdueTasksAsync(ct))
                    .Select(t => new
                    {
                        t.Title,
                        t.DueDate,
                        t.ProgressPercentage
                    })
                    .Take(5)
            },
            "ProjectStatus" => new
            {
                ActiveProjects = (await _uow.Projects.GetByStatusAsync(
                        Domain.Enums.ProjectStatus.InProgress,
                        ct))
                    .Select(p => new
                    {
                        p.Name,
                        p.ProgressPercentage,
                        p.AIHealthScore
                    })
                    .Take(5)
            },
            "ResourceManagement" => new
            {
                AvailableUsers = (await _uow.Users.GetAvailableUsersAsync(ct))
                    .Select(u => new
                    {
                        u.FullName,
                        u.AvailabilityPercentage,
                        u.AIWorkloadScore
                    })
                    .Take(5)
            },
            _ => null
        };
    }

    private static List<string> GetSuggestedActions(string intent)
        => intent switch
        {
            "TaskAssignment" => ["View AI Recommendations", "Assign Task Now", "Check Team Availability"],
            "DelayAnalysis" => ["View Overdue Tasks", "Escalate Now", "Adjust Timeline"],
            "ProjectStatus" => ["View Dashboard", "Generate Status Report", "View Milestones"],
            "ResourceManagement" => ["View Workload Distribution", "Optimize Allocation", "Check Burnout Risk"],
            _ => ["Go to Dashboard"]
        };

    private static bool NeedsConfirmation(string intent)
        => intent is "TaskAssignment";

    private static AIProviderInfoDto BuildProviderInfo(
        string provider,
        string displayName,
        ResolvedProviderConfig config)
        => new(
            Provider: provider,
            DisplayName: displayName,
            IsEnabled: config.Enabled,
            IsConfigured: config.Enabled &&
                         !string.IsNullOrWhiteSpace(config.ApiKey) &&
                         !string.IsNullOrWhiteSpace(config.BaseUrl),
            DefaultModel: config.DefaultModel,
            BaseUrl: config.BaseUrl);

    private static string CombineUrl(string baseUrl, string path)
        => $"{baseUrl.TrimEnd('/')}/{path.TrimStart('/')}";

    private static void EnsureAllowedProviderUrl(ResolvedProviderConfig provider)
    {
        if (!OutboundUrlGuard.IsAllowedAiProviderBaseUrl(provider.ProviderId, provider.BaseUrl, out var error))
        {
            throw new InvalidOperationException(error);
        }
    }

    private static string? ExtractAssistantText(string responseText)
    {
        using var document = JsonDocument.Parse(responseText);
        if (!document.RootElement.TryGetProperty("choices", out var choices) ||
            choices.ValueKind != JsonValueKind.Array ||
            choices.GetArrayLength() == 0)
        {
            return null;
        }

        var choice = choices[0];
        if (!choice.TryGetProperty("message", out var message))
        {
            return null;
        }

        if (!message.TryGetProperty("content", out var content))
        {
            return null;
        }

        if (content.ValueKind == JsonValueKind.String)
        {
            return content.GetString();
        }

        if (content.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        foreach (var part in content.EnumerateArray())
        {
            if (part.TryGetProperty("type", out var type) &&
                type.GetString() == "text" &&
                part.TryGetProperty("text", out var text))
            {
                return text.GetString();
            }
        }

        return null;
    }

    private sealed record ResolvedProviderConfig(
        string ProviderId,
        bool Enabled,
        string ApiKey,
        string BaseUrl,
        string DefaultModel,
        string ModelsPath,
        Dictionary<string, string> Headers);

    private sealed record ChatCompletionRequest(
        string Model,
        IReadOnlyList<ChatMessagePayload> Messages,
        bool Stream);

    private sealed record ChatMessagePayload(
        string Role,
        string Content);

    private sealed class ModelListResponse
    {
        [JsonPropertyName("data")]
        public List<ModelPayload> Data { get; set; } = [];
    }

    private sealed class ModelPayload
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("context_length")]
        public int? ContextLength { get; set; }
    }
}
