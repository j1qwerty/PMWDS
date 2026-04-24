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
    public IRepository<Role> Roles { get; }
    public IRepository<Permission> Permissions { get; }
    public IRepository<UserProfile> UserProfiles { get; }
    public IRepository<Organization> Organizations { get; }
    public IRepository<ProjectDocument> ProjectDocuments { get; }
    public IRepository<UserSkill> UserSkills { get; }
    public IRepository<TaskAssignment> TaskAssignments { get; }
    public IRepository<TaskComment> TaskComments { get; }
    public IRepository<TaskAttachment> TaskAttachments { get; }
    public IRepository<TimeEntry> TimeEntries { get; }

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
        Roles = new BaseRepository<Role>(context);
        Permissions = new BaseRepository<Permission>(context);
        UserProfiles = new BaseRepository<UserProfile>(context);
        Organizations = new BaseRepository<Organization>(context);
        ProjectDocuments = new BaseRepository<ProjectDocument>(context);
        UserSkills = new BaseRepository<UserSkill>(context);
        TaskAssignments = new BaseRepository<TaskAssignment>(context);
        TaskComments = new BaseRepository<TaskComment>(context);
        TaskAttachments = new BaseRepository<TaskAttachment>(context);
        TimeEntries = new BaseRepository<TimeEntry>(context);
    }

    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
        => await _context.SaveChangesAsync(ct);

    public async Task BeginTransactionAsync(CancellationToken ct = default)
    {
        _transaction = await _context.Database.BeginTransactionAsync(ct);
    }

    public async Task CommitTransactionAsync(CancellationToken ct = default)
    {
        if (_transaction != null)
        {
            await _transaction.CommitAsync(ct);
        }
    }

    public async Task RollbackTransactionAsync(CancellationToken ct = default)
    {
        if (_transaction != null)
        {
            await _transaction.RollbackAsync(ct);
        }
    }

    public void Dispose()
    {
        _transaction?.Dispose();
        _context.Dispose();
    }
}
