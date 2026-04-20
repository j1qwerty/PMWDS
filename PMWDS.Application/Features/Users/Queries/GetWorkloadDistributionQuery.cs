using MediatR;
using PMWDS.Application.DTOs.Users;
using PMWDS.Application.Interfaces.Services;
namespace PMWDS.Application.Features.Users.Queries;
public record GetWorkloadDistributionQuery(
 Guid? DepartmentId)
 : IRequest<WorkloadDistributionDto>;
public class GetWorkloadDistributionQueryHandler
 : IRequestHandler<
 GetWorkloadDistributionQuery,
 WorkloadDistributionDto>
{
 private readonly IUnitOfWork _uow;
 public GetWorkloadDistributionQueryHandler(
 IUnitOfWork uow)
 => _uow = uow;
 public async Task<WorkloadDistributionDto> Handle(
 GetWorkloadDistributionQuery req,
 CancellationToken ct)
 {
 var users = req.DepartmentId.HasValue
 ? (await _uow.Users.GetByDepartmentAsync(
 req.DepartmentId.Value, ct)).ToList()
 : (await _uow.Users.GetAllAsync(ct)).ToList();
 var distribution = users.Select(u =>
 new UserWorkloadItem(
 UserId: u.Id.ToString(),
 FullName: u.FullName,
 JobTitle: u.JobTitle,
 AvailabilityPercent: u.AvailabilityPercentage,
 WorkloadScore: u.AIWorkloadScore,
 BurnoutRisk: u.AIBurnoutRiskScore,
 PerformanceScore: u.AIPerformanceScore,
 ActiveTaskCount: u.GetActiveTaskCount(),
 CompletedThisMonth: 0,
 Skills: u.Skills
 .Select(s =>
 s.Skill?.Name ?? "")
 .ToList(),
 Status: u.AIWorkloadScore switch
 {
 >= 90 => "Overloaded",
 >= 70 => "High",
 >= 50 => "Moderate",
 _ => "Available"
 }
 )).ToList();
 return new WorkloadDistributionDto(
 DepartmentId: req.DepartmentId,
 TotalMembers: users.Count,
 AvailableCount: users.Count(u =>
 u.AvailabilityStatus ==
 Domain.Enums.AvailabilityStatus.Available),
 OverloadedCount: distribution.Count(d =>
 d.Status == "Overloaded"),
 AverageWorkload: distribution.Any()
 ? Math.Round(distribution
 .Average(d => d.WorkloadScore), 1)
 : 0.0,
 AverageBurnoutRisk: distribution.Any()
 ? Math.Round(distribution
 .Average(d => d.BurnoutRisk), 4)
 : 0.0,
 Members: distribution
 .OrderByDescending(d => d.WorkloadScore)
 .ToList(),
 GeneratedAt: DateTime.UtcNow
 );
 }
}
