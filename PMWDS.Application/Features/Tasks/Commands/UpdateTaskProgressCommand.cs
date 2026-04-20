using MediatR;
using PMWDS.Application.DTOs.Tasks;
using PMWDS.Application.Interfaces.Services;
using Microsoft.AspNetCore.SignalR;
using PMWDS.API.Hubs;
namespace PMWDS.Application.Features.Tasks.Commands;

public record UpdateTaskProgressCommand(
 Guid Id,
 UpdateTaskProgressDto Dto) : IRequest<TaskDto>;
public class UpdateTaskProgressCommandHandler
 : IRequestHandler<UpdateTaskProgressCommand, TaskDto>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;
    private readonly IAIService _ai;
    private readonly INotificationService _notifications;
    private readonly IHubContext<DashboardHub> _dashboardHub;
    public UpdateTaskProgressCommandHandler(
    IUnitOfWork uow,
    ICurrentUserService currentUser,
    IAIService ai,
    INotificationService notifications,


    IHubContext<DashboardHub> dashboardHub)
    {
        _uow = uow;
        _currentUser = currentUser;
        _ai = ai;
        _notifications = notifications;
        _dashboardHub = dashboardHub;
    }
    public async Task<TaskDto> Handle(
    UpdateTaskProgressCommand req,
    CancellationToken ct)
    {
        var task = await _uow.Tasks
        .GetByIdAsync(req.Id, ct)
        ?? throw new NotFoundException(
        "Task", req.Id);
        task.UpdateProgress(
        req.Dto.ProgressPercentage,
        req.Dto.Notes);
        task.SetModified(
        _currentUser.UserId ?? "system");
        // Re-run AI delay prediction on progress update
        var prediction = await _ai
        .PredictTaskDelayAsync(req.Id, ct);
        task.UpdateAIScores(
        prediction.DelayProbability,
        task.AIOptimalAssigneeScore,
        string.Join("; ",
        prediction.ContributingFactors));
        // Auto-escalate if AI deems critical
        if (prediction.ShouldEscalate && !task.IsEscalated)
        {
            task.Escalate();
            await _notifications.SendEscalationAlertAsync(
            task.Id, task.EscalationLevel, ct);
        }
        await _uow.Tasks.UpdateAsync(task, ct);
        await _uow.SaveChangesAsync(ct);
        // Push live update to dashboard via SignalR
        await _dashboardHub.Clients
        .Group($"project-{task.ProjectId}")
        .SendAsync("TaskProgressUpdated", new
        {
            task.Id,
            task.ProgressPercentage,
            task.Status,
            prediction.DelayProbability
        }, ct);
        return TaskDto.FromEntity(task);
    }
}