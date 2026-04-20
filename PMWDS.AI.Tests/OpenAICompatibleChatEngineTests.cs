using System.Net;
using System.Net.Http;
using System.Text;
using Microsoft.Extensions.Options;
using PMWDS.AI.Services;
using PMWDS.Application.Interfaces.Repositories;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Infrastructure.Settings;
using Xunit;

namespace PMWDS.AI.Tests;

public class OpenAICompatibleChatEngineTests
{
    [Fact]
    public async Task SearchModelsAsync_Filters_OpenRouter_Response()
    {
        var settings = BuildSettings();
        settings.OpenRouter.Enabled = true;
        settings.OpenRouter.ApiKey = "test-key";

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
    public async Task TestProviderAsync_Uses_BigPickle_On_OpenCode_Path()
    {
        var settings = BuildSettings();
        settings.OpenCode.Enabled = true;
        settings.OpenCode.ApiKey = "test-key";
        settings.OpenCode.DefaultModel = "bigpickle";

        var handler = new StubHttpMessageHandler(request =>
        {
            Assert.Equal(HttpMethod.Post, request.Method);
            Assert.Equal("https://opencode.ai/zen/v1/chat/completions", request.RequestUri?.ToString());
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
        var result = await engine.TestProviderAsync("OpenCode");

        Assert.True(result.Success);
        Assert.Equal("bigpickle", result.Model);
        Assert.Contains("provider test ok", result.RawResponse);
    }

    private static OpenAICompatibleChatEngine CreateEngine(
        AISettings settings,
        HttpMessageHandler handler)
        => new(
            new HttpClient(handler),
            Options.Create(settings),
            new NullUnitOfWork());

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
                DefaultModel = "openai/gpt-4o-mini"
            },
            OpenCode = new AIProviderOptions
            {
                BaseUrl = "https://opencode.ai/zen/v1",
                DefaultModel = "bigpickle"
            }
        };

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
        public IRepository<PMWDS.Domain.Entities.AuditLog> AuditLogs => throw new NotSupportedException();
        public IRepository<PMWDS.Domain.Entities.Skill> Skills => throw new NotSupportedException();
        public void Dispose() { }
        public Task<int> SaveChangesAsync(CancellationToken ct = default) => throw new NotSupportedException();
        public Task BeginTransactionAsync(CancellationToken ct = default) => throw new NotSupportedException();
        public Task CommitTransactionAsync(CancellationToken ct = default) => throw new NotSupportedException();
        public Task RollbackTransactionAsync(CancellationToken ct = default) => throw new NotSupportedException();
    }
}
