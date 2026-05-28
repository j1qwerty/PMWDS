using System.Diagnostics;
using System.Net;
using System.Net.Http;
using System.Text;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PMWDS.AI.Services;
using PMWDS.Application.Interfaces.Repositories;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Infrastructure.Settings;
using PMWDS.Persistence.Context;
using Xunit;

namespace PMWDS.AI.Tests;

public class OpenAICompatibleChatEngineTests
{
    [Fact]
    public async Task SearchModelsAsync_Filters_OpenRouter_Response()
    {
        var settings = BuildSettings();
        settings.OpenRouter.Enabled = true;
        settings.OpenRouter.ApiKey = "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";

        var handler = new StubHttpMessageHandler(_ =>
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    """
                    {
                      "data": [
                        { "id": "openai/gpt-4o-mini", "name": "GPT-4o mini", "context_length": 128000, "description": "Mini model" },
                        { "id": "anthropic/claude-3.5-haiku", "name": "Claude Haiku", "context_length": 200000, "description": "Fast model" }
                      ]
                    }
                    """,
                    Encoding.UTF8,
                    "application/json")
            });

        var engine = CreateEngine(settings, handler);
        var models = await engine.SearchModelsAsync("OpenRouter", "gpt", 10);

        Assert.Single(models);
        Assert.Equal("openai/gpt-4o-mini", models[0].Id);
        Assert.Equal("OpenRouter", models[0].Provider);
    }

    [Fact]
    public async Task TestProviderAsync_Uses_Configured_Model_On_OpenRouter_Path()
    {
        var settings = BuildSettings();
        settings.OpenRouter.Enabled = true;
        settings.OpenRouter.ApiKey = "test-key";
        settings.OpenRouter.DefaultModel = "openai/gpt-oss-120b:free";

        var handler = new StubHttpMessageHandler(request =>
        {
            Assert.Equal(HttpMethod.Post, request.Method);
            Assert.Equal("https://openrouter.ai/api/v1/chat/completions", request.RequestUri?.ToString());
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    """
                    {
                      "choices": [
                        {
                          "message": {
                            "content": "provider test ok"
                          }
                        }
                      ]
                    }
                    """,
                    Encoding.UTF8,
                    "application/json")
            };
        });

        var engine = CreateEngine(settings, handler);
        var result = await engine.TestProviderAsync("OpenRouter");

        Assert.True(result.Success);
        Assert.Equal("openai/gpt-oss-120b:free", result.Model);
        Assert.Contains("provider test ok", result.RawResponse);
    }

    [Fact]
    public async Task TestProviderAsync_Sends_Hi_To_OpenRouter_And_Logs_Response()
    {
        var settings = BuildSettings();
        settings.OpenRouter.Enabled = true;
        settings.OpenRouter.ApiKey = "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";
        settings.OpenRouter.DefaultModel = "openai/gpt-oss-120b:free";
        settings.OpenRouter.Headers = new Dictionary<string, string>
        {
            ["HTTP-Referer"] = "http://localhost:5177",
            ["X-OpenRouter-Title"] = "PMWDS"
        };

        var handler = new StubHttpMessageHandler(_ =>
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    """
                    {
                      "choices": [
                        {
                          "message": {
                            "content": "hi from openrouter"
                          }
                        }
                      ]
                    }
                    """,
                    Encoding.UTF8,
                    "application/json")
            });
        var engine = CreateEngine(settings, handler);

        Console.WriteLine("=== Testing OpenRouter Provider ===");
        Console.WriteLine($"Model: {settings.OpenRouter.DefaultModel}");
        Console.WriteLine($"ApiKey: {settings.OpenRouter.ApiKey.Substring(0, 10)}...");
        Console.WriteLine($"Headers: {string.Join(", ", settings.OpenRouter.Headers.Select(h => $"{h.Key}={h.Value}"))}");
        Console.WriteLine("Sending: hi");
        Console.WriteLine();

        var result = await engine.TestProviderAsync("OpenRouter");

        Console.WriteLine($"Provider: {result.Provider}");
        Console.WriteLine($"Model: {result.Model}");
        Console.WriteLine($"Success: {result.Success}");
        Console.WriteLine($"Message: {result.Message}");
        Console.WriteLine($"Response: {result.RawResponse}");
        Console.WriteLine($"ExecutedAt: {result.ExecutedAtUtc}");
        Console.WriteLine("===================================");
    }

    private static OpenAICompatibleChatEngine CreateEngine(
        AISettings settings,
        HttpMessageHandler handler)
        => new(
            new HttpClient(handler),
            Options.Create(settings),
            new NullUnitOfWork(),
            CreateDbContext());

    private static AISettings BuildSettings()
        => new()
        {
            DefaultProvider = "OpenAI",
            DefaultModel = "gpt-4o",
            OpenAI = new AIProviderOptions
            {
                Enabled = true,
                ApiKey = "openai-test-key",
                BaseUrl = "https://api.openai.com/v1",
                DefaultModel = "gpt-4o"
            },
            OpenRouter = new AIProviderOptions
            {
                BaseUrl = "https://openrouter.ai/api/v1",
                DefaultModel = "openai/gpt-oss-120b:free",
                Headers = new Dictionary<string, string>
                {
                    ["HTTP-Referer"] = "http://localhost:5177",
                    ["X-OpenRouter-Title"] = "PMWDS"
                }
            }
        };

    private static ApplicationDbContext CreateDbContext()
    {
        var connection = new SqliteConnection("Data Source=:memory:");
        connection.Open();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(connection)
            .Options;
        var db = new ApplicationDbContext(options);
        db.Database.EnsureCreated();
        return db;
    }

    private sealed class StubHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responder)
        : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
            => Task.FromResult(responder(request));
    }

    private sealed class NullUnitOfWork : IUnitOfWork
    {
        public IProjectRepository Projects => throw new NotSupportedException();
        public ITaskRepository Tasks => throw new NotSupportedException();
        public IUserRepository Users => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.Department> Departments => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.Milestone> Milestones => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.Notification> Notifications => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.NotificationTemplate> NotificationTemplates => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.AlertRule> AlertRules => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.Dashboard> Dashboards => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.DashboardWidget> DashboardWidgets => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.Report> Reports => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.ReportSchedule> ReportSchedules => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.Integration> Integrations => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.Webhook> Webhooks => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.WebhookDelivery> WebhookDeliveries => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.KnowledgeArticle> KnowledgeArticles => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.LessonLearned> LessonsLearned => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.ActivityLog> ActivityLogs => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.AuditLog> AuditLogs => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.Skill> Skills => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.Role> Roles => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.Permission> Permissions => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.UserProfile> UserProfiles => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.Organization> Organizations => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.AIModel> AIModels => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.PredictionResult> PredictionResults => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.TrainingDataPoint> TrainingDataPoints => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.AllocationRecommendation> AllocationRecommendations => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.DelayPrediction> DelayPredictions => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.ProjectDocument> ProjectDocuments => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.UserSkill> UserSkills => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.TaskAssignment> TaskAssignments => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.TaskComment> TaskComments => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.TaskAttachment> TaskAttachments => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.TaskDependency> TaskDependencies => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.TimeEntry> TimeEntries => throw new NotSupportedException();
        public void Dispose() { }
        public Task<int> SaveChangesAsync(CancellationToken ct = default) => throw new NotSupportedException();
        public Task BeginTransactionAsync(CancellationToken ct = default) => throw new NotSupportedException();
        public Task CommitTransactionAsync(CancellationToken ct = default) => throw new NotSupportedException();
        public Task RollbackTransactionAsync(CancellationToken ct = default) => throw new NotSupportedException();
    }
}
