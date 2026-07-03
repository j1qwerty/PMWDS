# Fix Todo — Consolidated from All Audit Reports

**Generated:** July 3, 2026  
**Source reports:** `performance-audit.md`, `security-audit.md`, `structure-audit.md`  
**Project root:** `E:\saturday\PMWDS.S\Client`

---

## How to use this document

Each item is prefixed with a category tag and a reference back to the source report(s).  
Priority order: **P0 (immediate)** → **P1 (high)** → **P2 (medium)** → **P3 (low)**.  
Work through phases sequentially — earlier phases unblock later ones.

---

## Phase 0: Security & Correctness (P0 — Critical)

> Stop data leaks, prevent XSS/CSRF, fix auth vulnerabilities before all else.

### 0.1 JWT Auth Token Stored in localStorage
- **Sources:** `security:C-1`, `security:H-1`, `structure:S5`
- **Files:** `src/auth.tsx:55-65`
- **Todo:** Migrate token from `localStorage` to httpOnly+Secure+SameSite cookies (backend change) or to memory-only with short-lived sessionStorage fallback. Never persist full `AuthState` (email, roles, permissions) to disk.
- **Verification:** After fix, `localStorage` should contain no auth data; token must not be accessible from `window.localStorage`.

### 0.2 AbortController Missing on All API Requests
- **Sources:** `security:C-2`, `performance:6`
- **Files:** `src/api.ts:76-129`, `src/pages/dashboard/dashboard.tsx:95-126`, and all pages that call `api.*` in useEffect
- **Todo:** Accept optional `AbortSignal` in the `request()` helper. In every `useEffect` that fires API calls, create an `AbortController` and abort on cleanup. Prioritize the dashboard (10 parallel calls).
- **Verification:** Navigate away from dashboard while requests are in-flight — no React warnings about state updates on unmounted component.

### 0.3 Exposed API Key in `.env.example`
- **Sources:** `security:C-3`
- **Files:** `.env.example:34`
- **Todo:** Rotate the exposed OpenRouter API key immediately. Remove the real key value from `.env.example`, replace with placeholder text. Verify `.env` is in `.gitignore`.
- **Verification:** The literal key string should not exist anywhere in the repository history (consider `git filter-repo` if committed).

### 0.4 Remove `dangerouslySetInnerHTML` SVG Injection
- **Sources:** `security:C-4`
- **Files:** `src/pages/shared/bg/BgRenderer.tsx:41-43`
- **Todo:** Replace `dangerouslySetInnerHTML` with a proper React SVG component that generates path elements programmatically.
- **Verification:** Background renders identically with no raw HTML injection.

### 0.5 Add Content Security Policy
- **Sources:** `security:C-5`
- **Files:** `index.html`, `vite.config.ts`
- **Todo:** Add a CSP `meta` tag or HTTP header. Include `default-src 'self'`, restrict `script-src`, `style-src`, `img-src`, `connect-src`, `frame-ancestors`. Use `nonce` or `strict-dynamic` if inline scripts are needed.
- **Verification:** CSP report-only mode first; no console violations after applying.

### 0.6 CSRF Protection for Auth Endpoints
- **Sources:** `security:C-6`
- **Files:** `src/api.ts:137-163` (login, signup, forgot/reset password, refresh)
- **Todo:** Add `X-CSRF-Token` header validation (backend side). Ensure backend validates `Origin`/`Referer` headers. Set `SameSite=Strict` on any auth cookies.
- **Verification:** Auth endpoints reject requests missing CSRF token.

### 0.7 API Key Exposure in Frontend AI Settings
- **Sources:** `security:H-3`
- **Files:** `src/pages/settings/AISettings.tsx:396-416`
- **Todo:** Never send full API keys to the frontend. Send only `hasKey: boolean`. The backend should proxy all AI API calls. The "test provider" feature should run server-side.
- **Verification:** Network tab shows no API key values in any response; AI provider test results come from server proxy.

### 0.8 File Upload Validation
- **Sources:** `security:H-8`
- **Files:** `src/pages/shared/ProfilePictureUploader.tsx:44-61`
- **Todo:** Add file size check (e.g., max 5MB), image dimension validation before cropping, and server-side validation as defense-in-depth. Reject non-image MIME types.
- **Verification:** Attempting to upload a 50MB file or non-image file shows a user-friendly error before any network request.

---

## Phase 1: Architecture & File Structure (P1 — High)

> Split monoliths, create standard directories, enable tree-shaking and lazy-loading.

### 1.1 Split `api.ts` into Domain Modules
- **Sources:** `performance:5`, `structure:C1`
- **Files:** `src/api.ts` (996 lines → split into `src/api/` directory)
- **Todo:** Create `src/api/` with `client.ts` (base request helpers) and domain files: `auth.api.ts`, `projects.api.ts`, `tasks.api.ts`, `milestones.api.ts`, `users.api.ts`, `departments.api.ts`, `organizations.api.ts`, `roles.api.ts`, `notifications.api.ts`, `ai.api.ts`, `reports.api.ts`, `integrations.api.ts`, `activity.api.ts`, `settings.api.ts`, `system.api.ts`. Re-export from `index.ts`.
- **Verification:** All imports of `api.someMethod` are replaced with `import { someMethod } from "../api/auth"` etc. App compiles and runs. Tree-shaking now works per domain.

### 1.2 Split `types.ts` into Domain Type Modules
- **Sources:** `structure:C2`
- **Files:** `src/types.ts` (1065 lines → split into `src/types/` directory)
- **Todo:** Create `src/types/` with domain files matching the API split. Separate DTOs (e.g., `PagesDataResponse`, all `Page*Dto`) into `src/types/dto/`. Re-export from `index.ts`.
- **Verification:** All imports of `import { X } from "../types"` are updated. App compiles without errors.

### 1.3 Split `layout.tsx` into Component Modules
- **Sources:** `structure:C3`, `performance:8`, `performance:15`
- **Files:** `src/layout.tsx` (706 lines → split into `src/components/layout/`)
- **Todo:** Extract `Sidebar.tsx`, `SidebarNavItem.tsx`, `SidebarNavGroup.tsx`, `SidebarProfile.tsx`, `Topbar.tsx`, `sectionThemes.ts`, `iconMap.tsx`, `navGroups.ts`. Replace IIFE nav items with a `SidebarLink` component and `.map()` loop. Throttle resize handler.
- **Verification:** Layout renders identically. Resize handler fires at most once per animation frame.

### 1.4 Fix `appData.tsx` Overfetching
- **Sources:** `structure:C4`, `performance:21`
- **Files:** `src/appData.tsx`
- **Todo:** Replace monolithic `getPagesData` with per-domain data fetching. Introduce a caching layer (TanStack Query recommended, or a simpler in-memory cache). Keep only truly global data (auth, user preferences, workspace metadata) in context. Move domain data to hooks like `useProjects()`, `useUsers()`.
- **Verification:** A page that only needs projects does not fetch users/notifications/etc.

### 1.5 Add Route-Level Code Splitting
- **Sources:** `performance:1`, `structure:W10`
- **Files:** `src/App.tsx:12-37`
- **Todo:** Replace all 18+ static page imports with `React.lazy(() => import("./pages/..."))`. Wrap `<Routes>` in `<Suspense fallback={<PageSkeleton />}>`. Create a shared `PageSkeleton` component.
- **Verification:** Initial bundle size reduced by 40-60%. Page chunks load on-demand. No layout shift during lazy load.

### 1.6 Split Large Page Files
- **Sources:** `structure:C5`, `structure:C6`, `performance:11`
- **Files:**
  - `src/pages/nested/ProjectTasksPage.tsx` (702 lines)
  - `src/pages/skills/SkillsPage.tsx` (877 lines)
  - `src/pages/settings/AISettings.tsx` (723 lines)
  - `src/pages/nested/ProjectMilestonesPage.tsx` (689 lines)
  - `src/pages/login/login.tsx` (627 lines)
  - `src/pages/dashboard/dashboard.tsx` (395 lines)
  - `src/pages/NewProject/NewProjectPage.tsx` (544 lines)
- **Todo:** Each page should follow: `PageComponent.tsx` (orchestrator, <100 lines) + `usePageData.ts` (fetching hook) + extracted components. Extract modal state into `useModal()` hooks.
- **Verification:** Each file is under 300 lines. No file contains more than one "screen" of logic.

### 1.7 Create Standard Directory Structure
- **Sources:** `structure:W5`, `structure:W6`, `structure:W8`
- **Files:** Entire `src/`
- **Todo:** Create directories: `src/api/`, `src/types/`, `src/hooks/`, `src/services/`, `src/utils/`, `src/constants/`, `src/providers/`, `src/routes/`. Move existing files to match. Standardize folder naming (camelCase for utility dirs, PascalCase for component dirs).
- **Verification:** `src/` has exactly these top-level directories. All imports updated.

---

## Phase 2: Performance Optimization (P1 — High)

> Memoization, debouncing, context stability, bundle optimization.

### 2.1 Add `React.memo` to Pure Leaf Components
- **Sources:** `performance:2`
- **Files:** `src/ui.tsx` (Panel, StatCard, MetricRow, MetricTile, EmptyState, SimpleProjectCards, UserTable), `src/pages/shared/Avatar.tsx`, `src/pages/shared/StatusBadge.tsx`, `src/pages/shared/PriorityBadge.tsx`, `src/pages/shared/StatCard.tsx`
- **Todo:** Wrap each component in `React.memo()`. For components with function props, memoize the callbacks at the call site.
- **Verification:** React DevTools profiler shows these components only re-render when their props actually change.

### 2.2 Debounce SearchBar
- **Sources:** `performance:3`
- **Files:** `src/pages/shared/search.tsx`
- **Todo:** Add 300ms debounce to `onSearch` callback. Clear timeout on unmount. Consider `useRef` for the timeout handle.
- **Verification:** Console-logging in `onSearch` shows at most 1 call per 300ms of typing.
- **Status:** ✅ Done — `useRef` timeout with 300ms debounce, cleanup on unmount.

### 2.3 Stabilize `NavHeaderContext` Value
- **Sources:** `performance:4`
- **Files:** `src/pages/shared/NavHeaderContext.tsx`
- **Todo:** Wrap context value in `useMemo([state, setNavHeader])` to prevent re-rendering all consumers on every provider render.
- **Verification:** A `useNavHeader()` consumer that doesn't read changed state does not re-render when parent updates.
- **Status:** ✅ Done — value wrapped in `useMemo` with correct deps.

### 2.4 Standardize Icon System
- **Sources:** `performance:7`
- **Files:** All files using `material-symbols-outlined` spans + `src/components/ui/Icon.tsx`
- **Todo:** Choose one system (recommend `react-icons` — already in use via `Icon` component). Replace all `material-symbols-outlined` `<span>` elements with `<Icon name="...">`. Remove unused icon imports. 
- **Verification:** Build bundle size decreases (no duplicate icon font). All icons render identically.

### 2.5 Fix Auth Token Auto-Refresh with Retry
- **Sources:** `performance:9`
- **Files:** `src/auth.tsx:67-99`
- **Todo:** Add retry logic (2 retries with 1s backoff) before logging out on refresh failure. Use a ref for token to avoid stale closure in the timeout callback.
- **Verification:** If the backend is temporarily unavailable, the user is not logged out after a single failed refresh.

### 2.6 Fix Toast Memory Leak
- **Sources:** `performance:10`
- **Files:** `src/pages/shared/Toast.tsx:20-25`
- **Todo:** Use a monotonic counter for toast IDs instead of `Math.random()`. Track all `setTimeout` handles and clear them on component unmount. Return a cleanup function from `addToast`.
- **Verification:** Rapid toasts do not collide. Unmounting during a toast's timeout does not log React warnings.

### 2.7 Fix Dashboard Data Fetching with AbortController
- **Sources:** `performance:6`, `security:C-2`
- **Files:** `src/pages/dashboard/dashboard.tsx`
- **Todo:** See #0.2. Also consider separating the 10 parallel calls into per-widget data hooks so each widget manages its own loading/error state.
- **Verification:** Each API call can be independently aborted. Stale responses do not overwrite newer data.

### 2.8 Remove `any` Types
- **Sources:** `performance:13`, `structure:W13`
- **Files:** `src/pages/dashboard/dashboard.tsx:47`, `src/pages/projectsK/components/ProjectBasicDetails.tsx:22`, `src/pages/projectsK/components/TaskSubtaskDetailsModal.tsx:19-20`, `src/pages/reports/ReportViewer.tsx:46`, `src/pages/shared/bg/BgControls.tsx`, and others.
- **Todo:** Replace every `any` with the correct type from the types directory. Create new types if needed.
- **Verification:** No `any` type annotations remain in `src/` (excluding `node_modules` and vendor types).

---

## Phase 3: Accessibility & UX (P1 — High)

> Keyboard navigation, screen reader support, form labeling, modal focus.

### 3.1 Add Focus Trapping to All Modals
- **Sources:** `security:H-4`
- **Files:** Modal components — `ProfilePictureUploader.tsx`, `TaskEditModal.tsx`, `SubtaskEditModal.tsx`, `ProjectFormModal.tsx`, and any custom modal overlay.
- **Todo:** Create a `useFocusTrap` hook that traps Tab cycling within the modal, sets initial focus on open, returns focus to trigger element on close, and closes on Escape.
- **Verification:** Tab key cycles only through interactive elements inside the modal. Escape closes the modal.

### 3.2 Add `aria-label` to Icon-Only Buttons
- **Sources:** `security:H-5`
- **Files:** `src/layout.tsx:298-310` (sidebar toggle), `src/pages/shared/modals/TaskEditModal.tsx:181,193` (escalate/delete), `src/pages/login/login.tsx:387-395` (show/hide password), `src/pages/shared/ProfilePictureUploader.tsx:156-163` (close), and all other icon buttons.
- **Todo:** Add `aria-label="..."` to every `<button>` that contains only an icon.
- **Verification:** Using a screen reader, each icon button announces its purpose.
- **Status:** ✅ Done — 7 buttons labeled: sidebar toggle/close/open, escalate, delete, password toggle, close.

### 3.3 Fix Form Label Associations
- **Sources:** `security:H-6`
- **Files:** 30+ form components across all pages — `login.tsx`, `TemplateFormModal.tsx`, `ActivityForm.tsx`, `RegisterUserForm.tsx`, `ProgressStatusEditor.tsx`, `AISettings.tsx`, and others.
- **Todo:** Add `htmlFor` on `<label>` and matching `id` on `<input>`/`<select>`/`<textarea>` for every form field. Use `<label>` element (not styled `<span>`).
- **Verification:** Clicking a label focuses its associated input. Axe/Lighthouse shows zero form label violations.

### 3.4 Replace Native `confirm()` with Accessible Modal
- **Sources:** `security:H-7`
- **Files:** `TaskEditModal.tsx:93`, `SubtaskEditModal.tsx:34`, `ProgressStatusEditor.tsx:70`
- **Todo:** Use the existing `DeleteConfirmationModal` component (create one if none exists). The modal should be focus-trapped, dismissable via Escape, and have clear "Confirm" / "Cancel" buttons.
- **Verification:** No `confirm()` calls remain. Screen reader announces the confirmation dialog.

### 3.5 Fix Heading Hierarchy
- **Sources:** `security:M-5`
- **Files:** `src/pages/ai/ai.tsx`, `src/pages/login/login.tsx`, `src/pages/skills/SkillsPage.tsx`, and all other pages
- **Todo:** Ensure every page has exactly one `<h1>`, followed by sequential `<h2>`, `<h3>`, etc. No heading levels should be skipped.
- **Verification:** WAVE or axe-core reports zero heading hierarchy violations.

### 3.6 Add/Standardize Loading States
- **Sources:** `security:M-6`, `structure:S2`
- **Files:** All pages and components that fetch data
- **Todo:** Add loading states using existing `LoadingPage` or `Skeleton` components. Create a `useAsyncData<T>` generic hook that returns `{ data, loading, error }` and standardizes loading/error rendering across pages.
- **Verification:** Every page with async data shows a skeleton/loading indicator before data arrives.

### 3.7 Add Keyboard Navigation to Custom Dropdowns
- **Sources:** `security:M-7`
- **Files:** `src/pages/projectsK/components/ProjectBasicDetails.tsx:156-209` (status dropdown), and any other custom `role="listbox"` controls
- **Todo:** Implement full ARIA combobox pattern: ArrowUp/ArrowDown for navigation, Enter/Space to select, Escape to close. Announce selected option to screen readers.
- **Verification:** Tab, ArrowDown, Enter, and Escape all work as expected. Screen reader announces current selection.

### 3.8 Sanitize Server Error Messages
- **Sources:** `security:M-8`
- **Files:** `src/api.ts:109-117`
- **Todo:** In non-development environments, sanitize error messages before displaying to users. Log full details server-side. Show generic messages like "Something went wrong. Please try again."
- **Verification:** Production builds do not show stack traces or internal server paths in error UI.

---

## Phase 4: Code Quality & Consistency (P2 — Medium)

> Remove duplication, fix naming, enable strict checks, clean up dead code.

### 4.1 Add Retry Logic to API Client
- **Sources:** `security:M-1`
- **Files:** `src/api/client.ts` (after 1.1 split)
- **Todo:** Implement exponential backoff retry for 429 (rate limit) and 5xx (server error) responses. Max 3 retries.
- **Verification:** A deliberately flaky endpoint is retried automatically without user-facing error.

### 4.2 Remove Hardcoded Demo Credentials
- **Sources:** `security:M-2`
- **Files:** `src/pages/login/login.tsx:68-69`
- **Todo:** Remove `useState('admin@org1.com')` and `useState('Pmwds@123')` defaults. Load demo account hints from environment variables or backend configuration.
- **Verification:** Login page loads with empty email/password fields.

### 4.3 Add Subresource Integrity to CDN Links
- **Sources:** `security:M-3`
- **Files:** `index.html:8`
- **Todo:** Add `crossorigin="anonymous"` to Google Fonts link. Generate and add `integrity` hash. Consider self-hosting fonts in production.
- **Verification:** No integrity-check warnings in browser console.

### 4.4 Add `referrerpolicy` to External Avatar Images
- **Sources:** `security:M-4`
- **Files:** `src/pages/shared/Avatar.tsx:57`, `Avatark.tsx:58`
- **Todo:** Add `referrerpolicy="no-referrer"` to all `<img>` tags pointing to `ui-avatars.com`. Preferably, generate avatars locally/on-server to avoid leaking user names to third parties.
- **Verification:** Request headers to `ui-avatars.com` do not include `Referer`.

### 4.5 Remove Duplicate `classNames` Utility
- **Sources:** `structure:W4`
- **Files:** `src/layout.tsx:47-49`, `src/ui.tsx:67-69`
- **Todo:** Move `classNames` to a single location (e.g., `src/utils/classNames.ts`). Import it everywhere. Consider using `clsx` or `tailwind-merge` instead of a hand-rolled version.
- **Verification:** No duplicate definitions. Both layout and ui import from the same source.

### 4.6 Remove Dead Code (Commented Chat Nav Item)
- **Sources:** `structure:W2`
- **Files:** `src/layout.tsx:458-494`
- **Todo:** Either remove the commented-out Chat navigation block or uncomment it if Chat is planned. Remove unused `HiChat` import (line 24).
- **Verification:** No commented-out JSX blocks in layout.tsx.
- **Status:** ✅ Done — commented block and unused `HiChat` import removed.

### 4.7 Add Barrel Exports for Page Folders
- **Sources:** `structure:W12`
- **Files:** `src/pages/ai/`, `src/pages/departments/`, `src/pages/activity/`, `src/pages/organisations/`, etc.
- **Todo:** Add `index.ts` barrel files for every page folder (following `projectsK/components/index.ts` as the pattern).
- **Verification:** `import { X } from "./pages/ai"` works instead of `import { X } from "./pages/ai/ai"`.

### 4.8 Enable Strict TypeScript Checks
- **Sources:** `performance:18`
- **Files:** `tsconfig.app.json:19-20`
- **Todo:** Set `"noUnusedLocals": true`, `"noUnusedParameters": true`. Fix all resulting compilation errors. Consider also enabling `strict: true` for full type safety.
- **Verification:** `tsc -b` passes with zero errors.

### 4.9 Rename Misspelled Files
- **Sources:** `performance:19`, `structure:W7`
- **Files:** `src/pages/dashboard/dashbaordStats.tsx` → `dashboardStats.tsx`, `src/pages/shared/StatusBadgeMininmal.tsx` → `StatusBadgeMinimal.tsx`
- **Todo:** Rename files and update all import references.
- **Verification:** No import errors. Git detects rename.
- **Status:** ✅ Done — both files renamed, all imports updated (including missed one in `projectsK.tsx`).

### 4.10 Fix Undefined CSS Variables
- **Sources:** `security:L-7`, `structure:W9`, `structure:S7`
- **Files:** `src/index.css:348,358`
- **Todo:** Define `--success-bg`, `--warning-bg`, and `--radius-default` in the `@theme` block. Fix `.gradient-btn` to use Tailwind utilities instead of hardcoded gradient.
- **Verification:** No `var(--undefined)` in computed styles.
- **Status:** ✅ Done — variables defined and `.gradient-btn` uses `var(--color-primary)` / `var(--color-secondary)`.

### 4.11 Add Client-Specific `.env.example`
- **Sources:** `structure:W1`
- **Files:** `Client/` root (the project root `.env.example` is backend-only)
- **Todo:** Create `Client/.env.example` with the single required variable (`VITE_API_BASE_URL=http://localhost:5177/api/v1`). Use a placeholder value. This is consistent with Vite conventions where each project directory has its own `.env`.
- **Verification:** New developer can copy `Client/.env.example → Client/.env` and the client starts.
- **Status:** ✅ Done — created at `Client/.env.example`.

---

## Phase 5: Polish & Enhancements (P3 — Low)

> Nice-to-have improvements, future-proofing, minor perf wins.

### 5.1 Add Error Boundary at App Route Level
- **Sources:** `structure:S1`
- **Files:** `src/App.tsx` or new `src/components/ErrorBoundary.tsx`
- **Todo:** Wrap `<Routes>` (or each lazy route) in a React Error Boundary that catches rendering errors and shows a fallback UI instead of a white screen.
- **Verification:** Throwing in a page component shows a styled error state, not a blank page or console-only error.

### 5.2 Use `useDeferredValue` for Expensive Filtering
- **Sources:** `performance:16`
- **Files:** `src/pages/projectsK/projectsK.tsx:192-206`
- **Todo:** Wrap filter state values in `useDeferredValue` so that filtering does not block UI updates during typing.
- **Verification:** Typing in the search/filter field remains smooth even with 1000+ items.

### 5.3 Optimize Framer Motion Usages
- **Sources:** `performance:17`, `performance:23`
- **Files:** Components using `motion.div`, `AnimatePresence`
- **Todo:** Replace simple animations with CSS transitions. For remaining Framer Motion usages, add `layoutId` for shared layout animations. Consider lazy-loading Framer Motion content.
- **Verification:** Animations look identical. Bundle size is reduced if Framer Motion can be dynamically imported.

### 5.4 Remove Inline Arrow Functions in JSX
- **Sources:** `performance:22`
- **Files:** Multiple — `layout.tsx:299`, `projectsK.tsx`, etc.
- **Todo:** Extract inline event handlers to named functions or `useCallback`.
- **Verification:** JSX no longer contains `onClick={() => ...}` patterns (exceptions where parameter passing is needed and unavoidable).

### 5.5 Fix Auth Context `refresh` Stale Closure
- **Sources:** `performance:20`
- **Files:** `src/auth.tsx:110-118`
- **Todo:** Use a ref to hold the current token instead of capturing `auth` in the `refresh` closure. Use functional `setAuth` update.
- **Verification:** Calling `refresh` after auth state changes uses the latest token, not the one from when the callback was created.

### 5.6 Add Stable Keys in List Rendering
- **Sources:** `performance:14`
- **Files:** `src/pages/dashboard/dashboardStats.tsx`
- **Todo:** Use stable identifiers (unique key per item) instead of array index as React key.
- **Verification:** List items maintain correct identity across re-renders even if order changes.
- **Status:** ✅ Done — index keys replaced with stable `stat.label` identifiers.

### 5.7 Merge Duplicate Avatar Components
- **Sources:** `security:L-3`
- **Files:** `Avatar.tsx` and `Avatark.tsx`
- **Todo:** Consolidate into a single `Avatar.tsx` component. Remove the duplicate file.
- **Verification:** All avatar usages render identically. No broken imports.

### 5.8 Fix Semantic HTML Structure
- **Sources:** `security:L-5`
- **Files:** Components using `<div role="button">`, sidebar `<nav>` element, main content area
- **Todo:** Use native `<button>` for clickable elements, `<nav>` for the sidebar, `<main>` for content area, `<section>`/`<article>` for content sections.
- **Verification:** Lighthouse semantic HTML audit passes.

### 5.9 Add `role="alert"` on Dynamic Messages
- **Sources:** `security:L-6`
- **Files:** Toast notifications, error messages, success banners
- **Todo:** Add `role="alert"` or `aria-live="polite"` to dynamically appearing messages so screen readers announce them.
- **Verification:** Screen reader announces toast messages without user focusing them.

### 5.10 Add Missing UseMemo for Expensive Computations
- **Sources:** `performance:12`
- **Files:** `src/pages/projectsK/projectsK.tsx:156-190` (topological sort)
- **Todo:** Audit all expensive computations and wrap in `useMemo` with correct dependencies.
- **Verification:** React DevTools profiler shows no unnecessary recomputation.

---

## Summary

| Phase | Focus | Items | Priority |
|-------|-------|-------|----------|
| 0 | Security & correctness | 8 | **P0 — Do first** |
| 1 | Architecture & file structure | 7 | **P1 — High impact** |
| 2 | Performance optimization | 8 | **P1 — High impact** |
| 3 | Accessibility & UX | 8 | **P1 — High impact** |
| 4 | Code quality & consistency | 11 | **P2 — Medium** |
| 5 | Polish & enhancements | 10 | **P3 — Low** |
| **Total** | | **52** | |

### Quick wins (can be done in parallel):
- ~~#2.2 Debounce SearchBar~~ ✅
- ~~#2.3 Stabilize NavHeaderContext~~ ✅
- ~~#3.2 aria-labels on icon buttons~~ ✅
- ~~#4.6 Remove dead code~~ ✅
- ~~#4.9 Rename misspelled files~~ ✅
- ~~#4.10 Fix CSS variables~~ ✅ (partial — `.gradient-btn` remaining)
- ~~#4.11 Add .env.example~~ ✅
- ~~#5.6 Stable list keys~~ ✅

### High effort / high impact (plan accordingly):
- #1.1 Split api.ts (will touch every file in the app)
- #1.2 Split types.ts (will touch every file in the app)
- #1.4 Fix appData.tsx overfetching (architectural change)
- #1.6 Split large page files (structural change)
- #0.1 Migrate auth from localStorage (backend + frontend coordinated effort)

---

*Generated by aggregating findings from `performance-audit.md`, `security-audit.md`, and `structure-audit.md`.*
