namespace PMWDS.Domain.Enums;

public enum TaskStatus
{
    NotStarted = 0,
    Assigned = 1,
    InProgress = 2,
    OnHold = 3,
    Completed = 4,
    Delayed = 5,
    Cancelled = 6
}
public enum TaskPriority
{
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4
}
public enum DependencyType
{
    FinishToStart = 0,
    StartToStart = 1,
    FinishToFinish = 2,
    StartToFinish = 3
}
