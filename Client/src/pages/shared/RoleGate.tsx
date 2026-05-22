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
    isDirector: canUseRole(roles, ["Director"]),
    isDepartmentHead: canUseRole(roles, ["DepartmentHead"]),
    canManageDepartments: canUseRole(roles, ["SuperAdmin", "Director", "DepartmentHead"]),
    canManageProjects: canUseRole(roles, ["SuperAdmin", "Director", "ProjectManager", "DepartmentHead"]),
    canManageMilestones: canUseRole(roles, ["SuperAdmin", "Director", "ProjectManager", "DepartmentHead"]),
    canManageTasks: canUseRole(roles, ["SuperAdmin", "Director", "ProjectManager", "DepartmentHead"]),
    canManageUsers: canUseRole(roles, ["SuperAdmin", "Director"]),
    canBroadcast: canUseRole(roles, ["SuperAdmin", "Director", "DepartmentHead"]),
    canViewManagementData: canUseRole(roles, ["SuperAdmin", "Director", "ProjectManager", "DepartmentHead"]),
    hasAny: (allow: Role[]) => canUseRole(roles, allow),
  };
}
