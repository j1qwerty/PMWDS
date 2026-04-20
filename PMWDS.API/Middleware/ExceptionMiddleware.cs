using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Text.Json;
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
        var (statusCode, message) = ex switch
        {
            NotFoundException e =>
            (HttpStatusCode.NotFound, e.Message),
            ValidationException e =>
            (HttpStatusCode.BadRequest, e.Message),
            UnauthorizedAccessException e =>
            (HttpStatusCode.Unauthorized, e.Message),
            ForbiddenException e =>
            (HttpStatusCode.Forbidden, e.Message),
            ConflictException e =>
            (HttpStatusCode.Conflict, e.Message),
            _ => (HttpStatusCode.InternalServerError,
            "An unexpected error occurred.")
        };
        ctx.Response.StatusCode = (int)statusCode;
        var response = new
        {
            StatusCode = (int)statusCode,
            Message = message,
            TraceId = ctx.TraceIdentifier,
            Timestamp = DateTime.UtcNow
        };
        await ctx.Response.WriteAsync(
        JsonSerializer.Serialize(response,
        new JsonSerializerOptions
        {
            PropertyNamingPolicy =
        JsonNamingPolicy.CamelCase
        }));
    }
}