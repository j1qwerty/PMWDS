using MediatR;
using PMWDS.Application.DTOs.Tasks;
using PMWDS.Application.Interfaces.Services;
namespace PMWDS.Application.Features.Tasks.Commands;

public record UpdateTaskProgressCommand(
 Guid Id,
 UpdateTaskProgressDto Dto) : IRequest<TaskDto>;
public class UpdateTaskProgressCommandHandler
 : IRequestHandler<UpdateTaskProgressCommand, TaskDto>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;
    public UpdateTaskProgressCommandHandler(
    IUnitOfWork uow,
    ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
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
        await _uow.SaveChangesAsync(ct);

        if (req.Dto.ProgressPercentage >= 100)
        {
            task.Complete();
            await _uow.SaveChangesAsync(ct);
        }

        return TaskDto.FromEntity(task);
    }
}
