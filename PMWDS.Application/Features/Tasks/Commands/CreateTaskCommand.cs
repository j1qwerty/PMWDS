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
    private readonly ITaskAiEnrichmentQueue _aiQueue;
    public CreateTaskCommandHandler(
    IUnitOfWork uow,
    ICurrentUserService currentUser,
    IAuditService audit,
    INotificationService notifications,
    ITaskAiEnrichmentQueue aiQueue)
    {
        _uow = uow;
        _currentUser = currentUser;
        _audit = audit;
        _notifications = notifications;
        _aiQueue = aiQueue;
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
        dto.ProjectId,
        dto.Title,
        dto.Description ?? string.Empty,
        dto.Priority,
        dto.StartDate,
        dto.DueDate,
        (int)dto.EstimatedHours,
        dto.MilestoneId,
        dto.ParentTaskId);
        task.SetCreatedBy(
        _currentUser.UserId ?? "system");
        await _uow.Tasks.AddAsync(task, ct);
        var assigneeIds = (dto.AssignedToUserIds ?? [])
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct()
            .ToList();
        if (!string.IsNullOrWhiteSpace(dto.AssignedToUserId) && !assigneeIds.Contains(dto.AssignedToUserId))
        {
            assigneeIds.Insert(0, dto.AssignedToUserId);
        }

        if (assigneeIds.Count > 0)
        {
            var assignedBy = ParseUserId(_currentUser.UserId, "current user");
            var parsedAssigneeIds = assigneeIds
                .Select(id => ParseUserId(id, "assignee"))
                .ToList();
            task.AssignTo(
            parsedAssigneeIds[0],
            assignedBy);
            foreach (var assigneeId in parsedAssigneeIds)
            {
                await _uow.TaskAssignments.AddAsync(TaskAssignment.Create(task.Id, assigneeId), ct);
                await _notifications
                .SendTaskAssignmentAlertAsync(
                task.Id,
                assigneeId.ToString(), ct);
            }
        }
        await _uow.SaveChangesAsync(ct);

        // AI enrichment is deliberately outside the create request. Task creation
        // is a transactional business operation; prediction is advisory work that
        // can be retried independently after the task exists.
        await _aiQueue.QueueAsync(task.Id);

        await _audit.LogAsync(
        _currentUser.UserId ?? "system",
        "Create", "Task",


        task.Id.ToString(),
        null,
        new { task.Id, task.Title },
        ct: ct);
        return TaskDto.FromEntity(task);
    }

    private static Guid ParseUserId(string? userId, string fieldName)
        => Guid.TryParse(userId, out var parsed)
            ? parsed
            : throw new InvalidOperationException($"Invalid {fieldName} id.");
}
