using Microsoft.EntityFrameworkCore.Storage;
using PMWDS.Application.Interfaces.Repositories;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;
using PMWDS.Persistence.Context;
namespace PMWDS.Persistence.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _context;
    private IDbContextTransaction? _transaction;
    public IProjectRepository Projects { get; }
    public ITaskRepository Tasks { get; }
    public IUserRepository Users { get; }
    public IRepository<Department> Departments { get; }
    public IRepository<Milestone> Milestones { get; }
    public IRepository<Notification> Notifications { get; }
    public IRepository<AuditLog> AuditLogs { get; }
    public IRepository<Skill> Skills { get; }
    public UnitOfWork(ApplicationDbContext context)
    {
        _context = context;
        Projects = new ProjectRepository(context);
        Tasks = new TaskRepository(context);
        Users = new UserRepository(context);
        Departments = new BaseRepository<Department>(context);
        Milestones = new BaseRepository<Milestone>(context);
        Notifications = new BaseRepository<Notification>(context);
        AuditLogs = new BaseRepository<AuditLog>(context);
        Skills = new BaseRepository<Skill>(context);
    }
    public async Task<int> SaveChangesAsync(
    CancellationToken ct = default)
    => await _context.SaveChangesAsync(ct);
    public async Task BeginTransactionAsync(
    CancellationToken ct = default)
    => _transaction =
    await _context.Database
    .BeginTransactionAsync(ct);
    public async Task CommitTransactionAsync(
     CancellationToken ct = default)
    {
        if (_transaction != null)
            await _transaction.CommitAsync(ct);
    }
    public async Task RollbackTransactionAsync(
    CancellationToken ct = default)
    {
        if (_transaction != null)
            await _transaction.RollbackAsync(ct);
    }
    public void Dispose()
    {
        _transaction?.Dispose();
        _context.Dispose();
    }
}
