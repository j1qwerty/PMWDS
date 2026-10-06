/**
 * Deletes any screenshot that selection.txt does not reference.
 *
 *   node prune.mjs            remove unselected shots
 *   node prune.mjs --dry      list what would go, delete nothing
 *
 * Useful after editing selection.txt: the deck only ever uses selected shots,
 * so anything else is dead weight (and confusing when picking files by hand).
 */
import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSelection } from "./selection.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.resolve(HERE, "..", "shots");
const DRY = process.argv.includes("--dry");

const sel = loadSelection();

/** The only extra file worth keeping: the single Admin login shot. */
const EXTRA = new Set(["admin|top|__login"]);

const keepers = new Set(sel.keys);
// The single Admin login shot is not a deck page, but it is the one login image
// worth keeping, so it is always spared regardless of the selection.
keepers.add("admin|top|login");

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else out.push(p);
  }
  return out;
}

// admin is already in sel.roles; Set keeps it from being walked twice.
const roles = new Set(sel.roles);
const doomed = [];

for (const role of roles) {
  const roleDir = path.join(SHOTS, role);
  if (!(await stat(roleDir).catch(() => null))) continue;

  for (const group of ["top", "deep", "wizard"]) {
    const dir = group === "top" ? roleDir : path.join(roleDir, group);
    if (!(await stat(dir).catch(() => null))) continue;

    for (const f of await readdir(dir)) {
      if (!f.toLowerCase().endsWith(".png")) continue;

      // "05-tasks-add-modal.png" -> slug "tasks-add-modal"
      const m = f.match(/^\d+-(.+)\.png$/);
      const slug = m ? m[1] : f.replace(/\.png$/i, "");
      if (keepers.has(`${role}|${group}|${slug}`)) continue;
      doomed.push(path.join(dir, f));
    }
  }
}

if (doomed.length === 0) {
  console.log("nothing to prune - every shot is referenced by selection.txt");
} else {
  console.log(`${DRY ? "[dry] would delete" : "deleting"} ${doomed.length} shot(s):\n`);
  for (const p of doomed) console.log(`  ${path.relative(SHOTS, p)}`);
  if (!DRY) {
    for (const p of doomed) await rm(p, { force: true });
    console.log(`\ndone. ${doomed.length} removed.`);
  }
}