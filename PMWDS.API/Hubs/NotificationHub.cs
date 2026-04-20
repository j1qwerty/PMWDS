using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
namespace PMWDS.API.Hubs;
[Authorize]
public class NotificationHub : Hub
{
 private static readonly Dictionary<string, string>
 _connections = new();
 public override async Task OnConnectedAsync()
 {
 var userId = Context.User?
 .FindFirstValue(ClaimTypes.NameIdentifier);


 if (userId != null)
 {
 _connections[userId] =
 Context.ConnectionId;
 // Add user to their personal group
 await Groups.AddToGroupAsync(
 Context.ConnectionId,
 $"user-{userId}");
 // Add to department group
 var deptId = Context.User?
 .FindFirstValue("DepartmentId");
 if (!string.IsNullOrEmpty(deptId))
 await Groups.AddToGroupAsync(
 Context.ConnectionId,
$"dept-{deptId}");
 // Add to role groups
 var roles = Context.User?
 .FindAll(ClaimTypes.Role)
 .Select(c => c.Value) ?? [];
 foreach (var role in roles)
 await Groups.AddToGroupAsync(
 Context.ConnectionId,
 $"role-{role}");
 }
 await base.OnConnectedAsync();
 }
 public override async Task OnDisconnectedAsync(
 Exception? exception)
 {
 var userId = Context.User?
 .FindFirstValue(ClaimTypes.NameIdentifier);
 if (userId != null)
 _connections.Remove(userId);
 await base.OnDisconnectedAsync(exception);
 }
 /// <summary>
 /// Client calls this to acknowledge a notification
 /// </summary>
 public async Task AcknowledgeNotification(
 string notificationId)
 {
 var userId = Context.User?
 .FindFirstValue(ClaimTypes.NameIdentifier);
 if (userId != null)
 await Clients.Caller.SendAsync(
 "NotificationAcknowledged",
 notificationId);
 }
 /// <summary>Broadcast to all connected clients</summary>
 public async Task SendBroadcast(
 string title, string message)
 => await Clients.All.SendAsync(
 "BroadcastReceived",
 new { title, message,
 timestamp = DateTime.UtcNow });
 public static string? GetConnectionId(string userId)
 => _connections.TryGetValue(
 userId, out var connId)
 ? connId : null;
}
