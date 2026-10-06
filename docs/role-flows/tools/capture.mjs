/**
 * Captures per-role screenshots of the live PMWDS deployment.
 *
 *   node capture.mjs [role ...]
 *
 * Screenshots land in ../shots/<role>/NN-slug.png at a fixed 16:9 viewport so
 * they drop straight onto a slide without cropping.
 */
import { chromium } from "playwright";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { wanted } from "./selection.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.resolve(HERE, "..", "shots");

const BASE = process.env.PMWDS_URL ?? "http://localhost:5173";
const PASSWORD = process.env.PMWDS_PASSWORD ?? "Pmwds@123";

const VIEWPORT = { width: 1600, height: 900 };
const PROJECT_ID = process.env.PMWDS_PROJECT_ID ?? "26c71ade-a0d6-4ab2-b72d-66b7062c6828";

// Display labels come from ROLE_DISPLAY_NAMES; the backend role keys are still
// superadmin / director / project-manager / department-head / team-member.
// SuperAdmin and Viewer are deliberately excluded from the deck.
const ROLES = {
  admin: { email: "admin@org1.com", label: "Admin", roleKey: "director" },
  manager: { email: "manager@org1.com", label: "Manager", roleKey: "project-manager" },
  head: { email: "head.eng@org1.com", label: "DepartmentHead", roleKey: "department-head" },
  member: { email: "member@org1.com", label: "TeamMember", roleKey: "team-member" },
};

/** Routes are captured in deck order. Skills is hidden behind SHOW_SKILLS_PAGE. */
const ROUTES = [
  { slug: "dashboard", path: "/" },
  { slug: "projects", path: "/projects" },
  { slug: "project-overview", path: `/projects/${PROJECT_ID}` },
  { slug: "project-milestones", path: `/projects/${PROJECT_ID}/milestones` },
  { slug: "project-tasks", path: `/projects/${PROJECT_ID}/tasks` },
  { slug: "project-documents", path: `/projects/${PROJECT_ID}/documents` },
  { slug: "project-dependencies", path: `/projects/${PROJECT_ID}/dependencies` },
  { slug: "users", path: "/users" },
  { slug: "departments", path: "/departmentsPage" },
  { slug: "organization-structure", path: "/organizationStructure" },
  { slug: "profiles", path: "/profiles" },
  { slug: "roles-permissions", path: "/roles" },
  { slug: "activity-logs", path: "/activity-logs" },
  { slug: "reports", path: "/reports" },
  { slug: "ai-insights", path: "/ai" },
  { slug: "notifications", path: "/notificationsPage" },
  { slug: "settings", path: "/settings" },
];

const roleArgsFromCli = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const ALL = process.argv.includes("--all");
const RETRY_BLOCKED = process.argv.includes("--retry-blocked");

// Previous run's access decisions, so restricted pages are not re-probed.
const manifest = JSON.parse(
  await readFile(path.resolve(HERE, "..", "manifest.json"), "utf8").catch(() => "{}"),
);
const roleArgs = roleArgsFromCli.filter((a) => ROLES[a]);
const roles = roleArgs.length ? roleArgs : Object.keys(ROLES);

const results = [];

async function settle(page) {
  // Let route guards resolve, charts paint, and skeletons swap for real data.
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page
    .waitForFunction(
      () => !document.body.innerText.match(/loading|skeleton/i) || document.body.innerText.length > 400,
      { timeout: 15_000 },
    )
    .catch(() => {});
  // Freeze looping animations so shots are byte-stable.
  await page.addStyleTag({
    content: `*,*::before,*::after{animation-play-state:paused!important;transition:none!important;caret-color:transparent!important}`,
  });
  await page.waitForTimeout(1200);
}

/** The guard renders NoAccessPage ("Page not found") instead of the real page. */
async function accessState(page) {
  return page.evaluate(() => {
    const t = document.body.innerText;
    return /you do not have access to it|Page not found/i.test(t) ? "blocked" : "allowed";
  });
}

/** The sidebar is the clearest per-role capability signal, so record it once. */
async function sidebarItems(page) {
  return page.evaluate(() => {
    const nav = document.querySelector("nav, aside");
    if (!nav) return [];
    return [...nav.querySelectorAll("a[href]")]
      .map((a) => a.getAttribute("href"))
      .filter(Boolean);
  });
}

/** Primary actions exposed on a page - the "what can this role actually do" evidence. */
async function actions(page) {
  return page.evaluate(() => {
    const skip = /^(cancel|close|save|submit|search|filter|reset|×|x)$/i;
    return [...document.querySelectorAll("button, a[role='button']")]
      .map((b) => b.innerText.trim().split("\n")[0])
      .filter((t) => t && t.length < 40 && !skip.test(t));
  });
}

async function captureRole(browser, key) {
  const role = ROLES[key];
  if (!role) throw new Error(`Unknown role: ${key}`);

  const dir = path.join(SHOTS, key);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await context.newPage();

  // --- login -------------------------------------------------------------
  // One login shot for the deck only; every role signs in the same way.
  const shootLogin = ALL ? roleArgsFromCli.length > 1 || !roleArgs.length : key === "admin";
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await settle(page);
  if (shootLogin) {
    await page.screenshot({ path: path.join(dir, "00-login.png") });
  } else {
    await rm(path.join(dir, "00-login.png"), { force: true });
  }

  await page.fill('input[type="email"]', role.email);
  await page.fill('input[type="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes("login"), { timeout: 45_000 }),
    page.click('#login-form button[type="submit"]'),
  ]);
  await settle(page);

  const nav = await sidebarItems(page);
  results.push({ role: key, slug: "__nav__", file: null, access: "allowed", nav });
  console.log(`\n[${key}] logged in as ${role.email}`);
  console.log(`       nav: ${nav.join(" ") || "(none detected)"}`);

  // --- routes ------------------------------------------------------------
  // Only open pages the deck will use, unless --all. Routes this role was
  // already refused on a previous run are skipped too - the guard does not
  // change without a permission change, and re-proving it costs a page load.
  const knownBlocked = new Set(
    (manifest.results ?? [])
      .filter((r) => r.role === key && (r.access === "blocked" || r.file === null))
      .map((r) => r.slug)
      .filter((slug) => slug && slug !== "__nav__"),
  );
  let routes = ALL ? ROUTES : ROUTES.filter((r) => wanted(key, "top", r.slug));
  if (!RETRY_BLOCKED) routes = routes.filter((r) => !knownBlocked.has(r.slug));

  const skipped = ROUTES.length - routes.length;
  if (skipped) console.log(`       skipping ${skipped} route(s) for this role`);
  if (knownBlocked.size) console.log(`       known restricted: ${[...knownBlocked].join(", ")}`);

  for (const route of routes) {
    // Number from the full route list, not the filtered one, so a page keeps the
    // same filename whether or not selection filtering is on.
    const file = `${String(ROUTES.indexOf(route) + 1).padStart(2, "0")}-${route.slug}.png`;
    try {
      await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await settle(page);
      const access = await accessState(page);
      if (access === "blocked") {
        // A "Page not found" guard is evidence, not a screenshot we want to keep
        // in the deck - drop the file so it never reaches build_deck.py.
        await rm(path.join(dir, file), { force: true });
        results.push({ role: key, slug: route.slug, file: null, access: "blocked" });
        console.log(`  x ${route.path.padEnd(42)} blocked - shot discarded`);
      } else {
        await page.screenshot({ path: path.join(dir, file) });
        results.push({ role: key, slug: route.slug, file, access, actions: await actions(page) });
        console.log(`  + ${route.path.padEnd(42)} ${file}`);
      }
    } catch (err) {
      console.log(`  ! ${route.path.padEnd(42)} FAILED: ${err.message.split("\n")[0]}`);
      results.push({ role: key, slug: route.slug, file: null, access: "error" });
    }
  }

  await context.close();
}

const browser = await chromium.launch();
try {
  for (const key of roles) await captureRole(browser, key);
} finally {
  await browser.close();
}

console.log(`\nCaptured ${results.filter((r) => r.file).length} screenshots into ${SHOTS}`);

// Merge rather than replace: a single-role run must not erase the access
// decisions already recorded for the roles it did not visit.
const manifestPath = path.resolve(HERE, "..", "manifest.json");
const merged = new Map();
for (const r of manifest.results ?? []) {
  if (r.slug && r.role) merged.set(`${r.role}|${r.slug}`, r);
}
for (const r of results) {
  if (r.slug) merged.set(`${r.role}|${r.slug}`, r);
}
await writeFile(
  manifestPath,
  JSON.stringify(
    { ...manifest, base: BASE, capturedAt: new Date().toISOString(), results: [...merged.values()] },
    null,
    2,
  ),
);
console.log(`Manifest -> ${manifestPath}`);