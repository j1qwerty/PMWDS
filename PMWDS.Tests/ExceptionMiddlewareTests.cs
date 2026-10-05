using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using PMWDS.API.Middleware;
using Xunit;

namespace PMWDS.Tests;

/// <summary>
/// Unit tests for <see cref="ExceptionMiddleware"/>, specifically the handling of
/// client disconnects.
///
/// A browser aborting an in-flight request is routine: navigating away, closing a
/// tab, or a refresh racing a fetch. EF surfaces that as a TaskCanceledException
/// from the running query. Logging it at Error made deploy.ps1 report "unhandled
/// exception(s) in journal" on every deploy where anyone browsed the site during
/// the verification window, which is noise that hides a real outage.
///
/// These use DefaultHttpContext and a capturing logger rather than a real socket,
/// so the cancellation is driven deterministically instead of racing a slow query.
/// </summary>
public class ExceptionMiddlewareTests
{
    [Fact]
    public async Task Client_abort_is_logged_as_information_not_error()
    {
        var logger = new CapturingLogger();
        var middleware = new ExceptionMiddleware(
            _ => throw new TaskCanceledException(),
            logger);

        var ctx = BuildContext(abort: true);

        await middleware.InvokeAsync(ctx);

        logger.Entries.Should().NotBeEmpty("the abort still needs to leave a trace");
        logger.Entries.Should().OnlyContain(e => e.Level < LogLevel.Error);
        logger.Entries.Should().Contain(e => e.Message.Contains("aborted by the client"));
    }

    [Fact]
    public async Task Client_abort_responds_499_not_500()
    {
        var middleware = new ExceptionMiddleware(
            _ => throw new TaskCanceledException(),
            new CapturingLogger());

        var ctx = BuildContext(abort: true);

        await middleware.InvokeAsync(ctx);

        // 499 is nginx's "client closed request". A 500 here would report a
        // server fault for something the client did.
        ctx.Response.StatusCode.Should().Be(499);
    }

    [Fact]
    public async Task Cancellation_that_is_not_a_client_abort_is_still_an_error()
    {
        // The token can be cancelled by something other than the client going
        // away - app shutdown, a timeout middleware. Those are real faults and
        // must not be quietly downgraded to 499.
        var logger = new CapturingLogger();
        var middleware = new ExceptionMiddleware(
            _ => throw new OperationCanceledException(),
            logger);

        var ctx = BuildContext(abort: false);

        await middleware.InvokeAsync(ctx);

        ctx.Response.StatusCode.Should().Be(StatusCodes.Status500InternalServerError);
        logger.Entries.Should().Contain(e => e.Level == LogLevel.Error);
    }

    [Fact]
    public async Task Ordinary_exceptions_are_unaffected()
    {
        // Guards the new catch clause from accidentally swallowing real errors.
        var middleware = new ExceptionMiddleware(
            _ => throw new InvalidOperationException("boom"),
            new CapturingLogger());

        var ctx = BuildContext(abort: true);

        await middleware.InvokeAsync(ctx);

        ctx.Response.StatusCode.Should().Be(StatusCodes.Status500InternalServerError);
    }

    [Fact]
    public async Task Successful_request_is_untouched()
    {
        var logger = new CapturingLogger();
        var middleware = new ExceptionMiddleware(
            ctx =>
            {
                ctx.Response.StatusCode = StatusCodes.Status200OK;
                return Task.CompletedTask;
            },
            logger);

        var ctx = BuildContext(abort: true);

        await middleware.InvokeAsync(ctx);

        ctx.Response.StatusCode.Should().Be(StatusCodes.Status200OK);
        logger.Entries.Should().BeEmpty();
    }

    private static DefaultHttpContext BuildContext(bool abort)
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Method = HttpMethods.Get;
        ctx.Request.Path = "/api/v1/pages";
        ctx.Response.Body = new MemoryStream();

        if (abort)
        {
            using var cts = new CancellationTokenSource();
            cts.Cancel();
            ctx.RequestAborted = cts.Token;
        }

        return ctx;
    }

    private sealed record LogEntry(LogLevel Level, string Message);

    private sealed class CapturingLogger : ILogger<ExceptionMiddleware>
    {
        public List<LogEntry> Entries { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
            => Entries.Add(new LogEntry(logLevel, formatter(state, exception)));
    }
}
