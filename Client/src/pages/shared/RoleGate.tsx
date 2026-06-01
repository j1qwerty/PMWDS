import { useMemo, type ReactNode } from "react";
import { useAuth } from "../../auth";
import type { Role } from "../../types";

type RoleGateProps = {
  allow?: Role[];
  deny?: Role[];
  permissions?: string[];
  fallback?: ReactNode;
  children: ReactNode;
};

export const Permission = {
  SystemAdmin: "SYSTEM_ADMIN",
  OrganizationView: "ORGANIZATION_VIEW",
  OrganizationCreate: "ORGANIZATION_CREATE",
  OrganizationEdit: "ORGANIZATION_EDIT",
  OrganizationDelete: "ORGANIZATION_DELETE",
  DepartmentView: "DEPARTMENT_VIEW",
  DepartmentCreate: "DEPARTMENT_CREATE",
  DepartmentEdit: "DEPARTMENT_EDIT",
  DepartmentDelete: "DEPARTMENT_DELETE",
  ProjectView: "PROJECT_VIEW",
  ProjectCreate: "PROJECT_CREATE",
  ProjectEdit: "PROJECT_EDIT",
  ProjectDelete: "PROJECT_DELETE",
  MilestoneView: "MILESTONE_VIEW",
  MilestoneCreate: "MILESTONE_CREATE",
  MilestoneEdit: "MILESTONE_EDIT",
  MilestoneDelete: "MILESTONE_DELETE",
  TaskView: "TASK_VIEW",
  TaskCreate: "TASK_CREATE",
  TaskEdit: "TASK_EDIT",
  TaskDelete: "TASK_DELETE",
  UserView: "USER_VIEW",
  UserCreate: "USER_CREATE",
  UserEdit: "USER_EDIT",
  UserDelete: "USER_DELETE",
  UserDepartmentManage: "USER_DEPARTMENT_MANAGE",
  UserProfilePictureManage: "USER_PROFILE_PICTURE_MANAGE",
  RoleView: "ROLE_VIEW",
  RoleCreate: "ROLE_CREATE",
  RoleEdit: "ROLE_EDIT",
  RoleDelete: "ROLE_DELETE",
  PermissionView: "PERMISSION_VIEW",
  PermissionCreate: "PERMISSION_CREATE",
  PermissionEdit: "PERMISSION_EDIT",
  PermissionDelete: "PERMISSION_DELETE",
  NotificationView: "NOTIFICATION_VIEW",
  NotificationBroadcast: "NOTIFICATION_BROADCAST",
  NotificationTemplateManage: "NOTIFICATION_TEMPLATE_MANAGE",
  NotificationRuleManage: "NOTIFICATION_RULE_MANAGE",
  ActivityLogView: "ACTIVITY_LOG_VIEW",
  ActivityLogCreate: "ACTIVITY_LOG_CREATE",
} as const;

export function canUseRole(userRoles: readonly string[] | undefined, allow?: readonly string[], deny?: readonly string[]) {
  if (!userRoles?.length) return false;
  if (deny?.some((role) => userRoles.includes(role))) return false;
  if (!allow?.length) return true;
  return allow.some((role) => userRoles.includes(role));
}

export function RoleGate({ allow, deny, permissions, fallback = null, children }: RoleGateProps) {
  const { auth, hasPermission } = useAuth();
  const allowedByPermission = permissions?.length ? hasPermission(...permissions) : true;
  const allowedByRole = allow?.length || deny?.length ? canUseRole(auth?.roles, allow, deny) : true;
  return allowedByPermission && allowedByRole ? <>{children}</> : <>{fallback}</>;
}

export function useRoleAccess() {
  const { auth, hasPermission } = useAuth();
  const roles = auth?.roles ?? [];

  return useMemo(() => ({
    roles,
    can: (...permissions: string[]) => hasPermission(...permissions),
    isAdmin: hasPermission(Permission.SystemAdmin),
    isDirector: canUseRole(roles, ["Director"]),
    isDepartmentHead: canUseRole(roles, ["DepartmentHead"]),
    canManageDepartments: hasPermission(Permission.DepartmentCreate, Permission.DepartmentEdit, Permission.DepartmentDelete),
    canCreateDepartments: hasPermission(Permission.DepartmentCreate),
    canDeleteDepartments: hasPermission(Permission.DepartmentDelete),
    canManageProjects: hasPermission(Permission.ProjectCreate, Permission.ProjectEdit, Permission.ProjectDelete),
    canManageMilestones: hasPermission(Permission.MilestoneCreate, Permission.MilestoneEdit, Permission.MilestoneDelete),
    canManageTasks: hasPermission(Permission.TaskCreate, Permission.TaskEdit, Permission.TaskDelete),
    canManageUsers: hasPermission(Permission.UserCreate, Permission.UserEdit, Permission.UserDelete),
    canUploadProfilePictures: hasPermission(Permission.UserProfilePictureManage),
    canManageRoles: hasPermission(Permission.RoleCreate, Permission.RoleEdit, Permission.RoleDelete),
    canManagePermissions: hasPermission(Permission.PermissionCreate, Permission.PermissionEdit, Permission.PermissionDelete),
    canBroadcast: hasPermission(Permission.NotificationBroadcast),
    canConfigureNotifications: hasPermission(Permission.NotificationTemplateManage, Permission.NotificationRuleManage),
    canViewActivityLogs: hasPermission(Permission.ActivityLogView),
    canViewManagementData: hasPermission(Permission.ProjectView, Permission.DepartmentView, Permission.UserView),
    hasAny: (allow: Role[]) => canUseRole(roles, allow),
  }), [roles, hasPermission]);
}
