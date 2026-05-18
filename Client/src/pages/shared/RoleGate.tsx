import type { ReactNode } from "react";
import { useAuth } from "../../auth";
import type { Role } from "../../types";

type RoleGateProps = {
  allow?: Role[];
  deny?: Role[];
  fallback?: ReactNode;
  children: ReactNode;
};

export function canUseRole(userRoles: readonly string[] | undefined, allow?: readonly string[], deny?: readonly string[]) {
  if (!userRoles?.length) return false;
  if (deny?.some((role) => userRoles.includes(role))) return false;
  if (!allow?.length) return true;
  return allow.some((role) => userRoles.includes(role));
}

export function RoleGate({ allow, deny, fallback = null, children }: RoleGateProps) {
  const { auth } = useAuth();
  return canUseRole(auth?.roles, allow, deny) ? <>{children}</> : <>{fallback}</>;
}

export function useRoleAccess() {
  const { auth } = useAuth();
  const roles = auth?.roles ?? [];

  return {
    roles,
    isAdmin: canUseRole(roles, ["SuperAdmin"]),
    canManageDepartments: canUseRole(roles, ["SuperAdmin", "ProjectManager", "DepartmentHead"]),
    canManageProjects: canUseRole(roles, ["SuperAdmin", "ProjectManager", "DepartmentHead"]),
    canManageMilestones: canUseRole(roles, ["SuperAdmin", "ProjectManager", "DepartmentHead", "TeamLead"]),
    canManageTasks: canUseRole(roles, ["SuperAdmin", "ProjectManager", "DepartmentHead", "TeamLead"]),
    canManageUsers: canUseRole(roles, ["SuperAdmin"]),
    canBroadcast: canUseRole(roles, ["SuperAdmin", "DepartmentHead", "ProjectManager"]),
    canViewManagementData: canUseRole(roles, ["SuperAdmin", "ProjectManager", "DepartmentHead"]),
    hasAny: (allow: Role[]) => canUseRole(roles, allow),
  };
}
