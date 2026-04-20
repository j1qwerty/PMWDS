using MediatR;
using PMWDS.Application.DTOs.AI;
using PMWDS.Application.Interfaces.Services;
namespace PMWDS.Application.Features.Projects.Queries;
public record GetProjectHealthQuery(Guid ProjectId)
 : IRequest<ProjectHealthDto>;
public class GetProjectHealthQueryHandler
 : IRequestHandler<GetProjectHealthQuery, ProjectHealthDto>
{
 private readonly IUnitOfWork _uow;
 private readonly IAIService _ai;
 public GetProjectHealthQueryHandler(
 IUnitOfWork uow,
 IAIService ai)
 {
 _uow = uow;
 _ai = ai;
 }
 public async Task<ProjectHealthDto> Handle(
 GetProjectHealthQuery req,
 CancellationToken ct)
 {
 var project = await _uow.Projects
 .GetWithDetailsAsync(req.ProjectId, ct)
 ?? throw new NotFoundException(
 "Project", req.ProjectId);
 return await _ai.AnalyzeProjectHealthAsync(
 req.ProjectId, ct);
 }
}
