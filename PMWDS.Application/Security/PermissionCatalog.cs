namespace PMWDS.Application.Security;

/// <summary>The four CRUD actions every feature exposes, plus the umbrella "manage".</summary>
public enum PermissionAction
{
    View,
    Create,
    Edit,
    Delete,
    Manage
}

/// <summary>Which slice of data a permission reaches.</summary>
public enum PermissionScope
{
    /// <summary>Only the departments the user belongs to.</summary>
    OwnDepartment,

    /// <summary>Every department in the user's organization.</summary>
    AllDepartments
}

/// <summary>
/// One permission code's metadata: what it is called, why it exists, and where the
/// roles screen groups it. Seeding, the role matrix and the API all read from here,
/// so a permission can never exist in one place and be missing from another.
/// </summary>
public sealed record PermissionDefinition(
    string Code,
    string Name,
    string Description,
    string Module,
    string Feature,
    PermissionAction Action,
    PermissionScope? Scope);

/// <summary>
/// A feature within a module — the unit a role matrix row is built from.
/// The code lists are explicit rather than inferred from a naming convention, so a
/// feature that genuinely lacks an action (audit logs cannot be edited) stays
/// honest instead of silently growing a phantom permission.
/// </summary>
public sealed record PermissionFeature(
    string Key,
    string Module,
    string Label,
    string Description,
    bool IsDepartmentScoped,
    IReadOnlyList<string> ManageCode,
    IReadOnlyList<string> ViewCodes,
    IReadOnlyList<string> CreateCodes,
    IReadOnlyList<string> EditCodes,
    IReadOnlyList<string> DeleteCodes,
    IReadOnlyList<string> SpecialCodes)
{
    /// <summary>Every non-umbrella code this feature owns, in matrix column order.</summary>
    public IReadOnlyList<string> ActionCodes =>
    [
        .. ViewCodes,
        .. CreateCodes,
        .. EditCodes,
        .. DeleteCodes,
        .. SpecialCodes
    ];
}

public static class PermissionCatalog
{
    /// <summary>Modules offered in the roles UI, in display order.</summary>
    public static readonly IReadOnlyList<string> ModuleOrder =
    [
        "System",
        "Authentication",
        "Authorization",
        "Organization",
        "Departments",
        "Projects",
        "Milestones",
        "Tasks",
        "Subtasks",
        "Documents",
        "Utilization Certificates",
        "Users",
        "Notifications",
        "Audit",
        "Reports",
        "Knowledge",
        "Integrations",
        "AI"
    ];

    public static readonly IReadOnlySet<string> VisibleModules =
        new HashSet<string>(ModuleOrder, StringComparer.OrdinalIgnoreCase);

    public static readonly IReadOnlySet<string> AdminOnlyModules = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "Authentication",
        "Authorization",
        "System"
    };

    // ── Feature definitions ───────────────────────────────────────────────────
    // IsDepartmentScoped decides whether a feature also gets the parallel
    // "all departments" family. Organization, Authorization, System, AI and
    // Integrations are organization- or system-wide concepts and deliberately keep
    // a single flavour: a second one would imply a boundary that does not exist.

    public static readonly IReadOnlyList<PermissionFeature> Features =
    [
        new("system", "System", "System",
            "System administration and database status.", false,
            ManageCode: [PermissionCodes.SystemAdmin],
            ViewCodes: [PermissionCodes.SystemDatabaseView],
            CreateCodes: [], EditCodes: [], DeleteCodes: [],
            SpecialCodes: []),

        new("authentication", "Authentication", "Authentication",
            "Authentication provider configuration.", false,
            ManageCode: [PermissionCodes.AuthManage],
            ViewCodes: [], CreateCodes: [], EditCodes: [], DeleteCodes: [],
            SpecialCodes: []),

        new("role", "Authorization", "Roles",
            "Roles and which permissions they carry.", false,
            ManageCode: [PermissionCodes.RoleManage],
            ViewCodes: [PermissionCodes.RoleView],
            CreateCodes: [PermissionCodes.RoleCreate],
            EditCodes: [PermissionCodes.RoleEdit],
            DeleteCodes: [PermissionCodes.RoleDelete],
            SpecialCodes: []),

        new("permission", "Authorization", "Permissions",
            "The permission catalogue itself.", false,
            ManageCode: [PermissionCodes.PermissionManage],
            ViewCodes: [PermissionCodes.PermissionView],
            CreateCodes: [PermissionCodes.PermissionCreate],
            EditCodes: [PermissionCodes.PermissionEdit],
            DeleteCodes: [PermissionCodes.PermissionDelete],
            SpecialCodes: []),

        new("organization", "Organization", "Organizations",
            "Managing the organizations that own every department.", false,
            ManageCode: [PermissionCodes.OrganizationManage],
            ViewCodes: [PermissionCodes.OrganizationView],
            CreateCodes: [PermissionCodes.OrganizationCreate],
            EditCodes: [PermissionCodes.OrganizationEdit],
            DeleteCodes: [PermissionCodes.OrganizationDelete],
            SpecialCodes: []),

        new("department", "Departments", "Departments",
            "Departments are the unit of ownership. Everything below hangs off one.", true,
            ManageCode: [PermissionCodes.DepartmentManage],
            ViewCodes: [PermissionCodes.DepartmentView],
            CreateCodes: [PermissionCodes.DepartmentCreate],
            EditCodes: [PermissionCodes.DepartmentEdit],
            DeleteCodes: [PermissionCodes.DepartmentDelete],
            SpecialCodes: []),

        new("project", "Projects", "Projects",
            "Projects are owned by a primary department and shared with others.", true,
            ManageCode: [PermissionCodes.ProjectManage],
            ViewCodes: [PermissionCodes.ProjectView],
            CreateCodes: [PermissionCodes.ProjectCreate],
            EditCodes: [PermissionCodes.ProjectEdit],
            DeleteCodes: [PermissionCodes.ProjectDelete],
            SpecialCodes: [PermissionCodes.ProjectPrimaryDepartmentManage]),

        new("milestone", "Milestones", "Milestones",
            "Milestones belong to a project and can be owned by any participating department.", true,
            ManageCode: [PermissionCodes.MilestoneManage],
            ViewCodes: [PermissionCodes.MilestoneView],
            CreateCodes: [PermissionCodes.MilestoneCreate],
            EditCodes: [PermissionCodes.MilestoneEdit],
            DeleteCodes: [PermissionCodes.MilestoneDelete],
            SpecialCodes: []),

        new("task", "Tasks", "Tasks",
            "Tasks belong to a milestone and inherit its department scope.", true,
            ManageCode: [PermissionCodes.TaskManage],
            ViewCodes: [PermissionCodes.TaskView],
            CreateCodes: [PermissionCodes.TaskCreate],
            EditCodes: [PermissionCodes.TaskEdit],
            DeleteCodes: [PermissionCodes.TaskDelete],
            SpecialCodes:
            [
                PermissionCodes.TaskAssign,
                PermissionCodes.TaskCommentCreate,
                PermissionCodes.TaskAttachmentCreate,
                PermissionCodes.TaskTimeTrack
            ]),

        new("subtask", "Subtasks", "Subtasks",
            "Subtasks are nested under a task.", true,
            ManageCode: [PermissionCodes.SubtaskManage],
            ViewCodes: [PermissionCodes.SubtaskView],
            CreateCodes: [PermissionCodes.SubtaskCreate],
            EditCodes: [PermissionCodes.SubtaskEdit],
            DeleteCodes: [PermissionCodes.SubtaskDelete],
            SpecialCodes: []),

        new("document", "Documents", "Documents",
            "Documents are attached at project, milestone or task level. Which levels a role may upload into is permissioned per level.", true,
            ManageCode: [PermissionCodes.DocumentManage],
            ViewCodes: [PermissionCodes.DocumentView],
            CreateCodes: [PermissionCodes.DocumentCreate],
            EditCodes: [PermissionCodes.DocumentEdit],
            DeleteCodes: [PermissionCodes.DocumentDelete],
            SpecialCodes: PermissionCodes.DocumentUploadLevels),

        new("utilizationCertificate", "Utilization Certificates", "Utilization Certificates",
            "Finance sign-off that funds were spent as intended. Submitting and reviewing are deliberately separate.", true,
            ManageCode: [PermissionCodes.UtilizationCertificateManage],
            ViewCodes: [PermissionCodes.UtilizationCertificateView],
            CreateCodes: [PermissionCodes.UtilizationCertificateCreate],
            EditCodes: [PermissionCodes.UtilizationCertificateEdit],
            DeleteCodes: [PermissionCodes.UtilizationCertificateDelete],
            SpecialCodes:
            [
                PermissionCodes.UtilizationCertificateReview,
                .. PermissionCodes.UtilizationCertificateDocumentUploadLevels
            ]),

        new("user", "Users", "Users",
            "Users and their department assignments.", true,
            ManageCode: [PermissionCodes.UserManage],
            ViewCodes: [PermissionCodes.UserView],
            CreateCodes: [PermissionCodes.UserCreate],
            EditCodes: [PermissionCodes.UserEdit],
            DeleteCodes: [PermissionCodes.UserDelete],
            SpecialCodes:
            [
                PermissionCodes.UserDepartmentManage,
                PermissionCodes.UserProfilePictureManage
            ]),

        new("notification", "Notifications", "Notifications",
            "Notification delivery, templates and alert rules.", false,
            ManageCode: [PermissionCodes.NotificationManage],
            ViewCodes: [PermissionCodes.NotificationView],
            CreateCodes: [], EditCodes: [], DeleteCodes: [],
            SpecialCodes:
            [
                PermissionCodes.NotificationBroadcast,
                PermissionCodes.NotificationTemplateManage,
                PermissionCodes.NotificationRuleManage
            ]),

        new("activityLog", "Audit", "Activity Logs",
            "Append-only audit trail — there is deliberately no edit or delete.", false,
            ManageCode: [PermissionCodes.ActivityLogManage],
            ViewCodes: [PermissionCodes.ActivityLogView],
            CreateCodes: [PermissionCodes.ActivityLogCreate],
            EditCodes: [], DeleteCodes: [],
            SpecialCodes: []),

        new("report", "Reports", "Reports",
            "Saved and generated reports.", true,
            ManageCode: [PermissionCodes.ReportManage],
            ViewCodes: [PermissionCodes.ReportView],
            CreateCodes: [PermissionCodes.ReportCreate],
            EditCodes: [PermissionCodes.ReportEdit],
            DeleteCodes: [PermissionCodes.ReportDelete],
            SpecialCodes: []),

        new("knowledge", "Knowledge", "Knowledge",
            "Knowledge articles and lessons learned.", true,
            ManageCode: [PermissionCodes.KnowledgeManage],
            ViewCodes: [PermissionCodes.KnowledgeView],
            CreateCodes: [PermissionCodes.KnowledgeCreate],
            EditCodes: [PermissionCodes.KnowledgeEdit],
            DeleteCodes: [PermissionCodes.KnowledgeDelete],
            SpecialCodes: []),

        new("integration", "Integrations", "Integrations",
            "Outbound integrations and webhooks.", false,
            ManageCode: [],
            ViewCodes: [PermissionCodes.IntegrationView],
            CreateCodes: [PermissionCodes.IntegrationCreate],
            EditCodes: [PermissionCodes.IntegrationEdit],
            DeleteCodes: [PermissionCodes.IntegrationDelete],
            SpecialCodes: []),

        new("ai", "AI", "AI",
            "AI insights, providers and models.", false,
            ManageCode: [PermissionCodes.AiManage],
            ViewCodes: [PermissionCodes.AiView],
            CreateCodes: [], EditCodes: [], DeleteCodes: [],
            SpecialCodes: [])
    ];

    public static readonly IReadOnlyDictionary<string, PermissionFeature> FeaturesByKey =
        Features.ToDictionary(feature => feature.Key, StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Every permission the product understands, in module/feature/action order.
    /// </summary>
    public static readonly IReadOnlyList<PermissionDefinition> Definitions = BuildDefinitions();

    public static IReadOnlyDictionary<string, PermissionDefinition> ByCode { get; } =
        Definitions.ToDictionary(definition => definition.Code, StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Umbrella expansion: holding a "manage" permission satisfies every other code
    /// in the same feature at the same scope. This is the single source of truth
    /// for the UI checkbox cascade and for API policy checks.
    /// </summary>
    public static readonly IReadOnlyDictionary<string, string[]> ManagePermissionCoverage =
        BuildManageCoverage();

    /// <summary>
    /// Cross-scope expansion: holding an "all departments" permission satisfies the
    /// equivalent own-department permission. Without this an API policy requiring
    /// PROJECT_VIEW would reject a Director granted PROJECT_VIEW_ALL.
    /// </summary>
    public static readonly IReadOnlyDictionary<string, string[]> AllScopeImpliedCoverage =
        BuildAllScopeImpliedCoverage();

    /// <summary>The union of both expansions — what the authorization handler applies.</summary>
    public static readonly IReadOnlyDictionary<string, string[]> EffectiveCoverage = BuildEffectiveCoverage();

    // ── Builders ─────────────────────────────────────────────────────────────

    private static IReadOnlyList<PermissionDefinition> BuildDefinitions()
    {
        var definitions = new List<PermissionDefinition>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        void Add(string code, PermissionFeature feature, PermissionAction action, PermissionScope? scope)
        {
            if (!seen.Add(code))
            {
                return;
            }

            definitions.Add(new PermissionDefinition(
                code,
                Name(code),
                Description(code, action, scope),
                feature.Module,
                feature.Key,
                action,
                scope));
        }

        foreach (var feature in Features)
        {
            foreach (var code in feature.ManageCode)
            {
                Add(code, feature, PermissionAction.Manage, null);

                if (feature.IsDepartmentScoped)
                {
                    Add(PermissionCodes.ToAllScope(code), feature, PermissionAction.Manage, PermissionScope.AllDepartments);
                }
            }

            foreach (var (codes, action) in new (IReadOnlyList<string>, PermissionAction)[]
                     {
                         (feature.ViewCodes, PermissionAction.View),
                         (feature.CreateCodes, PermissionAction.Create),
                         (feature.EditCodes, PermissionAction.Edit),
                         (feature.DeleteCodes, PermissionAction.Delete)
                     })
            {
                foreach (var code in codes)
                {
                    Add(code, feature, action, null);

                    if (feature.IsDepartmentScoped)
                    {
                        Add(PermissionCodes.ToAllScope(code), feature, action, PermissionScope.AllDepartments);
                    }
                }
            }

            foreach (var code in feature.SpecialCodes)
            {
                var action = ActionOf(code);
                Add(code, feature, action, null);

                if (feature.IsDepartmentScoped)
                {
                    Add(PermissionCodes.ToAllScope(code), feature, action, PermissionScope.AllDepartments);
                }
            }
        }

        return definitions
            .OrderBy(definition => ModuleSortOrder(definition.Module))
            .ThenBy(definition => definition.Feature, StringComparer.OrdinalIgnoreCase)
            .ThenBy(definition => definition.Code, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static IReadOnlyDictionary<string, string[]> BuildManageCoverage()
    {
        var coverage = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);

        foreach (var definition in Definitions.Where(d => d.Action == PermissionAction.Manage))
        {
            var covered = Definitions
                .Where(other => other.Feature == definition.Feature
                    && !string.Equals(other.Code, definition.Code, StringComparison.OrdinalIgnoreCase)
                    && other.Scope == definition.Scope)
                .Select(other => other.Code)
                .ToArray();

            if (covered.Length > 0)
            {
                coverage[definition.Code] = covered;
            }
        }

        return coverage;
    }

    private static IReadOnlyDictionary<string, string[]> BuildAllScopeImpliedCoverage()
    {
        var coverage = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);

        foreach (var definition in Definitions.Where(d => d.Scope == PermissionScope.AllDepartments))
        {
            var own = PermissionCodes.ToOwnScope(definition.Code);
            if (!string.Equals(own, definition.Code, StringComparison.OrdinalIgnoreCase))
            {
                coverage[definition.Code] = [own];
            }
        }

        return coverage;
    }

    private static IReadOnlyDictionary<string, string[]> BuildEffectiveCoverage()
    {
        var effective = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);

        foreach (var (code, covered) in ManagePermissionCoverage)
        {
            effective[code] = covered;
        }

        foreach (var (code, implied) in AllScopeImpliedCoverage)
        {
            // An ALL-scope umbrella also implies the own-department umbrella and
            // everything that umbrella already covers, so merge rather than replace.
            var merged = new List<string>(implied);
            if (ManagePermissionCoverage.TryGetValue(implied[0], out var nested))
            {
                merged.AddRange(nested);
            }

            effective[code] = merged.Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        }

        return effective;
    }

    private static string Name(string code)
    {
        var text = Humanize(PermissionCodes.ToOwnScope(code));
        return IsAllScope(code) ? $"{text} (all departments)" : text;
    }

    private static string Description(string code, PermissionAction action, PermissionScope? scope)
    {
        var trimmed = PermissionCodes.ToOwnScope(code);

        if (SpecialDescriptions.TryGetValue(trimmed, out var special))
        {
            return scope == PermissionScope.AllDepartments
                ? $"{special} This grant reaches every department."
                : special;
        }

        var subject = Humanize(Subject(trimmed));
        var body = action switch
        {
            PermissionAction.View => $"View {subject}.",
            PermissionAction.Create => $"Create {subject}.",
            PermissionAction.Edit => $"Edit {subject}.",
            PermissionAction.Delete => $"Delete {subject}.",
            _ => $"Create, edit and delete {subject} in a single grant."
        };

        return scope == PermissionScope.AllDepartments
            ? $"{body} Reaches every department, not only the user's own departments."
            : body;
    }

    /// <summary>Strips the action suffix to leave the noun the action applies to.</summary>
    private static string Subject(string trimmed)
    {
        foreach (var suffix in new[] { "_MANAGE", "_VIEW", "_CREATE", "_EDIT", "_DELETE" })
        {
            if (trimmed.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
            {
                return trimmed[..^suffix.Length];
            }
        }

        return trimmed;
    }

    private static PermissionAction ActionOf(string code)
    {
        var trimmed = PermissionCodes.ToOwnScope(code);
        if (trimmed.EndsWith("_VIEW", StringComparison.OrdinalIgnoreCase)) return PermissionAction.View;
        if (trimmed.EndsWith("_CREATE", StringComparison.OrdinalIgnoreCase)) return PermissionAction.Create;
        if (trimmed.EndsWith("_EDIT", StringComparison.OrdinalIgnoreCase)) return PermissionAction.Edit;
        if (trimmed.EndsWith("_DELETE", StringComparison.OrdinalIgnoreCase)) return PermissionAction.Delete;
        return PermissionAction.Manage;
    }

    private static string Humanize(string code)
    {
        var words = code.Replace('_', ' ').Trim().ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return string.Join(" ", words.Select(word => word.Length switch
        {
            0 => word,
            1 => word.ToUpperInvariant(),
            _ => char.ToUpperInvariant(word[0]) + word[1..]
        }));
    }

    /// <summary>
    /// Actions that are not plain CRUD need their own prose. Written out rather
    /// than generated because each one has a specific consequence a role admin
    /// needs to read before granting it.
    /// </summary>
    private static readonly IReadOnlyDictionary<string, string> SpecialDescriptions =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [PermissionCodes.SystemAdmin] =
                "Unrestricted access to everything, including organization, role and permission administration.",
            [PermissionCodes.SystemDatabaseView] = "View the active database provider and fallback status.",
            [PermissionCodes.AuthManage] = "Configure authentication providers and policies.",

            [PermissionCodes.ProjectPrimaryDepartmentManage] =
                "Full view and control of projects whose primary department is one the user heads, including milestones assigned to other departments. Without it, a department head working on someone else's project sees only their own milestones and tasks.",

            [PermissionCodes.TaskAssign] = "Assign or reassign who a task belongs to.",
            [PermissionCodes.TaskCommentCreate] = "Add comments to a task.",
            [PermissionCodes.TaskAttachmentCreate] = "Attach files to a task.",
            [PermissionCodes.TaskTimeTrack] = "Start and stop task timers.",

            [PermissionCodes.UserDepartmentManage] = "Assign users to departments and organizations.",
            [PermissionCodes.UserProfilePictureManage] = "Upload and update user profile pictures.",

            [PermissionCodes.NotificationBroadcast] = "Broadcast a notification to users or groups.",
            [PermissionCodes.NotificationTemplateManage] = "Create and update notification templates.",
            [PermissionCodes.NotificationRuleManage] = "Create and update alert rules.",

            [PermissionCodes.ActivityLogCreate] =
                "Record activity log entries. The log is append-only: there is no edit or delete.",

            [PermissionCodes.AiManage] = "Manage AI providers, models and training data.",

            [PermissionCodes.UtilizationCertificateReview] =
                "Approve or reject a submitted utilization certificate. Kept separate from submitting so a contributor can never sign off their own claim.",

            [PermissionCodes.DocumentUploadProject] =
                "Upload documents at project level — they sit on the project itself rather than a milestone or task.",
            [PermissionCodes.DocumentUploadMilestone] =
                "Upload documents at milestone level, against a milestone in a project the user can reach.",
            [PermissionCodes.DocumentUploadTask] =
                "Upload documents at task level, against a task in a project the user can reach.",

            [PermissionCodes.UtilizationCertificateDocumentUploadProject] =
                "Attach a utilization certificate document at project level.",
            [PermissionCodes.UtilizationCertificateDocumentUploadMilestone] =
                "Attach a utilization certificate document at milestone level.",
            [PermissionCodes.UtilizationCertificateDocumentUploadTask] =
                "Attach a utilization certificate document at task level."
        };

    private static int ModuleSortOrder(string module)
    {
        var index = ModuleOrder.ToList().FindIndex(candidate =>
            string.Equals(candidate, module, StringComparison.OrdinalIgnoreCase));
        return index < 0 ? int.MaxValue : index;
    }

    // ── Lookup helpers used by the API ───────────────────────────────────────

    public static bool IsAllScope(string code) =>
        code.EndsWith(PermissionCodes.AllScopeSuffix, StringComparison.OrdinalIgnoreCase);

    public static IReadOnlyList<string> CodesForFeature(string featureKey) =>
        Definitions.Where(d => d.Feature == featureKey).Select(d => d.Code).ToList();

    public static IReadOnlyList<string> CodesForModule(string module) =>
        Definitions.Where(d => string.Equals(d.Module, module, StringComparison.OrdinalIgnoreCase))
            .Select(d => d.Code).ToList();

    /// <summary>
    /// True when the code belongs to a department-scoped feature and therefore has
    /// an "all departments" counterpart.
    /// </summary>
    public static bool HasAllScopeFlavour(string code) =>
        ByCode.TryGetValue(PermissionCodes.ToOwnScope(code), out var definition)
        && definition.Scope is null
        && FeaturesByKey.TryGetValue(definition.Feature, out var feature)
        && feature.IsDepartmentScoped;
}
