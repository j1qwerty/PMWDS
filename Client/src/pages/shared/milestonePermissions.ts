import { PERMISSION_GROUPS } from "../../permissions";
import type { UsePermissionResult } from "./RoleGate";

/**
 * Whether the current user may create, edit and delete milestones and milestone
 * dependencies.
 *
 * This mirrors the `Manager` authorization policy the API applies to
 * `POST/PUT/DELETE /api/v1/milestones` and
 * `POST/PUT/DELETE /api/v1/milestones/dependencies` in
 * PermissionPolicyRegistry.AddPolicies, with one deliberate omission - see below.
 *
 * Keeping the list in one place matters because the pages disagreed about it. The
 * project tasks page gated milestone editing on task.manage, while the project
 * milestones page and both dependency surfaces gated it on `isSuperAdmin ||
 * director`. A project manager therefore got a working Edit button on the tasks tab
 * and no edit control at all on the milestones tab - for the same action, against
 * the same endpoint, that the API already accepted for them. A department head was
 * excluded the same way despite holding milestone.manage.
 *
 * task.edit is present in the server's policy and deliberately omitted here. The
 * seeded TeamMember role holds TASK_EDIT, so matching the policy literally would put
 * milestone and dependency delete buttons in front of individual contributors. The
 * server would permit those calls, so this is a usability choice rather than a
 * security boundary - but offering "delete milestone" to a team member is not a
 * reasonable reading of the feature. The server policy is the thing to revisit if
 * that behaviour is actually wrong.
 *
 * When the API policy changes, change the list here too. The failure mode is
 * silent: a too-strict list hides controls that work, a too-loose list shows
 * controls that 403.
 */
const MILESTONE_MANAGER_PERMISSIONS: readonly string[] = [
  PERMISSION_GROUPS.project.manage,
  PERMISSION_GROUPS.project.primaryDepartmentManage,
  PERMISSION_GROUPS.project.create,
  PERMISSION_GROUPS.project.edit,
  PERMISSION_GROUPS.task.manage,
  PERMISSION_GROUPS.task.create,
  PERMISSION_GROUPS.milestone.manage,
  PERMISSION_GROUPS.subtask.manage,
];

/**
 * True when the user can manage milestones.
 *
 * SystemAdmin is not in the list above because the API's policy lists it as an
 * alternative rather than implying it, and because `perm.has` already treats
 * SYSTEM_ADMIN as granting everything - see the server-side HasAnyPermissionAsync,
 * which short-circuits on it. Including it here as well would be harmless but
 * misleading, implying the list is exhaustive when it is not.
 */
export function canManageMilestones(perm: UsePermissionResult): boolean {
  return perm.hasAny(...MILESTONE_MANAGER_PERMISSIONS);
}

/**
 * True when the user can manage milestone dependencies.
 *
 * Separate from {@link canManageMilestones} even though the API applies the same
 * policy, so that a future divergence in the server's authorization is a one-line
 * change here rather than a search across every call site.
 */
export function canManageMilestoneDependencies(perm: UsePermissionResult): boolean {
  return canManageMilestones(perm);
}

/** The permission codes behind {@link canManageMilestones}, for tooltips and tests. */
export const MILESTONE_MANAGER_PERMISSION_CODES = MILESTONE_MANAGER_PERMISSIONS;
