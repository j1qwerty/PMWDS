import type { Milestone, MilestoneDependency } from "../../types";

/**
 * Display name for one side of a milestone dependency.
 *
 * The server sends both names on every dependency it returns - see
 * MilestoneDependencyDto, which reads them off the included
 * PrerequisiteMilestone and DependentMilestone navigations. The names are on the
 * wire for every dependency the caller is allowed to see, whether or not the caller
 * can open the milestone itself.
 *
 * The panels were ignoring that and looking the name up in the caller's own
 * `milestones` array, which is scope-filtered. A department head or team member who
 * can see a dependency touching their milestone but not the milestone on the other
 * side got "Unknown" rendered in place of a name the server had already sent.
 *
 * So the payload name is preferred, and the local list is only a fallback for data
 * that predates the field or arrives from somewhere that omits it.
 *
 * Deliberately name-only. This does not grant access to the other milestone: it is
 * not a link, and no detail, status or progress is exposed. A department head learns
 * that "Main site handover" blocks their milestone, which they need in order to
 * understand the block, and nothing more.
 */
export function dependencyMilestoneName(
  dep: MilestoneDependency,
  side: "prerequisite" | "dependent",
  visibleMilestones: readonly Milestone[],
): string {
  const fromPayload =
    side === "prerequisite" ? dep.prerequisiteMilestoneName : dep.dependentMilestoneName;

  if (fromPayload && fromPayload.trim().length > 0) {
    return fromPayload;
  }

  const id =
    side === "prerequisite" ? dep.prerequisiteMilestoneId : dep.dependentMilestoneId;

  return visibleMilestones.find((m) => m.id === id)?.name || "Unknown milestone";
}

/**
 * True when the milestone on this side is outside the caller's visible set.
 *
 * Used only to decide presentation - a muted name rather than the normal colour -
 * so a reader can tell "a milestone I cannot open" from "a milestone I can". Never
 * used to hide the name.
 */
export function isOutOfScopeMilestone(
  dep: MilestoneDependency,
  side: "prerequisite" | "dependent",
  visibleMilestones: readonly Milestone[],
): boolean {
  const id =
    side === "prerequisite" ? dep.prerequisiteMilestoneId : dep.dependentMilestoneId;
  return !visibleMilestones.some((m) => m.id === id);
}
