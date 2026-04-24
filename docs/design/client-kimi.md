Here is the consolidated, design-system-aware prompt for the PMWDS frontend. It fuses the original functional specification with **The Kinetic Archive** design philosophy, the expanded API surface (Skills, additional AI endpoints), and strict UI/UX rules.

---

# PMWDS Frontend — AI Agent Prompt (v2.0)

## 1. Project Overview & Creative North Star

**PMWDS (Project Monitoring Work Distribution System)** is a comprehensive project monitoring and task management platform with AI-powered insights.

**Creative Philosophy: "The Kinetic Archive"**
Treat data not as static entries in a table, but as living, breathing units of work within a sophisticated, multi-layered environment. The aesthetic is defined by architectural depth, tonal shifts rather than hard lines, and a high-contrast typographic scale that prioritizes clarity and authority. By utilizing intentional asymmetry and overlapping surfaces, create a UI that feels curated, premium, and inherently trustworthy.

---

## 2. Technology Stack

- **Framework:** React 18 + TypeScript (strict mode)
- **Build Tool:** Vite
- **Routing:** React Router DOM v6
- **Styling:** Custom CSS with CSS Modules + Global CSS Variables
- **API Communication:** REST via native `fetch` API
- **Font:** Inter (Google Fonts or self-hosted)
- **Icons:** Inline SVG only (no icon font libraries)

---

## 3. Project Structure

```
client/
├── src/
│   ├── api.ts          # All API endpoints (90+ methods)
│   ├── types.ts        # TypeScript interfaces
│   ├── auth.tsx        # Authentication context & role guards
│   ├── layout.tsx      # Main layout (sidebar + top bar)
│   ├── App.tsx         # Router configuration
│   ├── pages.tsx       # All page components
│   ├── ui.tsx          # Reusable UI components (design system primitives)
│   ├── index.css      # Global styles, CSS variables, tokens
│   └── App.css        # App-specific styles
├── package.json
└── vite.config.ts
```

---

## 4. Design System: The Kinetic Archive

### 4.1 Surface Philosophy & The "No-Line" Rule
**Designers are strictly prohibited from using 1px solid borders to section off major areas.** Structural boundaries must be defined through **Background Color Shifts**.

**Surface Hierarchy (Obsidian Glass Layers):**
| Token | Hex | Usage |
|-------|-----|-------|
| `surface_dim` | `#131318` | Global base background |
| `surface` | `#131318` | Alternate base (use interchangeably with dim) |
| `surface_container_low` | `#1b1b20` | Sidebar, header, major layout blocks |
| `surface_container` | `#1f1f24` | Content sections, page panels |
| `surface_container_high` | `#2a292f` | Actionable cards, inputs, elevated rows |
| `surface_container_highest` | `#35343a` | Floating modals, dropdowns, highest lift |
| `surface_variant` | `#464554` | Dividers (ghost borders), disabled states |

**Nesting Principle:** Stack containers to create lift. An error state should sit atop `surface_container_high`, never the base `surface`. This creates logical information importance.

### 4.2 Color Tokens
| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#c0c1ff` | Primary text accents, active states |
| `primary_container` | `#8083ff` | Gradient end, solid button fills |
| `on_primary` | `#1000a9` | Text on primary buttons |
| `on_surface` | `#e2e2ec` | Primary text, headings |
| `on_surface_variant` | `#c7c4d7` | Body text, descriptions, metadata |
| `outline` | `#575565` | Ghost borders at low opacity |
| `outline_variant` | `#464554` | Subtle dividers at 15% opacity |
| `success` | `#10b981` | Positive states, status beacons |
| `warning` | `#f59e0b` | Warning states |
| `danger` / `error` | `#ef4444` / `#ffb4ab` | Danger actions, error text |
| `error_container` | `#680003` | Error background tint |

### 4.3 Typography (Inter)
Use Inter to maintain surgical readability. The hierarchy should feel like a high-end financial journal.

| Scale | Size | Weight | Letter-Spacing | Usage |
|-------|------|--------|----------------|-------|
| `display-lg` | 3rem | 700 | -0.02em | Hero KPIs, empty states |
| `display-md` | 2.25rem | 700 | -0.02em | Major metrics |
| `headline-lg` | 1.75rem | 700 | -0.01em | Page titles |
| `headline-md` | 1.5rem | 600 | -0.01em | Section headers |
| `title-lg` | 1.25rem | 600 | 0 | Card titles |
| `title-md` | 1rem | 600 | 0 | Sub-headings, nav items |
| `body-lg` | 1rem | 400 | 0 | Primary body text |
| `body-md` | 0.875rem | 400 | 0 | Standard descriptions |
| `label-md` | 0.875rem | 500 | 0.05em | Tags, buttons, all-caps metadata |
| `label-sm` | 0.75rem | 500 | 0.05em | **Table headers only** (all-caps, tracked) |

**Rules:**
- Headings: `on_surface` (#e2e2ec)
- Body text: `on_surface_variant` (#c7c4d7) — **never pure white**
- Table headers: Always `label-sm`, all-caps, 0.05em tracking

### 4.4 Elevation & Depth
- **Ambient Shadows (Modals only):** `0 20px 40px rgba(0, 0, 0, 0.4)` — must feel like ambient occlusion, not a drop shadow.
- **Ghost Borders:** If absolutely necessary inside dense tables, use `outline_variant` at 15% opacity. It should be felt, not seen.
- **Glassmorphism:** Floating elements (dropdowns, hover cards) use `backdrop-blur: 12px-20px` with `surface_container_highest` at 60% alpha.
- **The "Glass & Gradient" Rule:** Primary action buttons must use a linear gradient from `primary` (#c0c1ff) to `primary_container` (#8083ff) at 135deg. Do not use flat colors.

### 4.5 Component Primitives

**Buttons:**
- **Primary:** Gradient 135deg (`primary` → `primary_container`), `rounded-md` (6px), text `on_primary`.
- **Secondary:** Ghost style. No background. `outline` at 20% opacity. Hover → `surface_container_highest`.
- **Tertiary:** Text-only `primary` color. For "Cancel", "View Less".

**Input Fields:**
- **Base:** Background `surface_container_highest`, no border, `rounded-md`.
- **Focus:** 2px "Ghost Border" using `primary` at 40% opacity. No high-contrast rings.
- **Error:** Background shifts to `error_container` at 10% opacity. Error message in `error` (#ffb4ab) using `label-sm`.

**Cards & Lists:**
- **Zero dividers.** Use 8px vertical whitespace and subtle background shifts between rows.
- **Interactive Lists:** Hover transitions from `surface` to `surface_container_low`.

**Status Beacons:**
- Replace large status tags with 8px circular beacons using `success`, `warning`, or `danger` with an outer glow (`box-shadow` of same color at 30% opacity).

**Progress Orbs:**
- Circular progress indicators for projects. Stroke-width 2px. `primary` for progress, `surface_variant` for track.

---

## 5. Roles & Permissions

| Role | Dashboard | Projects | Tasks | Users | Departments | Inbox | AI | Reports | Settings |
|------|-----------|----------|-------|-------|-------------|-------|-----|---------|----------|
| SuperAdmin | ✓ | Full | Full | Full | Full | ✓ | Full | Full | ✓ |
| ProjectManager | ✓ | Full | Full | Limited | Full | ✓ | Full | Full | ✓ |
| DepartmentHead | ✓ | View/Create | Full | Limited | Full | ✓ | Limited | Full | ✓ |
| TeamLead | ✓ | View | Full | View | - | ✓ | - | - | ✓ |
| TeamMember | ✓ | View | Own | - | - | ✓ | - | - | ✓ |
| Viewer | ✓ | View | View | - | - | ✓ | - | - | ✓ |

**Implementation:** Use `hasRole()` from auth context. Conditionally render navigation items, page routes, and action buttons based on the matrix above.

---

## 6. API Endpoints

### Authentication
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`

### Dashboard
- `GET /api/v1/projects/dashboard`

### Projects
- `GET /api/v1/projects`
- `GET /api/v1/projects/:id`
- `POST /api/v1/projects`
- `PUT /api/v1/projects/:id`
- `PATCH /api/v1/projects/:id/status`
- `GET /api/v1/projects/:id/progress`
- `GET /api/v1/projects/:id/ai/insights`
- `GET /api/v1/projects/:id/ai/health`
- `POST /api/v1/projects/:id/ai/optimize-resources`
- `DELETE /api/v1/projects/:id`

### Milestones
- `GET /api/v1/milestones/by-project/:projectId`
- `POST /api/v1/milestones`
- `PUT /api/v1/milestones/:id`
- `PATCH /api/v1/milestones/:id/complete`
- `DELETE /api/v1/milestones/:id`

### Tasks
- `GET /api/v1/tasks/by-project/:projectId`
- `GET /api/v1/tasks/my-tasks`
- `GET /api/v1/tasks/overdue`
- `GET /api/v1/tasks/escalated`
- `GET /api/v1/tasks/unassigned`
- `POST /api/v1/tasks`
- `PUT /api/v1/tasks/:id`
- `PATCH /api/v1/tasks/:id/progress`
- `PATCH /api/v1/tasks/:id/status`
- `POST /api/v1/tasks/:id/assign`
- `GET /api/v1/tasks/:id/ai/recommend-assignee`
- `GET /api/v1/tasks/:id/ai/delay-prediction`
- `POST /api/v1/tasks/:id/escalate`
- `POST /api/v1/tasks/:id/comments`
- `POST /api/v1/tasks/:id/time/start`
- `POST /api/v1/tasks/:id/time/stop`

### Users
- `GET /api/v1/users`
- `GET /api/v1/users/me`
- `GET /api/v1/users/available`
- `GET /api/v1/users/workload`
- `POST /api/v1/users/register`
- `PATCH /api/v1/users/:id/availability`
- `POST /api/v1/users/:id/skills`
- `PATCH /api/v1/users/:id/deactivate`

### Departments
- `GET /api/v1/departments`
- `GET /api/v1/departments/:id/dashboard`
- `POST /api/v1/departments`
- `PUT /api/v1/departments/:id`
- `DELETE /api/v1/departments/:id`

### Skills
- `GET /api/v1/skills`
- `GET /api/v1/skills/:id`
- `POST /api/v1/skills`
- `PUT /api/v1/skills/:id`
- `DELETE /api/v1/skills/:id`

### Notifications
- `GET /api/v1/notifications`
- `GET /api/v1/notifications/unread-count`
- `PATCH /api/v1/notifications/:id/read`
- `PATCH /api/v1/notifications/read-all`
- `DELETE /api/v1/notifications/:id`
- `POST /api/v1/notifications/broadcast`

### AI
- `GET /api/v1/ai/providers`
- `GET /api/v1/ai/providers/:provider/models`
- `POST /api/v1/ai/providers/:provider/test`
- `POST /api/v1/ai/chat`
- `GET /api/v1/ai/burnout-risk?departmentId={deptId}`
- `GET /api/v1/ai/insights/:projectId`
- `GET /api/v1/ai/project-health/:projectId`
- `POST /api/v1/ai/optimize-resources/:projectId`
- `GET /api/v1/ai/predict-delay/:taskId`
- `GET /api/v1/ai/recommend-assignee/:taskId`
- `POST /api/v1/ai/train`

### Reports
- `GET /api/v1/reports/*` (download endpoints)

---

## 7. Core Data Types

```typescript
type Role = "SuperAdmin" | "ProjectManager" | "DepartmentHead" | "TeamLead" | "TeamMember" | "Viewer";

interface AuthResponse {
  token: string;
  expiry: string;
  userId: string;
  fullName: string;
  email: string;
  roles: Role[];
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  jobTitle?: string;
  department?: string;
  departmentId?: string;
  availabilityStatus: string;
  availabilityPercentage: number;
  aiWorkloadScore: number;
  aiBurnoutRiskScore: number;
  aiPerformanceScore: number;
  activeTaskCount: number;
  isActive: boolean;
  roles: string[];
  skills: string[];
}

interface Project {
  id: string;
  projectCode: string;
  name: string;
  description?: string;
  category: string;
  status: string;
  priority: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  plannedBudget: number;
  actualCost: number;
  budgetVariance: number;
  progressPercentage: number;
  aiHealthScore: number;
  aiDelayRiskScore: number;
  aiBudgetRiskScore: number;
  departmentId: string;
  departmentName?: string;
  projectManagerId: string;
  projectManagerName?: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  startDate: string;
  dueDate: string;
  completedDate?: string;
  estimatedHours: number;
  actualHours: number;
  progressPercentage: number;
  projectId: string;
  projectName?: string;
  milestoneId?: string;
  milestoneName?: string;
  assignedToUserId?: string;
  assignedToUserName?: string;
  isEscalated: boolean;
  escalationLevel: number;
  aiDelayProbability: number;
  aiRiskFactors?: string;
  isOverdue: boolean;
}

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentDepartmentId?: string;
  departmentHeadUserId?: string;
  maxCapacity: number;
  capacityUtilization: number;
}

interface Skill {
  id: string;
  name: string;
  category: string;
  description?: string;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  createdDate: string;
  readDate?: string;
  actionUrl?: string;
}

interface DashboardData {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  escalatedTasks: number;
  totalTeamMembers: number;
  availableMembers: number;
  overallHealthScore: number;
  overallDelayRisk: number;
  totalBudget: number;
  totalActualCost: number;
  budgetVariance: number;
  highRiskProjects: ProjectSummary[];
  recentEscalations: Task[];
  projectHealthBreakdown: HealthItem[];
  workloadDistribution: WorkloadItem[];
  taskCompletionTrend: TrendItem[];
}

interface ProjectHealth {
  projectId: string;
  projectName: string;
  overallHealthScore: number;
  scheduleHealth: number;
  budgetHealth: number;
  teamHealth: number;
  qualityHealth: number;
  healthStatus: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  risks: RiskItem[];
}

interface DelayPrediction {
  taskId: string;
  delayProbability: number;
  expectedDelayDays: number;
  predictedCompletionDate: string;
  riskLevel: string;
  contributingFactors: string[];
  mitigationStrategies: string[];
  shouldEscalate: boolean;
}

interface AssigneeRecommendation {
  userId: string;
  fullName: string;
  matchScore: number;
  reason: string;
}
```

---

## 8. Page & Component Specifications

### 8.1 Layout
- **Sidebar:** Fixed, 240px width, `surface_container_low` background. Navigation items use `title-md`. Active item uses `primary` left-border accent (4px) and `surface_container` background. **No 1px border on the right edge** — separation is achieved by background color shift against the main content.
- **Top Bar:** Fixed, 56px height, `surface_container_low`. Contains breadcrumbs (headline-sm), notification beacon, and user avatar dropdown.
- **Main Content:** `surface_dim` background. Padding 24px-32px. Scrollable.
- **Responsive:** Mobile breakpoint (< 768px) collapses sidebar into a glassmorphic overlay drawer.

### 8.2 Dashboard Page
**Asymmetrical Hero Layout:** Left-align a `display-lg` KPI (e.g., "12 Active Projects") with `label-sm` metadata floated to the far right.

**Widgets (all on `surface_container` cards, no borders, 8px gap):**
- **Stat Cards:** 4-column grid. Each card shows a metric with `headline-md` value and `label-sm` label. Use status beacons for health indicators.
- **Project Health Grid:** Use **Progress Orbs** (2px stroke) for each project's completion percentage.
- **Workload Distribution:** Horizontal bars using `primary_container` fill on `surface_container_high` track.
- **Task List:** User's assigned tasks. Interactive list — hover shifts row to `surface_container_low`. No row dividers.
- **High Risk Projects:** Cards with `danger` beacon glow.
- **Recent Escalations:** Tasks with `warning` or `danger` beacons.

### 8.3 Projects Page
- **Project Cards:** `surface_container_high` background. Title in `title-lg`. Metadata in `body-md` / `on_surface_variant`. Status beacon top-right.
- **Project Detail Panel:** Slide-over or dedicated page. Milestones shown as a vertical timeline on `surface_container` with ghost connectors.
- **AI Insights:** Distinct `surface_container_high` panel with gradient-accent top border (4px, primary gradient). Display `ProjectHealth` data.
- **Status Update:** Secondary ghost buttons for status transitions.

### 8.4 Tasks Page
- **Task List:** Dense table. Headers in `label-sm` all-caps. Rows are interactive (hover → `surface_container_low`). No vertical dividers.
- **Task Detail:** Progress update uses a custom slider styled with `primary` track.
- **AI Assignee Recommendation:** Display as a ranked card with match score percentage in a Progress Orb.
- **Delay Prediction:** Show `delayProbability` as a heat-mapped value (green → red) with `body-md` contributing factors.
- **Timer Controls:** Primary gradient button for Start, Secondary ghost for Stop.
- **Comments:** Threaded list with 8px vertical spacing, no borders between comments.

### 8.5 Users Page
- **User Table:** Dense. Show AI scores (workload, burnout, performance) as mini Progress Orbs.
- **Registration Form:** SuperAdmin only. Inputs follow base/focus/error states.
- **Skill Management:** Tag-like pills using `surface_container_highest` with `label-md` text. Add skill via dropdown.

### 8.6 Skills Page (New)
- **Skill List:** Grid of cards showing `name`, `category`, `description`.
- **CRUD Forms:** Modal dialogs using glassmorphism (`backdrop-blur: 16px`, `surface_container_highest` at 85% opacity).

### 8.7 Departments Page
- **Department List:** Cards showing capacity utilization as a horizontal bar.
- **Department Dashboard:** Dedicated view with `surface_container` panels for metrics.

### 8.8 Notifications Page
- **Inbox:** Interactive list. Unread items use `surface_container_high` background; read items use `surface`. Swipe/click to mark read.
- **Broadcast:** SuperAdmin only. Textarea input with `surface_container_highest` background.

### 8.9 AI Page
- **Provider Selection:** Cards with test-connection buttons.
- **Chat Interface:** Messages bubble style — user messages on `surface_container_high`, AI responses on `surface_container`. Input fixed at bottom.
- **Burnout Risk:** Heatmap visualization using `danger` → `warning` → `success` tonal shifts.
- **Resource Optimization:** Results displayed in asymmetrical layout — large recommendation text left, metadata right.

### 8.10 Reports Page
- **Filter Controls:** Ghost-style selects.
- **Download Buttons:** Primary gradient buttons.

---

## 9. Global CSS Variables (index.css)

```css
:root {
  /* Surfaces */
  --surface-dim: #131318;
  --surface: #131318;
  --surface-container-low: #1b1b20;
  --surface-container: #1f1f24;
  --surface-container-high: #2a292f;
  --surface-container-highest: #35343a;
  --surface-variant: #464554;

  /* Colors */
  --primary: #c0c1ff;
  --primary-container: #8083ff;
  --on-primary: #1000a9;
  --on-surface: #e2e2ec;
  --on-surface-variant: #c7c4d7;
  --outline: #575565;
  --outline-variant: #464554;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --error: #ffb4ab;
  --error-container: #680003;

  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;

  /* Spacing (base 4px) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;

  /* Shadows */
  --shadow-ambient: 0 20px 40px rgba(0, 0, 0, 0.4);
  --shadow-beacon-success: 0 0 8px rgba(16, 185, 129, 0.3);
  --shadow-beacon-warning: 0 0 8px rgba(245, 158, 11, 0.3);
  --shadow-beacon-danger: 0 0 8px rgba(239, 68, 68, 0.3);
}
```

---

## 10. Implementation Checklist

- [ ] Set up Vite + React + TypeScript
- [ ] Configure global CSS variables and Inter font
- [ ] Create API client with all 90+ endpoints
- [ ] Implement authentication (login, logout, token refresh with 1-min pre-emptive refresh)
- [ ] Build `auth.tsx` context with `hasRole()` helper
- [ ] Build `layout.tsx` — sidebar (240px, no border) + top bar (56px)
- [ ] Build `ui.tsx` primitives: Button (Primary/Secondary/Tertiary), Input, Card, Beacon, ProgressOrb, Modal, Select
- [ ] Create Dashboard page with asymmetrical hero + all widgets
- [ ] Create Projects page with CRUD + AI insights + health grid
- [ ] Create Tasks page with full management + timer + comments
- [ ] Create Users page with workload viz + registration (SuperAdmin)
- [ ] Create Skills page with full CRUD
- [ ] Create Departments page with dashboard
- [ ] Create Notifications page with inbox + broadcast (SuperAdmin)
- [ ] Create AI page with chat, health, burnout, optimization
- [ ] Create Reports page with filters + downloads
- [ ] Create Settings page
- [ ] Add role-based access control to all routes and actions
- [ ] Implement loading skeletons (use `surface_container` pulsing blocks)
- [ ] Implement error states (toast notifications using `error_container` styling)
- [ ] Add responsive design (mobile sidebar overlay)
- [ ] Verify: zero 1px borders on major layout sections
- [ ] Verify: all primary actions use 135deg gradient
- [ ] Verify: body text uses `on_surface_variant`, not pure white

---

## 11. Critical Design Rules (Do's & Don'ts)

### ✅ Do:
- Use asymmetrical layouts. Align `headline-lg` left with `label-sm` metadata floated right.
- Use `surface_container_low` for large layout blocks to differentiate from base `surface`.
- Prioritize high information density. White space should be intentional but compact (use `sm` and `md` spacing tokens).
- Use glassmorphism for floating elements with `backdrop-blur: 12px-20px`.
- Use ambient shadows (`0 20px 40px rgba(0,0,0,0.4)`) exclusively for modals.

### ❌ Don't:
- Use pure white (#ffffff) for body text. Use `on_surface_variant` (#c7c4d7).
- Use 1px solid borders to section major UI areas. Use background color shifts.
- Use 100% opaque borders. They break the "Kinetic Archive" illusion.
- Use standard drop shadows with small Y-offset (1-2px). If it doesn't have a large blur, it doesn't belong.
- Use flat colors for primary actions. Always use the gradient.

---

## 12. Common Issues & Solutions

1. **API Base URL:** Set via `VITE_API_BASE_URL` environment variable.
2. **CORS:** Ensure backend allows frontend origin.
3. **Token Expiry:** Implement automatic refresh 1 minute before expiry. On 401, redirect to login.
4. **Role Checks:** Always use `hasRole()` from auth context before rendering admin actions.
5. **Form Validation:** Server-side validation. Display errors using `error_container` background tint + `label-sm` error text.
6. **Image Assets:** No external image dependencies. All icons must be inline SVG.

---