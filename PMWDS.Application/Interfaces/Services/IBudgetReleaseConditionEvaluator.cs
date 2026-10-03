namespace PMWDS.Application.Interfaces.Services;

public interface IBudgetReleaseConditionEvaluator
{
    Task<IReadOnlyDictionary<string, bool>> EvaluateAsync(
        Guid goalId,
        IReadOnlyDictionary<string, bool> requiredConditions,
        bool manualApprovalSatisfied,
        CancellationToken ct = default);
}
