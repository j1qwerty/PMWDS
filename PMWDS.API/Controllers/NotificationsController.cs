using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMWDS.Application.Features.Notifications.Commands;
using PMWDS.Application.Features.Notifications.Queries;
namespace PMWDS.API.Controllers;

public class NotificationsController : BaseApiController
{
    /// <summary>Get notifications for current user</summary>
    [HttpGet]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetMine(
    [FromQuery] bool unreadOnly = false,
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 20,
    CancellationToken ct = default)
    => HandleResult(await Mediator.Send(
    new GetMyNotificationsQuery(
    unreadOnly, page, pageSize), ct));
    /// <summary>Get unread notification count</summary>
    [HttpGet("unread-count")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetUnreadCount(
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetUnreadCountQuery(), ct));
    /// <summary>Mark a notification as read</summary>
    [HttpPatch("{id:guid}/read")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> MarkRead(
    Guid id, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new MarkNotificationReadCommand(id), ct));
    /// <summary>Mark all notifications as read</summary>
    [HttpPatch("read-all")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> MarkAllRead(
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new MarkAllNotificationsReadCommand(), ct));
    /// <summary>Delete a notification</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> Delete(
    Guid id, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new DeleteNotificationCommand(id), ct));
    /// <summary>Send a broadcast notification (Admin)</summary>
    [HttpPost("broadcast")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> Broadcast(
    [FromBody] BroadcastNotificationRequest req,
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new BroadcastNotificationCommand(
    req.Title,
    req.Message,
    req.DepartmentId), ct));
}
public record BroadcastNotificationRequest(
 string Title,
 string Message,
 Guid? DepartmentId = null);