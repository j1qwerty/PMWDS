using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMWDS.Application.DTOs.Notifications;
using PMWDS.Application.Interfaces.Services;

namespace PMWDS.API.Controllers;

public class NotificationsController : BaseApiController
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;
    private readonly INotificationService _notifications;

    public NotificationsController(
        IUnitOfWork uow,
        ICurrentUserService currentUser,
        INotificationService notifications)
    {
        _uow = uow;
        _currentUser = currentUser;
        _notifications = notifications;
    }

    [HttpGet]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetMine(
        [FromQuery] bool unreadOnly = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var userId = _currentUser.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var notifications = (await _uow.Notifications.FindAsync(n => n.UserId == userId, ct))
            .Where(n => !unreadOnly || !n.IsRead)
            .OrderByDescending(n => n.CreatedDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NotificationDto(
                n.Id,
                n.Title,
                n.Message,
                n.Type.ToString(),
                n.Priority.ToString(),
                n.IsRead,
                n.CreatedDate,
                n.ReadDate,
                n.ActionUrl))
            .ToList();

        return Ok(notifications);
    }

    [HttpGet("unread-count")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetUnreadCount(CancellationToken ct)
    {
        var userId = _currentUser.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var count = (await _uow.Notifications.FindAsync(n => n.UserId == userId && !n.IsRead, ct)).Count();
        return Ok(new { Count = count });
    }

    [HttpPatch("{id:guid}/read")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        var notification = await _uow.Notifications.GetByIdAsync(id, ct);
        if (notification == null)
        {
            return NotFound();
        }

        notification.MarkAsRead();
        await _uow.Notifications.UpdateAsync(notification, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok();
    }

    [HttpPatch("read-all")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        var userId = _currentUser.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var notifications = await _uow.Notifications.FindAsync(n => n.UserId == userId && !n.IsRead, ct);
        foreach (var notification in notifications)
        {
            notification.MarkAsRead();
            await _uow.Notifications.UpdateAsync(notification, ct);
        }

        await _uow.SaveChangesAsync(ct);
        return Ok();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _uow.Notifications.DeleteAsync(id, ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("broadcast")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> Broadcast(
        [FromBody] BroadcastNotificationRequest req,
        CancellationToken ct)
    {
        var users = req.DepartmentId.HasValue
            ? await _uow.Users.GetByDepartmentAsync(req.DepartmentId.Value, ct)
            : await _uow.Users.GetAllAsync(ct);

        var dtos = users.Select(u => new SendNotificationDto(
            u.Id.ToString(),
            req.Title,
            req.Message,
            PMWDS.Domain.Enums.NotificationType.SystemAlert,
            PMWDS.Domain.Enums.NotificationPriority.Normal,
            req.ActionUrl));

        await _notifications.SendBulkAsync(dtos, ct);
        return Ok();
    }
}

public record BroadcastNotificationRequest(
    string Title,
    string Message,
    Guid? DepartmentId = null,
    string? ActionUrl = null);
