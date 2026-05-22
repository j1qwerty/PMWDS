using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using PMWDS.API.Services;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;
using PMWDS.Persistence.Context;

namespace PMWDS.API.Controllers;

public class ActivityLogsController : BaseApiController
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;
    private readonly RoleScopeService _scope;
    private readonly ApplicationDbContext _db;

    public ActivityLogsController(
        IUnitOfWork uow,
        ICurrentUserService currentUser,
        RoleScopeService scope,
        ApplicationDbContext db)
    {
        _uow = uow;
        _currentUser = currentUser;
        _scope = scope;
        _db = db;
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
        if (!await _scope.CanAccessUserAsync(userId, ct))
        {
            return Forbid();
        }

        var logs = await _uow.ActivityLogs.FindAsync(a => a.UserId == userId, ct);
        return Ok(logs.OrderByDescending(a => a.Timestamp).Take(count).Select(MapLog));
    }

    [HttpGet("team")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetTeam([FromQuery] int count = 50, CancellationToken ct = default)
    {
        if (!Guid.TryParse(_currentUser.UserId, out var currentUserId))
        {
            return Unauthorized();
        }

        var scopedUsers = await _scope.ScopeUsersAsync(_db.Users.AsQueryable(), ct);
        var teamUserIds = await scopedUsers.Select(u => u.Id).ToListAsync(ct);

        var logs = await _uow.ActivityLogs.FindAsync(a => teamUserIds.Contains(a.UserId), ct);
        return Ok(logs.OrderByDescending(a => a.Timestamp).Take(count).Select(MapLog));
    }

    [HttpGet("all")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetAll([FromQuery] int count = 50, CancellationToken ct = default)
    {
        if (_scope.IsSuperAdmin)
        {
            var allLogs = await _uow.ActivityLogs.FindAsync(a => true, ct);
            return Ok(allLogs.OrderByDescending(a => a.Timestamp).Take(count).Select(MapLog));
        }

        if (!_scope.IsDirector)
        {
            return Forbid();
        }

        var scopedUsers = await _scope.ScopeUsersAsync(_db.Users.AsQueryable(), ct);
        var scopedUserIds = await scopedUsers.Select(u => u.Id).ToListAsync(ct);
        var logs = await _uow.ActivityLogs.FindAsync(a => scopedUserIds.Contains(a.UserId), ct);
        return Ok(logs.OrderByDescending(a => a.Timestamp).Take(count).Select(MapLog));
    }

    [HttpGet("project/{projectId:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetByProject(Guid projectId, [FromQuery] int count = 50, CancellationToken ct = default)
    {
        if (!await _scope.CanAccessProjectAsync(projectId, ct))
        {
            return Forbid();
        }

        var logs = await _uow.ActivityLogs.FindAsync(a => a.ProjectId == projectId, ct);
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

        var log = ActivityLog.Create(userId, req.ActivityType, req.Description, req.Metadata, req.ProjectId);
        log.SetCreatedBy(_currentUser.UserId ?? "system");
        await _uow.ActivityLogs.AddAsync(log, ct);
        await _uow.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetMine), new { id = log.Id }, MapLog(log));
    }

    private static ActivityLogResponse MapLog(ActivityLog log)
        => new(
            log.Id,
            log.UserId,
            log.ProjectId,
            log.ActivityType,
            log.Description,
            log.Timestamp,
            JsonSerializer.Deserialize<Dictionary<string, object>>(log.MetadataJson) ?? new());
}

public record ActivityLogResponse(Guid Id, Guid UserId, Guid? ProjectId, string ActivityType, string Description, DateTime Timestamp, Dictionary<string, object> Metadata);
public record CreateActivityLogRequest(string ActivityType, string Description, Dictionary<string, object> Metadata, Guid? ProjectId = null);
