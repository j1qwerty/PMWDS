using System.Net;
using System.Text.Json;
using FluentAssertions;
using PMWDS.Tests.Infrastructure;
using Xunit;

namespace PMWDS.Tests;

[Collection(ApiCollection.Name)]
public sealed class AuthorizationHardeningTests
{
    private readonly ApiFixture _fixture;

    public AuthorizationHardeningTests(ApiFixture fixture) => _fixture = fixture;

    [Fact]
    public async Task Dashboard_is_private_to_its_owner()
    {
        var owner = _fixture.Viewer.Client;
        var other = _fixture.TeamMember.Client;

        var created = await owner.PostAsync<JsonElement>("/api/v1/dashboards", new
        {
            name = $"Private Dashboard {Guid.NewGuid():N}",
            layoutType = "grid",
            isDefault = false,
        });

        created.Status.Should().Be(HttpStatusCode.Created);
        var dashboardId = created.Data.GetGuid("id");

        try
        {
            var ownerRead = await owner.GetAsync<JsonElement>($"/api/v1/dashboards/{dashboardId}");
            ownerRead.Status.Should().Be(HttpStatusCode.OK);

            var otherRead = await other.GetAsync<JsonElement>($"/api/v1/dashboards/{dashboardId}");
            otherRead.Status.Should().Be(HttpStatusCode.NotFound);
        }
        finally
        {
            await owner.DeleteAsync<JsonElement>($"/api/v1/dashboards/{dashboardId}");
        }
    }

    [Fact]
    public async Task Viewer_cannot_access_knowledge_without_permission()
    {
        _fixture.Viewer.Can("KNOWLEDGE_VIEW").Should().BeFalse();
        _fixture.Viewer.Can("KNOWLEDGE_CREATE").Should().BeFalse();

        var read = await _fixture.Viewer.Client.GetAsync<JsonElement>("/api/v1/knowledge/articles");
        read.Status.Should().Be(HttpStatusCode.Forbidden);

        var create = await _fixture.Viewer.Client.PostAsync<JsonElement>("/api/v1/knowledge/articles", new
        {
            projectId = (Guid?)null,
            title = "Unauthorized article",
            content = "This should never be persisted.",
            category = "Test",
            tags = Array.Empty<string>(),
            relevanceScore = 0d,
        });
        create.Status.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Viewer_cannot_use_AI_endpoints_without_AI_permission()
    {
        _fixture.Viewer.Can("AI_VIEW").Should().BeFalse();
        _fixture.Viewer.Can("AI_MANAGE").Should().BeFalse();

        var settings = await _fixture.Viewer.Client.GetAsync<JsonElement>("/api/v1/ai/settings");
        settings.Status.Should().Be(HttpStatusCode.Forbidden);

        var providers = await _fixture.Viewer.Client.GetAsync<JsonElement>("/api/v1/ai/providers");
        providers.Status.Should().Be(HttpStatusCode.Forbidden);

        var chat = await _fixture.Viewer.Client.PostAsync<JsonElement>("/api/v1/ai/chat", new
        {
            message = "This should not invoke the AI provider.",
        });
        chat.Status.Should().Be(HttpStatusCode.Forbidden);
    }
}
