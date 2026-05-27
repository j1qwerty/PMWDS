# Comprehensive Frontend Analysis Report — PMWDS.S/Client

> **Generated:** 2026-05-27
> **Scope:** Full React + TypeScript + Tailwind v4 client application
> **Total files analyzed:** 120+ (`.ts`/`.tsx`/`.js`/`.jsx`)

---

## 1. Directory / Location Inconsistencies

| # | Issue | Details | Path |
|---|-------|---------|------|
| 1.1 | **Misspelled folder name** | `oraganisations/` should be `organisations/` or `organizations/` | `src/pages/oraganisations/` |
| 1.2 | **Dashboard components buried in shared** | `TaskStats`, `TaskPerformance`, `TaskProgressBoard`, `TaskProgressBoards2`, `Timer` live under `shared/dashboard/` instead of a proper `dashboard/` sub-feature | `src/pages/shared/dashboard/` |
| 1.3 | **Dead legacy code** | 18 components in `src/old/` are never imported by the active codebase. Includes Dialog, ConfirmDialog, selectors, dashboards, integrations, knowledge — all orphaned | `src/old/` (18 files) |
| 1.4 | **Duplicate component barrels** | `ui.tsx` exports `TaskList`, `SimpleProjectList`, `NotificationList`, `WorkloadBars` and so does `src/pages/shared/index.ts` — creates confusion about which to import | `src/ui.tsx` vs `src/pages/shared/index.ts` |
| 1.5 | **Flat page structure** | All feature folders are directly under `pages/` with inconsistent internal structures (some have `components/` subfolders, some don't) | `src/pages/` |

---

## 2. Color / Design Token Inconsistencies

### 2.1 Three competing color systems

**System A — CSS `@theme` tokens (Tailwind v4):**
- Defined in `src/index.css:9-103`
- Uses `--color-primary: #4648d4`, `--color-secondary: #8127cf`, `--color-on-surface`, etc.
- Accessed via Tailwind classes like `bg-primary`, `text-on-surface`, `border-outline-variant`
- **Used by:** `CreateProjectModal.tsx`, `EditProjectModal.tsx`, `ProjectsBoard.tsx`, `dashboard.tsx`, `ProjectDetailPane.tsx`, `ui.tsx`

**System B — Raw Tailwind utility classes (indigo/slate palette):**
- Uses `bg-indigo-50`, `text-slate-900`, `border-slate-200`, etc.
- Bear in mind the `@theme` primary is `#4648d4` (a violet-blue), NOT Tailwind's `indigo-600` (`#4f46e5`)
- **Used by:** `OrgFormModal.tsx`, `DeptFormModal.tsx`, `MilestoneFormModal.tsx`, `TaskFormModal.tsx`, `DeleteConfirmationModal.tsx`, `GradientButton.tsx`, `GlassCard.tsx`, `PageHeader.tsx`, `login.tsx`, `NeuralHeatmap.tsx`

**System C — Hardcoded hex values:**
- **Used by:** `InfoTile.tsx:10-15` (`#e0e3e5`, `#4648d4`, `#767586`, `#191c1e`)
- `dashboard.tsx:275-281,316-318` (`#F59E0B`, `#D97706`, `#FEF3C7`)
- `login.tsx:236-239` (conditional inline styles)

### 2.2 Specific color violations

| Component | Actual Color Used | Should Use | File:Line |
|-----------|-------------------|------------|-----------|
| `PageHeader.tsx` | `text-blue-700` | `text-primary` | 15 |
| `PageHeader.tsx` | `text-slate-900` | `text-on-surface` | 18 |
| `PageHeader.tsx` | `text-slate-500` | `text-on-surface-variant` | 23 |
| `GradientButton.tsx` | `bg-indigo-600`, `text-indigo-600` | `bg-primary`, `text-primary` | 13 |
| `GlassCard.tsx` | `bg-white/90`, `border-slate-200/60` | `bg-surface-container-lowest`, `border-outline-variant` | 6 |
| `login.tsx` | Entirely `text-indigo-*`, `text-slate-*` | Design tokens throughout | 1-478 |
| `InfoTile.tsx` | Hardcoded hex `#4648d4` | `text-primary` | 11 |
| `InfoTile.tsx` | Hardcoded hex `#767586` | `text-outline` | 13 |
| `InfoTile.tsx` | Hardcoded hex `#191c1e` | `text-on-surface` | 14 |

### 2.3 Status color duplication (4 locations)

| Location | Key Type | Extra Fields | File:Line |
|----------|----------|-------------|-----------|
| `colors.ts` | `statusColorPalette` | `headerBg`, `headerText`, `badgeBg`, `badgeText` | 13-74 |
| `StatusBadge.tsx` | `statusStyles` (×2) | Just `bg`, `text`, `dot` (⚠️ missing `border`) | 20-28 & 72-80 |
| `ui.tsx` | `statusColors` | `bg`, `text`, `border` | 273-312 |
| `ProjectDetailPane.tsx` | `getHealthColor()` | `dot`, `text`, `label` | 314-318 |

Values for "Delayed" differ across all copies:
- `colors.ts`: `bg: "bg-orange-100"`, `text: "text-red-600"` (inconsistent — orange bg + red text)
- `StatusBadge.tsx`: `bg: "bg-error-container"`, `text: "text-error"`
- `ui.tsx`: `bg: "bg-error-container"`, `text: "text-error"`

### 2.4 Priority color duplication (2 locations)

| Location | File:Line |
|----------|-----------|
| `colors.ts` | 76-101 |
| `ui.tsx` (missing, only status) | — |

### 2.5 Modal overlay inconsistency

| Modal | Overlay Class | File |
|-------|---------------|------|
| `ModalOverlay.tsx` | `bg-black/35 backdrop-blur-md` | `pages/shared/ModalOverlay.tsx:11` |
| `CreateProjectModal` | `bg-black/40 backdrop-blur-sm` | `projects/components/CreateProjectModal.tsx:49` |
| `UserEditModal` | `bg-slate-950/40 backdrop-blur-sm` | `users/UserEditModal.tsx:94` |
| Old dialogs | Uses `<Dialog>` wrapper | `src/old/components/common/Dialog.tsx` |
| `OrgFormModal`, `DeptFormModal`, `DeleteConfirmationModal` | **No overlay at all** | `pages/shared/OrgFormModal.tsx`, etc. |

---

## 3. Interface / Type Issues

| # | Issue | Details | File:Line |
|---|-------|---------|-----------|
| 3.1 | **Interface defined in wrong file** | `WorkloadItem` is in `ui.tsx:624-633`, should be in `types.ts` | `src/ui.tsx` |
| 3.2 | **Inline anonymous types in DashboardData** | `recentEscalations[]`, `projectHealthBreakdown[]`, `workloadDistribution[]`, `departmentWorkloadDistribution[]`, `taskCompletionTrend[]` are all inline anonymous types | `types.ts:424-461` |
| 3.3 | **Untyped API returns** | Many methods return `Record<string, unknown>` | `api.ts:171,180,266,441,686,722` |
| 3.4 | **Local type declarations** | `ProjectFormState` defined inside component instead of shared types | `CreateProjectModal.tsx:5-17` |
| 3.5 | **Naming convention inconsistency** | ~50% use `*Record` suffix (`OrganizationRecord`, `RoleRecord`), others don't (`Department`, `Project`, `Milestone`, `User`) | `types.ts` (all) |
| 3.6 | **Missing type for StatusBadge** | `StatusBadgeProps` takes `status: string` — should be a union type of valid statuses | `StatusBadge.tsx:67-69` |
| 3.7 | **Zod only used in login** | Zod v4 is a dependency but only validates login forms | `login.tsx:9-30` |
| 3.8 | **TaskAssignee too sparse** | Only `userId` + optional `fullName`; code accesses other properties that don't exist | `types.ts:674-677` |

---

## 4. Route Naming Inconsistencies

| Route | Pattern | Issue |
|-------|---------|-------|
| `/notificationsPage` | camelCase | Should be `/notifications` or `/notifications-page` |
| `/milestonesPage` | camelCase | Should be `/milestones` or `/milestones-page` |
| `/departmentsPage` | camelCase | Should be `/departments` or `/departments-page` |
| `/organizationStructure` | camelCase | Should be `/organization-structure` |
| `/activity-logs` | kebab-case | Only route using kebab-case — inconsistent with all others |

---

## 5. API / Data Layer Issues

| # | Issue | Details | Examples |
|---|-------|---------|----------|
| 5.1 | **Token threading anti-pattern** | `token` is passed as a parameter to every single API method (~120 calls) instead of using an interceptor | Every method in `api.ts` |
| 5.2 | **Untyped payloads** | Most create/update methods accept `Record<string, unknown>` instead of typed DTOs | `api.ts:122,158,160,202,209,236,239...` (~40 methods) |
| 5.3 | **Missing return types** | `getTaskRecommendation` → `Record<string, unknown>`, should be `AssigneeRecommendation` | `api.ts:266` |
| 5.4 | **Missing return types** | `optimizeProjectResources` → `Record<string, unknown>`, should be `ResourceOptimizationRecord` | `api.ts:180` |
| 5.5 | **Missing return types** | `getDepartmentDashboard` → `Record<string, unknown>` | `api.ts:441` |
| 5.6 | **Missing return types** | `trainModels` → `Record<string, unknown>` | `api.ts:687` |
| 5.7 | **Missing return types** | `getModelPerformance` → `Record<string, number>` (flat map, no model identity) | `api.ts:722` |
| 5.8 | **No pagination abstraction** | Manual query param construction (`query: { count }`, `query: { page, pageSize }`) | `api.ts:452,456,879-908` |
| 5.9 | **No request cancellation** | No `AbortController` support | `api.ts:63-112` |
| 5.10 | **No retry logic** | Failed requests are not retried | `api.ts:96-104` |
| 5.11 | **Inconsistent method naming** | `getMilestonesByProject` vs `getDashboard` vs `getAiBurnoutRisk` vs `getMyTasks` — no consistent verb pattern | Throughout `api.ts` |
| 5.12 | **Hardcoded API base URL fallback** | `http://localhost:5177/api/v1` hardcoded in source | `api.ts:53` |

---

## 6. Modal / Dialog Inconsistencies

### 6.1 Three different modal overlay patterns

| Pattern | Components |
|---------|-----------|
| **Uses `ModalOverlay` component** | `MilestoneFormModal.tsx`, `TaskFormModal.tsx` |
| **Inline `fixed inset-0 z-50` overlay** | `CreateProjectModal.tsx`, `EditProjectModal.tsx`, `UserEditModal.tsx`, `PermissionFormModal.tsx`, `RoleFormModal.tsx`, `RuleFormModal.tsx`, `TemplateFormModal.tsx`, `BroadcastModal.tsx` |
| **No overlay (just renders content)** | `DeleteConfirmationModal.tsx`, `OrgFormModal.tsx`, `DeptFormModal.tsx`, `ProfileFormModal.tsx`, `SkillFormModal.tsx` |

### 6.2 Open/close prop naming

| Prop Name | Components |
|-----------|-----------|
| `show` | `CreateProjectModal`, `EditProjectModal`, `DeleteProjectModal` |
| `open` | `MilestoneFormModal`, `TaskFormModal` |
| No visibility prop | `OrgFormModal`, `DeptFormModal`, `DeleteConfirmationModal`, `UserEditModal` (always rendered, controlled by parent) |

### 6.3 Naming convention with old code

- New code: `*FormModal.tsx` — 12 components
- Old code (`src/old/`): `*FormDialog.tsx`, `*Dialog.tsx` — 9 components

### 6.4 Modal width inconsistency

| Width | Components |
|-------|-----------|
| `w-[520px]` | `OrgFormModal`, `MilestoneFormModal` |
| `w-[560px]` | `DeptFormModal` |
| `w-[920px]` | `TaskFormModal` |
| `max-w-2xl` | `CreateProjectModal` |
| `max-w-[440px]` | `DeleteConfirmationModal` |
| `max-w-3xl` | `UserEditModal` |

### 6.5 Button styling inconsistency

Cancel buttons:
- Raw colors: `border border-slate-200 bg-white text-slate-600` (OrgFormModal, DeptFormModal, MilestoneFormModal, etc.)
- Design tokens: `border border-outline-variant bg-surface-container-lowest text-on-surface-variant` (CreateProjectModal, EditProjectModal)

Submit buttons:
- Raw: `bg-indigo-600 text-white` (OrgFormModal, DeptFormModal, MilestoneFormModal, TaskFormModal)
- Tokens: `primary-gradient text-white` / `gradient-btn text-white` (CreateProjectModal, EditProjectModal)

---

## 7. Security Issues

| # | Issue | Severity | Details | Location |
|---|-------|----------|---------|----------|
| 7.1 | **JWT in localStorage** | **HIGH** | Full auth state (token, expiry, userId, roles) stored in plain text `localStorage`. XSS vulnerability | `auth.tsx:48-49,54-57` |
| 7.2 | **Hardcoded demo password** | MEDIUM | `Pmwds@123` hardcoded for all 6 demo accounts | `login.tsx:43,114` |
| 7.3 | **No CSRF protection** | MEDIUM | No CSRF tokens, no `SameSite` cookie config visible | `api.ts:63-112` |
| 7.4 | **No login rate limiting** | LOW | No throttling, captcha, or exponential backoff on login form | `login.tsx` |
| 7.5 | **Error message leakage** | LOW | Raw server error messages passed directly to UI | `api.ts:103`, `auth.tsx:96` |
| 7.6 | **Weak password policy** | LOW | Only `min(6)` validation in Zod | `login.tsx:10` |

---

## 8. Dummy / Mock Data (Scattered)

**No centralized mock file exists.** Dummy data is defined inline across 3+ components:

| Component | Dummy Data | File:Line |
|-----------|-----------|-----------|
| `NeuralHeatmap.tsx` | `DUMMY_HEATMAP_DATA` (6 departments × 4 fields), `DUMMY_PROJECT_NAMES` (5 names) | 9-20 |
| `ProjectDetailPane.tsx` | `calculateDummyHealth()` — computes schedule/budget/team/quality scores from project fields when `health` prop is null | 276-303 |
| `dashboard.tsx` | **4 static hardcoded alert cards**: "API Gateway Timeout" (line 266), "Resource Bottleneck" (line 275), "Server Downtime Risk" (line 306), "Security Policy Breach" (line 316) | 264-328 |
| `HealthCard.tsx` | Inline dummy generation (`// generate dummy data`) | 11 |

---

## 9. Code Quality Issues

| # | Issue | Details | File:Line |
|---|-------|---------|-----------|
| 9.1 | **`any` type used** | `useState<any>(null)` defeats TypeScript's type checking for the entire dashboard data | `dashboard.tsx:24` |
| 9.2 | **Empty div** | `<div className="w-2/3"></div>` renders nothing useful | `dashboard.tsx:117-118` |
| 9.3 | **Commented-out code** | Several dead blocks remain in source | `dashboard.tsx:127,151,243`, `login.tsx:151` |
| 9.4 | **Import typo** | `.//pages/activity/` — double slash | `App.tsx:26` |
| 9.5 | **Unused functions** | `MilestonesSection()`, `MilestonesTabPlaceholder()` are defined but never called | `ProjectDetailPane.tsx:458-473` |
| 9.6 | **Timer leak risk** | Auth refresh timer (`setTimeout`) has no cleanup on unmount handler beyond the `useEffect` return (OK, but worth verifying) | `auth.tsx:90-91` |
| 9.7 | **Inlined arrays** | `["Low", "Medium", "High", "Critical"]` hardcoded in components instead of importing from `constants.ts` | `TaskFormModal.tsx:130` |
| 9.8 | **Missing edge case handling** | `notificationResult` — `Array.isArray()` check suggests sometimes returns non-array | `dashboard.tsx:61` |
| 9.9 | **Implicit boolean coercion** | `task.dueDate && new Date(task.dueDate) < new Date()` — fair but fragile without validation | `ui.tsx:319-321` |

---

## 10. Constants / Enum Duplication

### 10.1 Status strings — 4+ locations

```typescript
// 1. constants.ts
export const projectStatuses = ["NotStarted", "InProgress", "OnHold", "Completed", "Cancelled", "Delayed"];
export const taskStatuses = ["NotStarted", "Assigned", "InProgress", "OnHold", "Completed", "Delayed", "Cancelled"];

// 2. ui.tsx (TaskList)
const statusColors: Record<string, { bg, text, border }> = { NotStarted, Assigned, InProgress, Completed, Delayed, OnHold, Cancelled };

// 3. colors.ts
export const statusColorPalette = { 'Not Started', 'In Progress', 'Completed', 'Delayed', 'On Hold', 'Cancelled' };
// ⚠️ NOTE: keys use space + capital letters ('Not Started') vs camelCase ('NotStarted') in constants.ts!

// 4. StatusBadge.tsx
const statusStyles: Record<string, { bg, text, border, dot }> = { NotStarted, Assigned, InProgress, Completed, Delayed, OnHold, Cancelled };
```

### 10.2 Priority strings — 3 locations

```typescript
// 1. constants.ts
export const priorities = ["Low", "Medium", "High", "Critical"];

// 2. colors.ts
export const priorityColorPalette = { Low, Medium, High, Critical };

// 3. TaskFormModal.tsx (inline)
options={["Low", "Medium", "High", "Critical"].map(p => ...)}
```

### 10.3 Availability statuses — 2 locations

```typescript
// 1. constants.ts
export const availabilityStatuses = ["Available", "Busy", "OnLeave", "PartiallyBusy"];

// 2. UserEditModal.tsx (inline — different values!)
const availabilityOptions = ["Available", "Busy", "Away", "InMeeting", "Offline", "DeepWork"];
// ⚠️ "Away", "InMeeting", "Offline", "DeepWork" only exist here, not in constants.ts!
```

---

## 11. Missing / Dead Imports

| # | Issue | File:Line |
|---|-------|-----------|
| 11.1 | `LoginSidebar` imported but `{/* <LoginSidebar/> */}` is commented out | `login.tsx:5,151` |
| 11.2 | `MilestonesTab` import path may be stale since the component exists in `shared/MilestonesTab.tsx` but is never used | `ProjectDetailPane.tsx` |
| 11.3 | `PageSkeleton` imported but not found in `shared/index.ts` exports — it's `LoadingPage` / `Skeleton` | `dashboard.tsx:13` |

---

## 12. Import Pattern Inconsistencies

| Pattern | Examples | Issue |
|---------|----------|-------|
| `../../types` | `CreateProjectModal.tsx`, `EditProjectModal.tsx` | Relative depth depends on file location |
| `../../../types` | `ProjectDetailPane.tsx` | Same depth, different count |
| `../shared` | `CreateProjectModal.tsx` | Varies |
| `../../shared` | `TaskFormModal.tsx` | Varies |
| `from ".//pages/..."` | `App.tsx:26` | Typo double-slash |
| Mixed relative/barrel | Components import directly from `ui.tsx` AND from `./shared/index.ts` | Need unified barrel |

---

## 13. Unused / Dead Code

| Component / Function | Location | Status |
|----------------------|----------|--------|
| All 18 files | `src/old/` | **Orphaned** — no active imports |
| `LoginSidebar.tsx` | `src/pages/login/LoginSidebar.tsx` | **Imported but not rendered** |
| `MilestonesSection()` | `ProjectDetailPane.tsx:458` | **Defined but never called** |
| `MilestonesTabPlaceholder()` | `ProjectDetailPane.tsx:466` | **Defined but never called** |
| `<TaskProgressBoards/>` | `dashboard.tsx:127` | **Commented out** |
| `Admin Only` badge span | `dashboard.tsx:243` | **Commented out** |

---

## 14. CSS Cleanup Opportunities

| # | Issue | File |
|---|-------|------|
| 14.1 | **Duplicate font-size utilities** | `@utility text-h1` + `@utility font-h1` define identical values; same for `display`, `h2`, `body-lg`, `body-md`, `numeric` — 10 utilities where 5 would do | `index.css:106-186` |
| 14.2 | **Hardcoded colors in utility classes** | `bg-warning-light`, `bg-warning-light-20`, `bg-error-container-10`, `bg-secondary-container-10`, `bg-error-10` hardcode hex/rgb values instead of using theme variables | `index.css:229-247` |
| 14.3 | **Unused CSS classes** | `.badge-success`, `.badge-error`, `.badge-warning` reference `--success-bg`, `--warning-bg` that are not defined in `@theme` | `index.css:357-370` |
| 14.4 | **`--radius-default` reference** | Used in `.skeleton` but not defined in `@theme` | `index.css:383` |
| 14.5 | **Commented-out Tailwind config** | Old Tailwind config object in HTML comment | `index.html` |

---

## 15. Missing State Management

The app has **no dedicated state management library** (no Redux, Zustand, Jotai, Recoil, etc.):

| Concern | Current Approach | Pain Point |
|---------|-----------------|------------|
| Server data | Local `useState` + `useEffect` per page | No caching, no dedup, waterfall requests | 
| Auth | `useContext` + localStorage | Re-renders entire tree on change |
| Notifications | Polled per page | No global unread badge state |
| Theme/UI | Ad-hoc per component | No consistent theme toggle |
| Form state | Local `useState` per modal | Verbose, no persistence |

---

## 🚀 Top 10 Recommended Improvements

### High Priority
1. **Unify to ONE color system** — remove all raw `text-slate-*`/`bg-indigo-*`/hardcoded hex; use only `@theme` CSS variable tokens throughout every component
2. **Create a `BaseModal` component** — single overlay, portal-based, with consistent `{ open, onClose }` props, escape-key handling, and animation. Refactor all 17+ modals to use it
3. **Add HTTP interceptor for auth** — stop threading `token` as a parameter to every API call; inject it automatically via a fetch/Axios wrapper

### Medium Priority
4. **Delete or quarantine `src/old/`** — remove dead code technical debt
5. **Standardize route naming** — convert `/milestonesPage`, `/notificationsPage`, `/departmentsPage`, `/organizationStructure` to kebab-case
6. **Consolidate constants** — create a single source of truth for statuses, priorities, availability; create Zod enums; delete all inline duplicates
7. **Add React Query or SWR** — replace ad-hoc `useState` + `useEffect` data fetching with proper caching, deduplication, and background refetching
8. **Rename `oraganisations/` → `organizations/`** and fix all imports

### Low Priority
9. **Extract mock data** — move all inline dummy data into a `src/mock/` directory with factory functions
10. **Add Zod validation everywhere** — extend Zod schemas beyond login to cover all entities; validate API responses at runtime

---

## File Count Summary

| Category | Count |
|----------|-------|
| Total `.ts`/`.tsx` files (active) | ~92 |
| Legacy files (`src/old/`) | 18 |
| Modal/Dialog/Overlay components | 26 (17 active + 9 legacy) |
| Distinct color declaration files | 3 (`index.css`, `colors.ts`, `ui.tsx`) |
| Status color DUPLICATE locations | 4 |
| Priority color DUPLICATE locations | 2 |
| API service files | 1 (925 lines) |
| Type/DTO files | 1 (761 lines) |
| Mock/dummy data files | 0 (all inline) |

---

## 16. `useMemo` Opportunities

### 16.1 Already using `useMemo`

| File | What's Memoized |
|------|----------------|
| `dashboard.tsx` | `departmentWorkload` (line 73) |
| `projects.tsx` | `filteredProjects`, `filteredDepartments` (lines 117, 142) |
| `ai.tsx` | `visibleDepartments`, `visibleProjects` (lines 70, 76) |
| `MilestonesPage.tsx` | `filteredOrganizations`, `filteredDepartments`, `filteredProjects`, `milestoneTasks` (lines 132-185) |
| `ActivityLogsPage.tsx` | `activityTypes`, `filteredLogs` (lines 74, 80) |
| `reports.tsx` | `visibleDepartments`, `visibleProjects` (lines 55, 61) |
| `DepartmentsPage.tsx` | `filteredDepartments` (line 95) — but other ops are NOT memoized |
| `tasks.tsx` | `filteredProjects`, `filteredMilestones`, `filteredTasks`, `searchResults`, `milestoneTasks`, `unassignedTasks` |
| `users.tsx` | `visibleDepartments` (line 282) — but other ops are NOT memoized |
| `UserEditModal.tsx` | `departmentsByOrg` (line 38) |
| `UserSkillsPanel.tsx` | `existingSkillIds` (line 28) |
| `ScopedUserSelect.tsx` | `filteredUsers` (line 34) |
| `DepartmentList.tsx` | `filteredList` (line 24) |
| `OrganizationDepartmentFilter.tsx` | `visibleOrganizations`, `visibleDepartments` (lines 36, 44) |
| `TaskProgressBoards2.tsx` | `projects`, `filteredTasks` |
| `TaskPerformance.tsx` | `filteredTasks` |
| `TaskProgressBoard.tsx` | Uses `useMemo` |

### 16.2 Missing `useMemo` (High Priority)

**1. `ProfilesPage.tsx:109`** — `filteredUsers` computed by filtering the entire `users` array against `searchTerm` on every render. As user types each keystroke, a re-render re-runs the filter.

**2. `UsersTable.tsx:37-50`** — `filteredDepartments` + `filteredUsers` with 3 nested `.find()` calls per user (lines 46-47) into `departments` and `organizations` arrays. O(users × departments) per render.

**3. `SkillsPage.tsx:59-62`** — `categories` (`map` + `Set` + `filter`) and `filteredSkills` both recompute on every render regardless of whether `skills`/`searchTerm`/`selectedCategory` changed.

**4. `OrganizationDetail.tsx:39-47`** — `reduce` on `departments` for average capacity, `getDeptHead()` users find per department, `getTeamMembers()` user filter per department — all inside the render body. Called in a `.map()` over departments (line 184), creating O(departments × users) complexity per render.

**5. `TaskDetail.tsx:50-60`** — `assignedUsersResolved` maps over `assignees` with nested `users.find()` to resolve names. Same pattern duplicated for subtasks (lines 320-330). O(assignees × users) per render.

**6. `MilestoneDetail.tsx:30,170-183`** — `completedTasks` count filter + per-task assignee resolution with nested `users.find()`. Same pattern as `TaskDetail`.

**7. `DependencyManagement.tsx:57-58`** — **identical** `.filter()` on `allTasks` executed **twice** (`predecessorTasks` and `successorTasks` produce the same result). Double the work on every render.

**8. `OrganizationStructurePage.tsx:58-59`** — `selectedOrg` find + `orgDepartments` filter run on every render.

**9. `DepartmentsPage.tsx:106-128`** — 6+ array operations per render: `find` on departments, `find` on organizations, `filter` on users, `find` on users, `find` on departments, `filter` on departments, plus `filter` inside JSX (line 216). Highest density of unmemoized operations in the codebase.

**10. `NotificationsPage.tsx:88` / `notifications.tsx:89`** — `unreadCount = items.filter(i => !i.isRead).length` runs on every render directly affecting stats/badge display.

### 16.3 Missing `useMemo` (Medium Priority)

| # | File | Operation | Line(s) |
|---|------|-----------|---------|
| 11 | `RolesPage.tsx` | `permissions.filter().length` + `roles.reduce()` for stat cards | 139, 145 |
| 12 | `PermissionsTable.tsx` | `permissions.reduce()` to group by module | 15 |
| 13 | `RoleFormModal.tsx` | Same group-by-module reduce as PermissionsTable | 44 |
| 14 | `ProjectCard.tsx` | 3× `users.find()` / `departments.find()` / `organizations.find()` per card | 19-20, 88 |
| 15 | `ActivityList.tsx` | `users.find()` inside `.map()` over activity logs | 70 |
| 16 | `UserDepartmentManager.tsx` | `organizations.map()` with nested `departments.filter()` per org | 43-46 |
| 17 | `MilestonesTab.tsx` | `tasks.reduce()` to group by milestone | 50 |
| 18 | `BurnoutPanel.tsx` | Two independent `.filter()` calls on `burnout` array | 10, 11-14 |
| 19 | `StatsCards.tsx` | `burnout.filter()` for high-risk count | 10 |
| 20 | `NeuralHeatmap.tsx` | `getHeatmapData()` with `.map()` / `.find()` / `.reduce()` chain | 24-47 |
| 21 | `users.tsx` | Inline `reduce` for avg workload + `filter` for active count | 124, 130 |
| 22 | `departments.tsx` | `find` on departments + `find` on orgs + `filter` on departments | 57-59 |
| 23 | `UserEditModal.tsx` | `departments.filter().map()` inside JSX (line 193) | 193 |

### 16.4 Summary

- **18 files** already use `useMemo` correctly
- **29 files** have expensive render-body array operations without `useMemo`
- **Top 10** high-priority files have the highest performance ROI (repeated `.filter()`/`.find()`/`.reduce()` on large arrays inside render)
- Most common pattern: filtering/searching arrays without memoization causes redundant O(n) iteration on every render cycle, even when the source data hasn't changed
