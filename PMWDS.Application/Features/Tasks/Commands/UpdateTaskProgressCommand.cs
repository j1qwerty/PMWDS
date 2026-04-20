using MediatR;
using PMWDS.Application.DTOs.Tasks;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Application.Exceptions;
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
 public UpdateTaskProgressCommandHandler(
 IUnitOfWork uow,
 ICurrentUserService currentUser,
 IAIService ai,
 INotificationService notifications)
 {
 _uow = uow;
 _currentUser = currentUser;
 _ai = ai;
 _notifications = notifications;
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
 task.UpdateAIPrediction(
 prediction.DelayProbability,
 prediction.PredictedCompletionDate,
 string.Join("; ",
 prediction.ContributingFactors),
 task.AIRecommendedAssigneeId);
 // Auto-escalate if AI deems critical
 if (prediction.ShouldEscalate && !task.IsEscalated)
 {
 task.Escalate();
 await _notifications.SendEscalationAlertAsync(
 task.Id, task.EscalationLevel, ct);
 }
 await _uow.Tasks.UpdateAsync(task, ct);
 await _uow.SaveChangesAsync(ct);
 return TaskDto.FromEntity(task);
 }
}
