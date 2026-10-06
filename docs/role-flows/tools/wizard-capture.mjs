/**
 * Walks the 4-step New Project wizard and screenshots each step.
 *
 *   node wizard-capture.mjs [role ...]
 *
 * Values come from the seeder (ProjectsSeeder / MilestonesSeeder) so the shots
 * show the same programme the rest of the deck screenshots. The wizard is driven
 * to the final Dependencies step and filled in there too, but Finish is
 * deliberately NOT clicked - no project is ever created.
 *
 * Executive roles (Admin, DepartmentHead) get the 4-step flow:
 *   Project Details -> Milestones -> Assign Departments -> Dependencies
 */
import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SHOTS = path.join(ROOT, "shots");

const BASE = process.env.PMWDS_URL ?? "http://localhost:5173";
const PASSWORD = process.env.PMWDS_PASSWORD ?? "Pmwds@123";

const ROLES = {
  admin: { email: "admin@org1.com", label: "Admin" },
  head: { email: "head.eng@org1.com", label: "DepartmentHead" },
  manager: { email: "manager@org1.com", label: "Manager" },
};

// --- seeder values -----------------------------------------------------------
// ProjectsSeeder.BuildProjectSpec
const PROJECT = {
  name: "Construction of Government Residential Colony",
  description:
    "Development of a government residential colony in Lucknow including land acquisition, " +
    "planning, construction of residential units, utilities, roads, landscaping, and quality handover.",
  department: "Public Works Department",
  priority: "Critical",
  budgetLakhs: "18500", // seeded as 1,850,000,000; the UI field is in lakhs
  start: "2026-07-01",
  end: "2027-12-31",
};

// MilestonesSeeder: name, description, due date, owning department
const MILESTONES = [
  ["Land Acquisition & Site Readiness",
    "Land ownership verification, physical survey, and handover to PWD", "2026-07-31", "Revenue Department"],
  ["Master Planning & Design",
    "Master layout preparation, building design and drawing approval", "2026-08-31", "Architecture & Planning Cell"],
  ["Statutory Approvals",
    "Building plan approval, development permission and documentation", "2026-09-30", "Town & Country Planning"],
  ["Site Preparation",
    "Temporary site office, site clearance and construction mobilization", "2026-11-20", "PWD Civil Division"],
];

// Site Preparation cannot start until Statutory Approvals closes.
const DEPENDENCY = { from: "Statutory Approvals", to: "Site Preparation" };

const results = [];

/**
 * Overlays animate in from opacity 0. Freezing animations (as the page capture
 * scripts do) would hold the modal at opacity 0, so it screenshots as an empty
 * page while still being interactable. Let entrance animations finish instead.
 */
async function settle(page, ms = 1400, freeze = false) {
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(ms);
  if (freeze) {
    await page.addStyleTag({
      content: `*,*::before,*::after{animation-play-state:paused!important;transition:none!important;caret-color:transparent!important}`,
    });
  } else {
    await page.addStyleTag({
      content: `*,*::before,*::after{transition:none!important;caret-color:transparent!important}`,
    });
  }
  await page.waitForTimeout(600);
}

/** Fail loudly instead of silently shooting an invisible modal. */
async function assertVisible(page, what) {
  const ok = await page.evaluate(() => {
    const nameInput = document.querySelector('input[placeholder="Milestone name"]');
    const anyModal = document.querySelector('[role="dialog"], .fixed.inset-0');
    const el = nameInput ? anyModal : anyModal;
    if (!el) return { ok: false, why: "no modal in DOM" };
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      ok: cs.display !== "none" && cs.visibility !== "hidden" && parseFloat(cs.opacity) > 0.1 && r.height > 100,
      why: `display=${cs.display} opacity=${cs.opacity} h=${Math.round(r.height)}`,
    };
  });
  if (!ok.ok) throw new Error(`${what} not visibly rendered (${ok.why})`);
}

async function shoot(page, dir, slug, n) {
  await assertVisible(page, slug);
  const file = `${String(n).padStart(2, "0")}-${slug}.png`;
  await page.screenshot({ path: path.join(dir, file) });
  results.push({ slug, file });
  console.log(`  + ${slug.padEnd(32)} ${file}`);
}

/** Select an option whose visible text contains `needle` (labels are
 *  rendered as "Name (CODE - Org)", so exact-label matching fails). */
async function selectContaining(page, selectLocator, needle) {
  const value = await selectLocator.evaluate(
    (el, n) => {
      const opt = [...el.options].find((o) => (o.text || "").toLowerCase().includes(n.toLowerCase()));
      return opt ? opt.value : null;
    },
    needle,
  );
  if (value === null) return false;
  await selectLocator.selectOption(value).catch(() => {});
  return true;
}

async function runRole(browser, key) {
  const role = ROLES[key];
  const dir = path.join(SHOTS, key, "wizard");
  await mkdir(dir, { recursive: true });

  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', role.email);
  await page.fill('input[type="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes("login"), { timeout: 45_000 }),
    page.click('#login-form button[type="submit"]'),
  ]);

  await page.goto(`${BASE}/projects`, { waitUntil: "domcontentloaded" });
  await settle(page, 3000);

  const trigger = page.getByText("New Project", { exact: false }).first();
  if ((await trigger.count()) === 0) {
    console.log(`  x no New Project action for ${key}`);
    results.push({ slug: "wizard-unavailable", file: null });
    await ctx.close();
    return;
  }
  await trigger.click();
  await settle(page, 1800);

  // -------------------------------------------- step 1: Project Details
  await page.fill('input[placeholder="Enter project name"]', PROJECT.name);
  const detailSelects = page.locator("select");
  await selectContaining(page, detailSelects.nth(0), PROJECT.department);
  await page.fill("textarea", PROJECT.description);
  await selectContaining(page, detailSelects.nth(1), PROJECT.priority);
  await page.fill('input[type="number"]', PROJECT.budgetLakhs);
  const startEnd = page.locator('input[type="date"]');
  await startEnd.nth(0).fill(PROJECT.start);
  await startEnd.nth(1).fill(PROJECT.end);
  await settle(page, 900);
  await shoot(page, dir, "wizard-1-project-details", 1);

  // -------------------------------------------------- step 2: Milestones
  await page.getByText("Next", { exact: true }).first().click();
  await settle(page, 1600);

  for (const [name, desc, due] of MILESTONES) {
    // The dashed "Add Milestone" button and the in-form save button share a
    // label; opening the form is only needed while the inputs are absent.
    if ((await page.locator('input[placeholder="Milestone name"]').count()) === 0) {
      await page.getByText("Add Milestone", { exact: false }).first().click();
      await page.waitForTimeout(700);
    }
    await page.fill('input[placeholder="Milestone name"]', name);
    await page.fill('textarea[placeholder="What marks this milestone?"]', desc);
    await page.locator('input[type="date"]').first().fill(due);
    await page.waitForTimeout(400);
    await page.getByText("Add Milestone", { exact: false }).first().click();
    await page.waitForTimeout(800);
  }
  await settle(page, 1200);
  await shoot(page, dir, "wizard-2-milestones", 2);

  // -------------------------------------------- step 3: Assign Departments
  await page.getByText("Next", { exact: true }).first().click();
  await settle(page, 1600);

  const deptSelects = page.locator("select");
  const n = await deptSelects.count();
  let assigned = 0;
  for (let i = 0; i < n; i++) {
    const dept = MILESTONES[i]?.[3];
    if (!dept) continue;
    if (await selectContaining(page, deptSelects.nth(i), dept)) assigned += 1;
    await page.waitForTimeout(350);
  }
  console.log(`  · assigned ${assigned}/${n} milestone departments`);
  await settle(page, 1200);
  await shoot(page, dir, "wizard-3-assign-departments", 3);

  // ---------------------------------------------- step 4: Dependencies (last)
  await page.getByText("Next", { exact: true }).first().click();
  await settle(page, 1600);

  // Opener and save share the "Add Dependency" label; when the form is open
  // only the save button carries it, so a single click target works for both.
  const depSelects = page.locator("select");
  if ((await depSelects.count()) === 0) {
    await page.getByText("Add Dependency", { exact: false }).first().click();
    await page.waitForTimeout(800);
  }
  const form = page.locator("select");
  if ((await form.count()) >= 2) {
    await selectContaining(page, form.nth(0), DEPENDENCY.from);
    await page.waitForTimeout(400);
    await selectContaining(page, form.nth(1), DEPENDENCY.to);
    await page.waitForTimeout(500);
    await page.getByText("Add Dependency", { exact: false }).first().click();
    await page.waitForTimeout(1000);
  }
  await settle(page, 1200);
  await shoot(page, dir, "wizard-4-dependencies", 4);

  // Stop here on purpose: Finish is never clicked, so no project is created.
  const finish = await page.getByText("Finish", { exact: true }).count();
  console.log(`  · stopped on final step (Finish present: ${finish > 0}, not clicked)`);

  await ctx.close();
}

const wanted = process.argv.slice(2);
const roles = wanted.length ? wanted : ["admin"];

const browser = await chromium.launch();
try {
  for (const k of roles) {
    console.log(`\n[${k}] ${ROLES[k].email}`);
    await runRole(browser, k);
  }
} finally {
  await browser.close();
}
console.log(`\n${results.filter((r) => r.file).length} wizard screenshots captured`);

// Record under manifest.wizard so review.mjs and build_deck.py can find these.
const manifestPath = path.join(ROOT, "manifest.json");
const existing = JSON.parse(await readFile(manifestPath, "utf8").catch(() => "{}"));
existing.wizard = (existing.wizard ?? []).concat(results);
await writeFile(manifestPath, JSON.stringify(existing, null, 2));
console.log(`manifest.wizard updated`);