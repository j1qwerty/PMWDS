/**
 * Captures per-role screenshots of the live PMWDS deployment.
 *
 *   node capture.mjs [role ...]
 *
 * Screenshots land in ../shots/<role>/NN-slug.png at a fixed 16:9 viewport so
 * they drop straight onto a slide without cropping.
 */
import { chromium } from "playwright";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.resolve(HERE, "..", "shots");

const BASE = process.env.PMWDS_URL ?? "https://pmwds.dharmaatribe.app";
const PASSWORD = process.env.PMWDS_PASSWORD ?? "Pmwds@123";

const VIEWPORT = { width: 1600, height: 900 };
const PROJECT_ID = process.env.PMWDS_PROJECT_ID ?? "b280c120-7d20-47c9-866a-8a99dd1c545f";

const ROLES = {
  admin: { email: "admin@org1.com", label: "SuperAdmin" },
  director: { email: "director@org1.com", label: "Director" },
  head: { email: "head.eng@org1.com", label: "DepartmentHead" },
  member: { email: "member@org1.com", label: "TeamMember" },
};

/** Routes are captured in deck order. `guard` is only used for reporting. */
const ROUTES = [
  { slug: "dashboard", path: "/" },
  { slug: "projects", path: "/projectsK" },
  { slug: "project-overview", path: `/projects/${PROJECT_ID}/overview` },
  { slug: "project-tasks", path: `/projects/${PROJECT_ID}/tasks` },
  { slug: "project-milestones", path: `/projects/${PROJECT_ID}/milestones` },
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

const wanted = process.argv.slice(2);
const roles = wanted.length ? wanted : Object.keys(ROLES);

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
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await settle(page);
  await page.screenshot({ path: path.join(dir, "00-login.png") });

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
  let n = 1;
  for (const route of ROUTES) {
    const file = `${String(n).padStart(2, "0")}-${route.slug}.png`;
    try {
      await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await settle(page);
      const access = await accessState(page);
      await page.screenshot({ path: path.join(dir, file) });
      const acts = access === "allowed" ? await actions(page) : [];
      results.push({ role: key, slug: route.slug, file, access, actions: acts });
      console.log(`  ${access === "blocked" ? "x" : "+"} ${route.path.padEnd(42)} ${file}  [${access}]`);
    } catch (err) {
      console.log(`  ! ${route.path.padEnd(42)} FAILED: ${err.message.split("\n")[0]}`);
      results.push({ role: key, slug: route.slug, file: null, access: "error" });
    }
    n += 1;
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

// Dump the capability matrix alongside the shots so the deck is data-driven.
const manifest = path.resolve(HERE, "..", "manifest.json");
await writeFile(manifest, JSON.stringify({ base: BASE, capturedAt: new Date().toISOString(), results }, null, 2));
console.log(`Manifest -> ${manifest}`);