namespace PMWDS.Application.Security;

public static class AuthorizationPolicies
{
    /// <summary>Prefix for the per-entity CRUD policies registered by the policy registry.</summary>
    public const string DocumentsPrefix = "Documents";

    public const string Authenticated = "Authenticated";
    public const string SuperAdmin = "SuperAdmin";
    public const string Director = "Director";
    public const string Manager = "Manager";
    public const string TaskEditor = "TaskEditor";

    public const string ActivityLogsView = "ActivityLogs.View";
    public const string ActivityLogsCreate = "ActivityLogs.Create";
    public const string ActivityLogsManage = "ActivityLogs.Manage";

    public const string NotificationsBroadcast = "Notifications.Create";

    public const string RolesCreate = "Roles.Create";
    public const string RolesEdit = "Roles.Edit";
    public const string RolesDelete = "Roles.Delete";

    public const string PermissionsCreate = "Permissions.Create";
    public const string PermissionsEdit = "Permissions.Edit";
    public const string PermissionsDelete = "Permissions.Delete";

    public const string UtilizationCertificateView = "UtilizationCertificates.View";
    public const string UtilizationCertificateCreate = "UtilizationCertificates.Create";
    public const string UtilizationCertificateEdit = "UtilizationCertificates.Edit";
    public const string UtilizationCertificateDelete = "UtilizationCertificates.Delete";
    public const string UtilizationCertificateReview = "UtilizationCertificates.Review";

    /// <summary>Prefix for the per-level document upload policies.</summary>
    public const string DocumentUpload = "Documents.Upload";

    /// <summary>
    /// Prefix for the per-level utilization certificate document upload policies.
    /// Separate from <see cref="DocumentUpload"/> so a role can be allowed to attach
    /// ordinary documents at a level without also attaching finance claims there.
    /// </summary>
    public const string UtilizationCertificateDocumentUpload = "UtilizationCertificates.Upload";
}
