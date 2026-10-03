/**
 * Preflight gate. Verifies the client, the API, every role login and the
 * project id before any screenshot work starts, so a capture run never dies
 * halfway through because something was not running.
 *
 *   node preflight.mjs        -> exits 1 with instructions if anything is down
 *
 * Never starts a server. If something is not up, it prints the command to run.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

const CLIENT = process.env.PMWDS_URL ?? "http://localhost:5173";
const API = (process.env.PMWDS_API_URL ?? "http://localhost:5177") + "/api/v1";
const PASSWORD = process.env.PMWDS_PASSWORD ?? "Pmwds@123";

export const ROLES = {
  admin: { email: "admin@org1.com", label: "Admin", expect: "director" },
  manager: { email: "manager@org1.com", label: "Manager", expect: "project-manager" },
  head: { email: "head.eng@org1.com", label: "DepartmentHead", expect: "department-head" },
  member: { email: "member@org1.com", label: "TeamMember", expect: "team-member" },
};

const problems = [];
const warns = [];

function ok(label, detail = "") {
  console.log(`  [ok]   ${label.padEnd(26)} ${detail}`);
}
function bad(label, detail) {
  console.log(`  [FAIL] ${label.padEnd(26)} ${detail}`);
  problems.push(`${label}: ${detail}`);
}
function warn(label, detail) {
  console.log(`  [warn] ${label.padEnd(26)} ${detail}`);
  warns.push(`${label}: ${detail}`);
}

async function reachable(url, ms = 8000) {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    const res = await fetch(url, { signal: ctl.signal });
    clearTimeout(t);
    return { up: res.status < 500, status: res.status };
  } catch (err) {
    return { up: false, error: err.name === "AbortError" ? "timed out" : err.message };
  }
}

function decodeRole(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return payload.role ?? payload.roles ?? payload[
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
    ];
  } catch {
    return null;
  }
}

async function main() {
  console.log("\n=== preflight ===\n");

  // ---------------------------------------------------------------- servers --
  console.log("servers");
  const client = await reachable(CLIENT);
  client.up
    ? ok("client", `${CLIENT} (HTTP ${client.status})`)
    : bad("client", `${CLIENT} unreachable (${client.error ?? client.status})`);
  if (!client.up) {
    console.log("\n         start it with:  cd Client && npm run dev -- --host 127.0.0.1 --port 5173");
  }

  const apiRoot = await reachable(API.replace(/\/api\/v1$/, ""));
  apiRoot.up
    ? ok("api", `${API} (HTTP ${apiRoot.status})`)
    : bad("api", `${API} unreachable (${apiRoot.error ?? apiRoot.status})`);
  if (!apiRoot.up) {
    console.log("\n         start it with:  dotnet run --project PMWDS.API --urls http://localhost:5177");
  }

  // ---------------------------------------------------------------- logins --
  console.log("\nlogins");
  const tokenFor = {};
  for (const [key, r] of Object.entries(ROLES)) {
    if (!apiRoot.up) {
      bad(r.label, "skipped - api unreachable");
      continue;
    }
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: r.email, password: PASSWORD }),
      });
      const json = await res.json().catch(() => null);
      if (!json?.success || !json?.data?.token) {
        bad(r.label, `${r.email} -> ${json?.error?.message ?? res.status}`);
        continue;
      }
      const role = decodeRole(json.data.token);
      tokenFor[key] = json.data.token;
      if (role && r.expect && role !== r.expect) {
        warn(r.label, `${r.email} role="${role}" (expected "${r.expect}")`);
      } else {
        ok(r.label, `${r.email}  role=${role}`);
      }
    } catch (err) {
      bad(r.label, `${r.email} -> ${err.message}`);
    }
  }

  // ---------------------------------------------------------------- project --
  console.log("\nproject under test");
  let projectId = process.env.PMWDS_PROJECT_ID;
  try {
    const res = await fetch(`${API}/projects?pageSize=5`, {
      headers: { Authorization: `Bearer ${tokenFor.admin}` },
    });
    const json = await res.json().catch(() => null);
    const items = json?.data?.items ?? json?.data ?? [];
    if (!items.length) {
      bad("project list", "no projects returned");
    } else {
      projectId = projectId ?? items[0].id;
      const match = items.find((p) => p.id === projectId) ?? items[0];
      ok("project", `${match.id}  "${match.name.trim()}"`);
      if (match.id !== projectId) {
        projectId = match.id;
        warn("PMWDS_PROJECT_ID", `reset to ${projectId} (configured id not found)`);
      }
    }
  } catch (err) {
    bad("project list", err.message);
  }

  // --------------------------------------------------------------- verdict --
  console.log("");
  if (problems.length === 0) {
    console.log(`preflight passed (${warns.length} warning(s))\n`);
    return { ok: true, projectId };
  }
  console.log(`preflight FAILED - ${problems.length} problem(s):`);
  for (const p of problems) console.log(`  - ${p}`);
  console.log("\nStart the missing servers above, then re-run. No screenshots were taken.\n");
  return { ok: false, projectId };
}

// Allow both `node preflight.mjs` and programmatic import from run.mjs.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const res = await main();
  process.exit(res.ok ? 0 : 1);
}

export { main as runPreflight };
export { ROOT };