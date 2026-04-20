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
    Task<int> SaveChangesAsync(
    CancellationToken ct = default);
    Task BeginTransactionAsync(
    CancellationToken ct = default);
    Task CommitTransactionAsync(
    CancellationToken ct = default);
    Task RollbackTransactionAsync(
    CancellationToken ct = default);
}
