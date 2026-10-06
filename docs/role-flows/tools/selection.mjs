/**
 * Single source of truth for what goes in the deck: selection.txt.
 *
 *   <role>|<group>|<slug>      group = top | deep | wizard
 *   # comments and blank lines ignored
 *
 * Every capture script imports this and skips opening any page that is not
 * listed, so a selection run never touches a route that will not be used.
 * Build the deck from the same file, so shot and slide stay in step.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SELECTION_FILE = path.resolve(HERE, "..", "selection.txt");

/** @returns {{roles: string[], keys: Set<string>, byRole: Map<string, {group:string,slug:string}[]>}} */
export function loadSelection(file = SELECTION_FILE) {
  const rows = [];
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [role, group, slug] = line.split("|");
    if (!role || !group || !slug) continue;
    rows.push({ role, group, slug });
  }
  return {
    rows,
    roles: [...new Set(rows.map((r) => r.role))],
    keys: new Set(rows.map((r) => `${r.role}|${r.group}|${r.slug}`)),
    byRole: new Map(
      [...new Set(rows.map((r) => r.role))].map((role) => [
        role,
        rows.filter((r) => r.role === role),
      ]),
    ),
  };
}

const sel = loadSelection();

/** True when `role|group|slug` is in the selection. */
export const wanted = (role, group, slug) => sel.keys.has(`${role}|${group}|${slug}`);

/**
 * Filters a role's route/step list down to the selection, preserving the
 * caller's declared order so files stay numbered the same way every run.
 *
 * @param items  objects carrying {slug} plus a roles/role field
 * @param role   the role being captured
 * @param group  "top" | "deep" | "wizard"
 */
export function filterFor(items, role, group) {
  return items.filter((it) => wanted(role, group, it.slug));
}

export default sel;