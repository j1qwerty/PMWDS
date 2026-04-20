using PMWDS.Domain.Entities;
namespace PMWDS.Application.DTOs.Projects;
public record MilestoneDto(
 Guid Id,
 Guid ProjectId,
 string Name,
 string Description,
 int Order,
 DateTime DueDate,
 DateTime? CompletedDate,
 string Status,
 bool IsCritical,
 double ProgressPercentage)
{
 public static MilestoneDto FromEntity(Milestone m)
 => new(
 m.Id,
 m.ProjectId,
 m.Name,
 m.Description,
 m.Order,
 m.DueDate,
 m.CompletedDate,
 m.Status.ToString(),
 m.IsCritical,
 m.ProgressPercentage);
}
