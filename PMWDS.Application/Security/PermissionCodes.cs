namespace PMWDS.Application.Security;

public static class PermissionCodes
{
    public const string PermissionClaimType = "permission";

    public const string SystemAdmin = "SYSTEM_ADMIN";
    public const string SystemDatabaseView = "SYSTEM_DATABASE_VIEW";

    public const string OrganizationView = "ORGANIZATION_VIEW";
    public const string OrganizationCreate = "ORGANIZATION_CREATE";
    public const string OrganizationEdit = "ORGANIZATION_EDIT";
    public const string OrganizationDelete = "ORGANIZATION_DELETE";

    public const string DepartmentView = "DEPARTMENT_VIEW";
    public const string DepartmentCreate = "DEPARTMENT_CREATE";
    public const string DepartmentEdit = "DEPARTMENT_EDIT";
    public const string DepartmentDelete = "DEPARTMENT_DELETE";

    public const string ProjectView = "PROJECT_VIEW";
    public const string ProjectCreate = "PROJECT_CREATE";
    public const string ProjectEdit = "PROJECT_EDIT";
    public const string ProjectDelete = "PROJECT_DELETE";

    public const string MilestoneView = "MILESTONE_VIEW";
    public const string MilestoneCreate = "MILESTONE_CREATE";
    public const string MilestoneEdit = "MILESTONE_EDIT";
    public const string MilestoneDelete = "MILESTONE_DELETE";

    public const string TaskView = "TASK_VIEW";
    public const string TaskCreate = "TASK_CREATE";
    public const string TaskEdit = "TASK_EDIT";
    public const string TaskDelete = "TASK_DELETE";
    public const string TaskAssign = "TASK_ASSIGN";
    public const string TaskCommentCreate = "TASK_COMMENT_CREATE";
    public const string TaskAttachmentCreate = "TASK_ATTACHMENT_CREATE";
    public const string TaskTimeTrack = "TASK_TIME_TRACK";

    public const string SubtaskView = "SUBTASK_VIEW";
    public const string SubtaskCreate = "SUBTASK_CREATE";
    public const string SubtaskEdit = "SUBTASK_EDIT";
    public const string SubtaskDelete = "SUBTASK_DELETE";

    public const string UserView = "USER_VIEW";
    public const string UserCreate = "USER_CREATE";
    public const string UserEdit = "USER_EDIT";
    public const string UserDelete = "USER_DELETE";
    public const string UserDepartmentManage = "USER_DEPARTMENT_MANAGE";
    public const string UserProfilePictureManage = "USER_PROFILE_PICTURE_MANAGE";

    public const string RoleView = "ROLE_VIEW";
    public const string RoleCreate = "ROLE_CREATE";
    public const string RoleEdit = "ROLE_EDIT";
    public const string RoleDelete = "ROLE_DELETE";
    public const string PermissionView = "PERMISSION_VIEW";
    public const string PermissionCreate = "PERMISSION_CREATE";
    public const string PermissionEdit = "PERMISSION_EDIT";
    public const string PermissionDelete = "PERMISSION_DELETE";

    public const string NotificationView = "NOTIFICATION_VIEW";
    public const string NotificationBroadcast = "NOTIFICATION_BROADCAST";
    public const string NotificationTemplateManage = "NOTIFICATION_TEMPLATE_MANAGE";
    public const string NotificationRuleManage = "NOTIFICATION_RULE_MANAGE";

    public const string ActivityLogView = "ACTIVITY_LOG_VIEW";
    public const string ActivityLogCreate = "ACTIVITY_LOG_CREATE";

    public const string ReportView = "REPORT_VIEW";
    public const string ReportCreate = "REPORT_CREATE";
    public const string ReportEdit = "REPORT_EDIT";
    public const string ReportDelete = "REPORT_DELETE";

    public const string KnowledgeView = "KNOWLEDGE_VIEW";
    public const string KnowledgeCreate = "KNOWLEDGE_CREATE";
    public const string KnowledgeEdit = "KNOWLEDGE_EDIT";
    public const string KnowledgeDelete = "KNOWLEDGE_DELETE";

    public const string IntegrationView = "INTEGRATION_VIEW";
    public const string IntegrationCreate = "INTEGRATION_CREATE";
    public const string IntegrationEdit = "INTEGRATION_EDIT";
    public const string IntegrationDelete = "INTEGRATION_DELETE";

    public const string AiView = "AI_VIEW";
    public const string AiManage = "AI_MANAGE";
}
