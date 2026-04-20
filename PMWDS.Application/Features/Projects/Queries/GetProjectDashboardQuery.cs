using MediatR;
using PMWDS.Application.DTOs.Dashboard;
using PMWDS.Application.DTOs.Projects;
using PMWDS.Application.DTOs.Tasks;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;
using PMWDS.Domain.Enums;
namespace PMWDS.Application.Features.Projects.Queries;
public record GetProjectDashboardQuery(
 Guid? DepartmentId) : IRequest<DashboardDto>;
public class GetProjectDashboardQueryHandler
 : IRequestHandler<GetProjectDashboardQuery, DashboardDto>
{
 private readonly IUnitOfWork _uow;
 private readonly ICacheService _cache;
 private readonly ICurrentUserService _currentUser;
 public GetProjectDashboardQueryHandler(
 IUnitOfWork uow,
 ICacheService cache,
 ICurrentUserService currentUser)
 {
 _uow = uow;
 _cache = cache;
 _currentUser = currentUser;
 }
 public async Task<DashboardDto> Handle(
 GetProjectDashboardQuery req,
 CancellationToken ct)
 {
 var cacheKey =
 $"dashboard-{req.DepartmentId ?? Guid.Empty}";
 var cached = await _cache
 .GetAsync<DashboardDto>(cacheKey, ct);
 if (cached != null) return cached;
 // Fetch data
 var deptId = req.DepartmentId
 ;
 var allProjects = deptId.HasValue
 ? await _uow.Projects
 .GetByDepartmentAsync(deptId.Value, ct)
 : await _uow.Projects.GetAllAsync(ct);
 var projects = allProjects.ToList();
 var tasks = (await _uow.Tasks
 .GetAllAsync(ct)).ToList();
 var users = deptId.HasValue
 ? (await _uow.Users
 .GetByDepartmentAsync(deptId.Value, ct))
 .ToList()
 : (await _uow.Users.GetAllAsync(ct)).ToList();
 var overdueTasks = tasks
 .Where(t => t.IsOverdue()).ToList();
 var escalatedTasks = tasks
 .Where(t => t.IsEscalated).ToList();
 var highRiskProjects = projects
 .Where(p => p.AIDelayRiskScore >= 0.7) 
.ToList(); 


var dashboard = new DashboardDto(
 TotalProjects:
 projects.Count,
 ActiveProjects:
 projects.Count(p =>
 p.Status == ProjectStatus.InProgress),
 CompletedProjects:
 projects.Count(p =>
 p.Status == ProjectStatus.Completed),
 OnHoldProjects:
 projects.Count(p =>
 p.Status == ProjectStatus.OnHold),
 TotalTasks:
 tasks.Count,
 CompletedTasks:
 tasks.Count(t =>
 t.Status ==
 Domain.Enums.TaskStatus.Completed),
 OverdueTasks:
 overdueTasks.Count,
 EscalatedTasks:
 escalatedTasks.Count,
 TotalTeamMembers:
 users.Count,
 AvailableMembers:
 users.Count(u =>
 u.AvailabilityStatus ==
AvailabilityStatus.Available),
 OverallHealthScore:
 projects.Any()
 ? Math.Round(
 projects.Average(p =>
 (double)p.AIHealthScore), 1)
 : 100.0,
 OverallDelayRisk:
 projects.Any()
 ? Math.Round(
 (double)projects.Average(p =>
 p.AIDelayRiskScore), 4)
 : 0.0,
 TotalBudget:
 projects.Sum(p => p.PlannedBudget),
 TotalActualCost:
 projects.Sum(p => p.ActualCost),
 BudgetVariance:
 projects.Sum(p =>
 p.PlannedBudget - p.ActualCost),
 HighRiskProjects:
 highRiskProjects
 .Select(ProjectSummaryDto.FromEntity)
.ToList(),
 RecentEscalations:
 escalatedTasks
 .OrderByDescending(t =>
 t.EscalatedDate)
 .Take(5)
.Select(TaskSummaryDto.FromEntity)
.ToList(),
 ProjectHealthBreakdown:
 projects
 .Select(p => new ProjectHealthItem(
 p.Id, p.Name,
(double)p.AIHealthScore,
(double)p.AIDelayRiskScore,
 p.Status.ToString()))
 .OrderBy(p => p.HealthScore)
 .ToList(),
 WorkloadDistribution:
 users
 .Select(u => new WorkloadItem(
 u.Id.ToString(),
 u.FullName,
 u.AIWorkloadScore,
 u.AIBurnoutRiskScore,
u.GetActiveTaskCount()))
 .OrderByDescending(w =>
 w.WorkloadScore)
 .Take(10)
.ToList(),
 TaskCompletionTrend:
 BuildCompletionTrend(tasks),
 GeneratedAt:
 DateTime.UtcNow
 );
 // Cache for 5 minutes
 await _cache.SetAsync(
 cacheKey, dashboard,


 TimeSpan.FromMinutes(5), ct);
 return dashboard;
 }
 private static List<TrendPoint> BuildCompletionTrend(
 List<ProjectTask> tasks)
 {
 var last30Days = Enumerable.Range(0, 30)
 .Select(i => DateTime.UtcNow
 .Date.AddDays(-i))
 .Reverse();
 return last30Days.Select(day =>
 new TrendPoint(
 Date: day,
 Completed: tasks.Count(t =>
 t.CompletedDate.HasValue &&
t.CompletedDate.Value.Date == day),
 Created: tasks.Count(t =>
 t.CreatedDate.Date == day)
 )).ToList();
 }
}
