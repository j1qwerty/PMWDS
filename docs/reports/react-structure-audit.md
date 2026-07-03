# Structure & Architecture Audit

**Project:** PMWDS.S/Client  
**Date:** 2026-07-03  
**Stack:** React 19.2.5 + TypeScript + Vite 8.0.9 + Tailwind CSS 4.2.4  
**Audit Scope:** src/ directory — architecture, code quality, file organization, state management, styling

---

## 🚨 Critical Issues

### C1. Monolithic API Layer — api.ts (996 lines)

**File:** src/api.ts  
**Severity:** 🔴 High  
**Description:** A single file exports a single api object containing ~120 API methods covering auth, projects, tasks, milestones, users, departments, roles, notifications, organizations, dashboards, AI, reports, integrations, webhooks, skills, knowledge, lessons, activity logs, settings, and more. This violates Single Responsibility Principle and makes the file impossible to navigate, test, or maintain.  
**Refactoring:** Split into domain-specific API modules:
`
src/api/
├── client.ts              # Base request/requestList helpers
├── api.types.ts           # API-specific types (ApiOptions, PaginatedResponse)
├── auth.api.ts            # login, signup, forgot/reset password, refresh
├── projects.api.ts        # projects CRUD + progress/insights/health/documents
├── tasks.api.ts           # tasks + subtasks + dependencies + time tracking
├── milestones.api.ts      # milestones + dependencies
├── users.api.ts           # users CRUD + skills + availability + profiles
├── departments.api.ts
├── organizations.api.ts
├── roles.api.ts           # roles + permissions
├── notifications.api.ts
├── ai.api.ts              # AI providers, predictions, recommendations, models
├── reports.api.ts
├── integrations.api.ts
├── activity.api.ts
├── settings.api.ts
└── index.ts               # Re-export all domain modules
`

### C2. Monolithic Types — 	ypes.ts (1065 lines)

**File:** src/types.ts  
**Severity:** 🔴 High  
**Description:** All interfaces (~80+) live in a single file. DTOs (Page*Dto) are mixed with domain models. This creates unnecessary coupling — any component importing one type must parse the entire file.  
**Refactoring:** Split by domain and separate DTOs from domain models:
`
src/types/
├── index.ts                # Re-exports
├── auth.types.ts           # AuthResponse, AuthState, Role
├── user.types.ts           # User, UserSkillAssignment, UserDepartmentAssignment
├── project.types.ts        # Project, ProjectSummary, ProjectDepartmentAssignment
├── task.types.ts           # Task, TaskDependency, TaskComment, TaskAttachment
├── milestone.types.ts      # Milestone, MilestoneDependency, DependencyStatus
├── department.types.ts
├── organization.types.ts
├── notification.types.ts
├── role.types.ts
├── ai.types.ts             # All AI-related types (~30 interfaces)
├── report.types.ts
├── integration.types.ts
├── dashboard.types.ts
└── dto/                    # DTOs from the Pages API
    ├── index.ts
    ├── pages-response.types.ts  # PagesDataResponse + all Page*Dto
    └── pagination.types.ts
`

### C3. Monolithic Layout — layout.tsx (706 lines)

**File:** src/layout.tsx  
**Severity:** 🔴 High  
**Description:** A single component handles sidebar rendering, topbar, responsive breakpoint detection, navigation groups, section theming, profile/logout, and a notification badge. This is far too many responsibilities for one file.  
**Refactoring:** Split into:
`
src/components/layout/
├── Layout.tsx              # Orchestrator — composes sidebar + topbar + content
├── Sidebar.tsx             # Sidebar component
├── SidebarNavItem.tsx      # Individual nav link
├── SidebarNavGroup.tsx     # Sectioned nav groups
├── SidebarProfile.tsx      # Profile & logout section
├── Topbar.tsx              # Top navigation bar
├── sectionThemes.ts        # Extracted theme configuration
├── iconMap.tsx             # Extracted icon mapping
└── navGroups.ts            # Navigation group definitions
`

### C4. Global State Overfetching — ppData.tsx

**File:** src/appData.tsx (199 lines)  
**Severity:** 🔴 High  
**Description:** AppDataProvider fetches **all** data (organizations, departments, projects, milestones, tasks, subtasks, users, roles, permissions, notifications, templates, rules, activity logs) in a single getPagesData call on mount. This means every route load fetches the entire data catalog regardless of what the current page needs. The context stores everything in memory, creating a monolithic state blob.  
**Refactoring:** 
- Remove the monolithic getPagesData approach
- Implement per-page data fetching with React Query (TanStack Query) or SWR for caching/dedup
- Keep only truly global data (auth, user preferences) in context
- Use domain-specific hooks: useProjects(), useTasks(projectId), useUsers(), etc.
- Keep AppDataProvider only for workspace-scoped metadata that rarely changes (departments, roles)

### C5. Dashboard Page — Massive God Component

**File:** src/pages/dashboard/dashboard.tsx (395 lines)  
**Severity:** 🔴 High  
**Description:** The DashboardPage:
- Manages 15+ state variables
- Makes 8+ parallel API calls directly (not via hooks/context)
- Has inline data transformation logic (departmentWorkload, activityData)
- Contains inline event handlers for task CRUD, project creation, modals
- Renders 6+ sub-sections with 3 modals
- Has nested try/catch in event handlers  
**Refactoring:**
- Extract data fetching into useDashboardData() hook
- Extract modal logic into separate components or useTaskModal(), useProjectModal() hooks
- Move workload calculation into a useDepartmentWorkload() hook
- Each section (HighRiskInterventions, ActiveObjectives, WorkloadBars, etc.) should own their data

### C6. Massive Page Files Across Codebase

**Files:**
- src/pages/nested/ProjectTasksPage.tsx (702 lines)
- src/pages/login/login.tsx (627 lines)
- src/pages/NewProject/NewProjectPage.tsx (544 lines)
- src/pages/organisations/OrganizationStructurePage.tsx (not fully read but likely large)
- src/pages/organisations/OrganizationDetail.tsx
- src/pages/notifications/notifications.tsx (316 lines)

**Severity:** 🔴 High  
**Description:** Multiple page components exceed 300–700 lines, combining data fetching, state management, event handlers, modal logic, and rendering in one file. This makes testing, reusability, and maintenance very difficult.  
**Refactoring:** Each page should follow a pattern:
`
PageComponent.tsx          # Orchestrator — 50-100 lines max
├── usePageData.ts         # Data fetching hook
├── usePageModals.ts       # Modal state management hook
├── PageFilters.tsx        # Filter/sort controls
├── PageTable.tsx          # Data table/list
├── PageDetailPanel.tsx    # Detail/side panel
└── PageFormModal.tsx      # CRUD modal (extracted)
`

---

## ⚠️ Warnings

### W1. Missing .env.example File

**File:** root of Client/  
**Severity:** 🟡 Medium  
**Issue:** No .env.example documents the required environment variables. Currently VITE_API_BASE_URL is used in pi.ts line 56 with a fallback to http://localhost:5177/api/v1. New developers have no documented reference.  
**Fix:** Create Client/.env.example:
`
# API Configuration
VITE_API_BASE_URL=http://localhost:5177/api/v1
`

### W2. Dead Code — Commented Chat Nav Item

**File:** src/layout.tsx, lines 458–494  
**Severity:** 🟡 Medium  
**Issue:** A fully implemented Chat navigation link is commented out with {/* ... */}. It includes icon mapping (chat in iconMap), the HiOutlineChatAlt2 import (line 21, still used in topbar line 664), and the rendered Link.  
**Fix:** Either remove the dead code or uncomment it if Chat is a planned feature. Remove unused imports (HiChat line 24 appears unused).

### W3. Circular Dependency Risk — shared/index.ts Barrel

**File:** src/pages/shared/index.ts  
**Severity:** 🟡 Medium  
**Issue:** The barrel file re-exports ~40 modules including Toast, RoleGate, PermissionControls, NavHeaderContext, and many others. These modules themselves import from shared/index.ts (e.g., useToast is imported from ../shared in pages). This creates a circular dependency risk: if any sub-module imports from the barrel, it gets its own re-exported reference.  
**Fix:** 
- Pages should import directly from specific files: import { useToast } from "../shared/Toast" not rom "../shared"
- The barrel should only be used by external consumers (App.tsx, etc.)
- Alternatively, restructure shared into a true library with clear internal boundaries

### W4. Duplicate classNames Utility

**Files:** src/layout.tsx (line 47–49), src/ui.tsx (line 67–69)  
**Severity:** 🟡 Medium  
**Issue:** The exact same classNames helper function is defined in two separate files.  
**Fix:** Export once from src/utils/classNames.ts (or use the Tailwind clsx/	wMerge library). Import from there everywhere.

### W5. No Dedicated Hooks Directory

**Severity:** 🟡 Medium  
**Issue:** Only one custom hook exists (src/pages/shared/useUserOrganization.ts). All other hooks are inline in page components. Missing a centralized src/hooks/ directory.  
**Fix:** Create src/hooks/ and move reusable hooks:
`
src/hooks/
├── useAuth.ts              # Re-export from auth.tsx
├── useAppData.ts           # Re-export from appData.tsx
├── usePermission.ts        # Re-export from shared/RoleGate
├── useUserOrganization.ts  # Move from shared/
├── useDashboardData.ts     # New — extracted from dashboard.tsx
├── useTaskModal.ts         # New — extracted modal state
└── useProjectWorkspace.ts  # Move from nested/nestedShared.ts
`

### W6. No Services Directory

**Severity:** 🟡 Medium  
**Issue:** API calls happen directly in page components via import { api } from "../../api". There is no service/abstraction layer between UI and API. This couples UI rendering to API call details.  
**Fix:** Create src/services/ with domain service modules that wrap API calls:
`
src/services/
├── auth.service.ts
├── projects.service.ts
├── tasks.service.ts
├── users.service.ts
├── dashboard.service.ts
└── notifications.service.ts
`

### W7. Inconsistent Folder Naming Conventions

**Severity:** 🟡 Medium  
**Issues:**
- NewProject/ (PascalCase) vs projectsK/ (camelCase) vs departments/ (lowercase)
- dashbaordStats.tsx — typo in filename (dashbaord vs dashboard)
- StatusBadgeMininmal.tsx — typo (Mininmal vs Minimal)
- projectDepartments.ts vs ProjectsGroup.tsx — inconsistent .ts vs .tsx for non-component modules
- 
estedShared.ts — non-descriptive name

### W8. No src/hooks/, src/utils/, src/constants/, src/services/ Standard Folders

**Severity:** 🟡 Medium  
**Issue:** The app has no standardized directory structure beyond components/, pages/, and ssets/. Constants are buried in src/pages/constants.ts. There is no utils/ folder (utility functions are in ui.tsx and layout.tsx).  
**Fix:** Create the standard structure:
`
src/
├── api/
├── components/
├── hooks/
├── pages/
├── services/
├── types/
├── utils/
├── constants/
└── assets/
`

### W9. Hardcoded Colors in index.css

**File:** src/index.css, lines 255–268 and 274–291  
**Severity:** 🟡 Medium  
**Issue:** The ody and html elements have hardcoded color values (#f7f9fb, #191c1e) that duplicate theme variables defined in the @theme block. The .gradient-btn class (line 283–286) hardcodes a gradient instead of using theme tokens. The --success-bg, --warning-bg, and --radius-default CSS variable references (lines 348, 358, 372) are used but never defined in @theme.  
**Fix:** 
- Remove hardcoded body colors, reference theme variables
- Define --success-bg, --warning-bg, --radius-default in @theme
- Use g-gradient-to-br from-primary to-secondary with Tailwind instead of hardcoded .gradient-btn

### W10. No Route Lazy Loading

**File:** src/App.tsx, lines 12–37  
**Severity:** 🟡 Medium  
**Issue:** All page components are statically imported at the top of App.tsx. With 15+ page imports, this increases initial bundle size.  
**Fix:** Use React.lazy() + Suspense:
`	sx
const DashboardPage = React.lazy(() => import("./pages/dashboard/dashboard"));
const ProjectsKPage = React.lazy(() => import("./pages/projectsK/projectsK"));
// ... wrap routes in <Suspense fallback={<PageSkeleton />}>
`

### W11. Prop Drilling in Dashboard Page

**File:** src/pages/dashboard/dashboard.tsx  
- ProjectFormModal receives 18 props (lines 370–385)
- TaskEditModal receives 15 props (lines 309–367)  
**Severity:** 🟡 Medium  
**Fix:** Use context or composition to reduce prop counts. For modals, use a useModal() hook pattern that encapsulates state.

### W12. Missing Barrel Exports for Page Folders

**Files:** 
- src/pages/ai/ — exports AIPage from i.tsx but no index.ts
- src/pages/departments/ — no barrel export
- src/pages/activity/ — no barrel export
- src/pages/organisations/ — no barrel export  
**Severity:** 🟡 Medium  
**Fix:** Add index.ts barrel files for each page folder for cleaner imports. Note: projectsK/components/ has a barrel (index.ts) — this is the exception and should be the standard.

### W13. ny Type Usage in Dashboard

**File:** src/pages/dashboard/dashboard.tsx, line 47  
**Severity:** 🟡 Medium  
**Issue:** const [dashboard, setDashboard] = useState<any>(null) — the dashboard data state is typed as ny instead of using the DashboardData type from 	ypes.ts.  
**Fix:** useState<DashboardData | null>(null)

---

## 💡 Suggestions

### S1. Error Boundary Implementation

**Severity:** 🟢 Low  
**Suggestion:** Add a React Error Boundary at the AppRoutes level to catch rendering errors gracefully instead of a white screen. Currently any component crash takes down the entire app.

### S2. Loading/Empty/Error State Consistency

**Severity:** 🟢 Low  
**Suggestion:** Many pages have inconsistent loading state patterns. Some use LoadingPage, some use PageSkeleton, some use inline if checks. Standardize with:
`	sx
function useAsyncData<T>(fetcher: () => Promise<T>): {
  data: T | null;
  loading: boolean;
  error: string | null;
} { ... }
`

### S3. Remove className Duplication in Sidebar

**File:** src/layout.tsx, lines 336–494  
**Suggestion:** The sidebar navigation items (Dashboard, Projects, Notifications, Chat) repeat the same Link structure pattern 3+ times with identical class logic. Each item is wrapped in an IIFE. Extract a SidebarLink component:
`	sx
function SidebarLink({ to, icon, label, theme, compact, unreadCount }: SidebarLinkProps) { ... }
`

### S4. Magic Numbers in Inline Styles

**File:** src/layout.tsx — uses clamp() values extensively inline:
- height: 'clamp(28px,4vw,32px)' (lines 302, 317, 647)
- width: 'clamp(28px,4vw,32px)' (lines 303, 318, 647)
- Various padding/margin clamp values  
**Suggestion:** Define reusable CSS variables or Tailwind utility classes for the most common clamp values to reduce duplication.

### S5. Token Management Security

**File:** src/auth.tsx, lines 59–65  
**Suggestion:** Auth tokens are stored in localStorage which is vulnerable to XSS. Consider using httpOnly cookies or sessionStorage for token storage, or at minimum document the security trade-off.

### S6. useMemo / useCallback Overuse

**Files:** src/auth.tsx, src/appData.tsx  
**Suggestion:** Every function in AuthContextValue is wrapped in useCallback and the entire value in useMemo. With React 19's improved compiler, much of this manual memoization may be unnecessary. Audit and remove where the performance benefit is negligible.

### S7. Color Palette Typo in Variables

**File:** src/index.css, lines 348 and 358  
**Suggestion:** --success-bg and --warning-bg reference variables that are not defined in the @theme block. Define them or use direct color values.

### S8. React 19 use() Hook Opportunity

**Suggestion:** React 19's use() hook can replace useEffect + useState for data fetching patterns. The current codebase uses useEffect extensively for data loading. Consider adopting use() for simpler async data flows.

---

## 🏗️ Architecture Recommendations

### Recommended Final Directory Structure

`
src/
├── api/                            # Split from monolithic api.ts
│   ├── client.ts                   # Base fetch helper
│   ├── index.ts                    # Re-exports
│   ├── auth.api.ts
│   ├── projects.api.ts
│   ├── tasks.api.ts
│   ├── milestones.api.ts
│   ├── users.api.ts
│   ├── departments.api.ts
│   ├── organizations.api.ts
│   ├── notifications.api.ts
│   ├── roles.api.ts
│   ├── ai.api.ts
│   ├── reports.api.ts
│   └── settings.api.ts
│
├── types/                          # Split from monolithic types.ts
│   ├── index.ts
│   ├── auth.types.ts
│   ├── project.types.ts
│   ├── task.types.ts
│   ├── user.types.ts
│   ├── milestone.types.ts
│   ├── department.types.ts
│   ├── organization.types.ts
│   ├── notification.types.ts
│   ├── role.types.ts
│   ├── ai.types.ts
│   ├── report.types.ts
│   ├── dashboard.types.ts
│   ├── integration.types.ts
│   ├── activity.types.ts
│   └── dto/
│       ├── index.ts
│       ├── pages-response.types.ts
│       └── pagination.types.ts
│
├── components/
│   ├── ui/                         # Only Icon.tsx currently
│   │   ├── Icon.tsx
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Skeleton.tsx
│   │   ├── EmptyState.tsx
│   │   └── index.ts
│   ├── layout/
│   │   ├── Layout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── SidebarNavItem.tsx
│   │   ├── SidebarNavGroup.tsx
│   │   ├── SidebarProfile.tsx
│   │   ├── Topbar.tsx
│   │   ├── NavHeader.tsx
│   │   ├── sectionThemes.ts
│   │   ├── iconMap.tsx
│   │   ├── navGroups.ts
│   │   └── index.ts
│   └── shared/                     # Feature-agnostic shared components
│       ├── Avatar.tsx
│       ├── StatusBadge.tsx
│       ├── PriorityBadge.tsx
│       ├── PermissionControls.tsx
│       ├── RoleGate.tsx
│       └── ...
│
├── hooks/
│   ├── useAuth.ts
│   ├── usePermission.ts
│   ├── useToast.ts
│   ├── useNavHeader.ts
│   ├── useUserOrganization.ts
│   ├── useDashboardData.ts
│   ├── useProjectWorkspace.ts
│   ├── useAsyncData.ts             # Generic data fetching hook
│   └── index.ts
│
├── services/                       # Domain service layer
│   ├── auth.service.ts
│   ├── projects.service.ts
│   ├── tasks.service.ts
│   ├── users.service.ts
│   ├── dashboard.service.ts
│   └── notifications.service.ts
│
├── constants/
│   ├── project.constants.ts        # From pages/constants.ts
│   ├── permissions.constants.ts
│   └── index.ts
│
├── utils/
│   ├── classNames.ts
│   ├── format.ts                   # formatDate, formatMoney, formatPercent
│   ├── validation.ts
│   └── index.ts
│
├── assets/
│   └── ...
│
├── pages/                          # Feature-based page modules
│   ├── auth/                       # Login, signup, password reset
│   ├── dashboard/
│   │   ├── DashboardPage.tsx       # Orchestrator (now <100 lines)
│   │   ├── useDashboardData.ts
│   │   ├── DashboardStats.tsx
│   │   ├── ActiveObjectives.tsx
│   │   └── index.ts
│   ├── projects/
│   │   ├── ProjectsListPage.tsx
│   │   ├── ProjectDetailPage.tsx
│   │   ├── ProjectCreateWizard/    # Moved from NewProject/
│   │   └── components/
│   ├── tasks/
│   │   ├── TasksBoardPage.tsx
│   │   ├── TaskDetailModal.tsx
│   │   └── TaskFormModal.tsx
│   ├── teams/
│   │   ├── UsersPage.tsx
│   │   ├── DepartmentsPage.tsx
│   │   ├── OrganizationsPage.tsx
│   │   ├── ProfilesPage.tsx
│   │   └── SkillsPage.tsx
│   ├── notifications/
│   ├── reports/
│   ├── ai/
│   ├── roles/
│   ├── settings/
│   └── activity/
│
├── providers/                      # Context providers split from App.tsx
│   ├── AuthProvider.tsx
│   ├── AppDataProvider.tsx
│   ├── ToastProvider.tsx
│   └── index.tsx                   # Composed provider
│
├── routes/
│   ├── AppRoutes.tsx               # Route definitions (extracted from App.tsx)
│   ├── PrivateRoute.tsx
│   ├── RouteGuards.ts
│   └── routePermissions.ts
│
├── App.tsx                         # ~20 lines — provider composition only
├── main.tsx
└── index.css
`

### Migration Priority

| Phase | What | Impact |
|-------|------|--------|
| **1** | Split 	ypes.ts → 	ypes/ | Low effort, high impact — unblocks everything else |
| **2** | Create hooks/ directory, extract shared hooks | Medium effort, high impact — enables reuse |
| **3** | Split pi.ts → pi/ | Medium effort, high impact — enables service layer |
| **4** | Create services/ layer | Medium effort — decouples UI from API |
| **5** | Split layout.tsx → components/layout/ | Medium effort — improves maintainability |
| **6** | Extract dashboard hooks, reduce page sizes | High effort, high impact — fixes worst god components |
| **7** | Standardize barrels, folders, naming | Low effort each, ongoing |
| **8** | Add React.lazy for route splitting | Low effort, immediate perf gain |
| **9** | Adopt React Query/SWR for data fetching | High effort, but eliminates appData.tsx overfetching |

---

## Summary Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Files over 300 lines | 8+ | 0 |
| Monolithic files (api/types) | 2 | 0 |
| Hook count | 1 (shared) | 10+ |
| Barrel exports (page folders) | ~4/15 | 15/15 |
| Standard directories | 3 (components, pages, assets) | 9 |
| Commented-out code blocks | 1 (layout.tsx:458-494) | 0 |
| Typo filenames | 2 (dashbaord, Mininmal) | 0 |
| ny type usage | Multiple | 0 |
| .env.example | Missing | Present |
| Route lazy loading | None | All routes lazy |

---

**Generated by: Structure & Architecture Audit**  
**Focus:** Actionable improvements for maintainability, scalability, and developer experience
