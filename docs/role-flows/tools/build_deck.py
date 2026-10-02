"""
Builds the PMWDS role-flow deck from exactly the screenshots listed in
selection.txt.

    python build_deck.py

Layout: one screenshot per slide with a numbered caption and a
"what you can do here" list, grouped into a section per role. Restricted
"Page not found" screens are excluded per the review selection.
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

ROLE_COLOR = {
    "admin": RGBColor(0x4F, 0x46, 0xE5),
    "director": RGBColor(0x0E, 0x74, 0x90),
    "head": RGBColor(0xB4, 0x53, 0x09),
    "member": RGBColor(0x47, 0x55, 0x69),
}
# Lightened variants for text and chips on the dark navy slides. The light
# palette reads as mud on INK - notably member's slate.
ROLE_ON_DARK = {
    "admin": RGBColor(0x81, 0x8C, 0xF8),
    "director": RGBColor(0x38, 0xBD, 0xF8),
    "head": RGBColor(0xFB, 0xBF, 0x24),
    "member": RGBColor(0x94, 0xA3, 0xB8),
}

FONT = "Segoe UI"
W, H = Inches(13.333), Inches(7.5)

ROLES = {
    "admin": dict(name="System Administrator", role="SuperAdmin", who="Aarav Sharma",
                  tagline="Owns the platform, the permission model and the audit trail.",
                  reach="16 of 16 modules"),
    "director": dict(name="Director", role="Director", who="Priya Menon",
                     tagline="Runs the whole organization — delivery, people and governance.",
                     reach="14 of 16 modules"),
    "head": dict(name="Department Head", role="DepartmentHead", who="Rohan Iyer",
                 tagline="Owns delivery and capacity inside a single department.",
                 reach="11 of 16 modules"),
    "member": dict(name="Team Member", role="TeamMember", who="Ananya Patel",
                   tagline="Executes assigned work, and nothing more.",
                   reach="7 of 16 modules"),
}
ORDER = ["admin", "director", "head", "member"]

# ---------------------------------------------------------------- captions --
# (title, body, [capabilities])
C: dict[str, tuple] = {
    # ------------------------------------------------------- admin: pages --
    "admin|dashboard": ("The whole portfolio on one screen",
        "Every module in PMWDS opens from here. The Administrator sees the identical dashboard "
        "everyone else does — the difference is that nothing in it is switched off.",
        ["Cross-portfolio totals: total, in-progress, on-hold, completed, delayed",
         "High-Risk Escalations surfaces work needing intervention",
         "Workload Distribution across every department",
         "Time Tracker running against an individual task"]),
    "admin|projects": ("Create and steer any project",
        "The New Project action appears here and nowhere below Administrator in the hierarchy, "
        "so programme setup starts at this level.",
        ["New Project enabled",
         "Filter across all organizations and all departments",
         "Full status lifecycle control per project"]),
    "admin|project-overview": ("The project control centre",
        "One project, every dimension of it: milestones, task status, budget, dependencies, "
        "team assignment and documents.",
        ["Milestones, AI Insights, Task Status, Budget Overview",
         "Dependency chain with blocking relationships",
         "Team Assignment and Documents in the same view"]),
    "admin|project-tasks": ("Full task and subtask control",
        "The widest task surface in the product — create, assign, escalate and decompose.",
        ["add_task — create tasks directly",
         "account_tree — manage the subtask hierarchy",
         "flag — raise an escalation on a task"]),
    "admin|project-milestones": ("Milestone timeline",
        "Phases laid out end to end with status, dependency blocking and progress, so the "
        "critical path is visible without exporting anything.",
        ["Phase-by-phase status and dates",
         "Blocking relationships between phases",
         "Critical-path highlighting"]),
    "admin|users": ("System-wide user administration",
        "Every user in every organization, with the ability to create, edit, deactivate and "
        "reassign them.",
        ["Full user list across all organizations",
         "Create, edit and deactivate",
         "Profile picture and department assignment"]),
    "admin|departments": ("Department administration",
        "Departments are created and maintained here, then used as the scope that every "
        "lower role inherits.",
        ["Architecture & Planning, PWD Civil, Procurement and the rest",
         "Create departments within scope",
         "Department detail with member counts"]),
    "admin|organization-structure": ("Shape the org chart itself",
        "The only role that can register, rename and delete organizations and departments. "
        "This is where the tenant structure is authored.",
        ["add_business — register an organization",
         "Edit and delete at both organization and department level",
         "Not available to Director, Department Head or Team Member"]),
    "admin|profiles": ("Profiles, skills and capacity",
        "The detail layer behind staffing decisions — skills, proficiency and utilisation "
        "per person.",
        ["Skill and proficiency records",
         "Capacity and utilisation data",
         "Feeds the AI allocation recommendations"]),
    "admin|roles-permissions": ("Define the permission model",
        "Roles and their grants are configured here. This screen is what makes every other "
        "restriction in this deck true.",
        ["Create, edit and delete roles",
         "Assign granular module-level permissions",
         "Grants cascade to every user holding the role"]),
    "admin|activity-logs": ("System-wide audit trail",
        "An activity trail spanning every user, team and project — the evidence layer for any "
        "governance question.",
        ["System-wide activity feed",
         "Filter by actor, entity and date",
         "Available to Administrator and Director only"]),
    "admin|reports": ("Reporting and export",
        "Pre-built report packs across delivery, finance and effort, each downloadable.",
        ["monitoring / speed — delivery performance packs",
         "account_balance — budget and variance views",
         "groups — task and effort roll-ups, downloadable"]),
    "admin|ai-insights": ("AI decision signals",
        "Risk prediction, neural heatmap, timeline predictions and recommendations — the "
        "layer that turns project data into a decision.",
        ["Risk Prediction and Neural Heatmap",
         "Timeline Predictions against planned dates",
         "AI Recommendations, Delay Prediction and Burnout Risk"]),
    "admin|notifications": ("Notification centre",
        "Templates, alert rules and the personal inbox — the alerting backbone for the whole "
        "platform.",
        ["Personal notification inbox",
         "Templates and alert rules",
         "Assignment and status alerts"]),
    "admin|settings": ("System configuration",
        "Account, AI, database and appearance settings. Gated on SYSTEM_ADMIN, so it is "
        "uniquely the Administrator's.",
        ["Profile and security settings",
         "AI model and agent configuration",
         "Database status panel"]),
    # ------------------------------------------------------ admin: drilled --
    "admin|project-documents": ("Documents and utilization certificates",
        "Project documentation sits alongside the financial control that proves released funds "
        "were used as intended.",
        ["Upload Document against the project",
         "Submit UC to raise a utilization certificate",
         "Versioned document register with title, category, size and date"]),
    "admin|project-edit-modal": ("Edit project",
        "Project details are editable in place — including for a Director, but not for a "
        "Department Head or Team Member.",
        ["Edit name, dates, budget and status in one form",
         "Edit project available to Administrator and Director",
         "Closed to Department Head and Team Member"]),
    "admin|tasks-subtasks-tree": ("The subtask tree",
        "Any task decomposes into subtasks, which is how large deliverables stay trackable at "
        "an individual level.",
        ["Expand subtasks beneath a parent task",
         "Add subtask and edit task inline",
         "Nested progress visible on the parent"]),
    "admin|ai-risk-prediction": ("Risk prediction",
        "Each project is scored for delivery risk with the drivers behind the score surfaced, "
        "rather than a bare number.",
        ["Per-project risk scoring",
         "Drivers behind the risk surfaced",
         "Runs before the project slips, not after"]),
    "admin|ai-recommendations": ("AI recommendations",
        "Allocation and intervention suggestions generated from live capacity and progress data.",
        ["Recommended assignments and reallocation",
         "Driven by workload and availability",
         "High-risk interventions prioritised"]),
    "admin|activity-log-filters": ("Narrowing the audit trail",
        "The audit view filters down by actor, entity and date, which is what turns a log into "
        "an answer.",
        ["Filter by user, entity and date range",
         "Drill into any single activity record",
         "Exportable evidence"]),
    # --------------------------------------------------- director: pages --
    "director|dashboard": ("Organization-wide oversight",
        "The same dashboard, scoped to everything inside one organization. The workload view "
        "is the one to watch — capacity problems surface here before they become delays.",
        ["Totals scoped to the director's organization",
         "Workload distribution across every department",
         "High-Risk Escalations for cross-team intervention"]),
    "director|projects": ("Scoped by department, not by organization",
        "The organization filter is gone — a Director already has exactly one — and the "
        "department filter takes its place.",
        ["New Project still enabled",
         "Scoped to all departments in the organization",
         "No organization-level switching"]),
    "director|project-overview": ("Delivery across the organization",
        "The same project control centre, with milestone, budget and dependency visibility "
        "spanning every contributing team.",
        ["Cross-department milestones and dependencies",
         "Budget Overview across the whole project",
         "Team Assignment spanning all 15 members"]),
    "director|project-tasks": ("Manage and escalate delivery",
        "Directors keep assignment and escalation rights across the organization.",
        ["Create tasks and manage the subtask tree",
         "flag — escalate a task across teams",
         "Cross-department visibility"]),
    "director|project-milestones": ("Milestone timeline, organization-wide",
        "All twelve phases of the programme visible at once, including the ones owned by other "
        "departments.",
        ["Every phase, not just departmental ones",
         "Blocking relationships across teams",
         "Critical-path highlighting"]),
    "director|users": ("People within the organization",
        "User administration for everyone the Director is responsible for — but not outside "
        "their own organization.",
        ["Organization-wide user list",
         "Create and edit users in scope",
         "Cannot reach other organizations"]),
    "director|departments": ("Departments and capacity",
        "Department management with a direct read on capacity, the metric that drives most "
        "reallocation decisions.",
        ["Every department in the organization",
         "Create departments within scope",
         "Capacity and workload drill-down"]),
    "director|profiles": ("Profiles and skills across the organization",
        "Skills and utilisation for the whole organization — the input to allocation and "
        "staffing decisions.",
        ["Organization-wide skill records",
         "Capacity and utilisation data",
         "Basis for AI allocation"]),
    "director|roles-permissions": ("Delegate roles, not platform configuration",
        "A Director can create and edit roles for their own people, but cannot touch the "
        "organization structure or system settings.",
        ["Create, edit and delete roles",
         "Applies within the director's organization",
         "No access to Settings"]),
    "director|activity-logs": ("Governance within the organization",
        "Audit visibility over everyone the Director is responsible for.",
        ["Activity across the whole organization",
         "Per-user and per-team drill-down",
         "Available to Administrator and Director only"]),
    "director|reports": ("Reporting and export",
        "The full reporting suite, scoped to the Director's organization.",
        ["Delivery, budget and effort packs",
         "Department Workload reporting",
         "Download and export"]),
    "director|ai-insights": ("AI signals across the organization",
        "Risk and recommendation signals spanning every project in scope.",
        ["Risk Prediction and Neural Heatmap",
         "Timeline Predictions and Recommendations",
         "Organization-wide coverage"]),
    "director|notifications": ("Notification centre",
        "Personal inbox plus the templates and alert rules for their organization.",
        ["Personal notification inbox",
         "Templates and alert rules",
         "Assignment and status alerts"]),
    # ------------------------------------------------ director: drilled --
    "director|project-documents": ("Documents and utilization certificates",
        "Document control and utilization certificates for the projects the Director owns.",
        ["Upload Document against the project",
         "Submit UC to raise a utilization certificate",
         "Versioned document register"]),
    "director|project-documents-viewall": ("The complete document register",
        "Expanding the register shows every document held against the project with its "
        "category, size, version and date.",
        ["Full document list, not a preview",
         "Category, size and version per document",
         "Date of last update tracked"]),
    "director|roles-table-detail": ("Inspecting a role's grants",
        "Every role with the exact permissions attached to it — the audit view of who can do "
        "what.",
        ["Permission grant per role, listed explicitly",
         "Module-level grants visible at a glance",
         "Basis for any access review"]),
    "director|users-row-detail": ("A single user record",
        "Opening a person shows their full record, roles and department context.",
        ["Full user detail",
         "Roles and department assignment",
         "Status and activation state"]),
    "director|users-create-modal": ("Onboarding someone",
        "The Director can add users directly — new starters appear with the right role without "
        "an administrator in the loop.",
        ["Create user with role and department",
         "Scoped to the director's organization",
         "No platform-wide reach"]),
    "director|ai-recommendations": ("AI recommendations",
        "Allocation and intervention guidance across the Director's portfolio.",
        ["Recommended assignments and reallocation",
         "Driven by workload and availability",
         "High-risk interventions prioritised"]),
    "director|activity-log-filters": ("Narrowing the audit trail",
        "Filter by actor, entity and date to answer a specific governance question.",
        ["Filter by user, entity and date range",
         "Drill into any single activity record",
         "Organization-scoped"]),
    "director|notification-templates": ("Alert rules and templates",
        "How the organization gets told about slippage — the rules behind every notification "
        "in the system.",
        ["Notification templates",
         "Alert rules by event and audience",
         "Foundation for assignment and status alerts"]),
    # -------------------------------------------------------- head: pages --
    "head|dashboard": ("Department-scoped dashboard",
        "The Head sees their department's delivery and nothing beyond it. Scoping is enforced "
        "on the API, not hidden in the interface.",
        ["Totals limited to the department",
         "Department workload and capacity view",
         "Same risk feed, department-scoped"]),
    "head|projects": ("Projects the department touches",
        "The same project list, filtered to departmental involvement.",
        ["New Project enabled",
         "Scoped to the department's projects",
         "No organization-level view"]),
    "head|project-overview": ("Department view of the project",
        "Delivery context for the department, with milestones the department actually owns.",
        ["Department's milestones and dependencies",
         "Budget and task status in scope",
         "Team Assignment limited to the department"]),
    "head|project-tasks": ("Deliver the department's work",
        "Task execution and assignment within the department, including escalation when work "
        "is at risk.",
        ["Create tasks and manage the subtask tree",
         "Escalate a task when it is at risk",
         "Only departmental milestones are listed"]),
    "head|project-milestones": ("Department milestones only",
        "The Head sees four phases where an Administrator sees twelve — the milestone list is "
        "filtered to departmental ownership.",
        ["4 milestones listed vs 12 for an Administrator",
         "Scoped by departmental ownership",
         "Same timeline presentation"]),
    "head|users": ("The department's people",
        "User administration stops at the department boundary — a Head cannot see or manage "
        "staff outside it.",
        ["Department user list only",
         "Add users within scope",
         "No access outside the department"]),
    "head|departments": ("Department and capacity management",
        "The Head's organizational surface — read and manage the department, and rebalance "
        "capacity across it.",
        ["Department detail and member counts",
         "Capacity and workload management",
         "No organization-level view"]),
    "head|profiles": ("Skills and capacity in the department",
        "Profile detail for departmental staff, used for staffing and allocation decisions.",
        ["Skill and proficiency visibility",
         "Capacity and utilisation data",
         "Basis for allocation decisions"]),
    "head|notifications": ("Notification centre",
        "Personal inbox and the alerts that matter to the department's work.",
        ["Personal notification inbox",
         "Assignment and status alerts",
         "No access to templates and rules"]),
    # ----------------------------------------------------- member: pages --
    "member|dashboard": ("A focused daily workspace",
        "Three menu items and no administration surface at all. There is no New Project action, "
        "and eight assigned tasks rather than an Administrator's ten.",
        ["Sidebar reduced to three items",
         "No New Project action",
         "Only the tasks actually assigned to this user"]),
    "member|projects": ("Read-only project context",
        "The Team Member can open a project to understand context, but the create and filter "
        "controls are gone.",
        ["No New Project action",
         "No organization or department filter controls",
         "Project status visible"]),
    "member|project-overview": ("Context, not control",
        "Enough of the project to understand the work — without any administrative action "
        "available anywhere on the page.",
        ["Milestones, task status and team visible",
         "Documents and dependencies read-only",
         "No create, edit or delete action"]),
    "member|project-tasks": ("Execute the work",
        "This is the Team Member's real workspace: run the task, track time against it, and "
        "record progress.",
        ["Start and stop the time tracker",
         "Update progress and status",
         "No create-task and no escalate action"]),
    "member|project-milestones": ("Department milestones only",
        "The same four departmental phases a Head sees — the contributor is not shown the "
        "organization-wide programme.",
        ["4 milestones listed vs 12 for an Administrator",
         "Read-only status and dates",
         "No milestone editing"]),
    "member|notifications": ("Stay in the loop",
        "Notifications are personal and self-scoped, so every role including Team Member gets "
        "an inbox.",
        ["Personal notification inbox",
         "Assignment and status alerts",
         "Available to every role"]),
}


# ------------------------------------------------------------- primitives ---
def blank(prs):
    return prs.slides.add_slide(prs.slide_layouts[6])


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


def bullets(slide, x, y, w, items, size=12.5, gap=9, dot=BRAND):
    """One textbox, one paragraph per item, so PowerPoint does the wrapping.
    Positioning each bullet in its own box would need a wrap estimate, and a
    wrong estimate silently overlaps the next item."""
    tb = slide.shapes.add_textbox(x, y, w, Inches(3.0))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    for i, it in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.line_spacing = 1.28
        if i:
            p.space_before = Pt(gap)
        mark = p.add_run()
        mark.text = "\u25aa  "
        mark.font.name = FONT
        mark.font.size = Pt(size)
        mark.font.bold = True
        mark.font.color.rgb = dot
        run = p.add_run()
        run.text = it
        run.font.name = FONT
        run.font.size = Pt(size)
        run.font.color.rgb = BODY
    return tb


def chip(slide, x, y, label, color, w=Inches(1.55)):
    rect(slide, x, y, w, Inches(0.32), fill=color, radius=0.5)
    text(slide, x, y + Inches(0.045), w, Inches(0.26), label, size=10.5,
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


# ------------------------------------------------------------ input data ---
selection = [l.split("|") for l in
             (ROOT / "selection.txt").read_text(encoding="utf-8").strip().splitlines() if l.strip()]

manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
top_files = {r["slug"]: r["file"] for r in manifest["results"] if r.get("slug") and r.get("file")}


def resolve_deep(role: str, slug: str) -> Path | None:
    """Re-runs append to manifest.json, so resolve deep shots from disk instead:
    the highest-numbered matching capture in shots/<role>/deep/ is the newest."""
    d = SHOTS / role / "deep"
    if not d.is_dir():
        return None
    hits = sorted(d.glob(f"*-{slug}.png"))
    return hits[-1] if hits else None


def shot_path(role, group, slug):
    if group == "deep":
        return resolve_deep(role, slug)
    f = top_files.get(slug)
    if not f:
        return None
    p = SHOTS / role / f
    return p if p.exists() else None


steps_by_role: dict[str, list] = {k: [] for k in ORDER}
missing = []
for role, group, slug in selection:
    p = shot_path(role, group, slug)
    cap = C.get(f"{role}|{slug}")
    if p is None or cap is None:
        missing.append((role, group, slug, "file" if p is None else "caption"))
        continue
    steps_by_role[role].append({"slug": slug, "group": group, "path": p, "cap": cap})

if missing:
    print("WARNING - unresolved:")
    for m in missing:
        print(f"  {m[0]} {m[1]} {m[2]}  (no {m[3]})")

prs = Presentation()
prs.slide_width, prs.slide_height = W, H


# ----------------------------------------------------------------- slides ---
def s_title():
    s = blank(prs)
    rect(s, 0, 0, W, H, fill=INK)
    rect(s, 0, 0, Inches(0.12), H, fill=BRAND)
    rect(s, Inches(9.4), Inches(-1.1), Inches(5.4), Inches(5.4), fill=RGBColor(0x1C, 0x21, 0x45), radius=0.5)
    rect(s, Inches(10.9), Inches(3.4), Inches(3.6), Inches(3.6), fill=RGBColor(0x25, 0x2A, 0x55), radius=0.5)

    text(s, Inches(0.95), Inches(1.45), Inches(9.2), Inches(0.4),
         "PMWDS  ·  PROJECT MONITORING & WORKLOAD DISTRIBUTION SYSTEM",
         size=12.5, color=RGBColor(0x9B, 0xA3, 0xD4), bold=True)
    text(s, Inches(0.95), Inches(1.95), Inches(9.0), Inches(1.1),
         "Role Based Flow", size=46, color=WHITE, bold=True, line=1.1)
    text(s, Inches(0.95), Inches(3.0), Inches(9.4), Inches(0.9),
         ["Four roles. Four workspaces. Zero leakage."],
         size=25, color=ROLE_ON_DARK["admin"], bold=True, line=1.15)
    text(s, Inches(0.95), Inches(3.95), Inches(8.4), Inches(1.0),
         "How PMWDS adapts its navigation, visible data and available actions to the user's "
         "role — walked through screen by screen, from system administrator down to an "
         "individual contributor.",
         size=14, color=DIM, line=1.45)

    # the caveat that matters for anyone evaluating the model
    rect(s, Inches(0.95), Inches(5.12), Inches(11.6), Inches(0.62),
         fill=RGBColor(0x1B, 0x20, 0x42), radius=0.1)
    rect(s, Inches(0.95), Inches(5.12), Inches(0.05), Inches(0.62), fill=ROLE_ON_DARK["director"])
    text(s, Inches(1.22), Inches(5.26), Inches(11.1), Inches(0.36),
         [[("Note:  ", {"bold": True, "color": ROLE_ON_DARK["director"], "size": 11.5}),
           ("roles in PMWDS are dynamic and configurable. The four below are used here to "
            "simulate and demonstrate the flow.",
            {"color": DIM, "size": 11.5})]])

    x = Inches(0.95)
    for k in ORDER:
        m = ROLES[k]
        rect(s, x, Inches(6.05), Inches(2.55), Inches(0.86), fill=RGBColor(0x1B, 0x20, 0x42), radius=0.14)
        rect(s, x, Inches(6.05), Inches(0.055), Inches(0.86), fill=ROLE_ON_DARK[k])
        text(s, x + Inches(0.22), Inches(6.19), Inches(2.3), Inches(0.28),
             m["role"], size=12, color=WHITE, bold=True)
        text(s, x + Inches(0.22), Inches(6.48), Inches(2.3), Inches(0.26),
             f"{m['name']}  ·  {m['reach'].replace(' of 16 modules', '/16')}", size=10, color=FAINT)
        x += Inches(2.72)


def s_intro():
    s = blank(prs)
    chrome(s, "One system, four ways in", kicker="The idea")
    text(s, Inches(0.72), Inches(1.66), Inches(11.9), Inches(1.3),
         ["PMWDS is a single application that every user opens as the same product — but never "
          "with the same powers. Navigation, visible data and available actions are all resolved "
          "from the user's role before a single pixel is drawn."],
         size=14.5, color=BODY, line=1.5)

    x = Inches(0.72)
    for big, label, sub in [
        ("3", "authorization layers", "JWT role claims, policy attributes, API data scoping"),
        ("4", "operating roles", "Administrator, Director, Department Head, Team Member"),
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
           ("a Team Member cannot open a user list at all, and a Department Head sees four of a "
            "project's twelve milestones — not because controls are hidden, but because the API "
            "never returns the data. Every screenshot that follows is the evidence.",
            {"color": BODY, "size": 13.5})]], line=1.45)


def s_matrix():
    s = blank(prs)
    chrome(s, "What each role can reach", kicker="Access matrix")
    mods = [("dashboard", "Dashboard"), ("projects", "Projects"),
            ("project-tasks", "Tasks & subtasks"), ("project-milestones", "Milestones"),
            ("users", "User administration"), ("departments", "Departments"),
            ("organization-structure", "Organization structure"),
            ("profiles", "Profiles & skills"), ("roles-permissions", "Roles & permissions"),
            ("activity-logs", "Activity logs"), ("reports", "Reports"),
            ("ai-insights", "AI insights"), ("notifications", "Notifications"),
            ("settings", "System settings")]
    # Keyed by (role, slug): a slug-only map would paint admin's access into
    # every column.
    access: dict[tuple[str, str], str] = {}
    for r in manifest["results"]:
        if r.get("role") and r.get("slug"):
            access[(r["role"], r["slug"])] = r["access"]

    x0, y0 = Inches(0.72), Inches(1.82)
    lw, cw, rh = Inches(3.5), Inches(1.94), Inches(0.35)

    text(s, x0, y0 - Inches(0.32), lw, Inches(0.3), "MODULE", size=10, color=MUTED, bold=True)
    for i, k in enumerate(ORDER):
        cx = x0 + lw + i * cw
        rect(s, cx + Inches(0.08), y0 - Inches(0.4), Inches(1.62), Inches(0.3),
             fill=ROLE_COLOR[k], radius=0.5)
        text(s, cx + Inches(0.08), y0 - Inches(0.355), Inches(1.62), Inches(0.24),
             ROLES[k]["role"], size=9.5, color=WHITE, bold=True, align=PP_ALIGN.CENTER)

    for r, (slug, label) in enumerate(mods):
        y = y0 + r * rh
        if r % 2 == 0:
            rect(s, x0, y - Inches(0.05), lw + 4 * cw - Inches(0.1), rh, fill=WHITE)
        text(s, x0 + Inches(0.12), y, lw - Inches(0.2), Inches(0.28), label,
             size=12.5, color=INK, bold=True)
        for i, k in enumerate(ORDER):
            ok = access.get((k, slug)) == "allowed"
            cx = x0 + lw + i * cw
            rect(s, cx + Inches(0.36), y - Inches(0.01), Inches(1.06), Inches(0.26),
                 fill=RGBColor(0xE7, 0xF7, 0xF0) if ok else RGBColor(0xF3, 0xF4, 0xF8), radius=0.5)
            text(s, cx + Inches(0.36), y + Inches(0.025), Inches(1.06), Inches(0.24),
                 "Available" if ok else "Restricted", size=9.5,
                 color=GREEN if ok else MUTED, bold=True, align=PP_ALIGN.CENTER)

    y = y0 + len(mods) * rh + Inches(0.24)
    text(s, x0, y, Inches(11.9), Inches(0.3),
         [[("Scoping is enforced server-side.", {"bold": True, "color": INK, "size": 12}),
           ("  'Restricted' means the API returns no data and the route guard refuses to render.",
            {"color": MUTED, "size": 12})]])
    text(s, x0, y + Inches(0.3), Inches(11.9), Inches(0.3),
         [[("Roles are configuration, not code.", {"bold": True, "color": INK, "size": 12}),
           ("  The four roles shown here simulate the flow; any number of custom roles can be "
            "defined and granted in Roles & Permissions.",
            {"color": MUTED, "size": 12})]])


def s_divider(role):
    m = ROLES[role]
    accent = ROLE_COLOR[role]      # left bar
    label = ROLE_ON_DARK[role]     # text + chip fill, legible on INK
    s = blank(prs)
    rect(s, 0, 0, W, H, fill=INK)
    rect(s, 0, 0, Inches(0.12), H, fill=accent)
    rect(s, Inches(9.9), Inches(-1.0), Inches(5.0), Inches(5.0), fill=RGBColor(0x1B, 0x20, 0x42), radius=0.5)

    n = len(steps_by_role[role])
    text(s, Inches(0.95), Inches(2.05), Inches(8), Inches(0.35),
         f"ROLE {ORDER.index(role) + 1} OF 4", size=12, color=label, bold=True)
    text(s, Inches(0.95), Inches(2.5), Inches(8.4), Inches(1.0),
         m["name"], size=44, color=WHITE, bold=True)
    text(s, Inches(0.95), Inches(3.62), Inches(7.4), Inches(0.7),
         m["tagline"], size=16, color=DIM, line=1.4)
    rect(s, Inches(0.95), Inches(4.55), Inches(2.6), Inches(0.42), fill=label, radius=0.5)
    text(s, Inches(0.95), Inches(4.63), Inches(2.6), Inches(0.3),
         f"{n} screens in this flow", size=11.5, color=INK, bold=True, align=PP_ALIGN.CENTER)
    text(s, Inches(3.75), Inches(4.62), Inches(5.2), Inches(0.3),
         f"shown as {m['who']}  ·  {m['reach']}", size=11.5, color=FAINT)


def s_step(role, step, idx):
    m, accent = ROLES[role], ROLE_COLOR[role]
    title, body, points = step["cap"]
    s = blank(prs)

    rect(s, 0, 0, W, H, fill=CANVAS)
    rect(s, 0, 0, Inches(0.09), H, fill=accent)
    chip(s, Inches(0.72), Inches(0.5), m["role"], accent)
    text(s, Inches(2.42), Inches(0.55), Inches(6), Inches(0.26),
         f"STEP {idx}", size=11.5, color=MUTED, bold=True)
    text(s, Inches(0.72), Inches(1.0), Inches(11.6), Inches(0.55),
         title, size=27, color=INK, bold=True)
    rect(s, Inches(0.72), Inches(1.66), Inches(11.9), Inches(0.012), fill=RULE)

    ix, iy, iw = Inches(0.72), Inches(1.95), Inches(7.62)
    ih = Emu(int(iw * 9 / 16))
    rect(s, ix - Inches(0.045), iy - Inches(0.045), iw + Inches(0.09), ih + Inches(0.09),
         fill=WHITE, radius=0.03, shadow=True)
    s.shapes.add_picture(str(step["path"]), ix, iy, width=iw)

    # provenance strip - also stops the area under the shot reading as dead space
    fy = iy + ih + Inches(0.22)
    rect(s, ix, fy, iw, Inches(0.44), fill=WHITE, radius=0.14)
    rect(s, ix, fy, Inches(0.05), Inches(0.44), fill=accent)
    text(s, ix + Inches(0.2), fy + Inches(0.09), iw - Inches(0.4), Inches(0.28),
         [[(f"{step['group'].upper()}  ·  ", {"bold": True, "color": accent, "size": 10}),
           (f"{step['slug'].replace('-', ' ')}", {"color": MUTED, "size": 10})]])

    cx, cw = Inches(8.72), Inches(3.92)
    text(s, cx, Inches(1.98), cw, Inches(1.6), body, size=13, color=BODY, line=1.45)
    y = Inches(3.68)
    rect(s, cx, y - Inches(0.18), cw, Inches(0.012), fill=RULE)
    text(s, cx, y, cw, Inches(0.28), "AVAILABLE IN THIS VIEW", size=10, color=accent, bold=True)
    bullets(s, cx, y + Inches(0.36), cw, points, size=12.5, gap=9, dot=accent)


def s_compare():
    s = blank(prs)
    chrome(s, "The same dashboard, four different realities", kicker="Side by side")
    text(s, Inches(0.72), Inches(1.58), Inches(11.9), Inches(0.34),
         "One URL. Identical rendering. What changes is the navigation, the action set and the "
         "underlying data — resolved from role at request time.",
         size=13, color=BODY, line=1.4)

    pairs = [
        ("admin", "10 tasks", "Full sidebar + New Project",
         ["All 16 modules", "Creates orgs and departments", "Roles, settings, audit trail"]),
        ("director", "10 tasks", "Organization-wide, no Settings",
         ["14 of 16 modules", "Manages people org-wide", "Full reporting and AI"]),
        ("head", "10 tasks", "Department-scoped only",
         ["11 of 16 modules", "4 of 12 project milestones", "Manages departmental users"]),
        ("member", "8 tasks", "3 menu items, no admin surface",
         ["7 of 16 modules", "Only assigned tasks", "No administration at all"]),
    ]
    cw, gx = Inches(2.96), Inches(3.09)
    y = Inches(2.1)
    ph = Emu(int(cw * 9 / 16))
    ch = Inches(2.62)

    for i, (k, tasks, note, deltas) in enumerate(pairs):
        x = Inches(0.72) + i * gx
        rect(s, x, y, cw, ch, fill=WHITE, radius=0.06)
        p = shot_path(k, "top", "dashboard")
        if p:
            s.shapes.add_picture(str(p), x, y, width=cw)
        rect(s, x, y + ph, cw, Inches(0.012), fill=RULE)
        text(s, x + Inches(0.16), y + ph + Inches(0.12), cw - Inches(0.32), Inches(0.26),
             ROLES[k]["role"], size=13, color=INK, bold=True)
        text(s, x + Inches(0.16), y + ph + Inches(0.38), cw - Inches(0.32), Inches(0.26),
             note, size=10.5, color=MUTED, line=1.3)
        rect(s, x, y + ch - Inches(0.36), cw, Inches(0.36), fill=BRAND_SOFT, radius=0.05)
        text(s, x, y + ch - Inches(0.29), cw, Inches(0.24), f"My Tasks · {tasks}",
             size=10.5, color=BRAND, bold=True, align=PP_ALIGN.CENTER)

        # the deltas, in the space the cards would otherwise waste
        cy = y + ch + Inches(0.3)
        for d in deltas:
            rect(s, x, cy + Inches(0.06), Inches(0.06), Inches(0.06), fill=ROLE_ON_DARK[k])
            text(s, x + Inches(0.18), cy - Inches(0.03), cw - Inches(0.18), Inches(0.28),
                 d, size=10.5, color=BODY, line=1.25)
            cy += Inches(0.3)


def s_close():
    s = blank(prs)
    rect(s, 0, 0, W, H, fill=INK)
    rect(s, 0, 0, Inches(0.12), H, fill=BRAND)
    rect(s, Inches(9.6), Inches(2.9), Inches(5.2), Inches(5.2), fill=RGBColor(0x1B, 0x20, 0x42), radius=0.5)
    text(s, Inches(0.95), Inches(1.85), Inches(8.2), Inches(0.4),
         "WHY THIS MATTERS", size=12, color=BRAND, bold=True)
    text(s, Inches(0.95), Inches(2.28), Inches(9.4), Inches(1.2),
         ["Adoption without a training manual.",
          "Control without a bottleneck."],
         size=30, color=WHITE, bold=True, line=1.16)
    text(s, Inches(0.95), Inches(4.2), Inches(8.2), Inches(1.6),
         ["Every user lands on a workspace that already matches their authority, so there is "
          "nothing to learn and nothing to be tempted by. Administrators keep a complete audit "
          "trail, and delegation goes as far down the hierarchy as the work actually requires.",
          "Roles and permissions are configuration rather than code, so the structure adapts as "
          "the organization changes."],
         size=13.5, color=DIM, line=1.5, space=10)
    x = Inches(0.95)
    for label, sub in [("4", "operating roles"), ("3", "authorization layers"), ("1", "unified platform")]:
        rect(s, x, Inches(6.12), Inches(2.5), Inches(0.92), fill=RGBColor(0x1B, 0x20, 0x42), radius=0.12)
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
    top = sum(1 for s in steps_by_role[k] if s['group'] == 'top')
    deep = len(steps_by_role[k]) - top
    print(f"  {ROLES[k]['role']:<16} {len(steps_by_role[k]):>2} slides  ({top} pages + {deep} drilled)")