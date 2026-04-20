using MediatR;
using PMWDS.Application.DTOs.Projects;
using PMWDS.Application.DTOs.Tasks;
using PMWDS.Application.DTOs.Users;
using PMWDS.Application.Interfaces.Services;
namespace PMWDS.Application.Features.Projects.Queries;
public record GetProjectDetailsQuery(Guid Id)
 : IRequest<ProjectDetailDto>;
public class GetProjectDetailsQueryHandler
 : IRequestHandler<GetProjectDetailsQuery, ProjectDetailDto>
{
 private readonly IUnitOfWork _uow;
 private readonly ICacheService _cache;
 public GetProjectDetailsQueryHandler(
 IUnitOfWork uow,
 ICacheService cache)
 {
 _uow = uow;
 _cache = cache;
 }
 public async Task<ProjectDetailDto> Handle(
 GetProjectDetailsQuery req,
 CancellationToken ct)
 {
 var cacheKey = $"project-detail-{req.Id}";
 var cached = await _cache
 .GetAsync<ProjectDetailDto>(cacheKey, ct);
 if (cached != null) return cached;
 var project = await _uow.Projects
 .GetWithDetailsAsync(req.Id, ct)
 ?? throw new NotFoundException(
 "Project", req.Id);
 var tasks = await _uow.Tasks
 .GetByProjectAsync(req.Id, ct);
 var milestones = project.Milestones;
 var detail = new ProjectDetailDto(
 Id: project.Id,
 ProjectCode: project.ProjectCode,
 Name: project.Name,
 Description: project.Description,
 Category: project.Category,
 Status: project.Status.ToString(),
 Priority: project.Priority.ToString(),
 PlannedStartDate: project.PlannedStartDate,
 PlannedEndDate: project.PlannedEndDate,
 ActualStartDate: project.ActualStartDate,
 ActualEndDate: project.ActualEndDate,
 PlannedBudget: project.PlannedBudget,
 ActualCost: project.ActualCost,
 BudgetVariance: project.PlannedBudget
 - project.ActualCost,
 ProgressPercentage: project.ProgressPercentage,
 AIHealthScore: (double)project.AIHealthScore,
 AIDelayRiskScore: (double)project.AIDelayRiskScore,
 AIBudgetRiskScore: (double)project.AIBudgetRiskScore,
 AIInsightsSummary: project.AIInsightsSummary,
 DepartmentId: project.DepartmentId,
 DepartmentName: project.Department?.Name,
 ProjectManagerId: project.ProjectManagerId,
 ProjectManagerName: null,
 Tasks: tasks
 .Select(TaskDto.FromEntity)
 .ToList(),
 Milestones: milestones
 .Select(MilestoneDto.FromEntity)
 .ToList(),
 TeamMembers: new(),
 TotalTasks: tasks.Count(),
 CompletedTasks: tasks.Count(t =>
 t.Status ==
Domain.Enums.TaskStatus.Completed),
 OverdueTasks: tasks.Count(t =>
 t.IsOverdue()),
 EscalatedTasks: tasks.Count(t =>
 t.IsEscalated),
 CreatedDate: project.CreatedDate,
 CreatedBy: project.CreatedBy
 );
 await _cache.SetAsync(
 cacheKey, detail,
 TimeSpan.FromMinutes(2), ct);
 return detail;
 }
}
