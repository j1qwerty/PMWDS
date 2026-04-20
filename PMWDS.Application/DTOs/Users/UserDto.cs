using PMWDS.Domain.Entities;
namespace PMWDS.Application.DTOs.Users;

public record UserDto(
 string Id,
 string FirstName,


 string LastName,
 string FullName,
 string Email,
 string? JobTitle,
 string? Department,
 Guid? DepartmentId,
 string AvailabilityStatus,
 double AvailabilityPercentage,
 double AIWorkloadScore,
 double AIBurnoutRiskScore,
 double AIPerformanceScore,
 int ActiveTaskCount,
 bool IsActive,
 DateTime? LastLoginDate,
 List<string> Roles,
 List<string> Skills)
{
    public static UserDto FromEntity(
    ApplicationUser u,
    IList<string>? roles = null)
    => new(
    Id: u.Id,
    FirstName: u.FirstName,
    LastName: u.LastName,
    FullName: u.FullName,
    Email: u.Email ?? "",
    JobTitle: u.JobTitle,
    Department: u.Department?.Name,
    DepartmentId: u.DepartmentId,
    AvailabilityStatus: u.AvailabilityStatus
    .ToString(),
    AvailabilityPercentage: u.AvailabilityPercentage,
    AIWorkloadScore: u.AIWorkloadScore,
    AIBurnoutRiskScore: u.AIBurnoutRiskScore,
    AIPerformanceScore: u.AIPerformanceScore,
    ActiveTaskCount: u.GetActiveTaskCount(),
    IsActive: u.IsActive,
    LastLoginDate: u.LastLoginDate,
    Roles: roles?.ToList()
    ?? new(),
    Skills: u.UserSkills?
    .Select(s =>
    s.Skill?.Name ?? "")
    .ToList()
    ?? new()
    );
}
public record UserSummaryDto(
 string Id,
 string FullName,
 string? JobTitle,
 double AvailabilityPercentage,
 double WorkloadScore)
{
    public static UserSummaryDto FromEntity(
    ApplicationUser u)
    => new(u.Id, u.FullName, u.JobTitle,
    u.AvailabilityPercentage,
    u.AIWorkloadScore);
}
public record RegisterUserDto(
 string FirstName,
 string LastName,
 string Email,
 string Password,
 string? JobTitle,
 Guid? DepartmentId,
 string Role = "TeamMember");
public record UpdateUserDto(
 string FirstName,
 string LastName,
 string? JobTitle,
 string? PhoneNumber,
 Guid? DepartmentId,
 double AvailabilityPercentage);
public record WorkloadDistributionDto(
 Guid? DepartmentId,
 int TotalMembers,
 int AvailableCount,
 int OverloadedCount,
 double AverageWorkload,
 double AverageBurnoutRisk,
 List<UserWorkloadItem> Members,
 DateTime GeneratedAt);
public record UserWorkloadItem(
 string UserId,
 string FullName,
 string? JobTitle,
 double AvailabilityPercent,
 double WorkloadScore,
 double BurnoutRisk,
 double PerformanceScore,
 int ActiveTaskCount,
 int CompletedThisMonth,
 List<string> Skills,
 string Status);