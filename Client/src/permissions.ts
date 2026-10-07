/**
 * The permission catalogue, mirroring PMWDS.Application.Security.PermissionCatalog.
 *
 * Every permission is declared once, here, with its name, description, module,
 * feature, action and scope. The roles matrix, the seeding view and every
 * `perm.has(...)` call read from these tables, so a permission cannot exist in
 * the API and be missing from the UI — or the reverse.
 *
 * When a code is added on the server, add it here too. Nothing else needs to
 * change: the matrix picks it up, and coverage is derived rather than listed.
 */

export const ALL_SCOPE_SUFFIX = "_ALL" as const;

/** The "every department" flavour of a code. */
export function toAllScope(code: string): string {
  return `${code}${ALL_SCOPE_SUFFIX}`;
}

/**
 * The own-department code an all-departments code implies.
 *
 * Returns the code unchanged when it is not a scoped flavour, so this is safe to
 * call unconditionally.
 */
export function toOwnScope(code: string): string {
  return code.endsWith(ALL_SCOPE_SUFFIX)
    ? code.slice(0, -ALL_SCOPE_SUFFIX.length)
    : code;
}

/** Whether a code is an "all departments" flavour. */
export function isAllScope(code: string): boolean {
  return code.endsWith(ALL_SCOPE_SUFFIX);
}

export const Permission = {
  SystemAdmin: "SYSTEM_ADMIN",
  SystemDatabaseView: "SYSTEM_DATABASE_VIEW",
  AuthManage: "AUTH_MANAGE",

  OrganizationManage: "ORGANIZATION_MANAGE",
  OrganizationView: "ORGANIZATION_VIEW",
  OrganizationCreate: "ORGANIZATION_CREATE",
  OrganizationEdit: "ORGANIZATION_EDIT",
  OrganizationDelete: "ORGANIZATION_DELETE",

  DepartmentManage: "DEPARTMENT_MANAGE",
  DepartmentView: "DEPARTMENT_VIEW",
  DepartmentCreate: "DEPARTMENT_CREATE",
  DepartmentEdit: "DEPARTMENT_EDIT",
  DepartmentDelete: "DEPARTMENT_DELETE",

  ProjectManage: "PROJECT_MANAGE",
  ProjectView: "PROJECT_VIEW",
  ProjectCreate: "PROJECT_CREATE",
  ProjectEdit: "PROJECT_EDIT",
  ProjectDelete: "PROJECT_DELETE",
  ProjectPrimaryDepartmentManage: "PROJECT_PRIMARY_DEPARTMENT_MANAGE",

  MilestoneManage: "MILESTONE_MANAGE",
  MilestoneView: "MILESTONE_VIEW",
  MilestoneCreate: "MILESTONE_CREATE",
  MilestoneEdit: "MILESTONE_EDIT",
  MilestoneDelete: "MILESTONE_DELETE",

  TaskManage: "TASK_MANAGE",
  TaskView: "TASK_VIEW",
  TaskCreate: "TASK_CREATE",
  TaskEdit: "TASK_EDIT",
  TaskDelete: "TASK_DELETE",
  TaskAssign: "TASK_ASSIGN",
  TaskCommentCreate: "TASK_COMMENT_CREATE",
  TaskAttachmentCreate: "TASK_ATTACHMENT_CREATE",
  TaskTimeTrack: "TASK_TIME_TRACK",

  SubtaskManage: "SUBTASK_MANAGE",
  SubtaskView: "SUBTASK_VIEW",
  SubtaskCreate: "SUBTASK_CREATE",
  SubtaskEdit: "SUBTASK_EDIT",
  SubtaskDelete: "SUBTASK_DELETE",

  DocumentManage: "DOCUMENT_MANAGE",
  DocumentView: "DOCUMENT_VIEW",
  DocumentCreate: "DOCUMENT_CREATE",
  DocumentEdit: "DOCUMENT_EDIT",
  DocumentDelete: "DOCUMENT_DELETE",
  DocumentUploadProject: "DOCUMENT_UPLOAD_PROJECT",
  DocumentUploadMilestone: "DOCUMENT_UPLOAD_MILESTONE",
  DocumentUploadTask: "DOCUMENT_UPLOAD_TASK",

  UtilizationCertificateManage: "UTILIZATION_CERTIFICATE_MANAGE",
  UtilizationCertificateView: "UTILIZATION_CERTIFICATE_VIEW",
  UtilizationCertificateCreate: "UTILIZATION_CERTIFICATE_CREATE",
  UtilizationCertificateEdit: "UTILIZATION_CERTIFICATE_EDIT",
  UtilizationCertificateDelete: "UTILIZATION_CERTIFICATE_DELETE",
  UtilizationCertificateReview: "UTILIZATION_CERTIFICATE_REVIEW",
  UtilizationCertificateDocumentUploadProject: "UTILIZATION_CERTIFICATE_DOCUMENT_UPLOAD_PROJECT",
  UtilizationCertificateDocumentUploadMilestone: "UTILIZATION_CERTIFICATE_DOCUMENT_UPLOAD_MILESTONE",
  UtilizationCertificateDocumentUploadTask: "UTILIZATION_CERTIFICATE_DOCUMENT_UPLOAD_TASK",

  UserManage: "USER_MANAGE",
  UserView: "USER_VIEW",
  UserCreate: "USER_CREATE",
  UserEdit: "USER_EDIT",
  UserDelete: "USER_DELETE",
  UserDepartmentManage: "USER_DEPARTMENT_MANAGE",
  UserProfilePictureManage: "USER_PROFILE_PICTURE_MANAGE",

  RoleManage: "ROLE_MANAGE",
  RoleView: "ROLE_VIEW",
  RoleCreate: "ROLE_CREATE",
  RoleEdit: "ROLE_EDIT",
  RoleDelete: "ROLE_DELETE",

  PermissionManage: "PERMISSION_MANAGE",
  PermissionView: "PERMISSION_VIEW",
  PermissionCreate: "PERMISSION_CREATE",
  PermissionEdit: "PERMISSION_EDIT",
  PermissionDelete: "PERMISSION_DELETE",

  NotificationManage: "NOTIFICATION_MANAGE",
  NotificationView: "NOTIFICATION_VIEW",
  NotificationBroadcast: "NOTIFICATION_BROADCAST",
  NotificationTemplateManage: "NOTIFICATION_TEMPLATE_MANAGE",
  NotificationRuleManage: "NOTIFICATION_RULE_MANAGE",

  ActivityLogManage: "ACTIVITY_LOG_MANAGE",
  ActivityLogView: "ACTIVITY_LOG_VIEW",
  ActivityLogCreate: "ACTIVITY_LOG_CREATE",

  ReportManage: "REPORT_MANAGE",
  ReportView: "REPORT_VIEW",
  ReportCreate: "REPORT_CREATE",
  ReportEdit: "REPORT_EDIT",
  ReportDelete: "REPORT_DELETE",

  KnowledgeManage: "KNOWLEDGE_MANAGE",
  KnowledgeView: "KNOWLEDGE_VIEW",
  KnowledgeCreate: "KNOWLEDGE_CREATE",
  KnowledgeEdit: "KNOWLEDGE_EDIT",
  KnowledgeDelete: "KNOWLEDGE_DELETE",

  IntegrationManage: "INTEGRATION_MANAGE",
  IntegrationView: "INTEGRATION_VIEW",
  IntegrationCreate: "INTEGRATION_CREATE",
  IntegrationEdit: "INTEGRATION_EDIT",
  IntegrationDelete: "INTEGRATION_DELETE",

  AiView: "AI_VIEW",
  AiManage: "AI_MANAGE",
} as const;

export type PermissionCode = (typeof Permission)[keyof typeof Permission];

// ── Feature model ───────────────────────────────────────────────────────────
//
// A feature is the unit the roles matrix is built from: one row per action, with
// an "own department" and an "all departments" column when the feature is
// department-scoped. Organization-scoped features have one column because a
// second one would imply a boundary that does not exist for them.

export type PermissionAction = "manage" | "view" | "create" | "edit" | "delete" | "special";

export type PermissionScope = "own" | "all";

export type PermissionFeatureDefinition = {
  /** Stable key, also the module's row identity on the server. */
  key: string;
  module: string;
  label: string;
  /** One line explaining what this feature covers. Shown under the group heading. */
  description: string;
  /** Whether the feature has a parallel "all departments" family. */
  departmentScoped: boolean;
  actions: readonly {
    action: PermissionAction;
    /** Column heading; absent for the single-scope case. */
    label: string;
    code: string;
    /** Hover text. Written per action because each has a distinct consequence. */
    description: string;
  }[];
};

export const PERMISSION_FEATURES: readonly PermissionFeatureDefinition[] = [
  {
    key: "system",
    module: "System",
    label: "System",
    description: "System administration and database status.",
    departmentScoped: false,
    actions: [
      {
        action: "manage",
        label: "Manage",
        code: Permission.SystemAdmin,
        description:
          "Unrestricted access to everything, including organization, role and permission administration.",
      },
      {
        action: "view",
        label: "View",
        code: Permission.SystemDatabaseView,
        description: "View the active database provider and fallback status.",
      },
    ],
  },
  {
    key: "authentication",
    module: "Authentication",
    label: "Authentication",
    description: "Authentication provider configuration.",
    departmentScoped: false,
    actions: [
      {
        action: "manage",
        label: "Manage",
        code: Permission.AuthManage,
        description: "Configure authentication providers and policies.",
      },
    ],
  },
  {
    key: "role",
    module: "Authorization",
    label: "Roles",
    description: "Roles and which permissions they carry.",
    departmentScoped: false,
    actions: [
      { action: "manage", label: "Manage", code: Permission.RoleManage, description: "Create, edit and delete roles in one grant." },
      { action: "view", label: "View", code: Permission.RoleView, description: "View roles." },
      { action: "create", label: "Create", code: Permission.RoleCreate, description: "Create roles." },
      { action: "edit", label: "Edit", code: Permission.RoleEdit, description: "Edit roles." },
      { action: "delete", label: "Delete", code: Permission.RoleDelete, description: "Delete roles." },
    ],
  },
  {
    key: "permission",
    module: "Authorization",
    label: "Permissions",
    description: "The permission catalogue itself.",
    departmentScoped: false,
    actions: [
      { action: "manage", label: "Manage", code: Permission.PermissionManage, description: "Create, edit and delete permissions in one grant." },
      { action: "view", label: "View", code: Permission.PermissionView, description: "View permissions." },
      { action: "create", label: "Create", code: Permission.PermissionCreate, description: "Create permissions." },
      { action: "edit", label: "Edit", code: Permission.PermissionEdit, description: "Edit permissions." },
      { action: "delete", label: "Delete", code: Permission.PermissionDelete, description: "Delete permissions." },
    ],
  },
  {
    key: "organization",
    module: "Organization",
    label: "Organizations",
    description: "The organizations that own every department. Organization is above department, so this feature has a single scope.",
    departmentScoped: false,
    actions: [
      { action: "manage", label: "Manage", code: Permission.OrganizationManage, description: "Create, edit and delete organizations in one grant." },
      { action: "view", label: "View", code: Permission.OrganizationView, description: "View organizations." },
      { action: "create", label: "Create", code: Permission.OrganizationCreate, description: "Create organizations." },
      { action: "edit", label: "Edit", code: Permission.OrganizationEdit, description: "Edit organizations." },
      { action: "delete", label: "Delete", code: Permission.OrganizationDelete, description: "Delete organizations." },
    ],
  },
  {
    key: "department",
    module: "Departments",
    label: "Departments",
    description: "Departments are the unit of ownership — everything below hangs off one. “Own department” means the departments the person belongs to; “all departments” reaches the whole organization.",
    departmentScoped: true,
    actions: [
      { action: "manage", label: "Manage", code: Permission.DepartmentManage, description: "Create, edit and delete the person's own departments in one grant." },
      { action: "view", label: "View", code: Permission.DepartmentView, description: "View the person's own departments." },
      { action: "create", label: "Create", code: Permission.DepartmentCreate, description: "Create departments inside the organization." },
      { action: "edit", label: "Edit", code: Permission.DepartmentEdit, description: "Edit departments." },
      { action: "delete", label: "Delete", code: Permission.DepartmentDelete, description: "Delete departments." },
    ],
  },
  {
    key: "project",
    module: "Projects",
    label: "Projects",
    description: "Projects are owned by a primary department and shared with others.",
    departmentScoped: true,
    actions: [
      { action: "manage", label: "Manage", code: Permission.ProjectManage, description: "Create, edit and delete projects in one grant." },
      { action: "view", label: "View", code: Permission.ProjectView, description: "View projects." },
      { action: "create", label: "Create", code: Permission.ProjectCreate, description: "Create projects." },
      { action: "edit", label: "Edit", code: Permission.ProjectEdit, description: "Edit projects." },
      { action: "delete", label: "Delete", code: Permission.ProjectDelete, description: "Delete projects." },
      {
        action: "special",
        label: "Primary department",
        code: Permission.ProjectPrimaryDepartmentManage,
        description:
          "Full view and control of projects whose primary department is one the person heads — including milestones assigned to other departments.\n\nWithout it, a department head working on somebody else’s project sees only the milestones and tasks owned by their own department, and nothing else about that project. Give this to a role that should own the projects its department creates.",
      },
    ],
  },
  {
    key: "milestone",
    module: "Milestones",
    label: "Milestones",
    description: "Milestones belong to a project and can be owned by any participating department.",
    departmentScoped: true,
    actions: [
      { action: "manage", label: "Manage", code: Permission.MilestoneManage, description: "Create, edit and delete milestones in one grant." },
      { action: "view", label: "View", code: Permission.MilestoneView, description: "View milestones." },
      { action: "create", label: "Create", code: Permission.MilestoneCreate, description: "Create milestones." },
      { action: "edit", label: "Edit", code: Permission.MilestoneEdit, description: "Edit milestones." },
      { action: "delete", label: "Delete", code: Permission.MilestoneDelete, description: "Delete milestones." },
    ],
  },
  {
    key: "task",
    module: "Tasks",
    label: "Tasks",
    description: "Tasks belong to a milestone and inherit its department scope.",
    departmentScoped: true,
    actions: [
      { action: "manage", label: "Manage", code: Permission.TaskManage, description: "Create, edit and delete tasks in one grant." },
      { action: "view", label: "View", code: Permission.TaskView, description: "View tasks." },
      { action: "create", label: "Create", code: Permission.TaskCreate, description: "Create tasks." },
      { action: "edit", label: "Edit", code: Permission.TaskEdit, description: "Edit tasks." },
      { action: "delete", label: "Delete", code: Permission.TaskDelete, description: "Delete tasks." },
      { action: "special", label: "Assign", code: Permission.TaskAssign, description: "Assign or reassign who a task belongs to." },
      { action: "special", label: "Comment", code: Permission.TaskCommentCreate, description: "Add comments to a task." },
      { action: "special", label: "Attach", code: Permission.TaskAttachmentCreate, description: "Attach files to a task." },
      { action: "special", label: "Time track", code: Permission.TaskTimeTrack, description: "Start and stop task timers." },
    ],
  },
  {
    key: "subtask",
    module: "Subtasks",
    label: "Subtasks",
    description: "Subtasks are nested under a task.",
    departmentScoped: true,
    actions: [
      { action: "manage", label: "Manage", code: Permission.SubtaskManage, description: "Create, edit and delete subtasks in one grant." },
      { action: "view", label: "View", code: Permission.SubtaskView, description: "View subtasks." },
      { action: "create", label: "Create", code: Permission.SubtaskCreate, description: "Create subtasks." },
      { action: "edit", label: "Edit", code: Permission.SubtaskEdit, description: "Edit subtasks." },
      { action: "delete", label: "Delete", code: Permission.SubtaskDelete, description: "Delete subtasks." },
    ],
  },
  {
    key: "document",
    module: "Documents",
    label: "Documents",
    description:
      "Documents are attached at project, milestone or task level. Which levels a role may upload into is permissioned per level, and the upload dialog offers exactly the levels ticked here.",
    departmentScoped: true,
    actions: [
      { action: "manage", label: "Manage", code: Permission.DocumentManage, description: "Create, edit and delete documents at every level in one grant." },
      { action: "view", label: "View", code: Permission.DocumentView, description: "View documents." },
      { action: "create", label: "Create", code: Permission.DocumentCreate, description: "Upload documents." },
      { action: "edit", label: "Edit", code: Permission.DocumentEdit, description: "Edit document details." },
      { action: "delete", label: "Delete", code: Permission.DocumentDelete, description: "Delete documents." },
      { action: "special", label: "Upload at project level", code: Permission.DocumentUploadProject, description: "Upload documents at project level — they sit on the project itself rather than a milestone or task." },
      { action: "special", label: "Upload at milestone level", code: Permission.DocumentUploadMilestone, description: "Upload documents at milestone level, against a milestone in a project the person can reach." },
      { action: "special", label: "Upload at task level", code: Permission.DocumentUploadTask, description: "Upload documents at task level, against a task in a project the person can reach." },
    ],
  },
  {
    key: "utilizationCertificate",
    module: "Utilization Certificates",
    label: "Utilization Certificates",
    description: "Finance sign-off that funds were spent as intended. Submitting and reviewing are deliberately separate.",
    departmentScoped: true,
    actions: [
      { action: "manage", label: "Manage", code: Permission.UtilizationCertificateManage, description: "Full control over utilization certificates, including review and deletion." },
      { action: "view", label: "View", code: Permission.UtilizationCertificateView, description: "View utilization certificates." },
      { action: "create", label: "Create", code: Permission.UtilizationCertificateCreate, description: "Submit a utilization certificate. Also grants the right to choose the level its document is filed at." },
      { action: "edit", label: "Edit", code: Permission.UtilizationCertificateEdit, description: "Edit a draft or rejected certificate." },
      { action: "delete", label: "Delete", code: Permission.UtilizationCertificateDelete, description: "Delete draft or rejected certificates." },
      {
        action: "special",
        label: "Review",
        code: Permission.UtilizationCertificateReview,
        description:
          "Approve or reject a submitted certificate. Kept separate from submitting so a contributor can never sign off their own claim.",
      },
      { action: "special", label: "UC document at project level", code: Permission.UtilizationCertificateDocumentUploadProject, description: "Attach a utilization certificate document at project level." },
      { action: "special", label: "UC document at milestone level", code: Permission.UtilizationCertificateDocumentUploadMilestone, description: "Attach a utilization certificate document at milestone level." },
      { action: "special", label: "UC document at task level", code: Permission.UtilizationCertificateDocumentUploadTask, description: "Attach a utilization certificate document at task level." },
    ],
  },
  {
    key: "user",
    module: "Users",
    label: "Users",
    description: "Users and their department assignments.",
    departmentScoped: true,
    actions: [
      { action: "manage", label: "Manage", code: Permission.UserManage, description: "Create, edit and delete users in one grant." },
      { action: "view", label: "View", code: Permission.UserView, description: "View users." },
      { action: "create", label: "Create", code: Permission.UserCreate, description: "Create users." },
      { action: "edit", label: "Edit", code: Permission.UserEdit, description: "Edit users." },
      { action: "delete", label: "Delete", code: Permission.UserDelete, description: "Deactivate or delete users." },
      { action: "special", label: "Assign departments", code: Permission.UserDepartmentManage, description: "Assign users to departments and organizations." },
      { action: "special", label: "Profile picture", code: Permission.UserProfilePictureManage, description: "Upload and update user profile pictures." },
    ],
  },
  {
    key: "notification",
    module: "Notifications",
    label: "Notifications",
    description: "Notification delivery, templates and alert rules.",
    departmentScoped: false,
    actions: [
      { action: "manage", label: "Manage", code: Permission.NotificationManage, description: "Manage notifications in one grant." },
      { action: "view", label: "View", code: Permission.NotificationView, description: "View notifications." },
      { action: "special", label: "Broadcast", code: Permission.NotificationBroadcast, description: "Broadcast a notification to users or groups." },
      { action: "special", label: "Templates", code: Permission.NotificationTemplateManage, description: "Create and update notification templates." },
      { action: "special", label: "Alert rules", code: Permission.NotificationRuleManage, description: "Create and update alert rules." },
    ],
  },
  {
    key: "activityLog",
    module: "Audit",
    label: "Activity Logs",
    description: "Append-only audit trail — there is deliberately no edit or delete.",
    departmentScoped: false,
    actions: [
      { action: "manage", label: "Manage", code: Permission.ActivityLogManage, description: "Manage activity logs in one grant." },
      { action: "view", label: "View", code: Permission.ActivityLogView, description: "View activity logs." },
      { action: "create", label: "Create", code: Permission.ActivityLogCreate, description: "Record activity log entries." },
    ],
  },
  {
    key: "report",
    module: "Reports",
    label: "Reports",
    description: "Saved and generated reports.",
    departmentScoped: true,
    actions: [
      { action: "manage", label: "Manage", code: Permission.ReportManage, description: "Create, edit and delete reports in one grant." },
      { action: "view", label: "View", code: Permission.ReportView, description: "View reports." },
      { action: "create", label: "Create", code: Permission.ReportCreate, description: "Create reports." },
      { action: "edit", label: "Edit", code: Permission.ReportEdit, description: "Edit reports." },
      { action: "delete", label: "Delete", code: Permission.ReportDelete, description: "Delete reports." },
    ],
  },
  {
    key: "knowledge",
    module: "Knowledge",
    label: "Knowledge",
    description: "Knowledge articles and lessons learned.",
    departmentScoped: true,
    actions: [
      { action: "manage", label: "Manage", code: Permission.KnowledgeManage, description: "Create, edit and delete knowledge articles in one grant." },
      { action: "view", label: "View", code: Permission.KnowledgeView, description: "View knowledge articles and lessons learned." },
      { action: "create", label: "Create", code: Permission.KnowledgeCreate, description: "Create knowledge articles and lessons learned." },
      { action: "edit", label: "Edit", code: Permission.KnowledgeEdit, description: "Edit knowledge articles and lessons learned." },
      { action: "delete", label: "Delete", code: Permission.KnowledgeDelete, description: "Delete knowledge articles and lessons learned." },
    ],
  },
  {
    key: "integration",
    module: "Integrations",
    label: "Integrations",
    description: "Outbound integrations and webhooks.",
    departmentScoped: false,
    actions: [
      { action: "view", label: "View", code: Permission.IntegrationView, description: "View integrations and webhooks." },
      { action: "create", label: "Create", code: Permission.IntegrationCreate, description: "Create integrations and webhooks." },
      { action: "edit", label: "Edit", code: Permission.IntegrationEdit, description: "Update integrations and webhooks." },
      { action: "delete", label: "Delete", code: Permission.IntegrationDelete, description: "Delete integrations and webhooks." },
    ],
  },
  {
    key: "ai",
    module: "AI",
    label: "AI",
    description: "AI insights, providers and models.",
    departmentScoped: false,
    actions: [
      { action: "manage", label: "Manage", code: Permission.AiManage, description: "Manage AI providers, models and training data." },
      { action: "view", label: "View", code: Permission.AiView, description: "View AI insights and predictions." },
    ],
  },
] as const;

/** Module display order. Matches PermissionCatalog.ModuleOrder on the server. */
export const PERMISSION_MODULE_ORDER: readonly string[] = [
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
  "AI",
];

/** Modules a non-superadmin may not assign. Mirrors PermissionCatalog.AdminOnlyModules. */
export const ADMIN_ONLY_MODULES: readonly string[] = ["Authentication", "Authorization", "System"];

export type PermissionModule = (typeof PERMISSION_MODULE_ORDER)[number];

// ── Coverage ────────────────────────────────────────────────────────────────

/** Action labels that are addressed by a conventional key rather than by `action`. */
const CONVENTIONAL_KEYS: Readonly<Record<string, string>> = {
  [Permission.ProjectPrimaryDepartmentManage]: "primaryDepartmentManage",
  [Permission.TaskAssign]: "assign",
  [Permission.TaskCommentCreate]: "comment",
  [Permission.TaskAttachmentCreate]: "attach",
  [Permission.TaskTimeTrack]: "time",
  [Permission.SubtaskManage]: "manage",
  [Permission.UserDepartmentManage]: "department",
  [Permission.UserProfilePictureManage]: "profilePicture",
  [Permission.ActivityLogManage]: "manage",
  [Permission.ActivityLogCreate]: "create",
  [Permission.NotificationBroadcast]: "broadcast",
  [Permission.NotificationTemplateManage]: "template",
  [Permission.NotificationRuleManage]: "rule",
  [Permission.UtilizationCertificateReview]: "review",
  [Permission.KnowledgeManage]: "manage",
  [Permission.AiManage]: "manage",
  [Permission.SystemAdmin]: "manage",
  [Permission.SystemDatabaseView]: "view",
  [Permission.RoleManage]: "manage",
  [Permission.PermissionManage]: "manage",
  [Permission.DocumentManage]: "manage",
  [Permission.UtilizationCertificateManage]: "manage",
  [Permission.UserManage]: "manage",
  [Permission.OrganizationManage]: "manage",
  [Permission.DocumentUploadProject]: "uploadProject",
  [Permission.DocumentUploadMilestone]: "uploadMilestone",
  [Permission.DocumentUploadTask]: "uploadTask",
  [Permission.UtilizationCertificateDocumentUploadProject]: "uploadProject",
  [Permission.UtilizationCertificateDocumentUploadMilestone]: "uploadMilestone",
  [Permission.UtilizationCertificateDocumentUploadTask]: "uploadTask",
};

/**
 * The legacy `PERMISSION_GROUPS.module.action` lookup, derived from the feature
 * table so it can never drift from the catalogue.
 *
 * Kept because pages gate on `PERMISSION_GROUPS.project.view` and there are a
 * couple of dozen of those call sites; they read exactly the codes the matrix
 * renders. Several distinct actions in one module — task assign, comment, attach,
 * time track — are addressed by their conventional keys.
 */
export const PERMISSION_GROUPS: Readonly<Record<string, Readonly<Record<string, string>>>> = (() => {
  const byModule: Record<string, Record<string, string>> = {};

  for (const feature of PERMISSION_FEATURES) {
    const group = (byModule[feature.module] ??= {});

    for (const entry of feature.actions) {
      const conventionalKey = CONVENTIONAL_KEYS[entry.code];
      if (conventionalKey) {
        group[conventionalKey] = entry.code;
      } else if (!(entry.action in group)) {
        group[entry.action] = entry.code;
      }
    }
  }

  return byModule;
})();

/** Every permission code, in catalogue order, including both scopes. */
const ALL_CODES: readonly string[] = PERMISSION_FEATURES.flatMap((feature) =>
  feature.actions.flatMap((entry) =>
    feature.departmentScoped ? [entry.code, toAllScope(entry.code)] : [entry.code],
  ),
);

const CODE_SET = new Set(ALL_CODES);

/**
 * Extra permissions a grant confers beyond its own feature.
 *
 * Kept in step with PermissionCatalog.AdditionalManageCoverage: a role that
 * manages projects also sees the projects it manages, and submitting a
 * utilization certificate is what puts its document on disk.
 */
const ADDITIONAL_COVERAGE: Readonly<Record<string, readonly string[]>> = {
  [Permission.ProjectManage]: [Permission.ProjectPrimaryDepartmentManage],
  [Permission.UtilizationCertificateCreate]: [
    Permission.UtilizationCertificateDocumentUploadProject,
    Permission.UtilizationCertificateDocumentUploadMilestone,
    Permission.UtilizationCertificateDocumentUploadTask,
  ],
};

function unique(codes: Iterable<string>): string[] {
  return Array.from(new Set(codes)).filter((code) => CODE_SET.has(code));
}

/**
 * Umbrella expansion: a "manage" grant covers the rest of its feature at the
 * same scope.
 */
export const MANAGE_COVERAGE: Readonly<Record<string, readonly string[]>> = (() => {
  const coverage: Record<string, string[]> = {};

  for (const feature of PERMISSION_FEATURES) {
    for (const entry of feature.actions) {
      if (entry.action !== "manage") continue;

      const codes = feature.actions
        .filter((other) => other.code !== entry.code)
        .flatMap((other) =>
          feature.departmentScoped ? [other.code, toAllScope(other.code)] : [other.code],
        );

      coverage[entry.code] = unique([...codes, ...(ADDITIONAL_COVERAGE[entry.code] ?? [])]);
      if (feature.departmentScoped) {
        coverage[toAllScope(entry.code)] = unique([
          ...codes.map(toAllScope),
          ...(ADDITIONAL_COVERAGE[entry.code] ?? []),
          ...Object.entries(ADDITIONAL_COVERAGE)
            .filter(([key]) => key === toOwnScope(entry.code))
            .flatMap(([, values]) => values),
        ]);
      }
    }
  }

  for (const [code, values] of Object.entries(ADDITIONAL_COVERAGE)) {
    coverage[code] = unique([...(coverage[code] ?? []), ...values]);
  }

  return coverage;
})();

/**
 * Cross-scope expansion: an all-departments grant covers its own-department
 * equivalent.
 */
export const ALL_SCOPE_COVERAGE: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  ALL_CODES.filter(isAllScope).map((code) => [code, [toOwnScope(code)]]),
);

/**
 * Both expansions together, walked to a fixed point.
 *
 * The fixed point matters: an all-departments umbrella implies an own-department
 * umbrella, which in turn covers the own-department actions. A single pass over
 * the map missed that second hop.
 */
export const PERMISSION_COVERAGE: Readonly<Record<string, readonly string[]>> = (() => {
  const effective: Record<string, string[]> = {};
  for (const [code, covered] of Object.entries(MANAGE_COVERAGE)) effective[code] = [...covered];
  for (const [code, implied] of Object.entries(ALL_SCOPE_COVERAGE)) {
    const merged = [...(effective[code] ?? []), ...implied];
    for (const own of implied) merged.push(...(MANAGE_COVERAGE[own] ?? []));
    effective[code] = unique(merged).filter((c) => c !== code);
  }
  return effective;
})();

/** Every code in the catalogue, including both scopes. */
export const ALL_PERMISSION_CODES: readonly string[] = ALL_CODES;

/**
 * Expands raw role permissions into the effective set, applying both
 * expansions. Mirrors the server exactly, so a checkbox the client renders and a
 * policy the API evaluates can never disagree.
 */
export function expandPermissions(
  userPermissions: readonly string[] | undefined | null,
): string[] {
  if (!userPermissions?.length) return [];

  const result = new Set<string>(userPermissions);
  const frontier = Array.from(userPermissions);
  const visited = new Set(userPermissions);

  while (frontier.length > 0) {
    const current = frontier.pop() as string;
    const covered = PERMISSION_COVERAGE[current];
    if (!covered) continue;

    for (const code of covered) {
      if (visited.has(code)) continue;
      visited.add(code);
      result.add(code);
      frontier.push(code);
    }
  }

  return Array.from(result);
}

export function isSuperAdmin(perms: readonly string[] | undefined | null): boolean {
  return Boolean(perms?.includes(Permission.SystemAdmin));
}

/** Whether the caller effectively holds a single permission. */
export function coversManagedPermission(
  userPermissions: readonly string[] | undefined | null,
  requested: string,
): boolean {
  if (!userPermissions?.length) return false;
  if (userPermissions.includes(Permission.SystemAdmin)) return true;
  if (userPermissions.includes(requested)) return true;

  return Object.entries(PERMISSION_COVERAGE).some(
    ([grant, covered]) =>
      userPermissions.includes(grant) && (covered as readonly string[]).includes(requested),
  );
}

/** Whether the caller effectively holds any one of the given permissions. */
export function coversAnyPermission(
  userPermissions: readonly string[] | undefined | null,
  requested: readonly string[],
): boolean {
  if (!requested.length) return true;
  return requested.some((perm) => coversManagedPermission(userPermissions, perm));
}

/**
 * Whether the caller reaches every department, rather than only their own.
 *
 * Only the all-departments flavour counts. Consulting the implied-coverage map
 * here would ask the opposite question — "do they hold the own-department code?"
 * — which is true of anyone with any scope at all.
 */
export function hasAllDepartmentScope(
  userPermissions: readonly string[] | undefined | null,
  ownDepartmentCode: string,
): boolean {
  if (!userPermissions?.length) return false;
  if (userPermissions.includes(Permission.SystemAdmin)) return true;
  return expandPermissions(userPermissions).includes(toAllScope(ownDepartmentCode));
}

// ── Role keys and display names ─────────────────────────────────────────────

export const RoleKey = {
  SuperAdmin: "superadmin",
  Director: "director",
  ProjectManager: "project-manager",
  DepartmentHead: "department-head",
  TeamMember: "team-member",
  Viewer: "viewer",
} as const;

export type RoleKeyCode = (typeof RoleKey)[keyof typeof RoleKey];

export const ROLE_DISPLAY_NAMES: Record<RoleKeyCode, string> = {
  [RoleKey.SuperAdmin]: "SuperAdmin",
  // Presented as "Admin" throughout the UI. The backend key stays "director", so no
  // permission, guard or API payload changes.
  [RoleKey.Director]: "Admin",
  [RoleKey.ProjectManager]: "ProjectManager",
  [RoleKey.DepartmentHead]: "DepartmentHead",
  [RoleKey.TeamMember]: "TeamMember",
  [RoleKey.Viewer]: "Viewer",
};

export const ROLE_LEVELS: Record<string, number> = {
  [RoleKey.SuperAdmin]: 100,
  [RoleKey.Director]: 90,
  [RoleKey.ProjectManager]: 80,
  [RoleKey.DepartmentHead]: 70,
  [RoleKey.TeamMember]: 40,
  [RoleKey.Viewer]: 10,
};

const LEGACY_ROLE_KEYS: Record<string, RoleKeyCode> = {
  SuperAdmin: RoleKey.SuperAdmin,
  Director: RoleKey.Director,
  ProjectManager: RoleKey.ProjectManager,
  DepartmentHead: RoleKey.DepartmentHead,
  TeamMember: RoleKey.TeamMember,
  Viewer: RoleKey.Viewer,
};

export function normalizeRoleKey(role: string): string {
  return LEGACY_ROLE_KEYS[role] ?? role;
}

/**
 * Display label for a role, given either its backend key ("director") or the role
 * name stored on the user ("Director"). Use this anywhere a role is shown to a
 * user so the relabelled roles read the same everywhere.
 */
export function roleDisplayName(role: string | null | undefined): string {
  const trimmed = role?.trim();
  if (!trimmed) return "";
  const key = normalizeRoleKey(trimmed) as RoleKeyCode;
  return ROLE_DISPLAY_NAMES[key] ?? trimmed;
}

/** Display labels for a list of roles, dropping any empty entries. */
export function roleDisplayNames(roles: readonly string[] | null | undefined): string[] {
  return (roles ?? []).map(roleDisplayName).filter(Boolean);
}

export function hasRoleKey(
  roles: readonly string[] | undefined | null,
  roleKey: RoleKeyCode,
): boolean {
  return Boolean(roles?.some((role) => normalizeRoleKey(role) === roleKey));
}

export function hasAnyRoleKey(
  roles: readonly string[] | undefined | null,
  roleKeys: readonly RoleKeyCode[],
): boolean {
  return roleKeys.some((roleKey) => hasRoleKey(roles, roleKey));
}

// ── Lookups used by the pages ───────────────────────────────────────────────

export function getModuleGroup(module: PermissionModule) {
  return PERMISSION_FEATURES.find((feature) => feature.module === module);
}

/**
 * The code a feature uses for an action at a given scope, or undefined when the
 * feature has no such action.
 */
export function featureCode(
  featureKey: string,
  action: PermissionAction,
  scope: PermissionScope = "own",
): string | undefined {
  const feature = PERMISSION_FEATURES.find((candidate) => candidate.key === featureKey);
  const entry = feature?.actions.find((candidate) => candidate.action === action);
  if (!entry) return undefined;
  return scope === "all" ? toAllScope(entry.code) : entry.code;
}

/** Hover text for a permission, written per action rather than generated. */
export function permissionDescription(code: string | undefined): string {
  if (!code) return "";
  const own = toOwnScope(code);
  const entry = PERMISSION_FEATURES.flatMap((feature) => feature.actions).find(
    (candidate) => candidate.code === own,
  );
  return entry?.description ?? "";
}

/** Display label for a permission, e.g. "View Projects (all departments)". */
export function permissionLabel(code: string): string {
  const entry = PERMISSION_FEATURES.flatMap((feature) => feature.actions).find(
    (candidate) => candidate.code === toOwnScope(code),
  );
  const base = entry?.label ?? toOwnScope(code);
  return isAllScope(code) ? `${base} (all departments)` : base;
}
