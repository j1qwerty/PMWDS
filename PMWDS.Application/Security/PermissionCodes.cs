namespace PMWDS.Application.Security;

public static class PermissionCodes
{
    public const string PermissionClaimType = "permission";

    /// <summary>
    /// Suffix carried by the "every department" flavour of a department-scoped
    /// permission. A feature therefore has two parallel families:
    /// <list type="bullet">
    /// <item><c>PROJECT_VIEW</c> — projects of the departments the user belongs to.</item>
    /// <item><c>PROJECT_VIEW_ALL</c> — projects of every department in the organization.</item>
    /// </list>
    /// The ALL flavour is a strict superset: it implies its own-department
    /// counterpart, so an API policy that requires <c>PROJECT_VIEW</c> still
    /// passes for someone holding <c>PROJECT_VIEW_ALL</c>.
    /// </summary>
    public const string AllScopeSuffix = "_ALL";

    /// <summary>Builds the "every department" code for an own-department code.</summary>
    public static string ToAllScope(string ownDepartmentCode) => ownDepartmentCode + AllScopeSuffix;

    /// <summary>
    /// Returns the own-department code for an ALL-scope code, or the code itself
    /// when it is not a scoped flavour (so this is safe to call unconditionally).
    /// </summary>
    public static string ToOwnScope(string code) =>
        code.EndsWith(AllScopeSuffix, StringComparison.OrdinalIgnoreCase)
            ? code[..^AllScopeSuffix.Length]
            : code;

    public const string SystemAdmin = "SYSTEM_ADMIN";
    public const string SystemDatabaseView = "SYSTEM_DATABASE_VIEW";
    public const string AuthManage = "AUTH_MANAGE";

    public const string OrganizationManage = "ORGANIZATION_MANAGE";
    public const string OrganizationView = "ORGANIZATION_VIEW";
    public const string OrganizationCreate = "ORGANIZATION_CREATE";
    public const string OrganizationEdit = "ORGANIZATION_EDIT";
    public const string OrganizationDelete = "ORGANIZATION_DELETE";

    public const string DepartmentManage = "DEPARTMENT_MANAGE";
    public const string DepartmentView = "DEPARTMENT_VIEW";
    public const string DepartmentCreate = "DEPARTMENT_CREATE";
    public const string DepartmentEdit = "DEPARTMENT_EDIT";
    public const string DepartmentDelete = "DEPARTMENT_DELETE";

    public const string ProjectManage = "PROJECT_MANAGE";
    public const string ProjectView = "PROJECT_VIEW";
    public const string ProjectCreate = "PROJECT_CREATE";
    public const string ProjectEdit = "PROJECT_EDIT";
    public const string ProjectDelete = "PROJECT_DELETE";
    public const string ProjectPrimaryDepartmentManage = "PROJECT_PRIMARY_DEPARTMENT_MANAGE";

    public const string MilestoneManage = "MILESTONE_MANAGE";
    public const string MilestoneView = "MILESTONE_VIEW";
    public const string MilestoneCreate = "MILESTONE_CREATE";
    public const string MilestoneEdit = "MILESTONE_EDIT";
    public const string MilestoneDelete = "MILESTONE_DELETE";

    public const string TaskManage = "TASK_MANAGE";
    public const string TaskView = "TASK_VIEW";
    public const string TaskCreate = "TASK_CREATE";
    public const string TaskEdit = "TASK_EDIT";
    public const string TaskDelete = "TASK_DELETE";
    public const string TaskAssign = "TASK_ASSIGN";
    public const string TaskCommentCreate = "TASK_COMMENT_CREATE";
    public const string TaskAttachmentCreate = "TASK_ATTACHMENT_CREATE";
    public const string TaskTimeTrack = "TASK_TIME_TRACK";

    public const string SubtaskManage = "SUBTASK_MANAGE";
    public const string SubtaskView = "SUBTASK_VIEW";
    public const string SubtaskCreate = "SUBTASK_CREATE";
    public const string SubtaskEdit = "SUBTASK_EDIT";
    public const string SubtaskDelete = "SUBTASK_DELETE";

    public const string UserManage = "USER_MANAGE";
    public const string UserView = "USER_VIEW";
    public const string UserCreate = "USER_CREATE";
    public const string UserEdit = "USER_EDIT";
    public const string UserDelete = "USER_DELETE";
    public const string UserDepartmentManage = "USER_DEPARTMENT_MANAGE";
    public const string UserProfilePictureManage = "USER_PROFILE_PICTURE_MANAGE";

    public const string RoleManage = "ROLE_MANAGE";
    public const string RoleView = "ROLE_VIEW";
    public const string RoleCreate = "ROLE_CREATE";
    public const string RoleEdit = "ROLE_EDIT";
    public const string RoleDelete = "ROLE_DELETE";
    public const string PermissionManage = "PERMISSION_MANAGE";
    public const string PermissionView = "PERMISSION_VIEW";
    public const string PermissionCreate = "PERMISSION_CREATE";
    public const string PermissionEdit = "PERMISSION_EDIT";
    public const string PermissionDelete = "PERMISSION_DELETE";

    public const string NotificationManage = "NOTIFICATION_MANAGE";
    public const string NotificationView = "NOTIFICATION_VIEW";
    public const string NotificationBroadcast = "NOTIFICATION_BROADCAST";
    public const string NotificationTemplateManage = "NOTIFICATION_TEMPLATE_MANAGE";
    public const string NotificationRuleManage = "NOTIFICATION_RULE_MANAGE";

    public const string ActivityLogManage = "ACTIVITY_LOG_MANAGE";
    public const string ActivityLogView = "ACTIVITY_LOG_VIEW";
    public const string ActivityLogCreate = "ACTIVITY_LOG_CREATE";

    public const string ReportManage = "REPORT_MANAGE";
    public const string ReportView = "REPORT_VIEW";
    public const string ReportCreate = "REPORT_CREATE";
    public const string ReportEdit = "REPORT_EDIT";
    public const string ReportDelete = "REPORT_DELETE";

    public const string KnowledgeManage = "KNOWLEDGE_MANAGE";
    public const string KnowledgeView = "KNOWLEDGE_VIEW";
    public const string KnowledgeCreate = "KNOWLEDGE_CREATE";
    public const string KnowledgeEdit = "KNOWLEDGE_EDIT";
    public const string KnowledgeDelete = "KNOWLEDGE_DELETE";

    public const string IntegrationManage = "INTEGRATION_MANAGE";
    public const string IntegrationView = "INTEGRATION_VIEW";
    public const string IntegrationCreate = "INTEGRATION_CREATE";
    public const string IntegrationEdit = "INTEGRATION_EDIT";
    public const string IntegrationDelete = "INTEGRATION_DELETE";

    public const string AiView = "AI_VIEW";
    public const string AiManage = "AI_MANAGE";

    // Utilization Certificates — formal proof that grant, government or corporate
    // funds were spent strictly for their intended purpose.
    public const string UtilizationCertificateManage = "UTILIZATION_CERTIFICATE_MANAGE";
    public const string UtilizationCertificateView = "UTILIZATION_CERTIFICATE_VIEW";
    public const string UtilizationCertificateCreate = "UTILIZATION_CERTIFICATE_CREATE";
    public const string UtilizationCertificateEdit = "UTILIZATION_CERTIFICATE_EDIT";
    public const string UtilizationCertificateDelete = "UTILIZATION_CERTIFICATE_DELETE";

    // Reviewing (approving / rejecting) a UC is a separate authority from submitting
    // one, so a contributor can never sign off their own certificate.
    public const string UtilizationCertificateReview = "UTILIZATION_CERTIFICATE_REVIEW";

    // ─────────────────────────────────────────────────────────────────────────
    //  Documents
    //
    //  A document is attached at one of three levels of the hierarchy, and which
    //  levels a role may upload into is itself a permission so the upload dialog
    //  can simply render the levels the role actually holds.
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Base code prefix for a document-level upload grant.</summary>
    public const string DocumentUploadLevelPrefix = "DOCUMENT_UPLOAD_";

    public const string DocumentUploadProject = "DOCUMENT_UPLOAD_PROJECT";
    public const string DocumentUploadMilestone = "DOCUMENT_UPLOAD_MILESTONE";
    public const string DocumentUploadTask = "DOCUMENT_UPLOAD_TASK";

    /// <summary>
    /// Utilization certificates are stored as documents but carry a finance
    /// sign-off workflow, so their upload levels are permissioned separately from
    /// ordinary documents. A role can hold one level for each document kind.
    /// </summary>
    public const string UtilizationCertificateDocumentUploadProject = "UTILIZATION_CERTIFICATE_DOCUMENT_UPLOAD_PROJECT";
    public const string UtilizationCertificateDocumentUploadMilestone = "UTILIZATION_CERTIFICATE_DOCUMENT_UPLOAD_MILESTONE";
    public const string UtilizationCertificateDocumentUploadTask = "UTILIZATION_CERTIFICATE_DOCUMENT_UPLOAD_TASK";

    public const string DocumentManage = "DOCUMENT_MANAGE";
    public const string DocumentView = "DOCUMENT_VIEW";
    public const string DocumentCreate = "DOCUMENT_CREATE";
    public const string DocumentEdit = "DOCUMENT_EDIT";
    public const string DocumentDelete = "DOCUMENT_DELETE";

    // ─────────────────────────────────────────────────────────────────────────
    //  "Every department" flavours.
    //
    //  Only department-scoped features get a pair. Organization, Authorization,
    //  System, AI and Integrations are organization- or system-wide concepts and
    //  deliberately keep a single flavour — a second one would imply a scope
    //  boundary that does not exist for them.
    //
    //  Each ALL code implies its own-department counterpart (see
    //  PermissionCatalog.AllScopeImpliedCoverage), so granting someone
    //  PROJECT_VIEW_ALL also satisfies an API policy asking for PROJECT_VIEW.
    // ─────────────────────────────────────────────────────────────────────────

    // Departments
    public const string DepartmentManageAll = "DEPARTMENT_MANAGE_ALL";
    public const string DepartmentViewAll = "DEPARTMENT_VIEW_ALL";
    public const string DepartmentCreateAll = "DEPARTMENT_CREATE_ALL";
    public const string DepartmentEditAll = "DEPARTMENT_EDIT_ALL";
    public const string DepartmentDeleteAll = "DEPARTMENT_DELETE_ALL";

    // Projects
    public const string ProjectManageAll = "PROJECT_MANAGE_ALL";
    public const string ProjectViewAll = "PROJECT_VIEW_ALL";
    public const string ProjectCreateAll = "PROJECT_CREATE_ALL";
    public const string ProjectEditAll = "PROJECT_EDIT_ALL";
    public const string ProjectDeleteAll = "PROJECT_DELETE_ALL";

    /// <summary>
    /// Full-project visibility for every department, as opposed to
    /// <see cref="ProjectPrimaryDepartmentManage"/> which only covers the
    /// projects where the viewer's own department is the primary department.
    /// </summary>
    public const string ProjectPrimaryDepartmentManageAll = "PROJECT_PRIMARY_DEPARTMENT_MANAGE_ALL";

    // Milestones
    public const string MilestoneManageAll = "MILESTONE_MANAGE_ALL";
    public const string MilestoneViewAll = "MILESTONE_VIEW_ALL";
    public const string MilestoneCreateAll = "MILESTONE_CREATE_ALL";
    public const string MilestoneEditAll = "MILESTONE_EDIT_ALL";
    public const string MilestoneDeleteAll = "MILESTONE_DELETE_ALL";

    // Tasks
    public const string TaskManageAll = "TASK_MANAGE_ALL";
    public const string TaskViewAll = "TASK_VIEW_ALL";
    public const string TaskCreateAll = "TASK_CREATE_ALL";
    public const string TaskEditAll = "TASK_EDIT_ALL";
    public const string TaskDeleteAll = "TASK_DELETE_ALL";
    public const string TaskAssignAll = "TASK_ASSIGN_ALL";
    public const string TaskCommentCreateAll = "TASK_COMMENT_CREATE_ALL";
    public const string TaskAttachmentCreateAll = "TASK_ATTACHMENT_CREATE_ALL";
    public const string TaskTimeTrackAll = "TASK_TIME_TRACK_ALL";

    // Subtasks
    public const string SubtaskManageAll = "SUBTASK_MANAGE_ALL";
    public const string SubtaskViewAll = "SUBTASK_VIEW_ALL";
    public const string SubtaskCreateAll = "SUBTASK_CREATE_ALL";
    public const string SubtaskEditAll = "SUBTASK_EDIT_ALL";
    public const string SubtaskDeleteAll = "SUBTASK_DELETE_ALL";

    // Users
    public const string UserManageAll = "USER_MANAGE_ALL";
    public const string UserViewAll = "USER_VIEW_ALL";
    public const string UserCreateAll = "USER_CREATE_ALL";
    public const string UserEditAll = "USER_EDIT_ALL";
    public const string UserDeleteAll = "USER_DELETE_ALL";
    public const string UserDepartmentManageAll = "USER_DEPARTMENT_MANAGE_ALL";
    public const string UserProfilePictureManageAll = "USER_PROFILE_PICTURE_MANAGE_ALL";

    // Reports
    public const string ReportManageAll = "REPORT_MANAGE_ALL";
    public const string ReportViewAll = "REPORT_VIEW_ALL";
    public const string ReportCreateAll = "REPORT_CREATE_ALL";
    public const string ReportEditAll = "REPORT_EDIT_ALL";
    public const string ReportDeleteAll = "REPORT_DELETE_ALL";

    // Knowledge
    public const string KnowledgeManageAll = "KNOWLEDGE_MANAGE_ALL";
    public const string KnowledgeViewAll = "KNOWLEDGE_VIEW_ALL";
    public const string KnowledgeCreateAll = "KNOWLEDGE_CREATE_ALL";
    public const string KnowledgeEditAll = "KNOWLEDGE_EDIT_ALL";
    public const string KnowledgeDeleteAll = "KNOWLEDGE_DELETE_ALL";

    // Documents
    public const string DocumentManageAll = "DOCUMENT_MANAGE_ALL";
    public const string DocumentViewAll = "DOCUMENT_VIEW_ALL";
    public const string DocumentCreateAll = "DOCUMENT_CREATE_ALL";
    public const string DocumentEditAll = "DOCUMENT_EDIT_ALL";
    public const string DocumentDeleteAll = "DOCUMENT_DELETE_ALL";

    public const string DocumentUploadProjectAll = "DOCUMENT_UPLOAD_PROJECT_ALL";
    public const string DocumentUploadMilestoneAll = "DOCUMENT_UPLOAD_MILESTONE_ALL";
    public const string DocumentUploadTaskAll = "DOCUMENT_UPLOAD_TASK_ALL";

    public const string UtilizationCertificateDocumentUploadProjectAll = "UTILIZATION_CERTIFICATE_DOCUMENT_UPLOAD_PROJECT_ALL";
    public const string UtilizationCertificateDocumentUploadMilestoneAll = "UTILIZATION_CERTIFICATE_DOCUMENT_UPLOAD_MILESTONE_ALL";
    public const string UtilizationCertificateDocumentUploadTaskAll = "UTILIZATION_CERTIFICATE_DOCUMENT_UPLOAD_TASK_ALL";

    // Utilization certificates
    public const string UtilizationCertificateManageAll = "UTILIZATION_CERTIFICATE_MANAGE_ALL";
    public const string UtilizationCertificateViewAll = "UTILIZATION_CERTIFICATE_VIEW_ALL";
    public const string UtilizationCertificateCreateAll = "UTILIZATION_CERTIFICATE_CREATE_ALL";
    public const string UtilizationCertificateEditAll = "UTILIZATION_CERTIFICATE_EDIT_ALL";
    public const string UtilizationCertificateDeleteAll = "UTILIZATION_CERTIFICATE_DELETE_ALL";
    public const string UtilizationCertificateReviewAll = "UTILIZATION_CERTIFICATE_REVIEW_ALL";

    // ─────────────────────────────────────────────────────────────────────────
    //  Shared helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>The three levels a document can be attached at, in hierarchy order.</summary>
    public static readonly IReadOnlyList<string> DocumentUploadLevels =
        new[] { DocumentUploadProject, DocumentUploadMilestone, DocumentUploadTask };

    /// <summary>The same three levels for utilization certificate documents.</summary>
    public static readonly IReadOnlyList<string> UtilizationCertificateDocumentUploadLevels =
        new[]
        {
            UtilizationCertificateDocumentUploadProject,
            UtilizationCertificateDocumentUploadMilestone,
            UtilizationCertificateDocumentUploadTask
        };
}
