using PMWDS.Domain.Entities;
namespace PMWDS.Application.DTOs.Projects;
public record MilestoneDto(
 Guid Id,
 Guid ProjectId,
 List<Guid> DepartmentIds,
 List<string> DepartmentNames,
 string Name,
 string Description,
 int Order,
 DateTime DueDate,
 DateTime? CompletedDate,
 string Status,
 bool IsCritical,
 double ProgressPercentage,
 bool HasTasks)
{
 public static MilestoneDto FromEntity(Milestone m)
 {
     var tasks = m.Tasks ?? new List<ProjectTask>();
     var hasTasks = tasks.Count > 0;
     var progress = m.RecalculateProgressFromTasks();
     m.RecalculateStatusFromTasks();
     var departmentIds = m.MilestoneDepartments?
         .Select(md => md.DepartmentId)
         .ToList() ?? new List<Guid>();
     var departmentNames = m.MilestoneDepartments?
         .Select(md => md.Department?.Name ?? string.Empty)
         .Where(name => !string.IsNullOrEmpty(name))
         .ToList() ?? new List<string>();
     return new(
     m.Id,
     m.ProjectId,
     departmentIds,
     departmentNames,
     m.Name,
     m.Description,
     m.Order,
     m.DueDate,
     m.CompletedDate,
     m.Status.ToString(),
     m.IsCritical,
     progress,
     hasTasks);
 }
}
