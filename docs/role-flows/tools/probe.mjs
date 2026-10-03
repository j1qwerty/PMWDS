/**
 * Dumps clickable elements on given routes so selectors come from the live DOM
 * rather than guesses.
 *
 *   node probe.mjs admin /projects/<id>/overview /roles
 */
import { chromium } from "playwright";

const BASE = process.env.PMWDS_URL ?? "https://pmwds.dharmaatribe.app";
const PASSWORD = process.env.PMWDS_PASSWORD ?? "Pmwds@123";
const EMAIL = process.env.PMWDS_EMAIL ?? "admin@org1.com";

const [, , email = EMAIL, ...routes] = process.argv;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await ctx.newPage();

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.fill('input[type="email"]', email);
await page.fill('input[type="password"]', PASSWORD);
await Promise.all([
  page.waitForURL((u) => !u.pathname.includes("login"), { timeout: 45_000 }),
  page.click('#login-form button[type="submit"]'),
]);

for (const route of routes) {
  await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const info = await page.evaluate(() => {
    const label = (el) =>
      (el.innerText || el.getAttribute("aria-label") || el.title || "").trim().split("\n")[0].slice(0, 46);
    const out = { buttons: [], tabs: [], headings: [], dialogs: [] };
    for (const b of document.querySelectorAll("button")) {
      const t = label(b);
      if (t) out.buttons.push(t);
    }
    for (const el of document.querySelectorAll("[role='tab'], [role='button']")) {
      const t = label(el);
      if (t) out.tabs.push(t);
    }
    for (const h of document.querySelectorAll("h1,h2,h3,h4")) {
      const t = label(h);
      if (t) out.headings.push(`${h.tagName}: ${t}`);
    }
    for (const d of document.querySelectorAll("[role='dialog']")) out.dialogs.push(label(d));
    return out;
  });

  console.log(`\n${"=".repeat(78)}\n${route}  [${email}]`);
  console.log(`headings: ${info.headings.join(" | ")}`);
  console.log(`buttons (${info.buttons.length}): ${[...new Set(info.buttons)].join(" | ")}`);
  console.log(`tabs/role-btn (${info.tabs.length}): ${[...new Set(info.tabs)].join(" | ")}`);
}

await browser.close();