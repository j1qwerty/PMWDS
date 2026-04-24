using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;

namespace PMWDS.API.Controllers;

public class ActivityLogsController : BaseApiController
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public ActivityLogsController(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    [HttpGet]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetMine([FromQuery] int count = 50, CancellationToken ct = default)
    {
        if (!Guid.TryParse(_currentUser.UserId, out var userId))
        {
            return Unauthorized();
        }

        var logs = await _uow.ActivityLogs.FindAsync(a => a.UserId == userId, ct);
        return Ok(logs.OrderByDescending(a => a.Timestamp).Take(count).Select(MapLog));
    }

    [HttpGet("user/{userId:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetByUser(Guid userId, [FromQuery] int count = 50, CancellationToken ct = default)
    {
        var logs = await _uow.ActivityLogs.FindAsync(a => a.UserId == userId, ct);
        return Ok(logs.OrderByDescending(a => a.Timestamp).Take(count).Select(MapLog));
    }

    [HttpPost]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> Create([FromBody] CreateActivityLogRequest req, CancellationToken ct)
    {
        if (!Guid.TryParse(_currentUser.UserId, out var userId))
        {
            return Unauthorized();
        }

        var log = ActivityLog.Create(userId, req.ActivityType, req.Description, req.Metadata);
        log.SetCreatedBy(_currentUser.UserId ?? "system");
        await _uow.ActivityLogs.AddAsync(log, ct);
        await _uow.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetMine), new { id = log.Id }, MapLog(log));
    }

    private static ActivityLogResponse MapLog(ActivityLog log)
        => new(
            log.Id,
            log.UserId,
            log.ActivityType,
            log.Description,
            log.Timestamp,
            JsonSerializer.Deserialize<Dictionary<string, object>>(log.MetadataJson) ?? new());
}

public record ActivityLogResponse(Guid Id, Guid UserId, string ActivityType, string Description, DateTime Timestamp, Dictionary<string, object> Metadata);
public record CreateActivityLogRequest(string ActivityType, string Description, Dictionary<string, object> Metadata);
