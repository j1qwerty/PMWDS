# React TODO — PMWDS Client

**Created:** 2026-07-04
**Owner:** PMWDS frontend
**Source reports:** `react-performance-audit.md`, `react-security-audit.md`, `react-structure-audit.md`, `todo-react-fix.md`
**Client root:** `E:\saturday\PMWDS.S\Client`

> This file supersedes `todo-react-fix.md` as the single living tracker for the React client. Update statuses here as work lands.

---

## How to use this file (read first)

**Process for every task**
1. Before writing any code, surface the important decisions for that task and ask the user — each question must come with a **recommended option**. Do not silently pick an approach for anything non-trivial.
2. Implement only after the approach is agreed.
3. After finishing a task: update its status here, and **update `docs/temp/project-overview.md`** with any new pattern / convention / file-name that future changes must respect.
4. Phases are ordered — earlier phases unblock later ones (e.g. split `api.ts` before adding retry logic to the client).

**Subagent delegation**
- Tasks tagged **`[independent]`** have no shared mutable state with other open tasks and can be handed to subagents in parallel (one agent per file / per phase).
- Tasks tagged **`[coordinated]`** touch shared files or contracts and should be done sequentially or by the same agent.
- When delegating, give the subagent: the task id, the source-report reference, the exact files, and the **Verification** steps below.
- Subagents must NOT implement tasks outside their assigned scope and must NOT edit `project-overview.md` (the lead does that).

**Status legend:** 🔴 Pending · 🟡 In progress · ✅ Done · ⚠️ Blocked / needs decision

---

## Cross-cutting initiative — Robust permission & role model

This is tracked in full in `dotnet-todo.md` **Phase 1**. The React side only *consumes* the result; no client-side auth logic should be invented independently.

- Current permissions are generic — there is **no permission for the "primary department"** that creates a project. Backend will add a permission (e.g. `ProjectPrimaryDepartment.Manage`); the client must then surface the right UI for the primary department head.
- **Role display names can be renamed** by SuperAdmin, and roles can be created. The backend will move to an immutable **Role Key** distinct from display **Name**. **Frontend must stop comparing against display-name strings** (e.g. any `role === "SuperAdmin"` checks) and switch to keys/permissions.
- Client-side route guards (`App.tsx` `ROUTE_GUARDS`, `PermissionControls.tsx`) are **UI hiding only** — they must stay backed by server enforcement. Do not rely on them for security.

➡️ When `dotnet-todo.md` Phase 1 lands, open a follow-up task here to refresh `ROUTE_GUARDS` + the client permission constants.

---

## Phase 0 — Security & correctness (P0 — do first)

| # | Task | Files | Source | Status |
|---|------|-------|--------|--------|
| 0.1 | Migrate JWT from `localStorage` to httpOnly+Secure+SameSite cookies (backend coord) **or** memory-only + short-lived `sessionStorage`. Never persist full `AuthState` (email/roles/permissions). | `src/auth.tsx:55-65` | sec C-1 / H-1 / S5 | 🔴 |
| 0.2 | Add `AbortController` to the `request()` helper; abort on unmount in every `useEffect` that calls `api.*`. Prioritise the dashboard (10 parallel calls). `[coordinated]` with 1.1 | `src/api.ts:76-129`, `src/pages/dashboard/dashboard.tsx:95-126` | sec C-2 / perf 6 | 🔴 |
| 0.3 | Rotate exposed OpenRouter key; remove real value from `.env.example`; confirm `.env` in `.gitignore`. `[coordinated]` with dotnet 0.1 | `.env.example:34` | sec C-3 | 🔴 |
| 0.4 | Replace `dangerouslySetInnerHTML` SVG with a programmatic React SVG component. `[independent]` | `src/pages/shared/bg/BgRenderer.tsx:41-43` | sec C-4 | 🔴 |
| 0.5 | Add Content-Security-Policy (meta tag or header). `default-src 'self'`, restrict `script-src`/`style-src`/`img-src`/`connect-src`/`frame-ancestors`. Start in report-only. `[coordinated]` with dotnet 5.4 | `index.html`, `vite.config.ts` | sec C-5 | 🔴 |
| 0.6 | CSRF protection for auth endpoints (X-CSRF-Token header validated server-side; SameSite=Strict on any cookie). `[coordinated]` with dotnet | `src/api.ts:137-163` | sec C-6 | 🔴 |
| 0.7 | Stop sending full AI provider API keys to the frontend — send `hasKey: boolean` only; proxy all AI calls + "test provider" through backend. `[coordinated]` with dotnet 0.6 | `src/pages/settings/AISettings.tsx:396-416` | sec H-3 | 🔴 |
| 0.8 | File upload validation: size limit (≤5MB), dimension check, reject non-image MIME before crop/network. `[independent]` | `src/pages/shared/ProfilePictureUploader.tsx:44-61` | sec H-8 | 🔴 |

---

## Phase 1 — Architecture & file structure (P1)

| # | Task | Files | Source | Status |
|---|------|-------|--------|--------|
| 1.1 | Split `api.ts` (996 lines) → `src/api/` domain modules (`client.ts` + `auth.api.ts`, `projects.api.ts`, `tasks.api.ts`, …, `index.ts`). `[coordinated]` — touches every import | `src/api.ts` | perf 5 / struct C1 | 🔴 |
| 1.2 | Split `types.ts` (1065 lines) → `src/types/` domain files; move DTOs to `src/types/dto/`. `[coordinated]` | `src/types.ts` | struct C2 | 🔴 |
| 1.3 | Split `layout.tsx` (706 lines) → `src/components/layout/` (Sidebar, SidebarNavItem, Topbar, sectionThemes, iconMap, navGroups). Replace IIFE nav items with `SidebarLink` + `.map()`. Throttle resize handler. `[independent]` once 1.7 lands | `src/layout.tsx` | struct C3 / perf 8,15 | 🔴 |
| 1.4 | Replace monolithic `getPagesData` overfetch with per-domain fetching (TanStack Query recommended). Keep only truly global data in context. Add `useProjects()`, `useUsers()`, etc. `[coordinated]` | `src/appData.tsx` | struct C4 / perf 21 | 🔴 |
| 1.5 | Route-level code splitting: `React.lazy` + `<Suspense>` for all 18+ page imports. Create shared `PageSkeleton`. `[independent]` | `src/App.tsx:12-37` | perf 1 / struct W10 | 🔴 |
| 1.6 | Split god page files (orchestrator ≤100 lines + `usePageData` + extracted sections). Files: `ProjectTasksPage.tsx` (702), `SkillsPage.tsx` (877), `AISettings.tsx` (723), `ProjectMilestonesPage.tsx` (689), `login.tsx` (627), `dashboard.tsx` (395), `NewProjectPage.tsx` (544). `[independent]` per page | `src/pages/**` | struct C5/C6 / perf 11 | 🔴 |
| 1.7 | Create standard directories: `src/api/ src/types/ src/hooks/ src/services/ src/utils/ src/constants/ src/providers/ src/routes/`. Standardise naming. `[coordinated]` | `src/` | struct W5/W6/W8 | 🔴 |

---

## Phase 2 — Performance (P1)

| # | Task | Files | Source | Status |
|---|------|-------|--------|--------|
| 2.1 | Wrap pure leaf components in `React.memo`: `ui.tsx` (Panel, StatCard, MetricRow, MetricTile, EmptyState, SimpleProjectCards, UserTable), `Avatar`, `StatusBadge`, `PriorityBadge`. `[independent]` | `src/ui.tsx`, `src/pages/shared/*` | perf 2 | 🔴 |
| 2.2 | Debounce `SearchBar` (300ms, cleanup on unmount). | `src/pages/shared/search.tsx` | perf 3 | ✅ |
| 2.3 | Stabilise `NavHeaderContext` value with `useMemo([state, setNavHeader])`. | `src/pages/shared/NavHeaderContext.tsx` | perf 4 | ✅ |
| 2.4 | Standardise on one icon system (`react-icons` via `Icon`); remove all `material-symbols-outlined` spans. `[coordinated]` (touches 100+ files) | all icon usages, `src/components/ui/Icon.tsx` | perf 7 | 🔴 |
| 2.5 | Auth token refresh: 2 retries w/ 1s backoff before logout; token via ref to avoid stale closure. | `src/auth.tsx:67-99` | perf 9 | 🔴 |
| 2.6 | Toast memory leak: monotonic IDs (not `Math.random`); track+clear timeouts on unmount. `[independent]` | `src/pages/shared/Toast.tsx:20-25` | perf 10 | 🔴 |
| 2.7 | Dashboard fetches with `AbortController` (see 0.2); split into per-widget hooks. | `src/pages/dashboard/dashboard.tsx` | perf 6 | 🔴 |
| 2.8 | Remove `any` types (dashboard:47, ProjectBasicDetails:22, TaskSubtaskDetailsModal:19-20, ReportViewer:46, BgControls). `[independent]` per file | multiple | perf 13 / struct W13 | 🔴 |

---

## Phase 3 — Accessibility & UX (P1)

| # | Task | Files | Source | Status |
|---|------|-------|--------|--------|
| 3.1 | `useFocusTrap` hook: trap Tab, focus on open, restore focus on close, close on Escape. Apply to all modals. `[independent]` hook, then `[coordinated]` apply | `ModalOverlay.tsx`, `ProfilePictureUploader.tsx`, `TaskEditModal.tsx`, `SubtaskEditModal.tsx`, `ProjectFormModal.tsx` | sec H-4 | 🔴 |
| 3.2 | `aria-label` on every icon-only button. | `layout.tsx`, modals, `login.tsx`, etc. | sec H-5 | ✅ |
| 3.3 | Form label associations: `htmlFor` on `<label>` + matching `id` on input (30+ forms). `[independent]` per form | `login.tsx`, `TemplateFormModal.tsx`, `ActivityForm.tsx`, `RegisterUserForm.tsx`, `ProgressStatusEditor.tsx`, `AISettings.tsx` | sec H-6 | 🔴 |
| 3.4 | Replace native `confirm()` with accessible `DeleteConfirmationModal`. `[independent]` | `TaskEditModal.tsx:93`, `SubtaskEditModal.tsx:34`, `ProgressStatusEditor.tsx:70` | sec H-7 | 🔴 |
| 3.5 | Fix heading hierarchy (one `h1`, sequential levels). `[independent]` per page | `ai.tsx`, `login.tsx`, `SkillsPage.tsx` | sec M-5 | 🔴 |
| 3.6 | Standardise loading states via `useAsyncData<T>` + `LoadingPage`/`Skeleton`. | all data-fetching pages | sec M-6 / struct S2 | 🔴 |
| 3.7 | Keyboard navigation for custom dropdowns (ARIA combobox: Arrow/Enter/Escape). | `ProjectBasicDetails.tsx:156-209` | sec M-7 | 🔴 |
| 3.8 | Sanitise server error messages in non-dev builds; log full detail server-side. `[coordinated]` with 1.1 | `src/api.ts:109-117` | sec M-8 | 🔴 |

---

## Phase 4 — Code quality & consistency (P2)

| # | Task | Files | Source | Status |
|---|------|-------|--------|--------|
| 4.1 | Retry logic (exp. backoff, max 3) for 429/5xx in API client. (after 1.1) | `src/api/client.ts` | sec M-1 | 🔴 |
| 4.2 | Remove hardcoded demo creds from login. | `src/pages/login/login.tsx:68-69` | sec M-2 | 🔴 |
| 4.3 | SRI + `crossorigin="anonymous"` on Google Fonts (self-host in prod). `[independent]` | `index.html:8` | sec M-3 | 🔴 |
| 4.4 | `referrerpolicy="no-referrer"` on external avatars (ideally generate locally). | `Avatar.tsx:57`, `Avatark.tsx:58` | sec M-4 | 🔴 |
| 4.5 | Single `classNames` util in `src/utils/classNames.ts` (or `clsx`+`tailwind-merge`). | `layout.tsx:47-49`, `ui.tsx:67-69` | struct W4 | 🔴 |
| 4.6 | Remove dead code (commented Chat nav + unused `HiChat`). | `layout.tsx:458-494` | struct W2 | ✅ |
| 4.7 | Barrel `index.ts` for each page folder. `[independent]` per folder | `pages/ai`, `pages/departments`, … | struct W12 | 🔴 |
| 4.8 | Strict TS: `noUnusedLocals`/`noUnusedParameters` true; fix fallout. `[coordinated]` | `tsconfig.app.json:19-20` | perf 18 | 🔴 |
| 4.9 | Rename misspelled files. | `dashbaordStats.tsx`, `StatusBadgeMininmal.tsx` | perf 19 / struct W7 | ✅ |
| 4.10 | Define `--success-bg`, `--warning-bg`, `--radius-default`; fix `.gradient-btn`. | `src/index.css:348,358` | sec L-7 / struct W9 | ✅ (`.gradient-btn` remaining) |
| 4.11 | Client-specific `.env.example`. | `Client/.env.example` | struct W1 | ✅ |

---

## Phase 5 — Polish & enhancements (P3)

| # | Task | Files | Source | Status |
|---|------|-------|--------|--------|
| 5.1 | Error Boundary at `AppRoutes` level. `[independent]` | `src/App.tsx` / new `ErrorBoundary.tsx` | struct S1 | 🔴 |
| 5.2 | `useDeferredValue` for expensive filtering. | `projectsK.tsx:192-206` | perf 16 | 🔴 |
| 5.3 | Optimise Framer Motion (CSS transitions; `layoutId`; lazy import). | `StatusDropdown.tsx`, `TaskSubtaskDetailsModal.tsx` | perf 17/23 | 🔴 |
| 5.4 | Replace inline JSX arrow handlers with `useCallback`/named fns. | multiple | perf 22 | 🔴 |
| 5.5 | Auth `refresh` stale closure → token ref + functional `setAuth`. | `src/auth.tsx:110-118` | perf 20 | 🔴 |
| 5.6 | Stable list keys (no array index). | `dashboardStats.tsx` | perf 14 | ✅ |
| 5.7 | Merge `Avatar.tsx` + `Avatark.tsx`. `[independent]` | shared | sec L-3 | 🔴 |
| 5.8 | Semantic HTML (`<button>`, `<nav>`, `<main>`, `<section>`). | multiple | sec L-5 | 🔴 |
| 5.9 | `role="alert"` / `aria-live` on dynamic messages. | toasts, errors, banners | sec L-6 | 🔴 |
| 5.10 | `useMemo` for expensive computations (topological sort, etc.). | `projectsK.tsx:156-190` | perf 12 | 🔴 |

---

## Completed ✅ (quick reference)

- 2.2 Debounce SearchBar
- 2.3 NavHeaderContext `useMemo`
- 3.2 aria-labels on icon buttons
- 4.6 Remove dead code (commented Chat nav)
- 4.9 Rename misspelled files
- 4.10 Fix undefined CSS variables (`.gradient-btn` still pending)
- 4.11 `Client/.env.example`
- 5.6 Stable list keys

## High-effort / high-impact (plan accordingly)
- 1.1 split `api.ts`, 1.2 split `types.ts` (touch every file)
- 1.4 fix `appData.tsx` overfetching (architectural)
- 1.6 split god page files
- 0.1 auth migration (backend + frontend coordinated)

## Open questions to resolve before implementation
- **0.1 / 0.6** — confirm backend will move to httpOnly cookies (drives CSRF design). *Recommended: yes, cookies + SameSite=Strict + CSRF token.*
- **1.4** — adopt TanStack Query vs a lighter in-memory cache? *Recommended: TanStack Query (caching/dedup/invalidation for free).*
- **2.4** — keep `react-icons` and drop Material Symbols, or vice-versa? *Recommended: keep `react-icons` (already wired via `Icon`), remove Material Symbols spans.*
