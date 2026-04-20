using OpenAI;
using OpenAI.Chat;
using PMWDS.Application.DTOs.AI;
using PMWDS.Application.Interfaces.Services;
using PMWDS.AI.Models;
using Microsoft.Extensions.Options;
namespace PMWDS.AI.Services;
public interface IChatEngine
{
 Task<ChatResponseDto> ProcessAsync(
 string userId, string message,
 CancellationToken ct = default);
 Task<string> GenerateSummaryAsync(
 string context,
 CancellationToken ct = default);
}


public class OpenAIChatEngine : IChatEngine
{
 private readonly ChatClient _client;
 private readonly AISettings _settings;
 private readonly IUnitOfWork _uow;
 // In-memory session history (production: use Redis)
 private static readonly Dictionary<string,
 List<ChatMessage>> _sessions = new();
 public OpenAIChatEngine(
 IOptions<AISettings> settings,
 IUnitOfWork uow)
 {
 _settings = settings.Value;
 _uow = uow;
 _client = new ChatClient(
 model: _settings.OpenAIModel,
 apiKey: _settings.OpenAIApiKey);
 }
 public async Task<ChatResponseDto> ProcessAsync(
 string userId, string message,
 CancellationToken ct = default)
 {
 if (!_sessions.ContainsKey(userId))
 _sessions[userId] = new List<ChatMessage>
 {
 ChatMessage.CreateSystemMessage(
 "You are PMWDS AI Assistant â€” a helpful " +
 "project management expert. " +
 "Help users with project status, " +
 "task assignments, risk analysis, " +
 "and productivity insights. " +
 "Always respond in a concise, " +
 "professional manner.")
 };
 _sessions[userId].Add(
 ChatMessage.CreateUserMessage(message));
 // Detect intent
 var intent = DetectIntent(message);
 // Fetch relevant context from DB
 var contextData = await FetchContextData(
 userId, intent, ct);
 var contextMsg = contextData != null
 ? $"\n\nSystem Context: {contextData}"
 : string.Empty;
 if (!string.IsNullOrEmpty(contextMsg))
 _sessions[userId].Add(
 ChatMessage.CreateSystemMessage(contextMsg));
 var completion = await _client.CompleteChatAsync(
 _sessions[userId],
 cancellationToken: ct);
 var reply = completion.Value.Content[0].Text;
 _sessions[userId].Add(
 ChatMessage.CreateAssistantMessage(reply));
 // Trim session to last 20 messages
 if (_sessions[userId].Count > 22)
 _sessions[userId] = _sessions[userId]
 .Take(1)
 .Concat(_sessions[userId].TakeLast(20))
 .ToList();
 return new ChatResponseDto(
 Message: reply,
 Intent: intent,
 SuggestedActions: GetSuggestedActions(intent),
 ContextData: contextData,
 RequiresConfirmation: NeedsConfirmation(intent)
 );
 }
 public async Task<string> GenerateSummaryAsync(
 string context,
 CancellationToken ct = default)
 {
 if (string.IsNullOrEmpty(_settings.OpenAIApiKey))
 return "AI summary not available.";
 var messages = new List<ChatMessage>
 {
 ChatMessage.CreateSystemMessage(
 "You are a concise project management " +
 "analyst. Generate a brief 2-3 sentence " +
 "summary based on the data provided."),
 ChatMessage.CreateUserMessage(context)
 };
 var completion = await _client.CompleteChatAsync(
 messages, cancellationToken: ct);
 return completion.Value.Content[0].Text;
 }
 private static string DetectIntent(string message)
 {
 var lower = message.ToLower();
 if (lower.Contains("assign") ||
 lower.Contains("who should"))
 return "TaskAssignment";
 if (lower.Contains("delay") ||
 lower.Contains("at risk") ||
 lower.Contains("overdue"))
 return "DelayAnalysis";
 if (lower.Contains("status") ||
 lower.Contains("progress") ||
 lower.Contains("health"))
 return "ProjectStatus";
 if (lower.Contains("report") ||
 lower.Contains("summary") ||
 lower.Contains("analytics"))
 return "Reporting";
 if (lower.Contains("workload") ||
 lower.Contains("capacity") ||
 lower.Contains("resource"))
 return "ResourceManagement";
 return "General";
 }

  private async Task<object?> FetchContextData(
 string userId, string intent,
 CancellationToken ct)
 {
 return intent switch
 {
 "DelayAnalysis" => new
 {
 OverdueTasks = (await _uow.Tasks
 .GetOverdueTasksAsync(ct))
.Select(t => new
 {
 t.Title,
t.DueDate,
t.ProgressPercentage
 })
.Take(5)
 },
 "ProjectStatus" => new
 {
 ActiveProjects = (await _uow.Projects
 .GetByStatusAsync(
 Domain.Enums.ProjectStatus.InProgress,
ct))
 .Select(p => new
 {
 p.Name,
p.ProgressPercentage,
p.AIHealthScore
 })
.Take(5)
 },
 "ResourceManagement" => new
 {
 AvailableUsers = (await _uow.Users
 .GetAvailableUsersAsync(ct))
.Select(u => new
 {
 u.FullName,
u.AvailabilityPercentage,
u.AIWorkloadScore
 })
.Take(5)
 },
 _ => null
 };
 }
 private static List<string> GetSuggestedActions(
 string intent)
 => intent switch
 {
 "TaskAssignment" => new()
 {
 "View AI Recommendations",
 "Assign Task Now",
 "Check Team Availability"
 },
 "DelayAnalysis" => new()
 {
 "View Overdue Tasks",
 "Escalate Now",
 "Adjust Timeline"
 },
 "ProjectStatus" => new()
 {
 "View Dashboard",
 "Generate Status Report",
 "View Milestones"
 },
 "ResourceManagement" => new()
 {
 "View Workload Distribution",
 "Optimize Allocation",
 "Check Burnout Risk"
 },
 _ => new() { "Go to Dashboard" }
 };
 private static bool NeedsConfirmation(string intent)
 => intent is "TaskAssignment";
}
