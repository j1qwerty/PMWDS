using PMWDS.Application.Interfaces.Repositories;
namespace PMWDS.Application.Interfaces.Services;

public interface IUnitOfWork : IDisposable
{
    IProjectRepository Projects { get; }
    ITaskRepository Tasks { get; }
    IUserRepository Users { get; }
    IRepository<Domain.Entities.Department> Departments { get; }
    IRepository<Domain.Entities.Milestone> Milestones { get; }
    IRepository<Domain.Entities.Notification> Notifications { get; }
    IRepository<Domain.Entities.AuditLog> AuditLogs { get; }
    IRepository<Domain.Entities.Skill> Skills { get; }
    IRepository<Domain.Entities.ProjectDocument> ProjectDocuments { get; }
    IRepository<Domain.Entities.UserSkill> UserSkills { get; }
    IRepository<Domain.Entities.TaskAssignment> TaskAssignments { get; }
    IRepository<Domain.Entities.TaskComment> TaskComments { get; }
    IRepository<Domain.Entities.TaskAttachment> TaskAttachments { get; }
    IRepository<Domain.Entities.TimeEntry> TimeEntries { get; }
    Task<int> SaveChangesAsync(
    CancellationToken ct = default);
    Task BeginTransactionAsync(
    CancellationToken ct = default);
    Task CommitTransactionAsync(
    CancellationToken ct = default);
    Task RollbackTransactionAsync(
    CancellationToken ct = default);
}
