/**
 * Builds review.html - a gallery of every captured screenshot, grouped by role,
 * so keep/ignore decisions can be made visually.
 *
 *   node review.mjs
 *
 * Blocked ("Page not found") and partial shots are pre-unchecked, since those
 * are the ones normally omitted from the deck.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const manifest = JSON.parse(await readFile(path.join(ROOT, "manifest.json"), "utf8"));

const ROLE_LABEL = {
  admin: "System Administrator (SuperAdmin)",
  director: "Director",
  head: "Department Head",
  member: "Team Member",
};

const top = manifest.results.filter((r) => r.slug && r.file);
const deep = (manifest.deep ?? []).filter((r) => r && r.slug);

// Re-runs append to the manifest, so keep only the newest entry per role+slug.
const newest = (rows) => {
  const m = new Map();
  for (const r of rows) m.set(`${r.role}|${r.slug}`, r);
  return [...m.values()];
};

const allTop = newest(top);
const allDeep = newest(deep);
console.log(
  `manifest entries: top=${top.length} deep=${deep.length} · after dedupe: top=${allTop.length} deep=${allDeep.length}`,
);

const item = (r, group) => {
  const dir = group === "deep" ? "deep" : "";
  const src = `shots/${r.role}/${dir ? "deep/" : ""}${r.file}`;
  const state = r.access !== "allowed" ? "blocked" : r.partial ? "partial" : "ok";
  const badge =
    state === "blocked" ? "RESTRICTED — omit" :
    state === "partial" ? "PARTIAL — check" : "";
  const on = state === "ok" ? "checked" : "";
  return `<figure class="shot ${state}">
    <label class="pick">
      <input type="checkbox" class="c" data-k="${r.role}|${group}|${r.slug}" ${on} />
      <span class="nm">${r.slug}</span>
    </label>
    <img loading="lazy" src="${src}" alt="${r.slug}" />
    ${badge ? `<figcaption class="${state}">${badge}</figcaption>` : ""}
  </figure>`;
};

const sections = Object.keys(ROLE_LABEL)
  .map((role) => {
    const t = allTop.filter((r) => r.role === role);
    const d = allDeep.filter((r) => r.role === role);
    return `<section>
      <h2>${ROLE_LABEL[role]} <small>${t.filter((r) => r.access === "allowed").length}/${t.length} pages · ${d.filter((r) => r.file).length} drilled</small></h2>
      <h3>Page-level screens</h3>
      <div class="grid">${t.map((r) => item(r, "top")).join("")}</div>
      ${d.length ? `<h3>Drilled-in sections &amp; modals</h3><div class="grid">${d.map((r) => item(r, "deep")).join("")}</div>` : ""}
    </section>`;
  })
  .join("\n");

const html = `<!doctype html>
<meta charset="utf-8">
<title>PMWDS role-flow screenshots — review</title>
<style>
  :root { color-scheme: light; }
  body { font: 14px/1.5 "Segoe UI", system-ui, sans-serif; margin: 0; background: #f6f7fc; color: #0f142e; }
  header { position: sticky; top: 0; z-index: 9; background: #0f142e; color: #fff; padding: 14px 22px; }
  header h1 { margin: 0 0 6px; font-size: 17px; }
  header p { margin: 0 0 10px; font-size: 12px; color: #9ba3d4; }
  .bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  button { font: inherit; padding: 6px 12px; border-radius: 7px; border: 1px solid #3b4270; background: #232a52; color: #fff; cursor: pointer; }
  button.p { background: #4f46e5; border-color: #4f46e5; }
  textarea { width: 100%; height: 84px; margin-top: 10px; font: 11px/1.45 ui-monospace, Consolas, monospace;
             background: #171c38; color: #b9c0e0; border: 1px solid #3b4270; border-radius: 8px; padding: 9px; resize: vertical; }
  main { padding: 20px 22px 60px; }
  section { margin-bottom: 40px; }
  h2 { font-size: 19px; margin: 0 0 4px; padding-bottom: 8px; border-bottom: 2px solid #dfe3f0; }
  h2 small { font-size: 12px; font-weight: 400; color: #8a93b0; margin-left: 8px; }
  h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .07em; color: #8a93b0; margin: 20px 0 10px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 14px; }
  .shot { margin: 0; background: #fff; border: 1px solid #dfe3f0; border-radius: 10px; overflow: hidden; }
  .shot img { width: 100%; display: block; aspect-ratio: 16/9; object-fit: cover; object-position: top center; }
  .pick { display: flex; gap: 8px; align-items: center; padding: 8px 10px; font-size: 12px; cursor: pointer; }
  .pick .nm { font-family: ui-monospace, Consolas, monospace; }
  .shot.blocked { opacity: .5; border-color: #d9dce8; }
  .shot.partial { border-color: #eab308; }
  figcaption { padding: 6px 10px; font-size: 10.5px; font-weight: 700; letter-spacing: .04em; }
  figcaption.blocked { background: #fdecec; color: #b3261e; }
  figcaption.partial { background: #fef6d8; color: #8a6300; }
</style>
<header>
  <h1>PMWDS role-flow screenshots — review &amp; select</h1>
  <p>Checked = going in the deck. <b>RESTRICTED</b> shots are "Page not found" pages that the role is refused &mdash; normally omitted. Adjust the boxes, then copy the list and send it back.</p>
  <div class="bar">
    <button class="p" onclick="pick(true)">Select all</button>
    <button onclick="pick(false)">Clear all</button>
    <button onclick="onlyOk()">Only allowed &amp; complete</button>
    <button onclick="onlyDeep()">Only drilled-in shots</button>
    <button onclick="copy()">Copy selection</button>
    <span id="count" style="font-size:12px;color:#9ba3d4"></span>
  </div>
  <textarea id="out" readonly placeholder="Selected slugs appear here..."></textarea>
</header>
<main>${sections}</main>
<script>
  const boxes = () => [...document.querySelectorAll(".c")];
  const upd = () => {
    const sel = boxes().filter(b => b.checked);
    document.getElementById("count").textContent = sel.length + " / " + boxes().length + " selected";
    document.getElementById("out").value = sel.map(b => b.dataset.k).join("\\n");
  };
  function pick(v) { boxes().forEach(b => b.checked = v); upd(); }
  function onlyOk() { boxes().forEach(b => b.checked = !b.closest(".shot").classList.contains("blocked") && !b.closest(".shot").classList.contains("partial")); upd(); }
  function onlyDeep() { boxes().forEach(b => b.checked = b.dataset.k.split("|")[1] === "deep"); upd(); }
  async function copy() { const t = document.getElementById("out"); t.select(); try { await navigator.clipboard.writeText(t.value); } catch {} document.execCommand && document.execCommand("copy"); }
  boxes().forEach(b => b.addEventListener("change", upd));
  upd();
</script>`;

await writeFile(path.join(ROOT, "review.html"), html);
console.log(`review.html written · ${allTop.length} page shots · ${allDeep.length} drilled shots`);