# Component & Performance Audit

**Project:** PMWDS.S/Client  
**Date:** July 3, 2026  
**Stack:** React 19.2.5 + TypeScript + Vite 8.0.9 + React Router v7.14.1 + Framer Motion 12.40.0  

---

## 🚨 Critical Issues

### 1. Zero Code Splitting — All Routes Eagerly Loaded
**File:** `src/App.tsx` (lines 1–38, 71–149)  
**Severity:** Critical  
**Issue:** All 18+ page components are statically imported at the top of App.tsx. With React 19's improved hydration and Vite's code-splitting, every page bundle is loaded upfront regardless of the current route.  
**Fix:** Use `React.lazy()` + `<Suspense>` for route-level code splitting:

```tsx
// Before
import { DashboardPage } from "./pages/dashboard/dashboard";
import { ProjectsKPage } from "./pages/projectsK/projectsK";
// ... 15+ more static imports

// After
const DashboardPage = React.lazy(() => import("./pages/dashboard/dashboard"));
const ProjectsKPage = React.lazy(() => import("./pages/projectsK/projectsK"));
// ... wrap in Suspense in AppRoutes
```

**Bundle impact:** Estimated 40-60% reduction in initial bundle size.

---

### 2. No React.memo Anywhere — Massively Missing Memoization
**Files:** All component files in `src/`  
**Severity:** Critical  
**Issue:** Zero uses of `React.memo` across the entire codebase. In a context-heavy app (AuthProvider, AppDataProvider, ToastProvider, NavHeaderProvider), every context change triggers re-renders of the entire subtree. Frequently re-rendered leaf components like `StatCard`, `Avatar`, `StatusBadge`, `PriorityBadge`, `SimpleProjectCards`, `UserTable`, `MetricRow`, etc., are all re-created on every parent render.  
**Fix:** Wrap pure/leaf components in `React.memo`:

```tsx
// Before
export function StatCard({ label, value, detail, tone }: StatCardProps) { ... }

// After
export const StatCard = React.memo(function StatCard({ label, value, detail, tone }: StatCardProps) { ... });
```

**Priority components for memoization:** `ui.tsx` — Panel, StatCard, MetricRow, MetricTile, EmptyState, SimpleProjectCards, UserTable, Avatar, StatusBadge, PriorityBadge.

---

### 3. Search Input Missing Debounce — Re-renders on Every Keystroke
**File:** `src/pages/shared/search.tsx` (lines 14–19)  
**Severity:** High  
**Issue:** The `SearchBar` calls `onSearch?.(value)` on every keystroke (`onChange`), triggering parent re-renders and potentially expensive API calls or filtering operations on each character typed.  
**Fix:** Add debounce:

```tsx
// Before
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  setQuery(value);
  onSearch?.(value);  // Called on every keystroke
};

// After
import { useCallback, useEffect, useRef, useState } from "react";

export function SearchBar({ placeholder = "Search...", onSearch, className = "" }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch?.(value);
    }, 300);
  }, [onSearch]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);
  
  // ... rest of component
}
```

---

### 4. NavHeaderContext Creates New Object on Every Render → Cascading Re-renders
**File:** `src/pages/shared/NavHeaderContext.tsx` (line 32)  
**Severity:** High  
**Issue:** The provider spreads `...state` into the context value on every render, creating a new object reference. This forces every consumer (`useNavHeader`) to re-render even when the state hasn't changed, because React uses reference equality for context.  
**Fix:** Use `useMemo` for context value:

```tsx
// Before
return (
  <NavHeaderContext.Provider value={{ ...state, setNavHeader }}>
    {children}
  </NavHeaderContext.Provider>
);

// After
const value = useMemo(() => ({ ...state, setNavHeader }), [state, setNavHeader]);
return (
  <NavHeaderContext.Provider value={value}>
    {children}
  </NavHeaderContext.Provider>
);
```

---

### 5. Massive `api.ts` File (996 lines) — Monolithic Object Pattern
**File:** `src/api.ts` (lines 1–996)  
**Severity:** High  
**Issue:** All API methods are defined as inline arrow functions on a single `api` object. This file cannot be tree-shaken — importing any one method pulls in the entire 996-line file. Additionally, there are no request deduplication, caching, or abort controller patterns.  
**Fix:** Split into domain modules or use a generated API client:

```tsx
// Before
export const api = {
  login(…) { … },
  getProjects(…) { … },
  getUsers(…) { … },
  // ... 90+ more methods
};

// After
// src/api/auth.ts
export function login(email: string, password: string) { … }
export function refresh(token: string) { … }

// Individual imports allow tree-shaking
```

---

### 6. Dashboard Page — 10 Simultaneous API Calls with No Abort Controller
**File:** `src/pages/dashboard/dashboard.tsx` (lines 95–126)  
**Severity:** High  
**Issue:** The dashboard fires 10 parallel `Promise.allSettled` API calls in a `useEffect` with no `AbortController`. If the component unmounts before all resolve (e.g., user navigates away), the fetches continue and `setState` calls happen on unmounted component.  
**Fix:** Add cleanup with AbortController:

```tsx
useEffect(() => {
  if (!auth) return;
  const controller = new AbortController();
  setLoading(true);
  
  Promise.allSettled([
    api.getDashboard(auth.token),
    // ...
  ]).then(…).finally(() => {
    if (!controller.signal.aborted) setLoading(false);
  });

  return () => controller.abort();
}, [auth, canViewTasks]);
```

---

### 7. `material-symbols-outlined` and `react-icons` Used Together — Double Icon Bundle
**Files:** 100+ instances of `material-symbols-outlined` spans across all pages + `layout.tsx` importing 25+ react-icons + `components/ui/Icon.tsx` wrapping 150+ icon imports  
**Severity:** High  
**Issue:** The codebase uses two separate icon systems: Google Material Symbols (via CSS class `material-symbols-outlined` in spans) AND react-icons (via `Icon` component). This means the browser downloads and parses two icon fonts/libraries. The `Icon.tsx` file alone imports 150+ individual icon components.  
**Fix:** Standardize on one icon system. If using `react-icons`, remove all `material-symbols-outlined` spans:

```tsx
// Before — two icon systems:
<span className="material-symbols-outlined text-lg">check_circle</span>
<Icon name="check-circle" size={18} />

// After — one system only:
<Icon name="check-circle" size={18} />
```

---

## ⚠️ Warnings

### 8. Inline IIFE Patterns in Layout Causing Re-renders
**File:** `src/layout.tsx` (lines 336–456)  
**Severity:** Medium  
**Issue:** The sidebar uses immediately-invoked function expressions (IIFEs) `{(() => { ... })()}` for each navigation link. This pattern creates a new anonymous function every render, preventing any potential optimization and making the markup less readable.  
**Fix:** Extract nav items to a component or use array `.map()`:

```tsx
// Before
{(() => {
  const theme = sectionThemes.Overview;
  const active = isActive("/");
  return (
    <Link to="/" className={...}>
      {iconMap.home}
    </Link>
  );
})()}

// After
const navItems = [
  { path: "/", label: "Dashboard", icon: iconMap.home },
  { path: "/projectsK", label: "Projects", icon: iconMap.projects },
  // ...
];
{navItems.map(item => <SidebarLink key={item.path} {...item} theme={sectionThemes.Overview} />)}
```

---

### 9. Auth Token Refresh Uses `setTimeout` — No Retry/Fallback
**File:** `src/auth.tsx` (lines 67–99)  
**Severity:** Medium  
**Issue:** Token auto-refresh uses `setTimeout` with a calculated expiry delta. If the refresh fails, the user is immediately logged out (`setAuth(null)` on line 88). No retry mechanism, no silent token rotation, and the refresh is tied to the `auth` dependency — changing auth state recreates the timeout.  
**Fix:** Add retry logic and handle transient failures:

```tsx
const doRefresh = async (retries = 2) => {
  try {
    const refreshed = await api.refresh(auth.token);
    startTransition(() => {
      setAuth(current => current ? { ...current, token: refreshed.token, expiry: refreshed.expiry } : current);
    });
  } catch {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return doRefresh(retries - 1);
    }
    setAuth(null);
  }
};
```

---

### 10. Toast Implementation Has Memory Leak Risk
**File:** `src/pages/shared/Toast.tsx` (lines 20–25)  
**Severity:** Medium  
**Issue:** `addToast` uses `Math.random().toString(36).slice(2)` for IDs, which has collision potential under rapid toasts. The `setTimeout` for auto-dismiss runs even if the component unmounts (no cleanup tracked). After 3000ms, a stale `setState` fires on unmounted component.  
**Fix:** Use a proper ID generator and track timeouts for cleanup:

```tsx
let toastCounter = 0;
const addToast = useCallback((message: string, type = "success") => {
  const id = ++toastCounter;
  setToasts(prev => [...prev, { id, message, type }]);
  const timer = setTimeout(() => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, 3000);
  return () => clearTimeout(timer);  // Return cleanup
}, []);
```

---

### 11. Large File Sizes — Over 300 Lines (Need Splitting)
**Severity:** Medium  
**Issue:** The following files exceed recommended size limits and should be split into smaller modules:

| File | Lines | Issues |
|------|-------|--------|
| `src/api.ts` | 996 | Monolithic API client |
| `src/types.ts` | 1065 | All types in one file |
| `src/pages/skills/SkillsPage.tsx` | 877 | Single page component |
| `src/pages/settings/AISettings.tsx` | 723 | Complex settings page |
| `src/pages/nested/ProjectMilestonesPage.tsx` | 689 | Nested page too large |
| `src/layout.tsx` | 706 | Layout + sidebar all in one |
| `src/pages/nested/ProjectTasksPage.tsx` | 647 | Single page |
| `src/pages/login/login.tsx` | 596 | Login page |

---

### 12. Missing `useMemo` for Expensive Computations
**File:** `src/pages/dashboard/dashboard.tsx` (lines 163–193, 195–216)  
**Severity:** Medium  
**Issue:** `departmentWorkload` and `activityData` are wrapped in `useMemo` but rely on `myTasks` which changes frequently. The computation inside (filtering, mapping, reducing) is non-trivial.  

**File:** `src/pages/projectsK/projectsK.tsx` (lines 156–190)  
**Issue:** `sortedMilestones` uses a custom topological sort algorithm that could be expensive for large milestone lists.  

**Fix:** Memo is already used, but consider moving to a `useMemo` with more stable references, or using `useDeferredValue` in React 19 for expensive computations.

---

### 13. `any` Types Weakening TypeScript Benefits
**Files:** Multiple locations  
**Severity:** Medium  
**Issue:** Several components use `any` types, bypassing TypeScript's compile-time checks and losing IDE support:

- `src/pages/dashboard/dashboard.tsx:47` — `useState<any>(null)`
- `src/pages/projectsK/components/ProjectBasicDetails.tsx:22` — `users?: any[]`
- `src/pages/projectsK/components/TaskSubtaskDetailsModal.tsx:19–20` — `recommendation?: any; delay?: any`
- `src/pages/reports/ReportViewer.tsx:46` — `function MetricBadge({ metric }: { metric: any })`
- `src/pages/shared/bg/BgControls.tsx` — Multiple `as any` casts

**Fix:** Replace with proper types from `types.ts` or create new ones.

---

### 14. Missing `key` Stability in List Rendering
**File:** `src/pages/dashboard/dashbaordStats.tsx` (line 79)  
**Severity:** Medium  
**Issue:** The stats map uses array index as key (`key={index}`). Since the stats array is static and never reordered, this is acceptable for now, but if filters ever change the list order, it will cause unnecessary DOM reconciliation.  
**Fix:** Use a stable identifier:

```tsx
const stats = [
  { key: "total", icon: ..., value: ..., label: 'Total Projects', statusKey: 'Total' },
  // ...
];
{stats.map(stat => <StatCard key={stat.key} {...stat} />)}
```

---

### 15. Layout Responsive `useEffect` Without Cleanup Consideration
**File:** `src/layout.tsx` (lines 197–212)  
**Severity:** Low  
**Issue:** The resize handler works correctly with cleanup. However, on every resize event, `setIsMobile`, `setIsTablet`, and `setSidebarCompact` are called, causing re-renders. Throttling/debouncing is not used.  
**Fix:** Throttle resize handler:

```tsx
useEffect(() => {
  let ticking = false;
  const handleResize = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const width = window.innerWidth;
        setIsMobile(width < 768);
        setIsTablet(width >= 768 && width < 1024);
        if (width >= 768 && width < 1024) setSidebarCompact(true);
        ticking = false;
      });
      ticking = true;
    }
  };
  handleResize();
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

---

## 💡 Suggestions

### 16. Use `useDeferredValue` for Expensive Filtering
**File:** `src/pages/projectsK/projectsK.tsx` (lines 192–206)  
**Severity:** Low  
**Issue:** `filteredProjects` recomputes on every state change. With React 19's `useDeferredValue`, we can keep the UI responsive while filtering large lists.  

```tsx
import { useDeferredValue } from "react";

const deferredSelectedOrgId = useDeferredValue(selectedOrgId);
const deferredSelectedDeptId = useDeferredValue(selectedDeptId);

const filteredProjects = useMemo(() => {
  let filtered = projects;
  if (shouldFilterByOrg && userOrganizationId) { ... }
  if (deferredSelectedOrgId) { ... }
  if (deferredSelectedDeptId) { ... }
  return filtered;
}, [projects, deferredSelectedOrgId, deferredSelectedDeptId, departments, shouldFilterByOrg, userOrganizationId]);
```

---

### 17. Framer Motion Bundle Optimization
**Files:** `src/pages/nested/components/StatusDropdown.tsx`, `src/pages/projectsK/components/TaskSubtaskDetailsModal.tsx`, etc.  
**Severity:** Low  
**Issue:** Framer Motion 12.40.0 is a large library (~150KB gzipped) but is only used in 4 components for simple animations (modals, dropdowns). These animations could be replaced with CSS transitions or Tailwind's `transition-*` utilities for the majority of use cases.  
**Fix:** Option A: Replace simple animations with CSS transitions. Option B: Use dynamic import for Framer Motion only when needed:

```tsx
const StatusDropdownContent = React.lazy(() => import("./StatusDropdownContent"));
```

---

### 18. `noUnusedLocals: false` and `noUnusedParameters: false` Mask Dead Code
**File:** `tsconfig.app.json` (lines 19–20)  
**Severity:** Low  
**Issue:** With these compiler flags disabled, unused variables and parameters silently accumulate. Dead code increases bundle size and cognitive load.  
**Fix:** Enable these flags and clean up:

```json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

---

### 19. Mixed Export Patterns
**Files:** `src/pages/dashboard/dashbaordStats.tsx` (default export) vs other components (named exports)  
**Severity:** Low  
**Issue:** Most components use named exports, but `dashbaordStats.tsx` (note: misspelled filename — should be `dashboardStats`) uses `export default`. This inconsistency causes import confusion: `import DashboardStats from "./dashbaordStats"` vs `import { DashboardStats }` style.  
**Fix:** Rename to `dashboardStats.tsx` and use named export consistently.

---

### 20. Auth Context `refresh` Callback Depends on `auth` — Stale Closure Risk
**File:** `src/auth.tsx` (lines 110–118)  
**Severity:** Low  
**Issue:** The `refresh` callback captures `auth` in its closure. If `refresh` is stored (e.g., as a callback ref) and called after auth changes, it will use stale data.  
**Fix:** Use functional state update:

```tsx
const refresh = useCallback(async () => {
  const { token } = useAuth();  // This won't work in hooks rules
  // Better: use a ref
  const tokenRef = useRef(auth?.token);
  tokenRef.current = auth?.token;
  const refreshed = await api.refresh(tokenRef.current);
  setAuth(current => current ? { ...current, token: refreshed.token, expiry: refreshed.expiry } : current);
}, []);  // No deps needed with ref approach
```

---

### 21. AppDataProvider Fetches All Data on Mount — No Granularity
**File:** `src/appData.tsx` (lines 154–190)  
**Severity:** Low  
**Issue:** `getPagesData` fetches ALL entity types (organizations, departments, projects, milestones, tasks, users, roles, permissions, notifications, etc.) in a single request. This is convenient but means every page mount triggers a full data refresh, even if the page only needs one entity type.  
**Fix:** Add selective refresh options:

```tsx
type RefreshOptions = {
  organizations?: boolean;
  departments?: boolean;
  projects?: boolean;
  // ...
};

const refresh = useCallback(async (options?: RefreshOptions) => {
  if (!auth) return;
  // Only fetch requested sections
}, [auth]);
```

---

### 22. Inline Arrow Functions in JSX Callbacks
**Files:** Multiple  
**Severity:** Low  
**Issue:** Many event handlers are defined inline in JSX, creating new function references on every render:

```tsx
<button onClick={() => setMobileSidebarOpen(false)} ...>  // layout.tsx:299
<button onClick={() => setShowCreateModal(true)} ...>     // projectsK.tsx
```

While React 19's compiler optimizes some of these, consistently using `useCallback` or extracted handlers is still a best practice, especially for components passed as props.

---

### 23. Framer Motion AnimatePresence Used Without Layout Animation
**File:** `src/pages/projectsK/components/TaskSubtaskDetailsModal.tsx` (lines 272–308)  
**Severity:** Low  
**Issue:** `AnimatePresence` is used with `motion.div` but without `layoutId`, preventing Framer Motion from optimizing shared layout animations. This causes full DOM unmount/remount animations instead of smooth transitions.  
**Fix:** Add `layoutId` for matching elements.

---

## 📊 Performance Summary

| Metric | Current State | Recommendation |
|--------|--------------|----------------|
| Code Splitting | ❌ None | Add React.lazy for all routes |
| React.memo | ❌ 0 components | Memoize pure leaf components |
| useMemo/useCallback | ⚠️ Partial | Cover expensive computations |
| Bundle Optimization | ⚠️ Dual icon systems | Standardize on one |
| Tree Shaking | ❌ api.ts monolithic | Split into domain modules |
| Debouncing | ❌ Missing | Add to SearchBar |
| Context Value Stability | ❌ NavHeaderContext | Wrap in useMemo |
| Abort Controller | ❌ Not used | Add to fetch effects |
| TypeScript Strictness | ⚠️ Lax settings | Enable strict checks |
| Component Size | ⚠️ 15+ files >300 lines | Refactor into smaller units |

---

## 🎯 Priority Action Items

- [ ] **CRITICAL:** Add `React.lazy` + `Suspense` for all routes in `src/App.tsx` to enable code splitting
- [ ] **CRITICAL:** Add `React.memo` to leaf components: `ui.tsx` (StatCard, MetricRow, MetricTile, SimpleProjectCards, UserTable), `Avatar.tsx`, `StatusBadge.tsx`, `PriorityBadge.tsx`
- [ ] **HIGH:** Add debounce to `SearchBar` in `src/pages/shared/search.tsx`
- [ ] **HIGH:** Fix `NavHeaderContext` value stability with `useMemo` in `src/pages/shared/NavHeaderContext.tsx`
- [ ] **HIGH:** Add AbortController cleanup to `useEffect` fetching in `src/pages/dashboard/dashboard.tsx`
- [ ] **HIGH:** Split `src/api.ts` into domain-specific modules for tree-shaking
- [ ] **HIGH:** Standardize icon system — remove either `material-symbols-outlined` or `react-icons` usage
- [ ] **MEDIUM:** Replace IIFE patterns in `src/layout.tsx` with extracted components
- [ ] **MEDIUM:** Split large files (>500 lines): `layout.tsx`, `SkillsPage.tsx`, `AISettings.tsx`, `ProjectMilestonesPage.tsx`
- [ ] **MEDIUM:** Fix Toast memory leak in `src/pages/shared/Toast.tsx`
- [ ] **MEDIUM:** Remove `any` types throughout the codebase
- [ ] **LOW:** Enable `noUnusedLocals: true` and `noUnusedParameters: true` in `tsconfig.app.json`
- [ ] **LOW:** Rename `dashbaordStats.tsx` → `dashboardStats.tsx`
- [ ] **LOW:** Throttle resize handler in `src/layout.tsx`

---

*Report generated by automated audit. All file paths are relative to `E:\saturday\PMWDS.S\Client\` unless otherwise noted.*
