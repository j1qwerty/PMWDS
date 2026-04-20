using PMWDS.Domain.Entities;
using PMWDS.Domain.Enums;
namespace PMWDS.Application.Interfaces.Repositories;

public interface ITaskRepository : IRepository<ProjectTask>
{
   Task<ProjectTask?> GetWithDetailsAsync(Guid taskId,
   CancellationToken ct = default);
   Task<IEnumerable<ProjectTask>> GetByProjectAsync(
      Guid projectId,
   CancellationToken ct = default);
   Task<IEnumerable<ProjectTask>> GetByAssigneeAsync(
   string userId,
   CancellationToken ct = default);
   Task<IEnumerable<ProjectTask>> GetOverdueTasksAsync(
   CancellationToken ct = default);
   Task<IEnumerable<ProjectTask>> GetByMilestoneAsync(
   Guid milestoneId,
   CancellationToken ct = default);
   Task<IEnumerable<ProjectTask>> GetUnassignedTasksAsync(
   CancellationToken ct = default);
   Task<IEnumerable<ProjectTask>> GetHighRiskTasksAsync(
   double threshold = 0.7,
   CancellationToken ct = default);
   Task<IEnumerable<ProjectTask>> GetEscalatedTasksAsync(
   CancellationToken ct = default);
}
