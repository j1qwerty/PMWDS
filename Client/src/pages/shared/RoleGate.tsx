import { useMemo, type ReactNode } from "react";
import { useAuth } from "../../auth";
import {
  PERMISSION_GROUPS,
  Permission,
  isSuperAdmin,
  type PermissionCode,
  type PermissionModule,
} from "../../permissions";
import type { Role } from "../../types";

export { Permission, PERMISSION_GROUPS };
export type { PermissionCode, PermissionModule };

type RoleGateProps = {
  allow?: Role[];
  deny?: Role[];
  permissions?: string[];
  fallback?: ReactNode;
  children: ReactNode;
};

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

type ModuleActions = {
  view: () => boolean;
  create: () => boolean;
  edit: () => boolean;
  delete: () => boolean;
  manage: () => boolean;
  [key: string]: () => boolean;
};

function buildModuleActions(
  module: PermissionModule,
  hasPermission: (...perms: string[]) => boolean,
): ModuleActions {
  const group = PERMISSION_GROUPS[module] as Record<string, string | undefined>;
  const make = (key: string) => () => {
    const code = group[key];
    return code ? hasPermission(code) : false;
  };
  const actions: ModuleActions = {
    view: make("view"),
    create: make("create"),
    edit: make("edit"),
    delete: make("delete"),
    manage: make("manage"),
  };
  for (const key of Object.keys(group)) {
    if (key in actions) continue;
    actions[key] = make(key);
  }
  return actions;
}

export type UsePermissionResult = {
  roles: Role[];
  permissions: readonly string[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  has: (permission: string) => boolean;
  hasAny: (...permissions: string[]) => boolean;
  hasAll: (...permissions: string[]) => boolean;
  can: (...permissions: string[]) => boolean;
  canModule: (action: string, module: PermissionModule) => boolean;
  module: (name: PermissionModule) => ModuleActions;
};

export function usePermission(): UsePermissionResult {
  const { auth, hasPermission, hasAllPermissions } = useAuth();
  const permissions = auth?.permissions ?? [];
  const roles = auth?.roles ?? [];

  return useMemo<UsePermissionResult>(() => {
    const result: UsePermissionResult = {
      roles,
      permissions,
      isAdmin: isSuperAdmin(permissions),
      isSuperAdmin: isSuperAdmin(permissions),
      has: (permission: string) => hasPermission(permission),
      hasAny: (...perms: string[]) => hasPermission(...perms),
      hasAll: (...perms: string[]) => hasAllPermissions(...perms),
      can: (...perms: string[]) => hasPermission(...perms),
      canModule: (action: string, module: PermissionModule) => {
        const group = PERMISSION_GROUPS[module] as Record<string, string | undefined>;
        const code = group[action];
        if (code) return hasPermission(code);
        const manage = group.manage;
        return manage ? hasPermission(manage) : false;
      },
      module: (name: PermissionModule) => buildModuleActions(name, hasPermission),
    };
    return result;
  }, [roles, permissions, hasPermission, hasAllPermissions]);
}

export type RoleAccess = Omit<UsePermissionResult, "hasAny"> & {
  isDirector: boolean;
  isDepartmentHead: boolean;
  canManageDepartments: boolean;
  canCreateDepartments: boolean;
  canDeleteDepartments: boolean;
  canManageProjects: boolean;
  canManageMilestones: boolean;
  canManageTasks: boolean;
  canManageUsers: boolean;
  canUploadProfilePictures: boolean;
  canManageRoles: boolean;
  canManagePermissions: boolean;
  canBroadcast: boolean;
  canConfigureNotifications: boolean;
  canViewActivityLogs: boolean;
  canViewManagementData: boolean;
  hasAny: (allow: Role[]) => boolean;
};

export function useRoleAccess(): RoleAccess {
  const perm = usePermission();

  return useMemo<RoleAccess>(() => ({
    ...perm,
    isDirector: canUseRole(perm.roles, ["Director"]),
    isDepartmentHead: canUseRole(perm.roles, ["DepartmentHead"]),
    canManageDepartments: perm.has(PERMISSION_GROUPS.department.manage),
    canCreateDepartments: perm.has(PERMISSION_GROUPS.department.create),
    canDeleteDepartments: perm.has(PERMISSION_GROUPS.department.delete),
    canManageProjects: perm.has(PERMISSION_GROUPS.project.manage),
    canManageMilestones: perm.has(PERMISSION_GROUPS.milestone.manage),
    canManageTasks: perm.has(PERMISSION_GROUPS.task.manage),
    canManageUsers: perm.has(PERMISSION_GROUPS.user.manage),
    canUploadProfilePictures: perm.has(PERMISSION_GROUPS.user.profilePicture),
    canManageRoles: perm.has(PERMISSION_GROUPS.role.manage),
    canManagePermissions: perm.has(PERMISSION_GROUPS.permission.manage),
    canBroadcast: perm.has(PERMISSION_GROUPS.notification.broadcast),
    canConfigureNotifications: perm.has(PERMISSION_GROUPS.notification.template) || perm.has(PERMISSION_GROUPS.notification.rule),
    canViewActivityLogs: perm.has(PERMISSION_GROUPS.activityLog.view),
    canViewManagementData: perm.hasAny(
      PERMISSION_GROUPS.project.view,
      PERMISSION_GROUPS.department.view,
      PERMISSION_GROUPS.user.view,
    ),
    hasAny: (allow: Role[]) => canUseRole(perm.roles, allow),
  }), [perm]);
}
