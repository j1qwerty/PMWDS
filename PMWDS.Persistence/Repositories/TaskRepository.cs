using Microsoft.EntityFrameworkCore;
using PMWDS.Application.Interfaces.Repositories;
using PMWDS.Domain.Entities;
using PMWDS.Persistence.Context;
namespace PMWDS.Persistence.Repositories;

public class TaskRepository
 : BaseRepository<ProjectTask>, ITaskRepository
{
    public TaskRepository(ApplicationDbContext ctx)
    : base(ctx) { }
    public async Task<ProjectTask?> GetWithDetailsAsync(
    Guid taskId, CancellationToken ct = default)
    => await _dbSet
    .Include(t => t.SubTasks)
    .Include(t => t.Comments)
    .Include(t => t.Attachments)
    .Include(t => t.Dependencies)
    .Include(t => t.Assignments)
    .ThenInclude(a => a.User)
    .Include(t => t.TimeEntries)
    .Include(t => t.Project)
    .Include(t => t.Milestone)
    .FirstOrDefaultAsync(t => t.Id == taskId, ct);
    public async Task<IEnumerable<ProjectTask>>
    GetByProjectAsync(
    Guid projectId,
    CancellationToken ct = default)
    => await _dbSet
    .Where(t => t.ProjectId == projectId)
    .Include(t => t.Assignments)
    .Include(t => t.SubTasks)
    .OrderBy(t => t.DueDate)
    .ToListAsync(ct);
    public async Task<IEnumerable<ProjectTask>>
    GetByAssigneeAsync(
    string userId,
    CancellationToken ct = default)
    => await _dbSet
    .Where(t => t.AssignedToUserId == userId
    && t.Status != Domain.Enums.TaskStatus.Completed
    && t.Status != Domain.Enums.TaskStatus.Cancelled)
    .Include(t => t.Project)
    .OrderBy(t => t.DueDate)
    .ToListAsync(ct);
    public async Task<IEnumerable<ProjectTask>>
    GetOverdueTasksAsync(
    CancellationToken ct = default)
    => await _dbSet
    .Where(t =>
    t.DueDate < DateTime.UtcNow
    && t.Status != Domain.Enums.TaskStatus.Completed
    && t.Status != Domain.Enums.TaskStatus.Cancelled)
    .Include(t => t.Project)
    .OrderBy(t => t.DueDate)
    .ToListAsync(ct);
    public async Task<IEnumerable<ProjectTask>>
    GetByMilestoneAsync(
    Guid milestoneId,
    CancellationToken ct = default)
    => await _dbSet
    .Where(t => t.MilestoneId == milestoneId)
    .OrderBy(t => t.DueDate)
    .ToListAsync(ct);
    public async Task<IEnumerable<ProjectTask>>
    GetUnassignedTasksAsync(
    CancellationToken ct = default)
    => await _dbSet
    .Where(t =>
    t.AssignedToUserId == null
    && t.Status == Domain.Enums.TaskStatus.NotStarted)
    .Include(t => t.Project)
    .ToListAsync(ct);
    public async Task<IEnumerable<ProjectTask>>
    GetHighRiskTasksAsync(
    double threshold = 0.7,
    CancellationToken ct = default)
    => await _dbSet
    .Where(t => t.AIDelayProbability >= threshold)
    .Include(t => t.Project)
    .OrderByDescending(t => t.AIDelayProbability)
    .ToListAsync(ct);
    public async Task<IEnumerable<ProjectTask>>
    GetEscalatedTasksAsync(
    CancellationToken ct = default)
    => await _dbSet
    .Where(t => t.IsEscalated
    && t.Status != Domain.Enums.TaskStatus.Completed)
    .Include(t => t.Project)
    .OrderByDescending(t => t.EscalationLevel)
    .ToListAsync(ct);
}
