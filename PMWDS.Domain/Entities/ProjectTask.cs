using PMWDS.Domain.Common;
using PMWDS.Domain.Enums;
using PMWDS.Domain.Events;
using TaskStatus = PMWDS.Domain.Enums.TaskStatus;
namespace PMWDS.Domain.Entities;

public class ProjectTask : AuditableEntity
{
    // Core Properties
    public Guid ProjectId { get; private set; }
    public Guid? MilestoneId { get; private set; }
    public Guid? ParentTaskId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public TaskStatus Status { get; private set; }
    public TaskPriority Priority { get; private set; }
    // Assignment
    public string? AssignedToUserId { get; private set; }
    public string? AssignedByUserId { get; private set; }
    public DateTime? AssignedDate { get; private set; }
    // Scheduling
    public DateTime StartDate { get; private set; }
    public DateTime DueDate { get; private set; }
    public DateTime? CompletedDate { get; private set; }
    public bool IsRecurring { get; private set; }
    public string? RecurrencePattern { get; private set; }
    // Effort
    public int EstimatedHours { get; private set; }
    public int ActualHours { get; private set; }
    public double ProgressPercentage { get; private set; }
    public string? CompletionNotes { get; private set; }
    // Escalation
    public bool IsEscalated { get; private set; }
    public int EscalationLevel { get; private set; }
    public DateTime? EscalatedDate { get; private set; }
    // AI Fields
    public double AIDelayProbability { get; private set; }
    public DateTime? AIPredictedCompletionDate { get; private set; }
    public double AIOptimalAssigneeScore { get; private set; }
    public string? AIRecommendedAssigneeId { get; private set; }
    public string? AIRiskFactors { get; private set; } // JSON
                                                       // Navigation
    public Project? Project { get; private set; }
    public Milestone? Milestone { get; private set; }
    public ProjectTask? ParentTask { get; private set; }
    public IReadOnlyCollection<ProjectTask> SubTasks =>
    _subTasks.AsReadOnly();
    public IReadOnlyCollection<TaskDependency> Dependencies =>
    _dependencies.AsReadOnly();
    public IReadOnlyCollection<TaskComment> Comments =>
    _comments.AsReadOnly();
    public IReadOnlyCollection<TaskAttachment> Attachments =>
    _attachments.AsReadOnly();
    public IReadOnlyCollection<TaskAssignment> Assignments =>
    _assignments.AsReadOnly();
    public IReadOnlyCollection<TimeEntry> TimeEntries =>
    _timeEntries.AsReadOnly();
    private readonly List<ProjectTask> _subTasks = new();
    private readonly List<TaskDependency> _dependencies = new();
    private readonly List<TaskComment> _comments = new();
    private readonly List<TaskAttachment> _attachments = new();
    private readonly List<TaskAssignment> _assignments = new();
    private readonly List<TimeEntry> _timeEntries = new();
    private readonly List<IDomainEvent> _domainEvents = new();
    public IReadOnlyList<IDomainEvent> DomainEvents =>
    _domainEvents.AsReadOnly();
    protected ProjectTask() { }
    public static ProjectTask Create(
    Guid projectId,
    string title,
    string description,
    TaskPriority priority,
    DateTime startDate,
    DateTime dueDate,
    int estimatedHours,
    Guid? milestoneId = null,
    Guid? parentTaskId = null)
    {
        return new ProjectTask
        {
            ProjectId = projectId,
            MilestoneId = milestoneId,
            ParentTaskId = parentTaskId,
            Title = title,
            Description = description,
            Priority = priority,
            Status = TaskStatus.NotStarted,
            StartDate = startDate,
            DueDate = dueDate,
            EstimatedHours = estimatedHours
        };
    }
    public void AssignTo(string userId, string assignedBy)
    {
        AssignedToUserId = userId;
        AssignedByUserId = assignedBy;
        AssignedDate = DateTime.UtcNow;
        Status = TaskStatus.Assigned;
        _assignments.Add(TaskAssignment.Create(Id, userId));
        _domainEvents.Add(new TaskAssignedEvent(
        Id, userId, assignedBy));
    }
    public void UpdateDetails(
    string title,
    string description,
    TaskPriority priority,
    DateTime startDate,
    DateTime dueDate,
    int estimatedHours,
    Guid? milestoneId)
    {
        Title = title;
        Description = description;
        Priority = priority;
        StartDate = startDate;
        DueDate = dueDate;
        EstimatedHours = estimatedHours;
        MilestoneId = milestoneId;
    }
    public void UpdateStatus(TaskStatus status)
    {
        Status = status;
        if (status == TaskStatus.Completed)
        {
            CompletedDate = DateTime.UtcNow;
            ProgressPercentage = 100;
        }
    }
    public void Start()
    {
        if (Status == TaskStatus.NotStarted
        || Status == TaskStatus.Assigned)
        {
            Status = TaskStatus.InProgress;
            _domainEvents.Add(
            new TaskStatusChangedEvent(Id,
            TaskStatus.NotStarted,
            TaskStatus.InProgress));
        }
    }
    public void UpdateProgress(
    double percentage, string? notes = null)
    {
        ProgressPercentage = Math.Clamp(percentage, 0, 100);
        if (!string.IsNullOrEmpty(notes))
            CompletionNotes = notes;
        if (percentage >= 100) Complete();
    }
    public void AddComment(TaskComment comment)
        => _comments.Add(comment);
    public void AddAttachment(TaskAttachment attachment)
        => _attachments.Add(attachment);
    public void AddDependency(TaskDependency dependency)
        => _dependencies.Add(dependency);
    public void LogTime(TimeEntry entry)
    {
        _timeEntries.Add(entry);
        ActualHours += (int)entry.Duration.TotalHours;
    }
    public void Complete()
    {
        Status = TaskStatus.Completed;
        CompletedDate = DateTime.UtcNow;
        ProgressPercentage = 100;
        _domainEvents.Add(
        new TaskCompletedEvent(Id, ProjectId,
        CompletedDate.Value));
    }
    public void PutOnHold(string reason)
    {
        Status = TaskStatus.OnHold;
        AddComment(TaskComment.Create(
        Id, "SYSTEM", $"Task put on hold: {reason}"));
    }
    public void MarkDelayed(string reason)
    {
        Status = TaskStatus.Delayed;
        _domainEvents.Add(
        new TaskDelayedEvent(Id, DueDate, reason));
    }
    public void Escalate()
    {
        IsEscalated = true;
        EscalationLevel++;
        EscalatedDate = DateTime.UtcNow;
        _domainEvents.Add(new TaskEscalatedEvent(
        Id, EscalationLevel));
    }
    public void UpdateAIPrediction(
    double delayProbability,
    DateTime predictedCompletion,
    string? riskFactors,
    string? recommendedAssigneeId = null)
    {
        AIDelayProbability = delayProbability;
        AIPredictedCompletionDate = predictedCompletion;
        AIRiskFactors = riskFactors;
        AIRecommendedAssigneeId = recommendedAssigneeId;
    }
    public bool IsOverdue()
        => Status != TaskStatus.Completed
        && DateTime.UtcNow > DueDate;
    public int GetEfficiencyRatio()
    {
        if (ActualHours == 0) return 0;
        return (int)(EstimatedHours / (double)ActualHours * 100);
    }
    public void ClearDomainEvents()
        => _domainEvents.Clear();
}
