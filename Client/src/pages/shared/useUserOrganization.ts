import { useMemo } from "react";
import { useAuth } from "../../auth";
import type { Department, User } from "../../types";
import { Permission, RoleKey, hasRoleKey } from "../../permissions";

/**
 * Resolves the organization a user belongs to, and whether they may see
 * organization anywhere in the interface.
 *
 * Organization is a superadmin-only concept in the UI. It exists above every
 * department, and everybody else is scoped to their own department and its
 * siblings, so showing an organization column or selector to them only invites
 * the question "which organization is this?" — which they have no way to answer
 * and no need to. Every call site asks this hook rather than testing roles of its
 * own, so the rule lives in exactly one place.
 */
export function useUserOrganization(users: User[], departments: Department[]) {
  const { auth } = useAuth();

  /**
   * True only for a SuperAdmin. Deliberately not permission-based: holding
   * SYSTEM_ADMIN is the same thing, but tying the decision to the role keeps the
   * intent legible at the call site.
   */
  const canSeeOrganization = hasRoleKey(auth?.roleKeys, RoleKey.SuperAdmin);

  const userOrganizationId = useMemo(() => {
    if (canSeeOrganization || !auth) return null;

    const currentUser = users.find((u) => u.id === auth.userId);
    if (!currentUser) return null;

    // Directors can be assigned directly to an organization without a primary
    // department. Prefer that authoritative user scope before department fallbacks.
    if (currentUser.organizationId) return currentUser.organizationId;

    const primaryDept = currentUser.departments?.find((d) => d.isPrimary);
    if (primaryDept?.organizationId) return primaryDept.organizationId;

    const firstDept = currentUser.departments?.[0];
    if (firstDept?.organizationId) return firstDept.organizationId;

    if (currentUser.departmentId) {
      const dept = departments.find((d) => d.id === currentUser.departmentId);
      return dept?.organizationId ?? null;
    }

    return null;
  }, [canSeeOrganization, auth, users, departments]);

  return {
    /** Kept as an alias: the previous name was "is this an organization admin". */
    isOrgAdmin: canSeeOrganization,
    /** Whether an organization selector or column may be rendered at all. */
    canSeeOrganization,
    userOrganizationId,
    /**
     * Whether lists should be narrowed to the user's own organization. True for
     * everyone except a superadmin, who sees every organization.
     */
    shouldFilterByOrg: !canSeeOrganization && userOrganizationId !== null,
  };
}

/**
 * Narrows a department list to the ones the caller may pick from.
 *
 * A superadmin sees all of them. Everyone else sees their own organization only,
 * and falls back to the full list when that would leave nothing — a user with no
 * organization recorded is not thereby allowed nothing, and showing an empty
 * dropdown with no explanation is worse than showing a slightly wide one.
 */
export function useScopedDepartments(allDepartments: Department[]): {
  departments: Department[];
  /** True when the list was narrowed, so callers can explain why it looks small. */
  isScoped: boolean;
} {
  const { userOrganizationId, shouldFilterByOrg } = useUserOrganization([], allDepartments);

  const scoped = useMemo(() => {
    if (!shouldFilterByOrg || !userOrganizationId) return allDepartments;

    const inOrganization = allDepartments.filter(
      (department) => department.organizationId === userOrganizationId,
    );
    if (inOrganization.length > 0) return inOrganization;

    // Every department lacks an organization, so filtering by it is meaningless.
    if (allDepartments.length > 0 && allDepartments.every((d) => !d.organizationId)) {
      return allDepartments;
    }

    return allDepartments;
  }, [allDepartments, shouldFilterByOrg, userOrganizationId]);

  return {
    departments: scoped,
    isScoped: shouldFilterByOrg && scoped !== allDepartments,
  };
}

/** Re-exported so callers do not need a second import for the permission code. */
export { Permission };
