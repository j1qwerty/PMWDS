using PMWDS.Domain.Common;

namespace PMWDS.Domain.Entities;

public class BudgetExpenditure : BaseEntity
{
    public Guid GoalBudgetAllocationId { get; private set; }
    public Guid? BudgetReleaseId { get; private set; }
    public Guid? DocumentId { get; private set; }
    public decimal Amount { get; private set; }
    public DateTime SpentOn { get; private set; }
    public string Description { get; private set; } = string.Empty;
    public string? InvoiceNumber { get; private set; }
    public string EnteredByUserId { get; private set; } = string.Empty;

    public GoalBudgetAllocation? GoalBudgetAllocation { get; private set; }
    public BudgetRelease? BudgetRelease { get; private set; }
    public ProjectDocument? Document { get; private set; }

    protected BudgetExpenditure() { }

    public static BudgetExpenditure Create(
        Guid allocationId,
        decimal amount,
        DateTime spentOn,
        string description,
        string? invoiceNumber,
        string enteredByUserId,
        Guid? budgetReleaseId = null,
        Guid? documentId = null)
        => new()
        {
            GoalBudgetAllocationId = allocationId,
            BudgetReleaseId = budgetReleaseId,
            DocumentId = documentId,
            Amount = amount,
            SpentOn = spentOn,
            Description = description.Trim(),
            InvoiceNumber = string.IsNullOrWhiteSpace(invoiceNumber) ? null : invoiceNumber.Trim(),
            EnteredByUserId = enteredByUserId
        };
}
