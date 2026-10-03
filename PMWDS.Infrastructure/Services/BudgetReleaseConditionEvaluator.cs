using Microsoft.EntityFrameworkCore;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Application.Security;
using PMWDS.Domain.Entities;
using PMWDS.Domain.Enums;
using PMWDS.Persistence.Context;

namespace PMWDS.Infrastructure.Services;

public sealed class BudgetReleaseConditionEvaluator : IBudgetReleaseConditionEvaluator
{
    private readonly ApplicationDbContext _db;

    public BudgetReleaseConditionEvaluator(ApplicationDbContext db)
        => _db = db;

    public async Task<IReadOnlyDictionary<string, bool>> EvaluateAsync(
        Guid goalId,
        IReadOnlyDictionary<string, bool> requiredConditions,
        bool manualApprovalSatisfied,
        CancellationToken ct = default)
    {
        var goal = await _db.Goals
            .AsNoTracking()
            .Where(item => item.Id == goalId)
            .Select(item => new
            {
                item.ProjectId,
                item.ProgressPercentage
            })
            .FirstOrDefaultAsync(ct);

        if (goal == null)
            throw new InvalidOperationException($"Goal {goalId} not found.");

        var required = requiredConditions
            .Where(item => item.Value)
            .Select(item => item.Key.Trim())
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var unsupported = required
            .Where(code => !BudgetReleaseConditionCodes.Supported.Contains(code))
            .ToList();

        if (unsupported.Count > 0)
        {
            throw new ArgumentException(
                $"Unsupported budget release conditions: {string.Join(", ", unsupported)}.",
                nameof(requiredConditions));
        }

        var documentApproval = required.Contains(
            BudgetReleaseConditionCodes.DocumentApproval,
            StringComparer.OrdinalIgnoreCase)
            && await _db.ProjectDocuments.AnyAsync(document =>
                document.ProjectId == goal.ProjectId &&
                document.Category != DocumentCategory.UtilizationCertificate &&
                document.ApprovalStatus == DocumentApprovalStatus.Approved,
                ct);

        var utilizationCertificate = required.Contains(
            BudgetReleaseConditionCodes.BudgetUtilizationCertificate,
            StringComparer.OrdinalIgnoreCase)
            && await _db.UtilizationCertificates.AnyAsync(certificate =>
                certificate.ProjectId == goal.ProjectId &&
                certificate.Status == UtilizationCertificateStatus.Approved,
                ct);

        var evaluated = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);

        foreach (var code in required)
        {
            evaluated[code] = code switch
            {
                var value when value.Equals(BudgetReleaseConditionCodes.GoalProgress, StringComparison.OrdinalIgnoreCase)
                    => goal.ProgressPercentage >= 100,
                var value when value.Equals(BudgetReleaseConditionCodes.DocumentApproval, StringComparison.OrdinalIgnoreCase)
                    => documentApproval,
                var value when value.Equals(BudgetReleaseConditionCodes.BudgetUtilizationCertificate, StringComparison.OrdinalIgnoreCase)
                    => utilizationCertificate,
                var value when value.Equals(BudgetReleaseConditionCodes.ManualApproval, StringComparison.OrdinalIgnoreCase)
                    => manualApprovalSatisfied,
                _ => false
            };
        }

        return evaluated;
    }
}
