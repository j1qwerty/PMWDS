using PMWDS.Domain.Common;
using PMWDS.Domain.Enums;

namespace PMWDS.Domain.Entities;

public class GoalBudgetAllocation : BaseEntity
{
    public Guid GoalId { get; private set; }
    public Guid DepartmentId { get; private set; }
    public decimal Amount { get; private set; }
    public BudgetAllocationStatus Status { get; private set; }
    public Guid? SupersedesAllocationId { get; private set; }
    public string? Reason { get; private set; }

    public Goal? Goal { get; private set; }
    public Department? Department { get; private set; }
    public GoalBudgetAllocation? SupersedesAllocation { get; private set; }

    protected GoalBudgetAllocation() { }

    public static GoalBudgetAllocation Create(
        Guid goalId,
        Guid departmentId,
        decimal amount,
        string? reason,
        Guid? supersedesAllocationId = null)
        => new()
        {
            GoalId = goalId,
            DepartmentId = departmentId,
            Amount = amount,
            Status = BudgetAllocationStatus.Active,
            Reason = reason?.Trim(),
            SupersedesAllocationId = supersedesAllocationId
        };

    public void Supersede() => Status = BudgetAllocationStatus.Superseded;
    public void Cancel() => Status = BudgetAllocationStatus.Cancelled;
}
