

## 1. Pre‑Existing Design System

All design tokens, typography, glass‑morphism utilities, button styles, input styles, status beacons, progress orbs, tags, avatars, dividers, and data‑table styles are already defined in `src/styles/tokens.css` (or `src/index.css`). **Do not redefine any of these.** Reference only the CSS classes and CSS variables already available in that file.

- CSS variables include: `--obsidian`, `--surface-elevated`, `--surface-glass`, `--accent`, `--gradient-start`, `--gradient-end`, `--text-primary`, `--text-body`, `--text-muted`, `--border-subtle`, `--border-glow`, `--success`, `--success-glow`, `--warning`, `--warning-glow`, `--danger`, `--danger-glow`, etc.
- Utility classes available: `.glass`, `.card`, `.card-interactive`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-tertiary`, `.btn-danger`, `.input-group`, `.input`, `.beacon`, `.beacon-success`, `.beacon-warning`, `.beacon-danger`, `.progress-orb`, `.tag`, `.tag-critical`, `.avatar`, `.divider-subtle`, `.data-table-wrapper`, etc.

Use these classes directly in components. **Avoid writing custom CSS unless absolutely necessary.**

---

## 2. Technology Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Routing | React Router DOM v6 |
| Styling | Tailwind CSS + pre‑existing `tokens.css` classes |
| Animation | **Framer Motion** (`motion/react`) |
| Icons | Lucide React |
| HTTP | fetch + custom API client |

---

## 3. Project Structure

```
src/
├── api/                # API client & endpoints
├── components/
│   ├── layout/         # Sidebar, Topbar, MainLayout
│   ├── ui/             # Reuse existing CSS classes; create component wrappers only if needed
│   └── pages/          # Page-specific components (ProjectCard, TaskRow, etc.)
├── pages/              # Route pages (Dashboard, Projects, ProjectDetail, ...)
├── hooks/              # useAuth, useRole, useAPI
├── styles/
│   └── tokens.css      # ALREADY EXISTS – all design tokens and utility classes
└── utils/              # Formatters, permission checks
```

---

## 4. Motion Principles (Framer Motion)

- **Page transitions:** Wrap every page content in  
  `<motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:20 }} transition={{ duration:0.25, ease:'easeOut' }} >`
- **Stagger lists:** For cards/rows, stagger with `transition={{ delay: index * 0.05 }}`.
- **View‑mode switch:** Use `AnimatePresence` and `layout` prop to animate grid ↔ list transitions.
- **Cards:** `whileHover={{ y: -4, borderColor: 'var(--border-glow)' }}`, `whileTap={{ scale: 0.98 }}`.
- **ProgressOrb:** The SVG component must animate `stroke-dashoffset` on mount using the pre‑defined `.progress-orb` classes (the CSS handles the transition).
- **Buttons:** Primary buttons (`btn-primary`) already have hover/active states; you may add `whileTap={{ scale: 0.97 }}` for affordance.

---

## 5. Global Layout

### Sidebar (240px)
- Background: `bg-[var(--obsidian)]` with right border `border-r border-[var(--border-subtle)]`.
- Logo: PMWDS in `headline-sm` class (already defined).
- Navigation items: Use `<NavLink>` with icon + label. Active state: `border-l-2 border-[var(--accent)] bg-[rgba(99,102,241,0.1)]`.
- **Role‑based visibility:** Only show links the current user can access (see Section 8).

### Topbar (56px)
- Background: `glass` class (`backdrop-blur-xl border-b border-[var(--border-subtle)]`).
- Left: Breadcrumb (use `label-sm` class).
- Right: Notification bell (with unread count badge using `beacon-danger pulse`), user avatar + name dropdown (Profile → Settings → Logout).

---

## 6. Page‑by‑Page Flow & Component Details

**IMPORTANT:** Every page listed in the sidebar must be fully implemented (Dashboard, Projects, ProjectDetail, Tasks, My Tasks, Users, Departments, Skills, Notifications, AI Insights, Reports, Settings). The following descriptions cover key interactions; all pages must be functional.

### 6.1 Login
- Split layout: left side with dark gradient and PMWDS branding, right side `glass` card.
- Use `.input-group` for email/password, `.btn-primary` for “Sign In”.

### 6.2 Dashboard
- **Top hero:** “Good [time], [firstName]” in `headline-lg`. Four `StatCard` components using `.card` with large `.display-md` value.
- **My Tasks:** List of up‑coming tasks. Each row: `.beacon` status, task title, due date (if overdue, use `text-[var(--danger)]`), `.progress-orb` small. Click opens task detail slide‑out.
- **Project Health Grid:** 2×2 `.card` grid with scores.
- **Workload Distribution:** Horizontal bars using CSS (gradient fills via inline style).
- **Overdue Tasks** (role‑restricted).

### 6.3 Projects Page
- **Header:** Search input (`.input-group`), filter dropdowns (`.glass`), “New Project” `.btn-primary`.
- **Grid View:** Responsive 3‑column grid of `.card-interactive` cards. Each card shows:
  - Top left: project code (`label-sm`), top right: `.beacon` (status).
  - Title: `headline-sm` class (or equivalent).
  - Description truncated, `text-sm text-[var(--text-body)]`.
  - `.progress-orb` (size 48px) with percentage.
  - Avatar stack (`.avatar-stack`) of assigned members.
  - Dates: `label-sm`.
  - Priority: `.tag` (e.g., `.tag-critical`).
  - Health: small beacon + number.
- **Hover effect:** Already handled by `.card-interactive`.
- **Click →** navigate to Project Detail Page.

**Toggle view button** (grid/list) with `AnimatePresence` for smooth transition.

### 6.4 Project Detail Page
- **Hero banner:** project name `headline-lg`, code `label-sm`, status beacon + text, action buttons: “Edit” `.btn-secondary`, “Delete” `.btn-danger`, “AI Insights” `.btn-primary`, “Add Task” `.btn-primary`, “Add Milestone” `.btn-secondary`.
- **Tabs:** Overview | Milestones | Tasks | AI Insights | Files (use underline accent for active tab).

#### Tab: Overview
- Info cards (dates, budget) using `.card`.
- Large `.progress-orb` (120px) center.
- Health grid, team list (name + role), recent activity timeline.

#### Tab: Milestones
- List of `card` items. Each: name `title-md`, due date, progress orb.
- Expandable list of nested tasks (use `.divider-subtle` for separation).
- “Complete”, “Edit”, “Delete” buttons on each milestone.

#### Tab: Tasks
- Table with `.data-table-wrapper`. Columns: status beacon, title, assignee, priority, progress, actions. Click row → open **Task Detail Slide‑out**.
- Highlight unassigned tasks with slight warning background.
- “Add Task” button opens creation modal.

#### Tab: AI Insights
- Pre‑built components: health gauge, strengths/weaknesses cards, delay prediction card, resource optimization button.

#### Tab: Files
- Drag‑and‑drop upload zone (`.glass`), file list.

### 6.5 Tasks Page (Global)
- Header with search, filters (project, status, priority), “Create Task” `.btn-primary`.
- Table/list like Project Tasks, click row → **Task Detail Slide‑out** (overlay from right, `.glass` with blur).

**Task Detail Panel:**
- Title, status beacon, close button.
- Progress slider (range input, update on release).
- Time tracker: start/stop buttons, elapsed vs estimated.
- AI assignee recommendation card (if unassigned) with confidence % and “Assign” `.btn-primary`.
- Delay prediction card (risk level, mitigation).
- Task details (dates, milestone, project).
- Comments section (list + input).
- “Escalate” `.btn-danger` button.

### 6.6 My Tasks Page
- Same as Tasks but pre‑filtered to current user. No assign action.

### 6.7 Users Page
- Table: avatar, name, department, role pills (`.tag`), availability beacon, workload bar, burnout risk indicator, actions.
- “Register User” `.btn-primary` (SuperAdmin only).
- Click row → **User Detail** glass panel: skills (chips), availability slider, role assignments (admin), deactivate button.

### 6.8 Departments Page
- Department cards: name (`title-lg`), code, head, member count, capacity orb (`.progress-orb`).
- “Create Department” button.
- Click card → Department Dashboard (members, projects, edit).

### 6.9 Skills Page
- Left: list of skill cards (name, category `.tag`, user count). Buttons to edit/delete.
- Right: “Add Skill” form using `.input-group`, `.btn-primary`.

### 6.10 Notifications Page
- Split view: list (40%) + detail (60%).
- Inbox items: `.beacon` (pulse if unread), title, preview, time.
- “Mark all read”, “Delete” actions.
- Broadcast modal (SuperAdmin): title, message, priority selector, department selector, `.btn-primary`.

### 6.11 AI Insights Page
- Tab navigation: Provider Config, Chat, Project Health, Burnout Risk, Delay Predictions, Train.
- Provider config: cards with status, model search.
- Chat: message bubbles (`.glass`), input + send `.btn-primary`.
- Project health: dropdown to select project, then same components as project AI tab.
- Burnout risk: department filter, user cards with risk meters.
- Delay predictions table.

### 6.12 Reports Page
- Filter panel (`.glass`): date range, project selector, report type chips, format selector.
- “Generate” `.btn-primary` → preview area with download links.

### 6.13 Settings Page
- Profile form (`.input-group`), notification preferences toggles, appearance, security.

**NOTE: ALL PAGES LISTED IN THE SIDEBAR MUST BE CREATED AND FULLY FUNCTIONAL. IMPLEMENT EVERY PAGE DESCRIBED ABOVE, INCLUDING THOSE BRIEFLY MENTIONED (REPORTS, SETTINGS, SKILLS, ETC.). DO NOT SKIP ANY.**

---

## 7. Role‑Based Visibility

Use a custom `useRole` hook that checks user roles from AuthContext. Apply conditionals in JSX:

| Feature | SuperAdmin | PM | DeptHead | TeamLead | Member | Viewer |
|---------|:----------:|:---:|:--------:|:--------:|:------:|:------:|
| View Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create/Delete Projects | ✓ | ✓ | ✓ | - | - | - |
| Manage Tasks (Assign) | ✓ | ✓ | ✓ | ✓ | - | - |
| Manage Users (CRUD) | ✓ | - | - | - | - | - |
| Manage Skills | ✓ | ✓ | ✓ | - | - | - |
| Full AI Insights | ✓ | ✓ | Limited* | - | - | - |
| Broadcast Notifications | ✓ | ✓ | - | - | - | - |
| Generate Reports | ✓ | ✓ | ✓ | - | - | - |

*Limited AI = only projects in own department.

---

## 8. Implementation Checklist

1. **Setup:** Vite + React + TS, install Tailwind, Framer Motion, Lucide React.
2. **Existing CSS:** Ensure `tokens.css` is imported globally.
3. **API Client:** Build with token refresh and error handling.
4. **Auth Context:** Login flow, token storage, protected routes.
5. **Core UI Wrappers:** Create thin React wrappers for the pre‑styled CSS classes only if needed (e.g., `<Button variant="primary">`, `<Card interactive>`, `<Input ...>`, `<StatusBeacon status="success">`, `<ProgressOrb progress={75} />`). Use the existing classes under the hood.
6. **Layout:** Sidebar + Topbar + `MainLayout` with `Outlet`.
7. **Pages (in order):**
   - Login
   - Dashboard (with stat cards, task list, health grid)
   - Projects (grid/list, filters, create modal)
   - Project Detail (hero, tabs, milestone list, task table, slide‑out)
   - Tasks & My Tasks (table + detail slide‑out)
   - Users (table + detail panel)
   - Departments (cards + dashboard)
   - Skills (list + form)
   - Notifications (inbox + broadcast modal)
   - AI Insights (sub‑tabs)
   - Reports (filters + generation)
   - Settings (multi‑section form)
8. **Role‑based Access:** Guard routes and conditionally render UI elements.
9. **Loading / Empty / Error States:** Skeleton loaders, empty state illustrations, retry buttons.
10. **Responsive:** Collapse sidebar to mobile menu, stack cards and tables.

---

## 9. Important Notes

- **Do not write custom CSS.** Use the provided classes and variables.
- **All design tokens are already set.** Use `var(--obsidian)`, `var(--accent)`, etc. directly in Tailwind `className` via `bg-[var(--surface-elevated)]` when needed.
- **Framer Motion** must be used for all page transitions and interactive card/button effects.
- **Accessibility:** Ensure focus states are visible (rely on the `.input-group:focus-within` styles already defined).
- **Data fetching:** Use a custom `useAPI` hook that handles loading and error states.

---

Proceed to build the entire frontend following these instructions and the pre‑existing CSS design system. The result should be a high‑density, animated command center with zero custom borders, deep layering, and smooth transitions.