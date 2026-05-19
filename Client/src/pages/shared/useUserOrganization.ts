import { useMemo } from "react";
import { useAuth } from "../../auth";
import type { Department, User } from "../../types";

const adminRoles = ["SuperAdmin", "ProjectManager", "DepartmentHead"] as const;

export function useUserOrganization(users: User[], departments: Department[]) {
  const { auth, hasRole } = useAuth();

  const isOrgAdmin = hasRole(...adminRoles);

  const userOrganizationId = useMemo(() => {
    if (isOrgAdmin || !auth) return null;

    const currentUser = users.find(u => u.id === auth.userId);
    if (!currentUser) return null;

    const primaryDept = currentUser.departments?.find(d => d.isPrimary);
    if (primaryDept?.organizationId) return primaryDept.organizationId;

    const firstDept = currentUser.departments?.[0];
    if (firstDept?.organizationId) return firstDept.organizationId;

    if (currentUser.departmentId) {
      const dept = departments.find(d => d.id === currentUser.departmentId);
      return dept?.organizationId ?? null;
    }

    return null;
  }, [isOrgAdmin, auth, users, departments]);

  return {
    isOrgAdmin,
    userOrganizationId,
    shouldFilterByOrg: !isOrgAdmin && userOrganizationId !== null,
  };
}
