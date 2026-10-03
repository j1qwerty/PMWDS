using FluentAssertions;
using PMWDS.API.Services;
using Xunit;

namespace PMWDS.Tests;

public sealed class IntegrationSecretRedactionTests
{
    [Fact]
    public void Configuration_redacts_sensitive_keys_recursively()
    {
        var result = IntegrationSecretRedactor.RedactConfiguration(
            new Dictionary<string, object>
            {
                ["baseUrl"] = "https://example.test",
                ["apiKey"] = "super-secret",
                ["nested"] = System.Text.Json.JsonSerializer.SerializeToElement(
                    new
                    {
                        clientId = "public-id",
                        clientSecret = "nested-secret",
                        retryCount = 3,
                    }),
            });

        result["baseUrl"].Should().Be("https://example.test");
        result["apiKey"].Should().Be("[REDACTED]");

        var nested = result["nested"].Should().BeOfType<Dictionary<string, object>>().Subject;
        nested["clientId"].Should().Be("public-id");
        nested["clientSecret"].Should().Be("[REDACTED]");
        nested["retryCount"].Should().Be(3L);
    }

    [Fact]
    public void Headers_redact_authorization_and_api_key_values()
    {
        var result = IntegrationSecretRedactor.RedactHeaders(new[]
        {
            "Authorization: Bearer very-secret",
            "X-API-Key: api-secret",
            "Content-Type: application/json",
        });

        result.Should().Contain("Authorization: [REDACTED]");
        result.Should().Contain("X-API-Key: [REDACTED]");
        result.Should().Contain("Content-Type: application/json");
    }
}
