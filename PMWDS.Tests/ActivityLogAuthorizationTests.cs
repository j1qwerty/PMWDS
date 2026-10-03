using System.Net;
using System.Text.Json;
using FluentAssertions;
using PMWDS.Tests.Infrastructure;
using Xunit;

namespace PMWDS.Tests;

[Collection(ApiCollection.Name)]
public sealed class ActivityLogAuthorizationTests
{
    private readonly ApiFixture _fixture;

    public ActivityLogAuthorizationTests(ApiFixture fixture) => _fixture = fixture;

    [Fact]
    public async Task Viewer_cannot_create_activity_logs()
    {
        var response = await _fixture.Viewer.Client.PostAsync<JsonElement>(
            "/api/v1/activitylogs",
            new
            {
                activityType = "Fake Audit Entry",
                description = "This must never be persisted.",
                metadata = new { },
                projectId = (Guid?)null,
            });

        response.Status.Should().Be(HttpStatusCode.Forbidden);
    }
}
