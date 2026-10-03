using PMWDS.Domain.Common;
using PMWDS.Domain.Enums;

namespace PMWDS.Domain.Entities;

public class Goal : AuditableEntity
{
    public Guid ProjectId { get; private set; }
    public Guid AssignedDepartmentId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public GoalPriority Priority { get; private set; }
    public GoalStatus Status { get; private set; }
    public DateTime DueDate { get; private set; }
    public double ProgressPercentage { get; private set; }

    public Project? Project { get; private set; }
    public Department? AssignedDepartment { get; private set; }
    public IReadOnlyCollection<Milestone> Milestones => _milestones.AsReadOnly();
    private readonly List<Milestone> _milestones = new();

    protected Goal() { }

    public static Goal Create(
        Guid projectId,
        Guid assignedDepartmentId,
        string title,
        string description,
        GoalPriority priority,
        DateTime dueDate)
        => new()
        {
            ProjectId = projectId,
            AssignedDepartmentId = assignedDepartmentId,
            Title = title.Trim(),
            Description = description?.Trim() ?? string.Empty,
            Priority = priority,
            Status = GoalStatus.NotStarted,
            DueDate = dueDate,
            ProgressPercentage = 0
        };

    public void Update(
        Guid assignedDepartmentId,
        string title,
        string description,
        GoalPriority priority,
        DateTime dueDate)
    {
        AssignedDepartmentId = assignedDepartmentId;
        Title = title.Trim();
        Description = description?.Trim() ?? string.Empty;
        Priority = priority;
        DueDate = dueDate;
    }

    public void AssignDepartment(Guid departmentId) => AssignedDepartmentId = departmentId;

    public void UpdateStatus(GoalStatus status) => Status = status;

    public double RecalculateProgressFromMilestones()
    {
        if (_milestones.Count == 0)
            return ProgressPercentage;

        ProgressPercentage = Math.Round(
            _milestones.Average(m => Math.Clamp(m.ProgressPercentage, 0, 100)), 1);

        if (_milestones.All(m => m.Status == MilestoneStatus.Completed))
            Status = GoalStatus.Completed;
        else if (_milestones.Any(m => m.Status == MilestoneStatus.Delayed))
            Status = GoalStatus.InProgress;
        else if (_milestones.Any(m => m.ProgressPercentage > 0 || m.Status == MilestoneStatus.InProgress))
            Status = GoalStatus.InProgress;

        return ProgressPercentage;
    }
}
