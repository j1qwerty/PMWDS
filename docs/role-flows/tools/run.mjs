/**
 * Parent runner for the PMWDS role-flow deck.
 *
 *   node run.mjs                 full pipeline
 *   node run.mjs --yes           accept the default for every prompt
 *   node run.mjs --skip-capture  rebuild the deck from existing shots
 *   node run.mjs --yes --skip-capture
 *
 * Stages
 *   1. preflight    client + api + every role login + project id
 *   2. housekeeping decide whether to overwrite the existing shots or reuse them
 *   3. capture      page screenshots, drilled-in sections, project wizard
 *   4. review       regenerate review.html for manual selection
 *   5. build        selection.txt -> PMWDS-Role-Flows.pptx
 *
 * It never starts a server. If preflight fails it stops and tells you what to run.
 * Nothing is moved or renamed - shots are replaced in place.
 */
import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SHOTS = path.join(ROOT, "shots");
const DECK = path.join(ROOT, "PMWDS-Role-Flows.pptx");

const argv = process.argv.slice(2);
const ASSUME_YES = argv.includes("--yes");
const SKIP_CAPTURE = argv.includes("--skip-capture");
const ONLY = (argv.find((a) => a.startsWith("--only=")) ?? "").replace("--only=", "");
void ONLY; // reserved: no filtering implemented yet

const rolesArg = (() => {
  const i = argv.indexOf("--roles");
  return i >= 0 && argv[i + 1] ? argv[i + 1].split(",") : null;
})();

// ------------------------------------------------------------------- utils --
const rl = createInterface({ input: process.stdin, output: process.stdout });

async function ask(question, defaultAnswer) {
  if (ASSUME_YES) {
    console.log(`   ${question} -> ${defaultAnswer} (--yes)`);
    return defaultAnswer;
  }
  const a = await rl.question(`${question} [${defaultAnswer}] `);
  const v = a.trim().toLowerCase();
  if (!v) return defaultAnswer;
  if (["y", "yes"].includes(v)) return true;
  if (["n", "no"].includes(v)) return false;
  return v;
}

function run(cmd, args, env = {}) {
  return new Promise((resolve) => {
    console.log(`\n$ ${cmd} ${args.join(" ")}\n`);
    const p = spawn(cmd, args, { cwd: HERE, stdio: "inherit", shell: cmd.endsWith(".py"), env: { ...process.env, ...env } });
    p.on("close", (code) => resolve(code ?? 1));
    p.on("error", () => resolve(1));
  });
}

async function dirStats(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    let files = 0;
    let bytes = 0;
    const walk = async (d) => {
      for (const e of await readdir(d, { withFileTypes: true })) {
        if (e.isDirectory()) await walk(path.join(d, e.name));
        else {
          files += 1;
          bytes += (await stat(path.join(d, e.name))).size;
        }
      }
    };
    for (const e of entries) {
      if (e.isDirectory()) await walk(path.join(dir, e.name));
      else {
        files += 1;
        bytes += (await stat(path.join(dir, e.name))).size;
      }
    }
    return { files, bytes };
  } catch {
    return null;
  }
}

async function fileSize(f) {
  try {
    return (await stat(f)).size;
  } catch {
    return null;
  }
}

// -------------------------------------------------------------- 1. preflight --
console.log("=" .repeat(70));
console.log(" PMWDS role-flow deck pipeline");
console.log("=".repeat(70));

const { runPreflight, ROLES } = await import("./preflight.mjs");
const pre = await runPreflight();
if (!pre.ok) {
  console.log("Stopping: fix the servers above and re-run `node run.mjs`.\n");
  rl.close();
  process.exit(1);
}
const env = { PMWDS_PROJECT_ID: pre.projectId ?? "" };

// --------------------------------------------------------- 2. housekeeping --
console.log("\n=== existing files ===\n");
const shotStats = await dirStats(SHOTS);
const deckSize = await fileSize(DECK);
let choice = null;

if (!shotStats && !deckSize) {
  console.log("  nothing on disk yet - clean run.\n");
} else {
  if (shotStats) {
    console.log(`  shots/       ${shotStats.files} files, ${(shotStats.bytes / 1048576).toFixed(1)} MB`);
  }
  if (deckSize) {
    console.log(`  deck         ${(deckSize / 1048576).toFixed(1)} MB`);
  }
  choice = await ask("  overwrite the existing shots, or reuse them? (overwrite/skip)", "overwrite");

  if (choice === "skip") {
    console.log("  reusing the shots already on disk.\n");
  } else if (choice === "overwrite" || choice === true) {
    console.log("  shots will be replaced in place (each role folder is cleared first).\n");
  } else {
    console.log("  unrecognised choice - stopping so nothing is lost.\n");
    rl.close();
    process.exit(1);
  }
}

const doCapture = !SKIP_CAPTURE && !(choice === "skip" && shotStats);

// ------------------------------------------------------------- 3. capture --
if (doCapture) {
  const roles = rolesArg ?? Object.keys(ROLES);
  let code = await run("node", ["capture.mjs", ...roles], env);
  if (code !== 0) {
    console.log("\n! page capture failed - stopping before the wizard stage.\n");
    rl.close();
    process.exit(code);
  }

  code = await run("node", ["deep-capture.mjs", ...roles], env);
  if (code !== 0) {
    console.log("\n! drilled-in capture failed - continuing, wizard next.\n");
  }

  // The wizard only exists for roles with a New Project action.
  const wizardRoles = roles.filter((r) => r === "admin" || r === "head");
  if (wizardRoles.length) {
    code = await run("node", ["wizard-capture.mjs", ...wizardRoles], env);
    if (code !== 0) console.log("\n! wizard capture failed - continuing.\n");
  }
} else {
  console.log("\n=== capture skipped ===\n");
}

// -------------------------------------------------------------- 4. review --
await run("node", ["review.mjs"]);

// --------------------------------------------------------------- 5. build --
let code = await run("python", ["build_deck.py"], env);
if (code !== 0) {
  console.log("\n! deck build failed.\n");
  rl.close();
  process.exit(code);
}

const finalSize = await fileSize(DECK);
console.log("\n" + "=".repeat(70));
console.log(` done: ${DECK}  (${((finalSize ?? 0) / 1048576).toFixed(1)} MB)`);
console.log("=".repeat(70) + "\n");

rl.close();