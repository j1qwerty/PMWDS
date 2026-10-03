namespace PMWDS.Application.Security;

public static class BudgetReleaseConditionCodes
{
    public const string GoalProgress = "goalProgress";
    public const string DocumentApproval = "documentApproval";
    public const string BudgetUtilizationCertificate = "budgetUtilizationCertificate";
    public const string ManualApproval = "manualApproval";

    public static readonly IReadOnlySet<string> Supported =
        new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            GoalProgress,
            DocumentApproval,
            BudgetUtilizationCertificate,
            ManualApproval
        };
}
