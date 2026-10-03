namespace PMWDS.Domain.Enums;

public enum GoalStatus
{
    NotStarted = 0,
    InProgress = 1,
    OnHold = 2,
    Completed = 3,
    Cancelled = 4
}

public enum GoalPriority
{
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4
}

public enum GoalTransferStatus
{
    Pending = 0,
    Acknowledged = 1,
    Rejected = 2,
    Cancelled = 3
}

public enum BudgetAllocationStatus
{
    Active = 0,
    Superseded = 1,
    Cancelled = 2
}

public enum BudgetReleaseStatus
{
    Pending = 0,
    Approved = 1,
    Withheld = 2,
    Rejected = 3,
    Cancelled = 4
}
