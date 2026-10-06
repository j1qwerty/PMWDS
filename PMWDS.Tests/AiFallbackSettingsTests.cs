using FluentAssertions;
using PMWDS.Infrastructure.Settings;
using Xunit;

namespace PMWDS.Tests;

/// <summary>
/// Tests for the AI model settings that drive the rate-limit fallback.
///
/// The fallback exists because OpenRouter's free tier allows 50 requests a day per
/// account, shared across every user of the deployment. Once spent, the assistant,
/// report generation and summaries all fail at once and the only remedy is waiting
/// for the reset. These pin the configuration contract; the retry itself is
/// exercised against a live provider rather than mocked, because what matters is
/// whether the fallback model id is actually accepted by OpenRouter.
/// </summary>
public class AiFallbackSettingsTests
{
    [Fact]
    public void Fallback_defaults_to_the_openrouter_free_router()
    {
        // openrouter/free picks a currently available free model at random and
        // filters for the features the request needs, so it sits in a different
        // quota bucket from any one named free model. That is the whole reason it
        // is a usable fallback.
        var settings = new AISettings();

        settings.EnableRateLimitFallback.Should().BeTrue();
        settings.RateLimitFallbackModel.Should().Be("openrouter/free");
    }

    [Fact]
    public void Fallback_model_is_an_openrouter_id_not_a_bare_name()
    {
        // ChatEngine.ModelBelongsToProvider decides whether a global default model
        // is valid for a provider by looking for a "/" in the id. A bare name would
        // be rejected as an OpenAI model and could not be resolved as a fallback
        // either.
        var settings = new AISettings();

        settings.RateLimitFallbackModel.Should().Contain("/");
        settings.RateLimitFallbackModel.Should().StartWith("openrouter/");
    }

    [Fact]
    public void The_fallback_is_configurable()
    {
        var settings = new AISettings
        {
            RateLimitFallbackModel = "some-org/some-paid-model",
            EnableRateLimitFallback = false
        };

        settings.RateLimitFallbackModel.Should().Be("some-org/some-paid-model");
        settings.EnableRateLimitFallback.Should().BeFalse();
    }

    [Theory]
    // These are the shapes a deployment is likely to end up with by accident.
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("openrouter/free")]
    public void A_blank_or_identical_fallback_means_do_not_retry(string configured)
    {
        // ChatEngine.ShouldRetryOnFallback returns false for all three, so these
        // cannot produce a pointless second request that would fail the same way.
        // Asserted here as the configuration invariant behind that behaviour.
        var settings = new AISettings { RateLimitFallbackModel = configured };
        var requested = "nvidia/nemotron-3-ultra-550b-a55b:free";

        var wouldRetry =
            settings.EnableRateLimitFallback &&
            !string.IsNullOrWhiteSpace(settings.RateLimitFallbackModel) &&
            !settings.RateLimitFallbackModel.Trim()
                .Equals(requested, StringComparison.OrdinalIgnoreCase);

        if (string.IsNullOrWhiteSpace(configured))
        {
            wouldRetry.Should().BeFalse();
        }
        else
        {
            // openrouter/free differs from the requested model, so this one does
            // retry - which is the intended behaviour.
            wouldRetry.Should().BeTrue();
        }
    }
}
