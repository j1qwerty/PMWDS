using MediatR;
using AutoMapper;
using PMWDS.Application.DTOs.Projects;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Enums;
namespace PMWDS.Application.Features.Projects.Queries;

public record GetProjectDashboardQuery(
 Guid? DepartmentId = null) : IRequest<ProjectDashboardDto>;
public record ProjectDashboardDto(
 int TotalProjects,
 int ActiveProjects,
 int CompletedProjects,
 int OverdueProjects,
 int HighRiskProjects,
 double AverageHealthScore,
 decimal TotalBudget,
 decimal TotalActualCost,
 List<ProjectSummaryDto> RecentProjects,
 List<ProjectSummaryDto> AtRiskProjects
);
public record ProjectSummaryDto(
 Guid Id,
 string ProjectCode,
 string Name,
 string Status,
 double ProgressPercentage,
 double AIHealthScore,
 double AIDelayRiskScore,
 int DelayDays,
 DateTime PlannedEndDate
);
public class GetProjectDashboardQueryHandler
 : IRequestHandler<GetProjectDashboardQuery,
 ProjectDashboardDto>
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;
    public GetProjectDashboardQueryHandler(
    IUnitOfWork uow, IMapper mapper)
    {
        _uow = uow;
        _mapper = mapper;
    }
    public async Task<ProjectDashboardDto> Handle(
    GetProjectDashboardQuery request,
    CancellationToken ct)
    {
        var projects = request.DepartmentId.HasValue
        ? await _uow.Projects
        .GetByDepartmentAsync(
        request.DepartmentId.Value, ct)
        : await _uow.Projects.GetAllAsync(ct);
        var list = projects.ToList();
        return new ProjectDashboardDto(
        TotalProjects: list.Count,
        ActiveProjects: list.Count(p =>
        p.Status == ProjectStatus.InProgress),
        CompletedProjects: list.Count(p =>
        p.Status == ProjectStatus.Completed),
        OverdueProjects: list.Count(p =>
        p.GetDelayDays() > 0),
        HighRiskProjects: list.Count(p =>
        p.AIDelayRiskScore >= 0.7),
        AverageHealthScore: list.Any()
        ? list.Average(p => p.AIHealthScore)
        : 0,
        TotalBudget: list.Sum(p => p.PlannedBudget),
        TotalActualCost: list.Sum(p => p.ActualCost),
        RecentProjects: list.OrderByDescending(p => p.CreatedDate)
        .Take(5)
        .Select(p => _mapper.Map<ProjectSummaryDto>(p))
        .ToList(),
        AtRiskProjects: list
        .Where(p => p.AIDelayRiskScore >= 0.7)
        .OrderByDescending(p => p.AIDelayRiskScore)
        .Take(10)
        .Select(p => _mapper.Map<ProjectSummaryDto>(p))
        .ToList()
        );
    }
}
