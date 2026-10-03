using PMWDS.Domain.Common;
using PMWDS.Domain.Enums;

namespace PMWDS.Domain.Entities;

public class BudgetRelease : BaseEntity
{
    public Guid GoalBudgetAllocationId { get; private set; }
    public decimal AmountRequested { get; private set; }
    public decimal AmountApproved { get; private set; }
    public BudgetReleaseStatus Status { get; private set; }
    public string RequiredConditionsJson { get; private set; } = "{}";
    public string SatisfiedConditionsJson { get; private set; } = "{}";
    public string? Justification { get; private set; }
    public string RequestedByUserId { get; private set; } = string.Empty;
    public DateTime RequestedOn { get; private set; }
    public string? ReviewedByUserId { get; private set; }
    public DateTime? ReviewedOn { get; private set; }
    public string? ReviewNotes { get; private set; }

    public GoalBudgetAllocation? GoalBudgetAllocation { get; private set; }

    protected BudgetRelease() { }

    public static BudgetRelease Create(
        Guid allocationId,
        decimal amountRequested,
        string requiredConditionsJson,
        string satisfiedConditionsJson,
        string requestedByUserId,
        string? justification)
        => new()
        {
            GoalBudgetAllocationId = allocationId,
            AmountRequested = amountRequested,
            AmountApproved = 0,
            Status = BudgetReleaseStatus.Pending,
            RequiredConditionsJson = requiredConditionsJson,
            SatisfiedConditionsJson = satisfiedConditionsJson,
            RequestedByUserId = requestedByUserId,
            RequestedOn = DateTime.UtcNow,
            Justification = justification?.Trim()
        };

    public bool AreAllConditionsSatisfied()
    {
        var required = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, bool>>(RequiredConditionsJson)
            ?? new Dictionary<string, bool>();
        var satisfied = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, bool>>(SatisfiedConditionsJson)
            ?? new Dictionary<string, bool>();

        return required.All(condition =>
            satisfied.TryGetValue(condition.Key, out var value) && value);
    }

    public void Approve(decimal amountApproved, string reviewerUserId, string? notes)
    {
        if (amountApproved < 0 || amountApproved > AmountRequested)
            throw new ArgumentOutOfRangeException(nameof(amountApproved));

        AmountApproved = amountApproved;
        Status = BudgetReleaseStatus.Approved;
        ReviewedByUserId = reviewerUserId;
        ReviewedOn = DateTime.UtcNow;
        ReviewNotes = notes?.Trim();
    }

    public void Withhold(string reviewerUserId, string? notes)
    {
        AmountApproved = 0;
        Status = BudgetReleaseStatus.Withheld;
        ReviewedByUserId = reviewerUserId;
        ReviewedOn = DateTime.UtcNow;
        ReviewNotes = notes?.Trim();
    }

    public void Reject(string reviewerUserId, string? notes)
    {
        AmountApproved = 0;
        Status = BudgetReleaseStatus.Rejected;
        ReviewedByUserId = reviewerUserId;
        ReviewedOn = DateTime.UtcNow;
        ReviewNotes = notes?.Trim();
    }

    public void Cancel(string reviewerUserId, string? notes)
    {
        AmountApproved = 0;
        Status = BudgetReleaseStatus.Cancelled;
        ReviewedByUserId = reviewerUserId;
        ReviewedOn = DateTime.UtcNow;
        ReviewNotes = notes?.Trim();
    }
}
