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
    public IRepository<NotificationTemplate> NotificationTemplates { get; }
    public IRepository<AlertRule> AlertRules { get; }
    public IRepository<Dashboard> Dashboards { get; }
    public IRepository<DashboardWidget> DashboardWidgets { get; }
    public IRepository<Report> Reports { get; }
    public IRepository<ReportSchedule> ReportSchedules { get; }
    public IRepository<Integration> Integrations { get; }
    public IRepository<Webhook> Webhooks { get; }
    public IRepository<WebhookDelivery> WebhookDeliveries { get; }
    public IRepository<KnowledgeArticle> KnowledgeArticles { get; }
    public IRepository<LessonLearned> LessonsLearned { get; }
    public IRepository<ActivityLog> ActivityLogs { get; }
    public IRepository<AuditLog> AuditLogs { get; }
    public IRepository<Skill> Skills { get; }
    public IRepository<Role> Roles { get; }
    public IRepository<Permission> Permissions { get; }
    public IRepository<UserProfile> UserProfiles { get; }
    public IRepository<Organization> Organizations { get; }
    public IRepository<AIModel> AIModels { get; }
    public IRepository<PredictionResult> PredictionResults { get; }
    public IRepository<TrainingDataPoint> TrainingDataPoints { get; }
    public IRepository<AllocationRecommendation> AllocationRecommendations { get; }
    public IRepository<DelayPrediction> DelayPredictions { get; }
    public IRepository<ProjectDocument> ProjectDocuments { get; }
    public IRepository<UserSkill> UserSkills { get; }
    public IRepository<TaskAssignment> TaskAssignments { get; }
    public IRepository<TaskComment> TaskComments { get; }
    public IRepository<TaskAttachment> TaskAttachments { get; }
    public IRepository<TaskDependency> TaskDependencies { get; }
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
        NotificationTemplates = new BaseRepository<NotificationTemplate>(context);
        AlertRules = new BaseRepository<AlertRule>(context);
        Dashboards = new BaseRepository<Dashboard>(context);
        DashboardWidgets = new BaseRepository<DashboardWidget>(context);
        Reports = new BaseRepository<Report>(context);
        ReportSchedules = new BaseRepository<ReportSchedule>(context);
        Integrations = new BaseRepository<Integration>(context);
        Webhooks = new BaseRepository<Webhook>(context);
        WebhookDeliveries = new BaseRepository<WebhookDelivery>(context);
        KnowledgeArticles = new BaseRepository<KnowledgeArticle>(context);
        LessonsLearned = new BaseRepository<LessonLearned>(context);
        ActivityLogs = new BaseRepository<ActivityLog>(context);
        AuditLogs = new BaseRepository<AuditLog>(context);
        Skills = new BaseRepository<Skill>(context);
        Roles = new BaseRepository<Role>(context);
        Permissions = new BaseRepository<Permission>(context);
        UserProfiles = new BaseRepository<UserProfile>(context);
        Organizations = new BaseRepository<Organization>(context);
        AIModels = new BaseRepository<AIModel>(context);
        PredictionResults = new BaseRepository<PredictionResult>(context);
        TrainingDataPoints = new BaseRepository<TrainingDataPoint>(context);
        AllocationRecommendations = new BaseRepository<AllocationRecommendation>(context);
        DelayPredictions = new BaseRepository<DelayPrediction>(context);
        ProjectDocuments = new BaseRepository<ProjectDocument>(context);
        UserSkills = new BaseRepository<UserSkill>(context);
        TaskAssignments = new BaseRepository<TaskAssignment>(context);
        TaskComments = new BaseRepository<TaskComment>(context);
        TaskAttachments = new BaseRepository<TaskAttachment>(context);
        TaskDependencies = new BaseRepository<TaskDependency>(context);
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
