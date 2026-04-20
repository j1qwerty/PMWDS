using PMWDS.Domain.Common;
using PMWDS.Domain.Enums;
namespace PMWDS.Domain.Entities;

public class Milestone : AuditableEntity
{
    public Guid ProjectId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public int Order { get; private set; }
    public DateTime DueDate { get; private set; }
    public DateTime? CompletedDate { get; private set; }
    public MilestoneStatus Status { get; private set; }
    public bool IsCritical { get; private set; }
    public double ProgressPercentage { get; private set; }
    // Navigation
    public Project? Project { get; private set; }
    public IReadOnlyCollection<ProjectTask> Tasks =>
    _tasks.AsReadOnly();
    private readonly List<ProjectTask> _tasks = new();
    protected Milestone() { }
    public static Milestone Create(
    Guid projectId, string name,
    string description, DateTime dueDate,
    int order, bool isCritical = false)
    {
        return new Milestone
        {
            ProjectId = projectId,
            Name = name,
            Description = description,
            DueDate = dueDate,
            Order = order,
            IsCritical = isCritical,
            Status = MilestoneStatus.Pending

        };
    }
    public void MarkComplete()
    {
        Status = MilestoneStatus.Completed;
        CompletedDate = DateTime.UtcNow;
        ProgressPercentage = 100;
    }
    public void UpdateProgress(double percentage)
    {
        ProgressPercentage = Math.Clamp(percentage, 0, 100);
        if (percentage >= 100) MarkComplete();
    }
    public bool IsOverdue() => Status != MilestoneStatus.Completed
    && DateTime.UtcNow > DueDate;
    public int GetDaysRemaining()
    => (int)(DueDate - DateTime.UtcNow).TotalDays;
}