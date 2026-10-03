namespace PMWDS.Application.Security;

public static class AuthorizationPolicies
{
    public const string Authenticated = "Authenticated";
    public const string SuperAdmin = "SuperAdmin";
    public const string Director = "Director";
    public const string Manager = "Manager";
    public const string TaskEditor = "TaskEditor";
    public const string GoalView = "Goals.View";
    public const string GoalCreate = "Goals.Create";
    public const string GoalEdit = "Goals.Edit";
    public const string GoalDelete = "Goals.Delete";
    public const string GoalManage = "Goals.Manage";
    public const string BudgetView = "Budget.View";
    public const string BudgetCreate = "Budget.Create";
    public const string BudgetEdit = "Budget.Edit";
    public const string BudgetApprove = "Budget.Approve";
    public const string BudgetDelete = "Budget.Delete";
    public const string BudgetManage = "Budget.Manage";

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
}
