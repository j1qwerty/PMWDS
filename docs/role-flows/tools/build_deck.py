"""
Builds the PMWDS Role Based Flow deck from selection.txt.

    python build_deck.py

Step-slide layout (per review):
  - role chip + step counter sit high, giving the screenshot the room
  - a single small description line sits above the image, in place of the title
  - no capability list, no breadcrumb strip, no right-hand column
  - dark slides carry no decorative circles

Dark-slide palette only: no decorative shapes are drawn on navy pages.
"""
from __future__ import annotations

import json
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Inches, Pt

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
SHOTS = ROOT / "shots"
OUT = ROOT / "PMWDS-Role-Flows.pptx"

INK = RGBColor(0x0F, 0x14, 0x2E)
BODY = RGBColor(0x44, 0x4E, 0x6E)
MUTED = RGBColor(0x8A, 0x93, 0xB0)
BRAND = RGBColor(0x4F, 0x46, 0xE5)
BRAND_SOFT = RGBColor(0xEE, 0xEF, 0xFE)
CANVAS = RGBColor(0xF6, 0xF7, 0xFC)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
RULE = RGBColor(0xDF, 0xE3, 0xF0)
GREEN = RGBColor(0x0E, 0xA5, 0x72)
DIM = RGBColor(0xB9, 0xC0, 0xE0)
FAINT = RGBColor(0x8F, 0x97, 0xC0)
PANEL = RGBColor(0x1B, 0x20, 0x42)

ROLE_COLOR = {
    "admin": RGBColor(0x4F, 0x46, 0xE5),
    "manager": RGBColor(0x0E, 0x74, 0x90),
    "head": RGBColor(0xB4, 0x53, 0x09),
    "member": RGBColor(0x47, 0x55, 0x69),
}
ROLE_ON_DARK = {
    "admin": RGBColor(0x81, 0x8C, 0xF8),
    "manager": RGBColor(0x38, 0xBD, 0xF8),
    "head": RGBColor(0xFB, 0xBF, 0x24),
    "member": RGBColor(0x94, 0xA3, 0xB8),
}

FONT = "Segoe UI"
W, H = Inches(13.333), Inches(7.5)

ORDER = ["admin", "manager", "head", "member"]
ROLES = {
    "admin": dict(name="Admin", role="Admin", who="Priya Menon",
                  tagline="Runs the whole organization — delivery, people and governance.",
                  reach="14 of 17"),
    "manager": dict(name="Manager", role="Manager", who="Dev Kapoor",
                    tagline="Owns assigned projects and the teams delivering them.",
                    reach="10 of 17"),
    "head": dict(name="Department Head", role="DepartmentHead", who="Rohan Iyer",
                 tagline="Owns delivery and capacity inside a single department.",
                 reach="10 of 17"),
    "member": dict(name="Team Member", role="TeamMember", who="Ananya Patel",
                   tagline="Executes assigned work, and nothing more.",
                   reach="7 of 17"),
}

# One short description per slide. This is the only text on a step slide
# besides the role chip and step number.
DESC: dict[tuple[str, str], str] = {}


def d(role: str, slug: str, text: str) -> None:
    DESC[(role, slug)] = text


# ------------------------------------------------------------------- Admin --
d("admin", "dashboard",
  "Every module opens from here. The Admin sees the same dashboard as everyone else — the "
  "difference is that nothing in it is switched off.")
d("admin", "projects",
  "The project portfolio, filtered by department, status and priority. Search spans name, code, "
  "description, department and manager.")
d("admin", "wizard-1-project-details",
  "New Project opens a four-step wizard. Step one captures the name, owning department, "
  "description, priority, budget in lakhs and the delivery window.")
d("admin", "wizard-2-milestones",
  "Milestones break the programme into trackable phases. Each needs a name, description and due "
  "date; at least one is required.")
d("admin", "wizard-3-assign-departments",
  "Every milestone is assigned an owning department, which is what later drives workload and "
  "capacity reporting.")
d("admin", "wizard-4-dependencies",
  "Dependencies declare which milestone waits on which, so blocked work is flagged before tasks "
  "start. Shown filled and ready — Finish is not pressed.")
d("admin", "project-overview",
  "One project, every dimension of it: milestones, task status, budget, dependencies, team "
  "assignment and documents.")
d("admin", "project-milestones",
  "The full phase-by-phase timeline with status and dependency blocking, so the critical path is "
  "visible without exporting anything.")
d("admin", "project-tasks",
  "The widest task surface in the product — create, assign, escalate and decompose work down to "
  "subtasks.")
d("admin", "project-documents",
  "Documents and utilization certificates sit together: the register of project files, and the "
  "proof that released funds were used as intended.")
d("admin", "project-dependencies",
  "The dependency chain between phases, showing which work blocks which. Blocked paths surface "
  "before a team starts something it cannot finish.")
d("admin", "users",
  "Every user in the organization with role, department, workload and burnout risk — and the "
  "ability to create, edit and deactivate them.")
d("admin", "departments",
  "Departments are maintained here, and then become the scope that every lower role inherits.")
d("admin", "profiles",
  "The detail layer behind staffing decisions: skills, proficiency and utilisation per person.")
d("admin", "roles-permissions",
  "Roles and their grants are configuration. This screen is what makes every other restriction in "
  "this deck true.")
d("admin", "activity-logs",
  "A system-wide activity trail across users, teams and projects — the evidence layer for any "
  "governance question.")
d("admin", "reports",
  "Pre-built report packs across delivery, finance and effort, each downloadable.")
d("admin", "ai-insights",
  "Risk prediction, timeline predictions and recommendations — the layer that turns project data "
  "into a decision.")
d("admin", "notifications",
  "Personal inbox plus the templates and alert rules behind every notification in the system.")
d("admin", "roles-table-detail",
  "Inspecting a role shows the exact permissions attached to it — the audit view of who can do "
  "what.")
d("admin", "users-create-modal",
  "New starters are created directly with a role and department, without an administrator in the "
  "loop.")
d("admin", "ai-recommendations",
  "Allocation and intervention suggestions generated from live capacity and progress data.")
d("admin", "activity-log-filters",
  "Filtering by actor, entity and date turns a raw log into an answer.")

# ----------------------------------------------------------------- Manager --
d("admin", "project-edit-modal",
  "Project details are editable in place — including for a Manager, but not for a Department Head "
  "or Team Member.")
d("admin", "tasks-add-modal",
  "Tasks are created against a milestone, which is what keeps progress attributable to a phase "
  "rather than to a person.")

d("manager", "dashboard",
  "The same dashboard, scoped to the projects this Manager is assigned to rather than the whole "
  "organization.")
d("manager", "projects",
  "The assigned portfolio. Filters are present but the organization-wide reach of the Admin is "
  "not.")
d("manager", "project-overview",
  "Delivery context for an assigned project, with milestones, dependencies and team assignment.")
d("manager", "project-milestones",
  "Phase-by-phase progress for the project, including the dependencies between phases.")
d("manager", "project-tasks",
  "Create tasks, manage the subtask hierarchy and escalate work that is at risk.")
d("manager", "project-documents",
  "The project document register and utilization certificates, with upload available.")
d("manager", "users",
  "The people on this project are visible for assignment decisions, but the list is read-only — "
  "no create or edit action.")
d("manager", "departments",
  "Departments are visible for context and capacity, but cannot be created or renamed here.")
d("manager", "profiles",
  "Skills and utilisation for the people involved, used for allocation decisions.")
d("manager", "notifications",
  "A personal inbox of assignment and status alerts.")

# ----------------------------------------------------------- DepartmentHead --
d("head", "dashboard",
  "Department-scoped delivery and nothing beyond it. Scoping is enforced on the API, not hidden in "
  "the interface.")
d("head", "projects",
  "The projects this department is involved in, filtered by department rather than by assignment.")
d("head", "project-overview",
  "Department context for the project — the milestones this department actually owns.")
d("head", "project-milestones",
  "Only the phases the department owns are listed, which is what makes workload reporting "
  "honest.")
d("head", "project-tasks",
  "Task execution and assignment inside the department, including escalation when work is at "
  "risk.")
d("head", "project-documents",
  "The department's view of project documents and utilization certificates.")
d("head", "activity-logs",
  "Audit visibility across the department's activity, without the organization-wide or "
  "system-wide reach of the roles above.")
d("head", "users",
  "User administration stops at the department boundary — a Head cannot see or manage staff "
  "outside it.")
d("head", "departments",
  "The Head's organizational surface: department detail, member counts and capacity.")
d("head", "profiles",
  "Skills and capacity for departmental staff, used for staffing and allocation.")
d("head", "notifications",
  "Personal inbox and the alerts that matter to the department's work.")
d("head", "tasks-add-modal",
  "The Head can create tasks inside the department's own milestones.")

# -------------------------------------------------------------- TeamMember --
d("member", "dashboard",
  "Three menu items and no administration surface at all — no New Project action, and only the "
  "tasks actually assigned to this user.")
d("member", "projects",
  "The project is readable for context, but the create and filter controls are gone.")
d("member", "project-overview",
  "Enough of the project to understand the work, with no administrative action available.")
d("member", "project-milestones",
  "The same departmental phases a Head sees — the contributor is not shown the wider programme.")
d("member", "project-tasks",
  "The real workspace: run the task, track time against it, record progress. No create, no "
  "escalate.")
d("member", "project-documents",
  "Documents are readable, but there is no upload action.")
d("member", "notifications",
  "Notifications are personal and self-scoped, so every role including Team Member gets an "
  "inbox.")


# ------------------------------------------------------------- primitives ---
def blank(prs):
    return prs.slide_layouts[6] and prs.slides.add_slide(prs.slide_layouts[6])


def rect(slide, x, y, w, h, fill=None, radius=None, shadow=False):
    shape = MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE
    s = slide.shapes.add_shape(shape, x, y, w, h)
    if radius:
        s.adjustments[0] = radius
    if fill is None:
        s.fill.background()
    else:
        s.fill.solid()
        s.fill.fore_color.rgb = fill
    s.line.fill.background()
    s.shadow.inherit = shadow
    return s


def text(slide, x, y, w, h, runs, size=14, color=BODY, bold=False,
         align=PP_ALIGN.LEFT, line=1.25, space=0):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.TOP
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    paras = runs if isinstance(runs, list) else [runs]
    for i, para in enumerate(paras):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = line
        if i:
            p.space_before = Pt(space)
        for txt, opts in (para if isinstance(para, list) else [(para, {})]):
            r = p.add_run()
            r.text = txt
            f = r.font
            f.name = opts.get("font", FONT)
            f.size = Pt(opts.get("size", size))
            f.bold = opts.get("bold", bold)
            f.color.rgb = opts.get("color", color)
    return tb


def chip(slide, x, y, label, color, w=Inches(1.5)):
    rect(slide, x, y, w, Inches(0.3), fill=color, radius=0.5)
    text(slide, x, y + Inches(0.04), w, Inches(0.24), label, size=10.5,
         color=WHITE, bold=True, align=PP_ALIGN.CENTER)


def chrome(slide, title, kicker=None, accent=BRAND):
    rect(slide, 0, 0, W, H, fill=CANVAS)
    rect(slide, 0, 0, Inches(0.09), H, fill=accent)
    if kicker:
        text(slide, Inches(0.72), Inches(0.52), Inches(9), Inches(0.3),
             kicker.upper(), size=11.5, color=accent, bold=True)
        text(slide, Inches(0.72), Inches(0.86), Inches(10.5), Inches(0.6),
             title, size=29, color=INK, bold=True)
    else:
        text(slide, Inches(0.72), Inches(0.62), Inches(10.5), Inches(0.6),
             title, size=29, color=INK, bold=True)


# ------------------------------------------------------------------ input ---
def load_selection():
    rows = []
    for line in (ROOT / "selection.txt").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        role, group, slug = line.split("|")
        rows.append((role, group, slug))
    return rows


manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))


def index_by_slug(rows):
    out = {}
    for r in rows:
        if r.get("slug") and r.get("file"):
            out[r["slug"]] = r["file"]
    return out


top_files = index_by_slug(manifest["results"])
deep_files = index_by_slug(manifest.get("deep", []))
wizard_files = index_by_slug(manifest.get("wizard", []))
FILES = {"top": top_files, "deep": deep_files, "wizard": wizard_files}


def shot_path(role: str, group: str, slug: str):
    """Re-runs append duplicates to the manifest, so fall back to a disk glob and
    take the highest-numbered capture as the newest."""
    f = FILES[group].get(slug)
    if f:
        p = SHOTS / role / ("" if group == "top" else f"{group}/") / f
        if p.exists():
            return p
    d = SHOTS / role / ("" if group == "top" else group)
    if d.is_dir():
        hits = sorted(d.glob(f"*-{slug}.png"))
        if hits:
            return hits[-1]
    return None


steps_by_role = {k: [] for k in ORDER}
missing = []
for role, group, slug in load_selection():
    p = shot_path(role, group, slug)
    desc = DESC.get((role, slug))
    if p is None or desc is None:
        missing.append((role, group, slug, "file" if p is None else "description"))
        continue
    steps_by_role[role].append({"slug": slug, "group": group, "path": p, "desc": desc})

if missing:
    print("WARNING - unresolved:")
    for m in missing:
        print(f"  {m[0]} {m[1]} {m[2]}  (no {m[3]})")

prs = Presentation()
prs.slide_width, prs.slide_height = W, H

# --------------------------------------------------------------- access map --
# Reach counts come from the capture manifest, per role.
reach = {k: 0 for k in ORDER}
total_mod = 0
for slug in set(r["slug"] for r in manifest["results"] if r.get("slug")):
    total_mod += 1
for k in ORDER:
    reach[k] = sum(
        1 for r in manifest["results"] if r.get("role") == k and r.get("slug") and r["access"] == "allowed"
    )


# ----------------------------------------------------------------- slides ---
def s_title():
    """Title slide: text only. No decorative circles, no subtitle strapline."""
    s = blank(prs)
    rect(s, 0, 0, W, H, fill=INK)
    rect(s, 0, 0, Inches(0.12), H, fill=BRAND)

    text(s, Inches(0.95), Inches(1.5), Inches(9.6), Inches(0.4),
         "PMWDS  ·  PROJECT MONITORING & WORKLOAD DISTRIBUTION SYSTEM",
         size=12.5, color=RGBColor(0x9B, 0xA3, 0xD4), bold=True)
    text(s, Inches(0.95), Inches(2.0), Inches(9.4), Inches(1.0),
         "Role Based Flow", size=46, color=WHITE, bold=True, line=1.1)
    text(s, Inches(0.95), Inches(3.1), Inches(9.0), Inches(1.0),
         "How PMWDS adapts its navigation, visible data and available actions to the user's role — "
         "walked through screen by screen.",
         size=15, color=DIM, line=1.45)

    rect(s, Inches(0.95), Inches(4.5), Inches(11.6), Inches(0.62), fill=PANEL, radius=0.1)
    rect(s, Inches(0.95), Inches(4.5), Inches(0.05), Inches(0.62), fill=ROLE_ON_DARK["manager"])
    text(s, Inches(1.22), Inches(4.64), Inches(11.1), Inches(0.36),
         [[("Note:  ", {"bold": True, "color": ROLE_ON_DARK["manager"], "size": 11.5}),
           ("roles in PMWDS are dynamic and configurable. The four below are used here to "
            "simulate and demonstrate the flow.",
            {"color": DIM, "size": 11.5})]])

    x = Inches(0.95)
    for k in ORDER:
        m = ROLES[k]
        rect(s, x, Inches(5.6), Inches(2.72), Inches(0.9), fill=PANEL, radius=0.14)
        rect(s, x, Inches(5.6), Inches(0.055), Inches(0.9), fill=ROLE_ON_DARK[k])
        text(s, x + Inches(0.22), Inches(5.74), Inches(2.4), Inches(0.28),
             m["role"], size=12, color=WHITE, bold=True)
        text(s, x + Inches(0.22), Inches(6.04), Inches(2.4), Inches(0.26),
             f"{m['name']}  ·  {reach[k]}/{total_mod}", size=10, color=FAINT)
        x += Inches(2.9)


def s_intro():
    s = blank(prs)
    chrome(s, "One system, four ways in", kicker="The idea")
    text(s, Inches(0.72), Inches(1.66), Inches(11.9), Inches(1.3),
         "PMWDS is a single application that every user opens as the same product — but never "
         "with the same powers. Navigation, visible data and available actions are all resolved "
         "from the user's role before a single pixel is drawn.",
         size=14.5, color=BODY, line=1.5)

    x = Inches(0.72)
    for big, label, sub in [
        ("3", "authorization layers", "JWT role claims, policy attributes, API data scoping"),
        ("4", "operating roles", "Admin, Manager, Department Head, Team Member"),
        ("0", "manual role rules", "Access is derived, never hand-maintained per screen"),
    ]:
        rect(s, x, Inches(3.1), Inches(3.72), Inches(1.9), fill=WHITE, radius=0.1)
        rect(s, x, Inches(3.1), Inches(3.72), Inches(0.05), fill=BRAND)
        text(s, x + Inches(0.28), Inches(3.34), Inches(1.2), Inches(0.7),
             big, size=40, color=BRAND, bold=True)
        text(s, x + Inches(0.28), Inches(4.08), Inches(3.2), Inches(0.28),
             label, size=13.5, color=INK, bold=True)
        text(s, x + Inches(0.28), Inches(4.36), Inches(3.16), Inches(0.6),
             sub, size=10.5, color=MUTED, line=1.35)
        x += Inches(3.92)

    rect(s, Inches(0.72), Inches(5.32), Inches(11.9), Inches(1.34), fill=BRAND_SOFT, radius=0.08)
    text(s, Inches(1.05), Inches(5.58), Inches(11.3), Inches(0.9),
         [[("Why it matters:  ", {"bold": True, "color": BRAND, "size": 14}),
           ("a Team Member cannot open a user list at all, and a Department Head sees only their "
            "department's milestones — not because controls are hidden, but because the API never "
            "returns the data. Every screenshot that follows is the evidence.",
            {"color": BODY, "size": 13.5})]], line=1.45)


def s_matrix():
    s = blank(prs)
    chrome(s, "What each role can reach", kicker="Access matrix")
    mods = ["dashboard", "projects", "project-overview", "project-milestones", "project-tasks",
            "project-documents", "users", "departments", "profiles", "roles-permissions",
            "activity-logs", "reports", "ai-insights", "notifications"]
    labels = {
        "dashboard": "Dashboard", "projects": "Projects", "project-overview": "Project overview",
        "project-milestones": "Milestones", "project-tasks": "Tasks & subtasks",
        "project-documents": "Documents", "users": "User administration",
        "departments": "Departments", "profiles": "Profiles & skills",
        "roles-permissions": "Roles & permissions", "activity-logs": "Activity logs",
        "reports": "Reports", "ai-insights": "AI insights", "notifications": "Notifications",
    }
    access = {}
    for r in manifest["results"]:
        if r.get("role") and r.get("slug"):
            access[(r["role"], r["slug"])] = r["access"]

    x0, y0 = Inches(0.72), Inches(1.86)
    lw, cw, rh = Inches(3.5), Inches(1.94), Inches(0.335)

    text(s, x0, y0 - Inches(0.32), lw, Inches(0.3), "MODULE", size=10, color=MUTED, bold=True)
    for i, k in enumerate(ORDER):
        cx = x0 + lw + i * cw
        rect(s, cx + Inches(0.08), y0 - Inches(0.4), Inches(1.62), Inches(0.3),
             fill=ROLE_COLOR[k], radius=0.5)
        text(s, cx + Inches(0.08), y0 - Inches(0.355), Inches(1.62), Inches(0.24),
             ROLES[k]["role"], size=9.5, color=WHITE, bold=True, align=PP_ALIGN.CENTER)

    for r, slug in enumerate(mods):
        y = y0 + r * rh
        if r % 2 == 0:
            rect(s, x0, y - Inches(0.05), lw + 4 * cw - Inches(0.1), rh, fill=WHITE)
        text(s, x0 + Inches(0.12), y, lw - Inches(0.2), Inches(0.26), labels[slug],
             size=12, color=INK, bold=True)
        for i, k in enumerate(ORDER):
            ok = access.get((k, slug)) == "allowed"
            cx = x0 + lw + i * cw
            rect(s, cx + Inches(0.36), y - Inches(0.01), Inches(1.06), Inches(0.25),
                 fill=RGBColor(0xE7, 0xF7, 0xF0) if ok else RGBColor(0xF3, 0xF4, 0xF8), radius=0.5)
            text(s, cx + Inches(0.36), y + Inches(0.02), Inches(1.06), Inches(0.22),
                 "Available" if ok else "Restricted", size=9.5,
                 color=GREEN if ok else MUTED, bold=True, align=PP_ALIGN.CENTER)

    y = y0 + len(mods) * rh + Inches(0.22)
    text(s, x0, y, Inches(11.9), Inches(0.28),
         [[("Scoping is enforced server-side.", {"bold": True, "color": INK, "size": 11.5}),
           ("  'Restricted' means the API returns no data and the route guard refuses to render.",
            {"color": MUTED, "size": 11.5})]])
    text(s, x0, y + Inches(0.28), Inches(11.9), Inches(0.28),
         [[("Roles are configuration, not code.", {"bold": True, "color": INK, "size": 11.5}),
           ("  These four simulate the flow; any number of custom roles can be defined and granted.",
            {"color": MUTED, "size": 11.5})]])


def s_divider(role):
    """Role divider on navy. No decorative circles."""
    m = ROLES[role]
    accent = ROLE_COLOR[role]
    label = ROLE_ON_DARK[role]
    s = blank(prs)
    rect(s, 0, 0, W, H, fill=INK)
    rect(s, 0, 0, Inches(0.12), H, fill=accent)

    n = len(steps_by_role[role])
    text(s, Inches(0.95), Inches(2.05), Inches(8), Inches(0.35),
         f"ROLE {ORDER.index(role) + 1} OF 4", size=12, color=label, bold=True)
    text(s, Inches(0.95), Inches(2.5), Inches(8.6), Inches(1.0),
         m["name"], size=42, color=WHITE, bold=True)
    text(s, Inches(0.95), Inches(3.58), Inches(8.4), Inches(0.7),
         m["tagline"], size=16, color=DIM, line=1.4)
    rect(s, Inches(0.95), Inches(4.5), Inches(2.6), Inches(0.42), fill=label, radius=0.5)
    text(s, Inches(0.95), Inches(4.58), Inches(2.6), Inches(0.3),
         f"{n} screens in this flow", size=11.5, color=INK, bold=True, align=PP_ALIGN.CENTER)


def s_step(role, step, idx):
    """Screenshot-led slide: chip + step high, small description above a large image."""
    m, accent = ROLES[role], ROLE_COLOR[role]
    s = blank(prs)
    rect(s, 0, 0, W, H, fill=CANVAS)
    rect(s, 0, 0, Inches(0.09), H, fill=accent)

    # Header block sits high so the image below gets the remaining height.
    chip(s, Inches(0.55), Inches(0.24), m["role"], accent, w=Inches(1.55))
    text(s, Inches(2.24), Inches(0.29), Inches(6), Inches(0.24),
         f"STEP {idx}", size=11, color=MUTED, bold=True)

    # The description replaces the title: small, above the image, full width.
    text(s, Inches(0.55), Inches(0.66), Inches(12.25), Inches(0.55),
         step["desc"], size=12, color=BODY, line=1.4)

    top = Inches(1.24)
    avail_h = H - top - Inches(0.26)
    iw = Emu(min(int(Inches(12.25)), int(avail_h * 16 / 9)))
    ih = Emu(int(iw * 9 / 16))
    ix = Emu(int((W - iw) / 2))

    rect(s, Emu(int(ix - Inches(0.05))), Emu(int(top - Inches(0.05))),
         Emu(int(iw + Inches(0.1))), Emu(int(ih + Inches(0.1))),
         fill=WHITE, radius=0.02, shadow=True)
    s.shapes.add_picture(str(step["path"]), ix, top, width=iw)


def s_compare():
    s = blank(prs)
    chrome(s, "The same dashboard, four different realities", kicker="Side by side")
    text(s, Inches(0.72), Inches(1.58), Inches(11.9), Inches(0.34),
         "One URL. Identical rendering. What changes is the navigation, the action set and the "
         "underlying data — resolved from role at request time.",
         size=13, color=BODY, line=1.4)

    pairs = [
        ("admin", "Organization-wide", ["Reports, AI insights and roles", "Manages people and roles",
                                        f"{reach['admin']}/{total_mod} modules"]),
        ("manager", "Assigned projects", ["Manages tasks and escalations",
                                          "User list is read-only", f"{reach['manager']}/{total_mod} modules"]),
        ("head", "One department", ["Own departmental milestones", "Manages departmental users",
                                    f"{reach['head']}/{total_mod} modules"]),
        ("member", "Execution only", ["Only assigned tasks", "Time tracker and progress",
                                      f"{reach['member']}/{total_mod} modules"]),
    ]
    cw, gx = Inches(2.96), Inches(3.09)
    y = Inches(2.1)
    ph = Emu(int(cw * 9 / 16))
    ch = Inches(2.5)

    for i, (k, note, deltas) in enumerate(pairs):
        x = Inches(0.72) + i * gx
        rect(s, x, y, cw, ch, fill=WHITE, radius=0.06)
        p = shot_path(k, "top", "dashboard")
        if p:
            s.shapes.add_picture(str(p), x, y, width=cw)
        rect(s, x, y + ph, cw, Inches(0.012), fill=RULE)
        text(s, x + Inches(0.16), y + ph + Inches(0.12), cw - Inches(0.32), Inches(0.26),
             ROLES[k]["role"], size=13, color=INK, bold=True)
        text(s, x + Inches(0.16), y + ph + Inches(0.38), cw - Inches(0.32), Inches(0.24),
             note, size=10.5, color=MUTED)
        cy = y + ch + Inches(0.28)
        for dl in deltas:
            rect(s, x, cy + Inches(0.06), Inches(0.06), Inches(0.06), fill=ROLE_ON_DARK[k])
            text(s, x + Inches(0.18), cy - Inches(0.03), cw - Inches(0.18), Inches(0.28),
                 dl, size=10.5, color=BODY, line=1.25)
            cy += Inches(0.3)


def s_close():
    s = blank(prs)
    rect(s, 0, 0, W, H, fill=INK)
    rect(s, 0, 0, Inches(0.12), H, fill=BRAND)
    text(s, Inches(0.95), Inches(1.9), Inches(8.2), Inches(0.4),
         "WHY THIS MATTERS", size=12, color=BRAND, bold=True)
    text(s, Inches(0.95), Inches(2.35), Inches(9.4), Inches(1.2),
         ["Adoption without a training manual.",
          "Control without a bottleneck."],
         size=30, color=WHITE, bold=True, line=1.16)
    text(s, Inches(0.95), Inches(4.25), Inches(9.4), Inches(1.6),
         ["Every user lands on a workspace that already matches their authority, so there is "
          "nothing to learn and nothing to be tempted by. Administrators keep a complete audit "
          "trail, and delegation goes as far down the hierarchy as the work actually requires.",
          "Roles and permissions are configuration rather than code, so the structure adapts as "
          "the organization changes."],
         size=13.5, color=DIM, line=1.5, space=10)
    x = Inches(0.95)
    for label, sub in [("4", "operating roles"), ("3", "authorization layers"),
                       ("1", "unified platform")]:
        rect(s, x, Inches(6.12), Inches(2.5), Inches(0.92), fill=PANEL, radius=0.12)
        text(s, x + Inches(0.24), Inches(6.24), Inches(1), Inches(0.5), label,
             size=26, color=BRAND, bold=True)
        text(s, x + Inches(0.24), Inches(6.66), Inches(2.1), Inches(0.3), sub,
             size=10.5, color=FAINT)
        x += Inches(2.66)


# ------------------------------------------------------------------ build ---
s_title()
s_intro()
s_matrix()
for role in ORDER:
    s_divider(role)
    for i, step in enumerate(steps_by_role[role], start=1):
        s_step(role, step, i)
s_compare()
s_close()

prs.save(OUT)
total = sum(len(v) for v in steps_by_role.values())
print(f"Wrote {OUT}")
print(f"  {len(prs.slides._sldIdLst)} slides · {total} screenshots")
for k in ORDER:
    t = sum(1 for s in steps_by_role[k] if s["group"] == "top")
    w = sum(1 for s in steps_by_role[k] if s["group"] == "wizard")
    dcount = sum(1 for s in steps_by_role[k] if s["group"] == "deep")
    print(f"  {ROLES[k]['role']:<16} {len(steps_by_role[k]):>2} slides  "
          f"({t} pages + {w} wizard + {dcount} drilled)")