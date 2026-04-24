using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using PMWDS.Application.DTOs.Notifications;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;

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

    [HttpGet("templates")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetTemplates(CancellationToken ct)
        => Ok((await _uow.NotificationTemplates.GetAllAsync(ct)).Select(MapTemplate));

    [HttpPost("templates")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> CreateTemplate([FromBody] UpsertNotificationTemplateRequest req, CancellationToken ct)
    {
        var template = NotificationTemplate.Create(req.TemplateType, req.SubjectTemplate, req.BodyTemplate, req.Variables, req.SupportedChannels);
        template.SetCreatedBy(_currentUser.UserId ?? "system");
        await _uow.NotificationTemplates.AddAsync(template, ct);
        await _uow.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetTemplates), new { id = template.Id }, MapTemplate(template));
    }

    [HttpPut("templates/{id:guid}")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> UpdateTemplate(Guid id, [FromBody] UpsertNotificationTemplateRequest req, CancellationToken ct)
    {
        var template = await _uow.NotificationTemplates.GetByIdAsync(id, ct);
        if (template == null)
        {
            return NotFound();
        }

        template.Update(req.TemplateType, req.SubjectTemplate, req.BodyTemplate, req.Variables, req.SupportedChannels);
        await _uow.NotificationTemplates.UpdateAsync(template, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(MapTemplate(template));
    }

    [HttpDelete("templates/{id:guid}")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> DeleteTemplate(Guid id, CancellationToken ct)
    {
        await _uow.NotificationTemplates.DeleteAsync(id, ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpGet("rules")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetRules(CancellationToken ct)
        => Ok((await _uow.AlertRules.GetAllAsync(ct)).Select(MapRule));

    [HttpPost("rules")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> CreateRule([FromBody] UpsertAlertRuleRequest req, CancellationToken ct)
    {
        var rule = AlertRule.Create(req.Name, req.ConditionType, req.ConditionExpression, req.ActionType, req.ActionParameters, req.IsEnabled);
        rule.SetCreatedBy(_currentUser.UserId ?? "system");
        await _uow.AlertRules.AddAsync(rule, ct);
        await _uow.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetRules), new { id = rule.Id }, MapRule(rule));
    }

    [HttpPut("rules/{id:guid}")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> UpdateRule(Guid id, [FromBody] UpsertAlertRuleRequest req, CancellationToken ct)
    {
        var rule = await _uow.AlertRules.GetByIdAsync(id, ct);
        if (rule == null)
        {
            return NotFound();
        }

        rule.Update(req.Name, req.ConditionType, req.ConditionExpression, req.ActionType, req.ActionParameters, req.IsEnabled);
        await _uow.AlertRules.UpdateAsync(rule, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(MapRule(rule));
    }

    [HttpDelete("rules/{id:guid}")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> DeleteRule(Guid id, CancellationToken ct)
    {
        await _uow.AlertRules.DeleteAsync(id, ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }

    private static NotificationTemplateResponse MapTemplate(NotificationTemplate template)
        => new(
            template.Id,
            template.TemplateType,
            template.SubjectTemplate,
            template.BodyTemplate,
            template.GetVariables().ToList(),
            template.GetSupportedChannels().ToList());

    private static AlertRuleResponse MapRule(AlertRule rule)
        => new(
            rule.Id,
            rule.Name,
            rule.ConditionType,
            rule.ConditionExpression,
            rule.ActionType,
            JsonSerializer.Deserialize<Dictionary<string, object>>(rule.ActionParametersJson) ?? new(),
            rule.IsEnabled,
            rule.LastTriggered);
}

public record BroadcastNotificationRequest(
    string Title,
    string Message,
    Guid? DepartmentId = null,
    string? ActionUrl = null);

public record NotificationTemplateResponse(
    Guid Id,
    string TemplateType,
    string SubjectTemplate,
    string BodyTemplate,
    List<string> Variables,
    List<string> SupportedChannels);

public record UpsertNotificationTemplateRequest(
    string TemplateType,
    string SubjectTemplate,
    string BodyTemplate,
    List<string> Variables,
    List<string> SupportedChannels);

public record AlertRuleResponse(
    Guid Id,
    string Name,
    string ConditionType,
    string ConditionExpression,
    string ActionType,
    Dictionary<string, object> ActionParameters,
    bool IsEnabled,
    DateTime? LastTriggered);

public record UpsertAlertRuleRequest(
    string Name,
    string ConditionType,
    string ConditionExpression,
    string ActionType,
    Dictionary<string, object> ActionParameters,
    bool IsEnabled);
