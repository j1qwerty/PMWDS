using PMWDS.Domain.Entities;
using PMWDS.Domain.Enums;

namespace PMWDS.Persistence.Migrations.Seeders;

internal static class SeedConstants
{
    internal const string SeedUser = "system-seed";
    internal const string DefaultAiProvider = "OpenRouter";

    /// <summary>
    /// Configuration key for the password given to every seeded account.
    /// Supplied through Seed__DefaultPassword (or a SEED_DEFAULTPASSWORD
    /// environment variable, which is how it arrives from .env) so no
    /// credential is committed to source.
    /// </summary>
    internal const string DefaultPasswordConfigKey = "Seed:DefaultPassword";

    /// <summary>
    /// Resolved seed password, set once by <see cref="SetDefaultPassword"/> from
    /// configuration before seeding runs. Null means nothing has been supplied,
    /// in which case seeding fails rather than falling back to a shared
    /// password that would be in the repository.
    /// </summary>
    internal static string? DefaultPassword { get; private set; }

    internal static void SetDefaultPassword(string? password)
    {
        if (!string.IsNullOrWhiteSpace(password))
        {
            DefaultPassword = password;
        }
    }

    /// <summary>
    /// The seed password, or a thrown error explaining how to supply it. A
    /// hardcoded fallback is deliberately not provided: a committed default
    /// password is a live credential on any deployment that forgot to set it.
    /// </summary>
    internal static string RequireDefaultPassword()
        => DefaultPassword
           ?? throw new InvalidOperationException(
               "No seed password is configured, so demo accounts cannot be created. " +
               "Set Seed__DefaultPassword in the .env file (see .env.example) to a strong password, " +
               "then restart. Every seeded account (superadmin@org1.com, admin@org1.com, and the rest) " +
               "is created with this password.");


    internal sealed record DepartmentSpec(string OrganizationName, string Name, string Code, string Description, int Capacity);
    internal sealed record AlertRuleSpec(string Name, string ConditionType, string Expression, string ActionType, object Parameters);
    internal sealed record IntegrationSpec(string Type, string Name, object Configuration, bool Enabled);
    internal sealed record AIProviderCredentialSpec(string Provider, string DisplayName, bool Enabled, string BaseUrl, string DefaultModel);
    internal sealed record RoleSpec(string Key, string Name, string Description, int Level, IReadOnlyCollection<string> PermissionCodes);
    internal sealed record UserSpec(string Email, string FirstName, string LastName, string EmployeeCode, string JobTitle, string Role, Guid? DepartmentId, AvailabilityStatus Availability, double AvailabilityPercent, double Performance, double Workload, double Burnout);
    internal sealed record ProjectSpec(string Name, string Description, string Category, ProjectPriority Priority, Guid DepartmentId, Guid ManagerId, DateTime Start, DateTime End, decimal Budget, decimal ActualCost, string Client, double Progress, double Health, double DelayRisk, double BudgetRisk, string Insight, string ProjectCode = "");
    internal sealed record TaskSpec(Guid ProjectId, Guid? MilestoneId, Guid? ParentTaskId, string Title, string Description, TaskPriority Priority, DateTime Start, DateTime Due, int EstimatedHours, Guid AssigneeId, Guid AssignedById, PMWDS.Domain.Enums.TaskStatus Status, double Progress, double DelayProbability, int ExpectedDelayDays, string Notes);
}
