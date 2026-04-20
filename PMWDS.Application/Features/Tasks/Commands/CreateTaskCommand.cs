using MediatR;
using PMWDS.Application.DTOs.Tasks;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;
namespace PMWDS.Application.Features.Tasks.Commands;

public record CreateTaskCommand(
 CreateTaskDto Dto) : IRequest<TaskDto>;
public class CreateTaskCommandHandler
 : IRequestHandler<CreateTaskCommand, TaskDto>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditService _audit;
    private readonly INotificationService _notifications;
    private readonly IAIService _ai;
    public CreateTaskCommandHandler(
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
    CreateTaskCommand req,
    CancellationToken ct)
    {
        var dto = req.Dto;
        var project = await _uow.Projects
        .GetByIdAsync(dto.ProjectId, ct)
        ?? throw new NotFoundException(
        "Project", dto.ProjectId);
        var task = ProjectTask.Create(
        dto.Title,
        dto.Description,
        dto.StartDate,
        dto.DueDate,
        dto.EstimatedHours,
        dto.ProjectId,
        dto.MilestoneId,
        dto.ParentTaskId,
        dto.Priority);
        task.SetCreated(
        _currentUser.UserId ?? "system");
        // AI: get initial delay prediction
        var prediction = await _ai
        .PredictTaskDelayAsync(task.Id, ct)
        .ContinueWith(t =>
        t.IsCompletedSuccessfully
        ? t.Result : null, ct);
        if (prediction != null)
        {
            task.UpdateAIScores(
            prediction.DelayProbability, 0,
            string.Join("; ",
            prediction.ContributingFactors));
        }
        await _uow.Tasks.AddAsync(task, ct);
        // Auto-assign if specified
        if (!string.IsNullOrEmpty(dto.AssignedToUserId))
        {
            task.AssignTo(dto.AssignedToUserId);
            await _notifications
            .SendTaskAssignedAsync(
            task.Id,
           dto.AssignedToUserId, ct);
        }
        await _uow.SaveChangesAsync(ct);
        await _audit.LogAsync(
        _currentUser.UserId ?? "system",
        "Create", "Task",


        task.Id.ToString(),
        null,
        new { task.Id, task.Title },
        ct: ct);
        return TaskDto.FromEntity(task);
    }
}