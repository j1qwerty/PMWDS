using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PMWDS.Domain.Common;
using PMWDS.Domain.Entities;
namespace PMWDS.Persistence.Context;

public class ApplicationDbContext
 : IdentityDbContext<ApplicationUser>
{
    // ── Core ─────────────────────────────────────────────
    public DbSet<Department> Departments { get; set; }
    public DbSet<Project> Projects { get; set; }
    public DbSet<Milestone> Milestones { get; set; }
    public DbSet<ProjectTask> Tasks { get; set; }
    public DbSet<SubTask> SubTasks { get; set; }
    public DbSet<TaskDependency> TaskDependencies { get; set; }
    public DbSet<TaskAssignment> TaskAssignments { get; set; }
    public DbSet<TaskComment> TaskComments { get; set; }
    public DbSet<TaskAttachment> TaskAttachments { get; set; }
    public DbSet<TimeEntry> TimeEntries { get; set; }
    public DbSet<ProjectDocument> ProjectDocuments { get; set; }
    // ── People & Skills ───────────────────────────────────
    public DbSet<Skill> Skills { get; set; }
    public DbSet<UserSkill> UserSkills { get; set; }
    // ── Notifications ─────────────────────────────────────
    public DbSet<Notification> Notifications { get; set; }
    // ── Audit ─────────────────────────────────────────────
    public DbSet<AuditLog> AuditLogs { get; set; }
    public ApplicationDbContext(
    DbContextOptions<ApplicationDbContext> options)
    : base(options) { }
    protected override void OnModelCreating(
    ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        // Apply all IEntityTypeConfiguration<T> in assembly
        builder.ApplyConfigurationsFromAssembly(
        typeof(ApplicationDbContext).Assembly);
        // Global soft-delete query filter
        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(
            entityType.ClrType))
            {
                builder.Entity(entityType.ClrType)
                .HasQueryFilter(
                GetSoftDeleteFilter(entityType.ClrType));
            }
        }
    }
    private static System.Linq.Expressions.LambdaExpression
    GetSoftDeleteFilter(Type type)
    {
        var param = System.Linq.Expressions
        .Expression.Parameter(type, "e");
        var prop = System.Linq.Expressions
        .Expression.Property(param, "IsDeleted");
        var cond = System.Linq.Expressions
        .Expression.Equal(prop,
        System.Linq.Expressions
        .Expression.Constant(false));
        return System.Linq.Expressions
        .Expression.Lambda(cond, param);
    }
    public override async Task<int> SaveChangesAsync(
    CancellationToken ct = default)
    {
        // Auto-set ModifiedDate on changed entities
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Modified)
                entry.Entity.SetModified(
                entry.Entity.ModifiedBy ?? "system");
        }
        return await base.SaveChangesAsync(ct);
    }
}
