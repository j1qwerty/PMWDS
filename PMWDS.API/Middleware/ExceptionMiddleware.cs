using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Text.Json;
using PMWDS.Application.DTOs.Common;
using PMWDS.Application.Exceptions;
namespace PMWDS.API.Middleware;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;
    public ExceptionMiddleware(
    RequestDelegate next,
    ILogger<ExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }
    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await _next(ctx);
        }
        catch (OperationCanceledException) when (ctx.RequestAborted.IsCancellationRequested)
        {
            // The client went away mid-request: navigating away, closing a tab, a
            // refresh racing an in-flight fetch. Nothing is wrong server-side, so
            // this is logged as information rather than as an error.
            //
            // It used to be logged at Error, which made every deploy report an
            // unhandled exception in the journal purely because someone browsed
            // the site during verification. EF surfaces the cancellation as a
            // TaskCanceledException from the running query, so this cannot be
            // distinguished by exception type alone.
            _logger.LogInformation(
                "Request aborted by the client: {Method} {Path}",
                ctx.Request.Method,
                ctx.Request.Path);

            // 499 is nginx's "client closed request". The client is gone, so
            // there is nobody to read a body, but a real status beats leaving
            // the response as a bare 200.
            if (!ctx.Response.HasStarted)
            {
                ctx.Response.StatusCode = 499;
            }
        }
        catch (AiProviderException ex)
        {
            // Handled explicitly rather than left to the catch-all below.
            //
            // An exhausted provider quota is an expected, actionable upstream
            // condition, not a fault in this application. Letting it fall through
            // logged it as "Unhandled exception" with a stack trace at Error, which
            // is the same noise problem as the client-abort case above: it makes
            // the deploy verification report a failure for a condition an operator
            // can see coming and has a documented remedy for.
            _logger.LogWarning(
                "AI provider call failed ({Reason}): {Message}",
                ex.Reason,
                ex.Message);

            await HandleExceptionAsync(ctx, ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
            "Unhandled exception: {Message}", ex.Message);
            await HandleExceptionAsync(ctx, ex);
        }
    }
    private static async Task HandleExceptionAsync(
    HttpContext ctx, Exception ex)
    {
        ctx.Response.ContentType = "application/json";
        HttpStatusCode statusCode;
        string message;
        if (ex is NotFoundException)
        {
            statusCode = HttpStatusCode.NotFound;
            message = ex.Message;
        }
        else if (ex is ValidationException)
        {
            statusCode = HttpStatusCode.BadRequest;
            message = ex.Message;
        }
        else if (ex is UnauthorizedAccessException)
        {
            statusCode = HttpStatusCode.Unauthorized;
            message = ex.Message;
        }
        else if (ex is ConflictException)
        {
            statusCode = HttpStatusCode.Conflict;
            message = ex.Message;
        }
        else if (ex is AiProviderException aiFailure)
        {
            // The failure is upstream, so 502 by default rather than 500 - 500
            // reads as "this application is broken" and sends people to the logs.
            //
            // A 429 is passed through unchanged because it means something different
            // to the caller: it is a quota limit that clears on its own. Reporting it
            // as 502 told users to retry immediately against a limit that had not
            // reset, and told operators to go looking for a fault that was not there.
            statusCode = aiFailure.UpstreamStatusCode == 429
                ? (HttpStatusCode)429
                : HttpStatusCode.BadGateway;
            message = aiFailure.Message;
        }
        else
        {
            statusCode = HttpStatusCode.InternalServerError;
            message = "An unexpected error occurred.";
        }
        ctx.Response.StatusCode = (int)statusCode;
        var response = ApiResponse<object>.Fail(
            new ApiError(StatusCodeToCode((int)statusCode), message),
            ctx.TraceIdentifier);
        await ctx.Response.WriteAsync(
        JsonSerializer.Serialize(response,
        new JsonSerializerOptions
        {
            PropertyNamingPolicy =
        JsonNamingPolicy.CamelCase
        }));
    }

    private static string StatusCodeToCode(int statusCode)
        => statusCode switch
        {
            StatusCodes.Status400BadRequest => "bad_request",
            StatusCodes.Status401Unauthorized => "unauthorized",
            StatusCodes.Status404NotFound => "not_found",
            StatusCodes.Status409Conflict => "conflict",
            StatusCodes.Status502BadGateway => "ai_provider_unavailable",
            429 => "ai_provider_rate_limited",
            _ => "server_error"
        };
}
