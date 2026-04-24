# PMWDS Frontend – AI Agent Prompt (Deep Space Edition)

## Design System: The Kinetic Archive – Deep Space Edition

### 1. Color Palette: Void Neutral & Neon Accents

```css
:root {
  /* Foundation */
  --obsidian: #131318;                /* Base app background */
  --surface-elevated: #191918;        /* Cards, elevated surfaces */
  --surface-glass: rgba(255,255,255,0.03); /* Glass elements (backdrop-blur) */

  /* Accent & Primary */
  --accent: #6366f1;                  /* Iris Blue – active states, progress, links */
  --accent-glow: rgba(99,102,241,0.25);
  --gradient-start: #6366f1;
  --gradient-end: #a855f7;            /* Electric Lavender */

  /* Typography */
  --text-primary: #f0f0f5;            /* Headlines */
  --text-body: #c9c9d5;              /* Body copy */
  --text-muted: #7e7e8a;             /* Secondary metadata */

  /* Borders & Dividers */
  --border-subtle: rgba(255,255,255,0.08);
  --border-glow: rgba(99,102,241,0.3); /* On hover/focus */

  /* Functional Beacons (with glows) */
  --success: #10b981;                /* Emerald-500 */
  --success-glow: rgba(16,185,129,0.3);
  --warning: #f59e0b;               /* Amber-500 */
  --warning-glow: rgba(245,158,11,0.3);
  --danger: #f43f5e;                /* Rose-500 */
  --danger-glow: rgba(244,63,94,0.3);
}
```

### 2. Glass‑Panel Philosophy

Never use solid opaque borders. Instead:
- **Background:** `rgba(255,255,255,0.03)` with `backdrop-blur-xl` (12‑20px blur).
- **Borders:** `1px solid var(--border-subtle)` or `border-[var(--border-subtle)]/50`.
- **Depth:** Use `shadow-inner` (inset 0 1px 0 rgba(255,255,255,0.05)) to create tactile “docked” surfaces.
- **Hover State:** Elevation via `translate-y-[-2px]` + border glow `var(--border-glow)`.

### 3. Typography

- Font family: **Inter**, system-ui, sans-serif.
- **Headlines & Project Titles:** `font-black` (weight 900) with `tracking-tighter` (-0.02em) for modern authority.
- **Metadata, dates, codes:** `text-xs font-semibold tracking-[0.2em] uppercase text-[var(--text-muted)]`.
- **Body:** `text-sm font-medium text-[var(--text-body)]`.
- **KPIs & Large Numbers:** `text-4xl font-black tracking-tighter`.

### 4. Elevation & Depth

- **Cards:** `bg-[var(--surface-elevated)]` with subtle `shadow-lg` (no heavy drop shadows).
- **Modals/Flyouts:** `bg-[var(--surface-glass)] backdrop-blur-xl border border-[var(--border-subtle)]`.
- **Active/Hover Cards:** `ring-1 ring-[var(--accent)]/30` and scale slightly.

### 5. Motion & Micro‑Interactions (Framer Motion)

Use `motion/react` to create a sense of kinetic assembly.

```tsx
import { motion, AnimatePresence } from 'framer-motion';

// Page transition wrapper
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: 20 }}
  transition={{ duration: 0.25, ease: 'easeOut' }}
>
  {children}
</motion.div>
```

- **Staggered children:** Stagger project cards with a 0.05s delay.
- **View‑mode switch:** Use `AnimatePresence` and `motion.div` with layout animations for smooth grid‑to‑list transitions.
- **ProgressOrb:** SVG circle with animated `stroke-dashoffset` on mount.
- **Hover on cards:** `whileHover={{ y: -4, borderColor: 'var(--border-glow)' }}`.
- **Buttons:** Tap with `whileTap={{ scale: 0.97 }}`.

### 6. Visual Hierarchy & Information Density

Every component follows the “Single Source of Truth” principle:
- Project cards show: **Code**, **Status Beacon**, **Name**, **Description**, **Progress Orb**, **People**, **Dates**, **Priority**, **Health** – all without clutter by using tight spacing and the size/weight hierarchy described above.

---

## Core Component Styling (Updated)

### Button (Primary Gradient)

```tsx
<button className="relative px-5 py-2.5 rounded-lg font-semibold text-sm 
  bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)]
  text-white shadow-lg shadow-[var(--accent-glow)] transition-all duration-200
  hover:brightness-110 active:scale-95"
/>
```

### Card (Glass Elevated)

```tsx
<div className="bg-[var(--surface-elevated)] rounded-xl p-5 shadow-lg 
  border border-[var(--border-subtle)] transition-all duration-300
  hover:border-[var(--border-glow)] hover:-translate-y-1 hover:shadow-xl"
/>
```

### Input (Ghost)

```tsx
<div className="flex items-center bg-[var(--surface-glass)] backdrop-blur-xl
  rounded-lg px-4 py-2.5 border border-[var(--border-subtle)] 
  focus-within:border-[var(--accent)]/50 transition-colors">
  <input className="bg-transparent w-full outline-none text-sm text-[var(--text-body)] placeholder:text-[var(--text-muted)]" />
</div>
```

### StatusBeacon

```tsx
<span className={`inline-block w-2 h-2 rounded-full 
  ${status === 'success' ? 'bg-[var(--success)] shadow-[0_0_8px_var(--success-glow)]' : ''}
  ${status === 'warning' ? 'bg-[var(--warning)] shadow-[0_0_8px_var(--warning-glow)]' : ''}
  ${status === 'danger' ? 'bg-[var(--danger)] shadow-[0_0_8px_var(--danger-glow)]' : ''}
`} />
```

### ProgressOrb (Animated SVG)

```tsx
import { motion } from 'framer-motion';

const radius = 20;
const circumference = 2 * Math.PI * radius;

<motion.svg width="48" height="48" viewBox="0 0 48 48" className="transform -rotate-90">
  <circle cx="24" cy="24" r={radius} stroke="#1f1f1f" strokeWidth="3" fill="none" />
  <motion.circle
    cx="24" cy="24" r={radius}
    stroke="url(#gradient)" strokeWidth="3" fill="none"
    strokeLinecap="round"
    strokeDasharray={circumference}
    initial={{ strokeDashoffset: circumference }}
    animate={{ strokeDashoffset: circumference - (progress / 100) * circumference }}
    transition={{ duration: 1, ease: 'easeOut' }}
  />
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="var(--gradient-start)" />
      <stop offset="100%" stopColor="var(--gradient-end)" />
    </linearGradient>
  </defs>
</motion.svg>
```

---

## Full Page & Flow Description (with updated styling)

Since the user wants a complete flow like “projects page shows projects, each project card shows … onclick opens project view page … milestones, tasks …”, I will now describe the full app flow as requested, but now each component uses the **Deep Space** styling.

*(The following sections repeat the detailed page‑by‑page flow from the previous answer, but I’ll re‑write them concisely with the new design applied. I’ll structure the entire response as the final prompt.)*

I’ll produce the full prompt including:

- Technology stack (including framer-motion)
- Project structure (updated with motion)
- Design system (the one above)
- Component API descriptions with styles
- Full page flow: Dashboard, Projects, Project Detail, Tasks, Users, Departments, Skills, Notifications, AI Insights, Reports, Settings
- Each page includes: what components are shown, what each component displays, buttons and interactions, navigation
- Role-based visibility mapping
- Implementation checklist

The final output will be a comprehensive AI agent prompt. I'll ensure that the user's color palette and glass‑panel rules are prominently embedded, and the motion guidelines are clear.

Let me craft that now.# PMWDS Frontend – AI Agent Prompt

*Build a comprehensive project monitoring & task management dashboard with AI insights. The UI follows **The Kinetic Archive – Deep Space Edition** – a dark, layered, glass‑infused command center built with depth, high information density, and kinetic motion.*

---

## 1. Technology Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Routing | React Router DOM v6 |
| Styling | Tailwind CSS (with custom theme) + CSS variables |
| Animation | **Framer Motion** (`motion/react`) |
| Icons | Lucide React |
| HTTP | fetch + custom API client |

---

## 2. Design System: The Kinetic Archive – Deep Space Edition

### Color Tokens

```css
:root {
  /* Foundation */
  --obsidian: #131318;                /* App background */
  --surface-elevated: #191918;        /* Cards, panels */
  --surface-glass: rgba(255,255,255,0.03); /* Glass effect */

  /* Accent & Primary */
  --accent: #6366f1;                  /* Iris Blue */
  --accent-glow: rgba(99,102,241,0.25);
  --gradient-start: #6366f1;
  --gradient-end: #a855f7;            /* Electric Lavender */

  /* Typography */
  --text-primary: #f0f0f5;
  --text-body: #c9c9d5;
  --text-muted: #7e7e8a;

  /* Borders */
  --border-subtle: rgba(255,255,255,0.08);
  --border-glow: rgba(99,102,241,0.3);

  /* Functional Beacons (with glows) */
  --success: #10b981;           /* Emerald-500 */
  --success-glow: rgba(16,185,129,0.3);
  --warning: #f59e0b;           /* Amber-500 */
  --warning-glow: rgba(245,158,11,0.3);
  --danger: #f43f5e;            /* Rose-500 */
  --danger-glow: rgba(244,63,94,0.3);
}
```

### Typography Scale

| Usage | Class |
|-------|-------|
| Page titles | `text-2xl font-black tracking-tighter text-[var(--text-primary)]` |
| Project names | `text-lg font-black tracking-tighter` |
| KPI numbers | `text-4xl font-black tracking-tighter` |
| Card titles | `text-sm font-bold` |
| Body text | `text-sm font-medium text-[var(--text-body)]` |
| Metadata/dates | `text-xs font-semibold tracking-[0.2em] uppercase text-[var(--text-muted)]` |

### Glass & Depth Rules

- Use `bg-[var(--surface-elevated)]` for cards; `bg-[var(--surface-glass)] backdrop-blur-xl` for overlays, modals, and dropdowns.
- Never use solid high-opacity borders. Instead: `border border-[var(--border-subtle)]` and inner shadow `shadow-inner` for a “docked” feel.
- Hover: lift with `-translate-y-1` and add `border-[var(--border-glow)]`.

### Motion Principles (Framer Motion)

- All page content: `initial={{ opacity: 0, y: 20 }}` -> `animate={{ opacity: 1, y: 0 }}` with `transition={{ duration: 0.25, ease: 'easeOut' }}`.
- Stagger list items with `delay: index * 0.05`.
- View‑mode switch (grid/list): wrap inside `<AnimatePresence>` and animate layout.
- ProgressOrb: animate SVG `stroke-dashoffset`.
- Buttons and cards: `whileHover`, `whileTap` for tactile feedback.

---

## 3. Project Structure

```
src/
├── api/                # API client & endpoints
├── components/
│   ├── layout/         # Sidebar, Topbar, MainLayout
│   ├── ui/             # Button, Card, Input, StatusBeacon, ProgressOrb, etc.
│   └── pages/          # Page-specific components (DashboardWidgets, ProjectCard, etc.)
├── pages/              # Route pages (Dashboard, Projects, ProjectDetail, Tasks, ...)
├── hooks/              # useAuth, useRole, useAPI
├── styles/             # Global CSS (tokens, animations)
└── utils/              # Formatters, permission checks
```

---

## 4. Global Layout

### Sidebar (240px)
- `bg-[var(--obsidian)] border-r border-[var(--border-subtle)]`
- **Navigation Items:** Icon + `text-sm font-medium`. Active item has a left border `border-l-2 border-[var(--accent)]` and `bg-[var(--accent-glow)]/10`.
- Items visible conditionally based on role (see role matrix).

### Topbar (56px)
- `bg-[var(--surface-glass)] backdrop-blur-xl border-b border-[var(--border-subtle)]`.
- Breadcrumb (left), Notification bell with unread count badge (right).
- User avatar + name; dropdown on click: Profile, Settings, Logout.

---

## 5. Page-by-Page Flow & Component Details

### 5.1 Login
- Split layout: left dark gradient with app name, right glass card with email/password inputs and a **gradient button** (from‑indigo to‑purple).

### 5.2 Dashboard

**Hero Section:** Welcome message, date, four StatCards (Active Projects, Tasks Completed, Team Health, Overdue Tasks).

**StatCard:** `bg-[var(--surface-elevated)]`, large number (`font-black text-4xl`), title (`label-sm`), optional trend arrow, icon top-right.

**Main Grid:**
- **My Tasks:** compact list. Each item: StatusBeacon, title, due date (glows red if overdue), ProgressOrb (24px). Click opens task detail slide‑out.
- **Project Health Grid:** 2x2 cards with scores.
- **Workload Bars:** horizontal bars with gradient fills.
- **Overdue Tasks** (role dependent).

### 5.3 Projects Page

**Header:** Title, search (glass input), filter dropdowns, **“New Project” gradient button**.

**Project Cards** (grid, 3 cols):
Each card `bg-[var(--surface-elevated)]` shows:

- **Top Row:** Project code (`label-sm` left), StatusBeacon (right).
- **Title:** `font-black text-lg` name.
- **Description:** truncated `text-sm text-[var(--text-body)]`.
- **ProgressOrb** (48px) with percentage.
- **People:** small avatar stack (max 3) + “+N”.
- **Dates:** “Created … | Due …” in `label-sm`.
- **Priority:** colored capsule (Low/Medium/High/Critical).
- **Health:** small beacon + number.

Hover: lift, border glow. Click navigates to **Project Detail Page**.

### 5.4 Project Detail Page

**Hero Banner:** project name, code, status, action buttons (Edit, Delete, AI Insights, Add Task, Add Milestone).

**Tabs:** Overview | Milestones | Tasks | AI Insights | Files.

- **Overview Tab:** info cards (dates, budget), large ProgressOrb, health grid, team list, recent activity.
- **Milestones Tab:** list of milestone cards. Each shows name, due date, progress orb, expandable task list. Button to add milestone.
- **Tasks Tab:** table/list of tasks (status, title, assignee, priority, progress). Click opens task detail panel. Unassigned tasks highlighted.
- **AI Insights Tab:** Project health analysis, delay risk, resource optimization.
- **Files Tab:** upload zone, file list.

### 5.5 Tasks Page (Global)

**Header:** search, filters, “Create Task” button.

**Task List:** table with columns: StatusBeacon, Title, Project, Assignee, Priority, Due Date, Progress, Actions. Row click opens **Task Detail Slide‑out** (glass panel from right).

**Task Detail Panel:** description, progress slider, time tracker (start/stop), AI assignee recommendations, delay prediction card, comments, escalate button.

### 5.6 My Tasks Page
Same as Tasks but filtered to current user.

### 5.7 Users Page

**User Table:** avatar, name, department, role pills, availability beacon, workload bar, burnout risk indicator, active tasks count.

Click row opens **User Detail** glass panel: skills, availability slider, role assignment (admin), deactivate button.

### 5.8 Departments Page

Department cards (name, head, member count, capacity orb). Click opens Department Dashboard (members, projects, edit).

### 5.9 Skills Page (NEW)

Left list of skill cards, right form to add/edit. Skill chips show category, user count.

### 5.10 Notifications Page

Inbox split: list + detail. Priority beacons, mark‑read, broadcast modal (admin).

### 5.11 AI Insights Page

Sub-tabs: Provider Config, Chat, Project Health (select project), Burnout Risk (department filter), Delay Predictions, Train Model.

### 5.12 Reports Page

Filter panel (glass), generate button, preview/download.

### 5.13 Settings Page

Profile, notifications, appearance, security.

---

## 6. Role‑Based Visibility Summary

| Feature | SuperAdmin | PM | DeptHead | TeamLead | Member | Viewer |
|---------|:----------:|:---:|:--------:|:--------:|:------:|:------:|
| View Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create Projects | ✓ | ✓ | ✓ | – | – | – |
| Delete Projects | ✓ | ✓ | – | – | – | – |
| Manage Tasks (Assign/Delete) | ✓ | ✓ | ✓ | ✓ | – | – |
| Manage Users | ✓ | – | – | – | – | – |
| Manage Skills | ✓ | ✓ | ✓ | – | – | – |
| Full AI Insights | ✓ | ✓ | Limited* | – | – | – |
| Generate Reports | ✓ | ✓ | ✓ | – | – | – |

*Limited AI: only projects in own department.*

---

## 7. Implementation Checklist

1. Initialize Vite + React + TypeScript, Tailwind, Framer Motion.
2. Configure design tokens in `index.css`.
3. Build API client with token refresh.
4. Auth context, protected routes, role guard.
5. Core UI kit: Button (gradient), Card, Input (glass), StatusBeacon, ProgressOrb (animated).
6. Layout (Sidebar + Topbar + MainLayout).
7. Dashboard page with stat cards, task list, health grid.
8. Projects page with animated grid cards and filters.
9. Project Detail page with tabs and slide‑out task panel.
10. Tasks & My Tasks pages with sheet overlay.
11. Users & Skills management.
12. Departments, Notifications, AI Insights, Reports, Settings.
13. Wire up role‑based visibility everywhere.
14. Add loading skeletons, empty/error states.
15. Responsive adjustments (collapsible sidebar, stacked cards).

---

## 8. Key Code Snippets

### Gradient Primary Button

```tsx
<button className="px-5 py-2.5 bg-gradient-to-br from-[#6366f1] to-[#a855f7] 
  text-white font-bold text-sm rounded-lg shadow-lg shadow-[rgba(99,102,241,0.25)]
  hover:brightness-110 active:scale-95 transition-all duration-200">
  New Project
</button>
```

### Glass Card with Hover Lift

```tsx
<motion.div 
  whileHover={{ y: -4, borderColor: 'rgba(99,102,241,0.3)' }}
  className="bg-[#191918] rounded-xl p-5 border border-[rgba(255,255,255,0.08)]
    shadow-lg cursor-pointer transition-all duration-300"
>
  {/* card content */}
</motion.div>
```

### Animated ProgressOrb (SVG)

```tsx
const radius = 22, circumference = 2 * Math.PI * radius;
<motion.svg width="52" height="52" viewBox="0 0 52 52" className="transform -rotate-90">
  <circle cx="26" cy="26" r={radius} stroke="#1f1f1f" strokeWidth="3" fill="none" />
  <motion.circle
    cx="26" cy="26" r={radius}
    stroke="url(#progGrad)" strokeWidth="3" fill="none"
    strokeLinecap="round"
    strokeDasharray={circumference}
    initial={{ strokeDashoffset: circumference }}
    animate={{ strokeDashoffset: circumference - (percent/100) * circumference }}
    transition={{ duration: 1, ease: 'easeOut' }}
  />
  <defs>
    <linearGradient id="progGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#6366f1" />
      <stop offset="100%" stopColor="#a855f7" />
    </linearGradient>
  </defs>
</motion.svg>
```
