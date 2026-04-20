using MediatR;
using AutoMapper;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;
using PMWDS.Application.DTOs.Projects;
namespace PMWDS.Application.Features.Projects.Queries;

public record GetProjectDetailsQuery(
 Guid ProjectId) : IRequest<ProjectDto>;
public class GetProjectDetailsQueryHandler
 : IRequestHandler<GetProjectDetailsQuery, ProjectDto>
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;
    public GetProjectDetailsQueryHandler(
    IUnitOfWork uow, IMapper mapper)
    {
        _uow = uow;
        _mapper = mapper;
    }
    public async Task<ProjectDto> Handle(
    GetProjectDetailsQuery request,
    CancellationToken ct)
    {
        var project = await _uow.Projects
        .GetWithDetailsAsync(request.ProjectId, ct)
        ?? throw new NotFoundException(
        nameof(Project), request.ProjectId);
        return _mapper.Map<ProjectDto>(project);
    }
}