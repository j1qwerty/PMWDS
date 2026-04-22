using MediatR;
using PMWDS.Application.DTOs.Tasks;
using PMWDS.Application.Interfaces.Services;
namespace PMWDS.Application.Features.Tasks.Commands;

public record AssignTaskCommand(
 Guid TaskId,
 string AssigneeId,
 bool UseAIRecommendation = false)
 : IRequest<TaskDto>;
public class AssignTaskCommandHandler
 : IRequestHandler<AssignTaskCommand, TaskDto>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _audit;
    private readonly INotificationService _notifications;
    private readonly IAIService _ai;
    public AssignTaskCommandHandler(
    IUnitOfWork uow,
    ICurrentUserService currentUser,
    IAuditService audit,
    INotificationService notifications,
    IAIService ai)
    {
        _uow = uow;
        _currentUser = currentUser;
        _audit = audit;
        _notifications = notifications;
        _ai = ai;
    }
    public async Task<TaskDto> Handle(
    AssignTaskCommand req,
    CancellationToken ct)
    {
        var task = await _uow.Tasks
        .GetByIdAsync(req.TaskId, ct)
        ?? throw new NotFoundException(
        "Task", req.TaskId);
        string finalAssigneeId = req.AssigneeId;
        if (req.UseAIRecommendation)
        {
            var recommendation = await _ai
            .GetOptimalAssigneeAsync(req.TaskId, ct);
            finalAssigneeId =
            recommendation.RecommendedUserId;
        }
        var assignee = await _uow.Users
        .GetByIdAsync(
        Guid.Parse(finalAssigneeId), ct)
        ?? throw new NotFoundException(
        "User", finalAssigneeId);
        var oldAssignee = task.AssignedToUserId;
        task.AssignTo(
        finalAssigneeId,
        _currentUser.UserId ?? "system");
        var assignment = Domain.Entities.TaskAssignment.Create(task.Id, finalAssigneeId);
        await _uow.TaskAssignments.AddAsync(assignment, ct);
        await _uow.SaveChangesAsync(ct);
        await _notifications.SendTaskAssignmentAlertAsync(
        task.Id, finalAssigneeId, ct);
        await _audit.LogAsync(
        _currentUser.UserId ?? "system",
        "Assign", "Task",
        task.Id.ToString(),
        new { AssignedTo = oldAssignee },
        new
        {
            AssignedTo = finalAssigneeId,
            AIUsed = req.UseAIRecommendation
        },
        isAI: req.UseAIRecommendation,
        aiModel: req.UseAIRecommendation
        ? "TaskAllocationEngine" : null,
        ct: ct);
        return TaskDto.FromEntity(task);
    }
}
