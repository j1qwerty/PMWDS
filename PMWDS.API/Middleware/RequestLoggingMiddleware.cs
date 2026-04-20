using System.Diagnostics;
namespace PMWDS.API.Middleware;
public class RequestLoggingMiddleware
{
 private readonly RequestDelegate _next;
 private readonly ILogger<RequestLoggingMiddleware> _logger;
 public RequestLoggingMiddleware(
 RequestDelegate next,
 ILogger<RequestLoggingMiddleware> logger)
 {
 _next = next;
 _logger = logger;
 }
 public async Task InvokeAsync(HttpContext ctx)
 {
 var sw = Stopwatch.StartNew();
 await _next(ctx);
 sw.Stop();
 _logger.LogInformation(
 "{Method} {Path} responded {StatusCode} " +
 "in {Elapsed}ms | User: {User}",
 ctx.Request.Method,
 ctx.Request.Path,
 ctx.Response.StatusCode,
 sw.ElapsedMilliseconds,
 ctx.User.Identity?.Name ?? "Anonymous");
 }
}
