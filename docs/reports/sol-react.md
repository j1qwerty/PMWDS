# React Frontend Remediation Plan

**Created:** 2026-07-11  
**Scope:** `Client/` only by default  
**Inputs:** current source, production build, ESLint baseline, `react-todo.md`, `todo-react-fix.md`, `react-security-audit.md`, `react-structure-audit.md`, `react-performance-audit.md`  
**Execution model:** Codex owns architecture, sequencing, review, and complex fixes. Independent mechanical work may be delegated to opencode using `opencode/deepseek-v4-flash-free` (`medium` for repetitive work, `high` for behavior-sensitive work).

## 1. Guardrails

- The backend warning-fix track remains paused. Do not modify `PMWDS.*` projects for frontend lint or cleanup.
- Backend changes require a demonstrated API/security contract need. Record such work as blocked or coordinated before editing server code.
- Preserve current behavior and user changes. No destructive Git operations.
- Every implementation batch must pass `npm run build`. Run scoped ESLint for changed files; use full `npm run lint` to measure overall progress.
- Client-side permission checks only control presentation. Server authorization remains authoritative.
- This document supersedes stale line numbers and statuses in the older React reports. Those reports remain historical evidence.

## 2. Verified Baseline

| Check | Result | Meaning |
|---|---|---|
| `npm run build` | Pass | TypeScript and production bundling currently succeed. |
| Initial JS bundle | 1,672.04 kB / 419.02 kB gzip | Route-level code splitting is a high-impact performance fix. |
| Initial CSS bundle | 158.41 kB / 22.73 kB gzip | Large but secondary to JavaScript and icon/style consolidation. |
| `npm run lint` | 212 errors, 29 warnings | Frontend quality gate is not usable; some findings are runtime-risk issues, not cosmetic warnings. |
| Automated tests | No test script/framework configured | Refactors lack regression protection. Add a minimal test foundation before deep structural work. |

Current largest files include `types.ts` (1,098), `api.ts` (1,032), `ProjectOverviewPage.tsx` (975), `SkillsPage.tsx` (937), `AISettings.tsx` (776), `layout.tsx` (674), `ProjectMilestonesPage.tsx` (650), `login.tsx` (628), and `ProjectTasksPage.tsx` (606).

## 3. Priority Definitions

- **P0:** exploitable security exposure, authorization/session correctness, data loss, or broken core workflow.
- **P1:** runtime correctness, accessibility blockers, severe performance, or architecture that blocks safe fixes.
- **P2:** maintainability, consistency, moderate UX/performance, and quality-gate recovery.
- **P3:** polish or optimization requiring measurement.

## 4. Current Issue Inventory by Category

### A. Security and privacy

| ID | Priority | Status | Issue and evidence | Ownership |
|---|---|---|---|---|
| SEC-01 | P0 | Open, coordinated | `auth.tsx` persists the full auth state, including access/refresh tokens and user authorization data, in `localStorage`. Target is an httpOnly cookie session; this requires an explicit backend contract. Until then, do not pretend a client-only storage move fully resolves XSS token theft. | Codex design; backend only if approved/required |
| SEC-02 | P0 | Done 2026-07-11 | `BgRenderer.tsx` now renders generated waves as React-managed SVG/path elements; the raw HTML builder was removed. | Delegated with opencode high; Codex verified |
| SEC-03 | P0 | Partially resolved server-side | `AISettings.tsx` must never receive or display recoverable provider secrets. Current backend overview says protected storage exists, but the response contract and browser network behavior still require verification. | Codex verification; coordinate only if contract leaks |
| SEC-04 | P1 | Open | No effective production CSP is established in `index.html`/`nginx.conf`. Prefer the deployment header; start with report-only in a deploy environment because Vite dev requirements differ. | Coordinated infrastructure/frontend |
| SEC-05 | P1 | Client done 2026-07-11 | Profile images are restricted to PNG/JPEG/WebP, 5 MiB, and decoded dimensions from 64x64 through 8192x8192 before the crop UI. Object URLs are cleaned up. Server validation remains defense in depth. | Delegated with opencode medium; Codex verified |
| SEC-06 | P1 | Open | External avatar/image URLs need privacy-safe referrer handling and failure fallback. | Independent, opencode medium |
| SEC-07 | P1 | Conditional | CSRF protection becomes mandatory if auth moves to cookies. It is not solved by a client header alone and should be implemented only with the server contract. | Blocked by SEC-01 decision |
| SEC-08 | P2 | Verify | Old report claimed a committed OpenRouter key. Re-scan tracked files without reading secret `.env`; rotate externally if a real key ever entered history. | Codex/security operation |

### B. Runtime correctness and data flow

| ID | Priority | Status | Issue and evidence | Ownership |
|---|---|---|---|---|
| COR-01 | P1 | Open | API requests lack a consistent `AbortSignal` contract and effect cleanup. Navigation can leave stale requests racing later state. Add signal support centrally, then migrate callers by domain. | Architecture by Codex; repetitive callers delegated |
| COR-02 | P1 | Done 2026-07-11 | `TaskPerformanceTable.tsx` captures trigger geometry when a menu opens and stores the position; it no longer reads trigger refs during render. | Delegated with opencode high; Codex verified |
| COR-03 | P1 | Open | `Timer.tsx` mutates refs during render and contains swallowed exceptions. Synchronize refs in effects or restructure callbacks; preserve timer recovery semantics. | Behavior-sensitive, Codex or opencode high with review |
| COR-04 | P1 | Open | Multiple effects synchronously derive/reset state (`appData`, `layout`, new-project, skill/user forms). Some are legitimate initialization but others cause cascading renders or stale state. Classify individually; do not bulk-disable the rule. | Coordinated review, high |
| COR-05 | P1 | Open | Missing effect dependencies occur in new-project, activity, skills, and users flows. These may cause stale callbacks or missed reloads. Stabilize callbacks or restructure effects rather than blindly adding dependencies. | Independent per feature, high |
| COR-06 | P1 | Open | API helper contains an empty catch and error handling is inconsistent. Abort errors, auth refresh, API envelopes, and user-safe messages need typed branches. | Coupled to API split |
| COR-07 | P2 | Open | Native `confirm()` remains in task/subtask/status flows, producing inconsistent and inaccessible control flow. Replace with the shared confirmation modal and preserve async delete semantics. | Independent per flow, medium |
| COR-08 | P2 | Open | Random client IDs use `Math.random()` fallbacks. Use a single ID helper based on `crypto.randomUUID`, with a clearly non-security fallback only where necessary. | Independent after utils foundation |

### C. Accessibility and UX

| ID | Priority | Status | Issue and evidence | Ownership |
|---|---|---|---|---|
| A11Y-01 | P1 | Open | Modal behavior is inconsistent. Establish one `ModalOverlay` contract: dialog semantics, accessible name, initial focus, focus trap, Escape close, scroll lock, and focus restoration. | Codex foundation; delegated migrations |
| A11Y-02 | P1 | Open | Form labels are not consistently associated with controls. Fix by feature, including generated IDs and error/help references. | Repetitive, opencode medium |
| A11Y-03 | P1 | Open | Custom dropdowns/select-like controls lack complete keyboard and ARIA combobox/listbox behavior. Prefer native controls where styling permits. | Behavior-sensitive, high |
| A11Y-04 | P2 | Partially resolved | Icon-only buttons were improved previously, but the current tree requires a fresh semantic/accessible-name scan after icon consolidation. | Delegated by feature |
| A11Y-05 | P2 | Open | Heading hierarchy, landmarks, live regions, and error announcements are inconsistent. | Delegated by page after structural splits |
| UX-01 | P1 | Open | Loading, empty, error, and retry behavior varies by page. Standardize primitives, but avoid hiding errors behind indefinite spinners. | Foundation then delegated adoption |
| UX-02 | P2 | Open | Error messages may expose server detail or be too generic. Centralize user-safe errors while retaining development diagnostics. | Coupled to API client |

### D. Performance

| ID | Priority | Status | Issue and evidence | Ownership |
|---|---|---|---|---|
| PERF-01 | P1 | Open | All major pages are eagerly loaded; the initial JS chunk is 1.67 MB. Add route-level `React.lazy`/`Suspense` and a shared route fallback. | Independent, opencode high |
| PERF-02 | P1 | Open | `getPagesData`/`AppDataProvider` centralizes broad data and invalidation, causing over-fetching and wide rerenders. Replace incrementally with domain query hooks; do not perform a flag-day rewrite. | Complex architecture, Codex |
| PERF-03 | P1 | Open | `api.ts` prevents clean domain ownership and makes cancellation/retry/auth behavior risky to change. Split transport from domain endpoints while retaining a compatibility export during migration. | Complex/coordinated, Codex |
| PERF-04 | P1 | Open | `types.ts` is a 1,098-line coupling point. Split types by domain after establishing import boundaries; avoid runtime barrel cycles. | Coordinated, delegated mechanical moves with review |
| PERF-05 | P2 | Open | Material Symbols spans and `react-icons` coexist across many files. Standardize deliberately and measure bundle/font impact. | Repetitive, opencode medium in batches |
| PERF-06 | P2 | Open | Large pages/components combine queries, mutations, derived data, and presentation. Split by feature behavior and test seams, not an arbitrary line limit. | Independent per page after foundations |
| PERF-07 | P2 | Open | Memoization findings from old reports are hypotheses. Apply `memo`, `useMemo`, or `useCallback` only after stabilizing props or profiling; blanket memoization can add overhead. | Codex review |
| PERF-08 | P3 | Open | Expensive list filtering/topological computations may benefit from deferred values or memoization after profiling. | Independent, measurement-led |

### E. Architecture, maintainability, and testing

| ID | Priority | Status | Issue and evidence | Ownership |
|---|---|---|---|---|
| ARCH-01 | P1 | Open | No automated test framework/script exists. Add Vitest, React Testing Library, setup, and a small smoke/behavior suite before high-risk refactors. | Codex design; opencode setup high |
| ARCH-02 | P1 | Open | Establish `api/`, `types/`, `hooks/`, `utils/`, `providers/`, and route boundaries only as used; empty directory scaffolding has no value. | Codex |
| ARCH-03 | P2 | Open | Fast-refresh violations mix contexts/helpers and components. Extract contexts/hooks/constants into focused modules; this also improves testability. | Repetitive in bounded groups, medium |
| ARCH-04 | P2 | Open | Explicit `any`, unused code, empty blocks, and inconsistent effect patterns make the ESLint gate fail. Fix by category and behavior, never by weakening rules globally. | Repetitive, medium; complex hook cases high |
| ARCH-05 | P2 | Open | Duplicate components and naming (`Avatar`/`Avatark`, `Project*...k`, shared and feature modal variants) obscure the canonical path. Inventory call sites before consolidation. | Coordinated |
| ARCH-06 | P2 | Open | Error boundary is missing around routes. Add a resettable boundary that reports a useful fallback without swallowing navigation recovery. | Independent, high |
| ARCH-07 | P2 | Open | Page-folder barrels are low value unless they improve a real public boundary. Do not create barrels mechanically because they can worsen cycles and tree shaking. | Supersedes old blanket task |

## 5. Reconciled Legacy Findings

### Verified resolved or substantially resolved

- Search input debounce is present.
- `NavHeaderContext` memoizes its provider value.
- Previously misspelled `dashboardStats.tsx` and `StatusBadgeMinimal.tsx` names are corrected.
- Client `.env.example` exists.
- Some CSS variable gaps and dead navigation code were corrected.
- Role-key and permission constants now exist and should remain the logic identity; display role names must not regain authorization significance.

### Still open or regressed

- Auth remains in `localStorage`.
- Raw SVG injection remains.
- Route-level lazy loading is absent.
- `api.ts`, `types.ts`, `layout.tsx`, and several pages remain monolithic.
- Native confirmation dialogs remain in multiple files.
- Toast IDs still use `Math.random`, and timeout lifecycle needs verification.
- Material Symbols and `react-icons` remain mixed at large scale.
- Accessibility and effect cleanup work is incomplete.
- Full lint has grown into a 212-error baseline, including React 19 correctness rules.

### Corrected recommendations from older reports

- Do not add retries to every request. Retry only idempotent operations and selected 429/5xx/network failures; never blindly replay mutations.
- Do not solve cookie CSRF only in React. Cookie issuance, origin checks, CSRF validation, and refresh rotation are a server contract.
- Do not blanket-wrap leaf components in `React.memo` or all handlers in `useCallback`; profile and stabilize data boundaries first.
- Do not create page barrels or directories solely to satisfy structure aesthetics.
- SRI is not a practical fix for Google Fonts CSS whose response can vary. Prefer self-hosted fonts or a strict CSP/deployment policy.

## 6. Phased Delivery Plan

### Phase 0: Safety net and high-risk correctness

1. Add Vitest/RTL and initial tests for route guards, permission controls, API error parsing, and one critical modal/workflow.
2. Remove raw SVG injection (SEC-02).
3. Fix render-phase ref access in `TaskPerformanceTable` and `Timer` (COR-02/03).
4. Add profile image client validation (SEC-05).
5. Verify AI settings responses contain no secret values (SEC-03); stop and coordinate only if leakage is proven.
6. Design the auth cookie contract without editing the backend unless the user authorizes that coordinated change.

**Exit:** build passes; scoped tests pass; changed files lint clean; no raw SVG injection or render-phase ref access remains.

### Phase 1: Request lifecycle and accessibility foundations

1. Introduce API transport boundaries with typed errors and optional abort signals.
2. Migrate high-traffic effects (dashboard, app bootstrap, project pages) to cancellation-safe hooks.
3. Establish the canonical modal/focus contract and migrate existing modals in batches.
4. Add route-level code splitting and an error boundary.
5. Resolve effect dependency/state synchronization findings feature by feature.

**Exit:** navigation does not leave stale updates; routes load in separate chunks; modal keyboard smoke tests pass.

### Phase 2: Domain boundaries and data-fetch redesign

1. Split API endpoints by domain behind stable exports.
2. Split types by domain without introducing cycles.
3. Replace broad page bootstrap data incrementally with domain hooks/cache ownership.
4. Add query/mutation invalidation rules and tests.
5. Split `layout.tsx` and the largest pages along state/behavior boundaries.

**Exit:** no single global fetch is required for unrelated pages; domain modules have defined ownership; key workflows have regression tests.

### Phase 3: Accessibility, consistency, and quality gate

1. Associate labels/help/errors and complete keyboard semantics by feature.
2. Replace native confirmations.
3. Standardize loading/error/empty states and live announcements.
4. Consolidate icon systems in bounded page groups.
5. Resolve unused imports, `any`, fast-refresh boundaries, and empty blocks until full ESLint passes without rule suppression.

**Exit:** `npm run lint`, tests, and build all pass; core workflows pass keyboard checks.

### Phase 4: Performance and consolidation

1. Measure bundle composition and route chunks.
2. Consolidate duplicate components after call-site inventories.
3. Profile high-cost lists/charts; then apply memoization, deferred values, or virtualization where measured.
4. Self-host fonts and finalize CSP/deployment headers.

**Exit:** agreed bundle budgets pass and no duplicate canonical component paths remain.

## 7. Delegation Batches

| Batch | Variant | Scope | Dependency | Risk |
|---|---|---|---|---|
| D1 | high | Replace `BgRenderer` raw SVG injection; add focused test | None | Low/medium visual behavior |
| D2 | high | Fix `TaskPerformanceTable` menu geometry without render-time ref reads | None | Medium interaction behavior |
| D3 | high | Fix `Timer` render-time refs and swallowed errors; add tests | Test foundation preferred | Medium/high state behavior |
| D4 | medium | Add image MIME/size/dimension validation and accessible errors | Test foundation preferred | Low |
| D5 | high | Add route lazy loading, route fallback, and error boundary | None | Medium routing behavior |
| D6 | medium | Replace native confirmations one feature at a time | Canonical modal | Low/medium |
| D7 | medium | Label/control associations by isolated feature folder | Modal/form primitives | Low |
| D8 | medium | Remove unused imports/variables and explicit `any` by isolated folder | After structural churn | Low, but avoid behavior edits |
| D9 | medium | Fix fast-refresh module boundaries in bounded groups | After provider structure settles | Low |
| D10 | medium | Icon migration by page folder | Canonical icon mapping | Low but high-volume |

Not safe for independent bulk delegation: auth/cookie migration, API transport semantics, `appData` replacement, API/types global splits, permission contract changes, or cross-domain cache invalidation.

## 8. Verification Matrix

For each batch:

```powershell
cd Client
npx eslint <changed-files>
npm run test -- --run <relevant-tests>
npm run build
```

At phase boundaries:

```powershell
cd Client
npm run lint
npm run test -- --run
npm run build
```

Also perform focused browser checks for login/refresh, guarded routes, dashboard navigation during in-flight requests, modal keyboard behavior, task timer persistence, project creation, and image upload rejection.

## 9. Decisions and Backend Escalation Triggers

Backend work is not authorized by this frontend plan. Escalate before server edits only when one of these is demonstrated:

- adopting httpOnly cookie auth and CSRF protection;
- an API response exposes AI/provider secrets or excessive sensitive data;
- upload validation is absent server-side and the endpoint accepts unsafe content;
- a required frontend permission state is unavailable or contradicts server enforcement;
- cancellation, pagination, or domain-fetch improvements require an API contract change.

All other frontend findings should be solved inside `Client/`.

## 10. Implementation Log

### 2026-07-11

- D1 / SEC-02: replaced raw SVG injection with React SVG elements in `BgRenderer.tsx`; removed the obsolete `buildWavesSvg` string builder. Scoped ESLint and production build pass.
- D4 / SEC-05: added pre-crop MIME, size, decode, and dimension validation to `ProfilePictureUploader.tsx`, with accessible existing error output and object URL cleanup. Scoped ESLint and production build pass.
- D2 / COR-02: moved task-table status/priority menu geometry capture into the open event and removed render-time trigger-ref reads. Production build passes; the file retains five unrelated pre-existing lint errors for later categorized cleanup.
- Director organization scope: `useUserOrganization` now recognizes a user's direct `organizationId` before department fallbacks.
- Sidebar project consistency: `AppDataProvider` retains the independently server-scoped workspace navigation projects instead of replacing them with the first paginated `pages` response. `ProjectsGroup` no longer applies a second organization/department filter using incomplete paginated department data. Directors and department heads therefore see the same accessible project set in the sidebar as the projects page.
- Dashboard task consistency: `TaskPerformanceTable` uses the paginated `/tasks` endpoint with server-side role/project scoping, stable totals, and query filters. The temporary `/my-tasks` client filtering approach was removed because that feed is separately paginated and has role-specific semantics.
- Users directory consistency: the users API request now asks for the complete scoped set (up to 500) rather than silently displaying only the default first 10 users, which could omit the director despite a valid login account.
- No backend file was changed.
