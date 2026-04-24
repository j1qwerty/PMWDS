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
 Guid? ProfileId,
 string? Bio,
 string AvailabilityStatus,
 double AvailabilityPercentage,
 double AIWorkloadScore,
 double AIBurnoutRiskScore,
 double AIPerformanceScore,
 int ActiveTaskCount,
 bool IsActive,
 DateTime? LastLoginDate,
 List<string> Roles,
 List<string>? Skills)
{
    public static UserDto FromEntity(
    ApplicationUser u,
    IList<string>? roles = null)
    => new(
    Id: u.Id.ToString(),
    FirstName: u.FirstName,
    LastName: u.LastName,
    FullName: u.FullName,
    Email: u.Email,
    JobTitle: u.Profile?.JobTitle ?? u.JobTitle,
    Department: u.Department?.Name,
    DepartmentId: u.DepartmentId,
    ProfileId: u.Profile?.Id,
    Bio: u.Profile?.Bio,
    AvailabilityStatus: u.AvailabilityStatus
    .ToString(),
    AvailabilityPercentage: u.AvailabilityPercentage,
    AIWorkloadScore: u.AIWorkloadScore,
    AIBurnoutRiskScore: u.AIBurnoutRiskScore,
    AIPerformanceScore: u.AIPerformanceScore,
    ActiveTaskCount: u.GetActiveTaskCount(),
    IsActive: u.IsActive,
    LastLoginDate: null,
    Roles: roles?.ToList()
    ?? new(),
    Skills: null
    );
    public static UserDto FromEntityWithSkills(
    ApplicationUser u,
    IList<string>? roles = null)
    => new(
    Id: u.Id.ToString(),
    FirstName: u.FirstName,
    LastName: u.LastName,
    FullName: u.FullName,
    Email: u.Email,
    JobTitle: u.Profile?.JobTitle ?? u.JobTitle,
    Department: u.Department?.Name,
    DepartmentId: u.DepartmentId,
    ProfileId: u.Profile?.Id,
    Bio: u.Profile?.Bio,
    AvailabilityStatus: u.AvailabilityStatus
    .ToString(),
    AvailabilityPercentage: u.AvailabilityPercentage,
    AIWorkloadScore: u.AIWorkloadScore,
    AIBurnoutRiskScore: u.AIBurnoutRiskScore,
    AIPerformanceScore: u.AIPerformanceScore,
    ActiveTaskCount: u.GetActiveTaskCount(),
    IsActive: u.IsActive,
    LastLoginDate: null,
    Roles: roles?.ToList()
    ?? new(),
    Skills: u.Skills
    .Select(s => s.Skill?.Name ?? "")
    .ToList()
    );
}

public record UserSkillDto(
 Guid SkillId,
 string SkillName,
 int ProficiencyLevel,
 int ExperienceMonths,
 DateTime LastUsed);
public record UserSummaryDto(
 string Id,
 string FullName,
 string? JobTitle,
 double AvailabilityPercentage,
 double WorkloadScore)
{
    public static UserSummaryDto FromEntity(
    ApplicationUser u)
    => new(u.Id.ToString(), u.FullName, u.Profile?.JobTitle ?? u.JobTitle,
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
