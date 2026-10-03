/**
 * Deep-interaction capture: clicks into nested sections of each screen
 * (Documents, milestone/subtask drill-downs, permission modals, report viewers,
 * detail panels) and screenshots the result.
 *
 *   node deep-capture.mjs [role ...]
 *
 * Writes ../shots/<role>/deep-NN-slug.png and merges findings into ../manifest.json
 */
import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { wanted } from "./selection.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SHOTS = path.join(ROOT, "shots");

const BASE = process.env.PMWDS_URL ?? "http://localhost:5173";
const PASSWORD = process.env.PMWDS_PASSWORD ?? "Pmwds@123";
const PROJECT_ID = process.env.PMWDS_PROJECT_ID ?? "26c71ade-a0d6-4ab2-b72d-66b7062c6828";

// Matches capture.mjs: Admin is the old Director role key, SuperAdmin excluded.
const ROLES = {
  admin: { email: "admin@org1.com", label: "Admin" },
  manager: { email: "manager@org1.com", label: "Manager" },
  head: { email: "head.eng@org1.com", label: "DepartmentHead" },
  member: { email: "member@org1.com", label: "TeamMember" },
};

const P = `/projects/${PROJECT_ID}`;

/**
 * Each step: navigate to `path`, run `do`, capture one screenshot.
 * `roles` omitted = all roles.
 */
const STEPS = [
  // -------------------------------------------------------- project tabs --
  {
    slug: "project-overview-documents-section",
    path: `${P}`,
    label: "Documents section",
    do: [{ k: "scroll", text: "Documents" }],
  },
  {
    slug: "project-overview-team",
    path: `${P}`,
    label: "Team Assignment",
    do: [{ k: "scroll", text: "Team Assignment" }],
  },
  {
    slug: "project-overview-ai",
    path: `${P}`,
    label: "AI Insights",
    do: [{ k: "scroll", text: "AI Insights" }],
  },
  {
    slug: "project-overview-budget",
    path: `${P}`,
    label: "Budget Overview",
    do: [{ k: "scroll", text: "Budget" }],
  },
  {
    slug: "project-edit-modal",
    path: `${P}`,
    roles: ["admin", "manager"],
    do: [{ k: "click", text: "Edit project" }],
  },

  // ------------------------------------------------- documents tab detail --
  {
    slug: "documents-register",
    path: `${P}/documents`,
    do: [{ k: "scroll", text: "DOCUMENT" }],
  },
  {
    slug: "documents-upload-modal",
    path: `${P}/documents`,
    roles: ["admin", "manager"],
    do: [{ k: "click", text: "Upload" }],
  },

  // ------------------------------------------------------- tasks drill-down --
  {
    slug: "tasks-milestone-expanded",
    path: `${P}/tasks`,
    do: [{ k: "click", text: "Land Acquisition & Site Readiness", byRole: { head: "Site Preparation", member: "Site Preparation" } }],
  },
  {
    slug: "tasks-subtask-detail",
    path: `${P}/tasks`,
    do: [
      { k: "click", text: "Land Acquisition & Site Readiness", byRole: { head: "Site Preparation", member: "Site Preparation" } },
      { k: "click", text: "Land Handover", byRole: { head: "Construction Mobilization", member: "Construction Mobilization" } },
    ],
  },
  {
    slug: "tasks-escalate-modal",
    path: `${P}/tasks`,
    roles: ["admin", "manager"],
    do: [
      { k: "click", text: "Land Acquisition & Site Readiness" },
      { k: "clickAny", text: "Escalate task" },
    ],
  },
  {
    slug: "tasks-add-modal",
    path: `${P}/tasks`,
    roles: ["admin", "manager", "head"],
    do: [{ k: "click", text: "add_task" }],
  },

  // ----------------------------------------------------------- milestones --
  {
    slug: "milestone-detail",
    path: `${P}/milestones`,
    do: [{ k: "click", text: "Land Acquisition & Site Readiness", byRole: { head: "Site Preparation", member: "Site Preparation" } }],
  },

  // ---------------------------------------------------------------- roles --
  {
    slug: "roles-table-detail",
    path: "/roles",
    roles: ["admin", "manager"],
    do: [{ k: "clickNth", text: "Edit", index: 0 }],
  },
  {
    slug: "roles-create-modal",
    path: "/roles",
    roles: ["admin", "manager"],
    do: [{ k: "click", text: "add", exact: true }],
  },

  // ---------------------------------------------------------------- users --
  // Manager can view the user list but the table exposes no add/edit actions,
  // so there is nothing to drill into for that role.
  {
    slug: "users-row-detail",
    path: "/users",
    roles: ["admin", "head"],
    do: [{ k: "click", text: "Edit user", index: 0 }],
  },
  {
    slug: "users-create-modal",
    path: "/users",
    roles: ["admin"],
    do: [{ k: "click", text: "add", exact: true }],
  },

  // ----------------------------------------------------------- departments --
  {
    slug: "departments-detail",
    path: "/departmentsPage",
    roles: ["admin", "manager", "head"],
    do: [{ k: "click", text: "PWD Civil Division" }],
  },
  {
    slug: "departments-create-modal",
    path: "/departmentsPage",
    roles: ["admin"],
    do: [{ k: "click", text: "add", exact: true }],
  },

  // --------------------------------------------------- organization detail --
  {
    slug: "org-structure-detail",
    path: "/organizationStructure",
    roles: ["admin"],
    do: [{ k: "click", text: "org1" }],
  },

  // --------------------------------------------------------------- reports --
  {
    slug: "report-department-workload",
    path: "/reports",
    roles: ["admin"],
    do: [{ k: "click", text: "Department Workload" }],
  },

  // ------------------------------------------------------------------- ai --
  {
    slug: "ai-risk-prediction",
    path: "/ai",
    roles: ["admin"],
    do: [{ k: "scroll", text: "Risk Prediction" }],
  },
  {
    slug: "ai-recommendations",
    path: "/ai",
    roles: ["admin"],
    do: [{ k: "scroll", text: "AI Recommendations" }],
  },

  // --------------------------------------------------------- profiles etc --
  {
    slug: "profiles-detail",
    path: "/profiles",
    roles: ["admin", "manager", "head"],
    do: [{ k: "click", text: "Profile", index: 0 }],
  },
  {
    slug: "activity-log-filters",
    path: "/activity-logs",
    roles: ["admin", "head"],
    do: [{ k: "scroll", text: "Activity" }],
  },
  {
    slug: "notification-templates",
    path: "/notificationsPage",
    roles: ["admin"],
    do: [{ k: "click", text: "Rule", exact: false }],
  },
];

// ----------------------------------------------------------------- engine ---
async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  // The task board renders ~250 controls asynchronously; clicking before it
  // settles produces intermittent "no element matching" failures.
  await page
    .waitForFunction(() => document.body.innerText.length > 600, { timeout: 20_000 })
    .catch(() => {});
  await page.waitForTimeout(2000);
  await page.addStyleTag({
    content: `*,*::before,*::after{animation-play-state:paused!important;transition:none!important;caret-color:transparent!important}`,
  });
  await page.waitForTimeout(900);
}

const blocked = (page) =>
  page.evaluate(() => /you do not have access to it|Page not found/i.test(document.body.innerText));

/**
 * Click the first visible element whose label matches. Icon-only buttons carry
 * their name in aria-label/title rather than innerText, so both are considered.
 */
async function doClick(page, { text, exact = false, index = 0 }) {
  const handle = await page.evaluateHandle(
    ({ text, exact, index }) => {
      const sel = "button, a, [role='button'], [role='tab'], h3, h4, td, span, div";
      const name = (el) =>
        [
          (el.innerText || "").trim().split("\n")[0],
          el.getAttribute("aria-label") || "",
          el.getAttribute("title") || "",
        ]
          .find(Boolean) || "";
      const hits = [...document.querySelectorAll(sel)].filter((el) => {
        const t = name(el);
        if (!t) return false;
        if (exact) return t === text;
        const low = t.toLowerCase();
        return low === text.toLowerCase() || low.startsWith(text.toLowerCase());
      });
      // deepest/most specific first so we hit the control, not an ancestor wrapper
      hits.sort((a, b) => {
        const da = a.querySelectorAll("*").length;
        const db = b.querySelectorAll("*").length;
        return da - db;
      });
      return hits[index] || null;
    },
    { text, exact, index },
  );
  const el = handle.asElement();
  if (!el) throw new Error(`no element matching "${text}"`);
  await el.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {});
  await el.click({ timeout: 8000 });
  await page.waitForTimeout(1400);
}

async function doScroll(page, { text }) {
  await page.evaluate((t) => {
    const el = [...document.querySelectorAll("h2,h3,h4,div,span")].find((e) =>
      (e.innerText || "").trim().startsWith(t),
    );
    if (el) el.scrollIntoView({ block: "center" });
  }, text);
  await page.waitForTimeout(1200);
}

const ACTIONS = {
  click: doClick,
  clickAny: (page, a) => doClick(page, { ...a, index: a.index ?? 0, exact: false }),
  clickNth: (page, a) => doClick(page, { ...a, index: a.index ?? 0 }),
  scroll: doScroll,
};

// ------------------------------------------------------------------ run -----
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const roles = args.length ? args : Object.keys(ROLES);

const manifestPath = path.join(ROOT, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.deep = manifest.deep ?? [];

const browser = await chromium.launch();

for (const key of roles) {
  const role = ROLES[key];
  const dir = path.join(SHOTS, key, "deep");
  await mkdir(dir, { recursive: true });

  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', role.email);
  await page.fill('input[type="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes("login"), { timeout: 45_000 }),
    page.click('#login-form button[type="submit"]'),
  ]);
  console.log(`\n[${key}] ${role.email}`);

  for (const step of STEPS) {
    if (step.roles && !step.roles.includes(key)) continue;
    // Only drill into sections the deck will actually use.
    if (!wanted(key, "deep", step.slug)) continue;
    // Number from the full step list so a section keeps the same filename
    // whether or not selection filtering is on.
    const file = `${String(STEPS.indexOf(step) + 1).padStart(2, "0")}-${step.slug}.png`;

    try {
      await page.goto(`${BASE}${step.path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await settle(page);

      if (await blocked(page)) {
        console.log(`  x ${step.slug.padEnd(34)} blocked`);
        manifest.deep.push({ role: key, slug: step.slug, file: null, access: "blocked" });
        continue;
      }

      const missed = [];
      for (const raw of step.do ?? []) {
        const act = { ...raw, text: raw.byRole?.[key] ?? raw.text };
        try {
          await ACTIONS[act.k](page, act);
        } catch (err) {
          missed.push(`${act.k}:${act.text}`);
          console.log(`    ~ action ${act.k}:${act.text} skipped (${err.message.split("\n")[0]})`);
        }
      }
      await settle(page);

      await page.screenshot({ path: path.join(dir, file) });
      manifest.deep.push({
        role: key, slug: step.slug, file, access: "allowed", label: step.label,
        partial: missed.length > 0 ? missed : undefined,
      });
      console.log(`  ${missed.length ? "~" : "+"} ${step.slug.padEnd(34)} ${file}${missed.length ? "  (partial)" : ""}`);
    } catch (err) {
      console.log(`  ! ${step.slug.padEnd(34)} FAILED ${err.message.split("\n")[0]}`);
      manifest.deep.push({ role: key, slug: step.slug, file: null, access: "error" });
    }
  }

  await ctx.close();
}

await browser.close();
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
const ok = manifest.deep.filter((d) => d.file).length;
console.log(`\n${ok} deep screenshots captured (${manifest.deep.filter((d) => !d.file).length} skipped)`);