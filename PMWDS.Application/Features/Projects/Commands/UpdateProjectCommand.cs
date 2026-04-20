using MediatR;
using PMWDS.Application.DTOs.Projects;
using PMWDS.Application.Interfaces.Services;
namespace PMWDS.Application.Features.Projects.Commands;
public record UpdateProjectCommand(
 Guid Id, UpdateProjectDto Dto) : IRequest<ProjectDto>;
public class UpdateProjectCommandHandler
 : IRequestHandler<UpdateProjectCommand, ProjectDto>
{
 private readonly IUnitOfWork _uow;
 private readonly ICurrentUserService _currentUser;
 private readonly IAuditService _audit;
 public UpdateProjectCommandHandler(
 IUnitOfWork uow,
 ICurrentUserService currentUser,
 IAuditService audit)
 {
 _uow = uow;
 _currentUser = currentUser;
 _audit = audit;
 }
 public async Task<ProjectDto> Handle(
 UpdateProjectCommand req,
 CancellationToken ct)
 {
 var project = await _uow.Projects
 .GetByIdAsync(req.Id, ct)
 ?? throw new NotFoundException(
 "Project", req.Id);
 var oldValues = new { project.PlannedEndDate };
 var dto = req.Dto;
 if (dto.PlannedEndDate > project.PlannedEndDate)
 {
 project.UpdateTimeline(
 dto.PlannedEndDate,
 "Project updated");
 }
 project.SetModified(
 _currentUser.UserId ?? "system");
 await _uow.Projects.UpdateAsync(project, ct);
 await _uow.SaveChangesAsync(ct);
 await _audit.LogAsync(
 _currentUser.UserId ?? "system",
 "Update", "Project",
 project.Id.ToString(),
 oldValues,
 new { dto.PlannedEndDate },
 ct: ct);
 return ProjectDto.FromEntity(project);
 }
}
