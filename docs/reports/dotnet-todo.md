# .NET TODO — PMWDS Backend

**Created:** 2026-07-04
**Owner:** PMWDS backend
**Source reports:** `dotnet-api-audit.md`, `dotnet-architecture-audit.md`, `dotnet-code-quality-audit.md`, `dotnet-database-audit.md`, `dotnet-security-audit.md`
**Issue notes:** `docs/issue-sql-cascade-paths.md`, `docs/issue-sqlite.md`
**Solution root:** `E:\saturday\PMWDS.S` (entry project: `PMWDS.API`)

> This is the single living tracker for the .NET backend. Update statuses here as work lands.

---
# IMPORTANT NOTE 
- make git commits every after every fix. 
- DO NOT RUN DOTNET PROJECT , CAN BUILD TO CHECK FOR ERRORS ONLY
- DO not write TEST OR TEST unless asked, ASK me to build and run.

## How to use this file (read first)

**Process for every task**
1. Before writing any code, surface the important decisions for that task and ask the user — each question must come with a **recommended option**. Do not silently pick an approach for anything non-trivial.
2. Implement only after the approach is agreed.
3. After finishing a task: update its status here, and **update `docs/temp/project-overview.md`** with any new pattern / convention / file-name that future changes must respect (entity map, service responsibilities, permission/role keys, DB provider strategy, etc.).
4. Phases are ordered — earlier phases unblock later ones (e.g. lock the provider strategy in Phase 2 before tightening migrations).

**Subagent delegation**
- Tasks tagged **`[independent]`** have no shared mutable state with other open tasks and can be handed to subagents in parallel (one agent per file / per phase).
- Tasks tagged **`[coordinated]`** touch shared files, DB schema, contracts, or auth and should be done sequentially or by the same agent.
- When delegating, give the subagent: the task id, the source-report reference, exact files, and the **Verification** steps below.
- Subagents must NOT implement tasks outside their assigned scope and must NOT edit `project-overview.md` (the lead does that).

**Status legend:** 🔴 Pending · 🟡 In progress · ✅ Done · ⚠️ Blocked / needs decision

---

## Cross-cutting initiative — Robust permission & role management

See **Phase 1** for the full plan. Summary of the gaps to fix project-wide:
- Permissions are generic; there is **no permission for the "primary department"** that creates a project. The department head who creates a project must keep visibility/control of it (and its milestones) even when that department is not in the assigned `ProjectDepartments`.
- **Role display names double as logic keys** in several spots (`User.IsInRole("SuperAdmin")`, `_scope.IsSuperAdmin`, policy names). Because SuperAdmin can create/rename roles and Director/SuperAdmin can edit permissions, a rename can silently break authorization. We will introduce an immutable **Role Key** distinct from the display **Name** and make every check key/permission-based.
- We need a single source of truth for permission codes and role keys, and DB-backed revalidation for sensitive operations (do not trust stale JWT claims).

---

## Phase 0 — Security & correctness (P0 — do first)

| # | Task | Files | Source | Status |
|---|------|-------|--------|--------|
| 0.1 | Remove all hardcoded secrets (JWT secret, OpenRouter key, SMTP creds, SQL SA password) → env vars / User Secrets / Key Vault. Rotate the leaked OpenRouter key. `[coordinated]` with react 0.3 | `appsettings.json:12,47`, `appsettings.Development.json:3`, `.env.example` | sec 6.1 / db 6.1 / cq 9.3 | ✅ |
| 0.2 | Remove stack-trace leakage: delete the 3 try/catch blocks in `TasksController` that return `ex.Message`/`ex.StackTrace`; let `ExceptionMiddleware` handle. `[independent]` | `TasksController.cs:136,661,938` | api §6.2 / sec 10.1 / cq 2.2 | ✅ |
| 0.3 | Rate limiting on auth endpoints (login/signup/forgot/reset) + account lockout after N failures. `[independent]` | `Program.cs`, `AuthController.cs` | sec 1.4 / 9 | ✅ |
| 0.4 | Strengthen password policy (≥10, complexity); remove legacy SHA256 fallback. | `AuthController.cs:97,209,272-274` | sec 1.3 | ✅ |
| 0.5 | JWT hardening: random 256-bit secret, expiry 15–30 min, refresh-token rotation, revocation on logout/password change/deactivation. | `AuthController.cs:231-253,280-310`, `Program.cs:58-77` | sec 1.1/1.2 | 🔴 |
| 0.6 | Encrypt sensitive data at rest (API keys, webhook secrets, integration config) via `AddDataProtection()`. `[coordinated]` with react 0.7 | `Program.cs`, `AIProviderCredential`, `Webhook`, `Integration` | sec 11.3 | 🔴 |
| 0.7 | SignalR: require a permission on `NotificationHub.SendBroadcast`; replace static `Dictionary` with `ConcurrentDictionary`. Thread-safe `ChatEngine.Sessions` too. `[independent]` | `NotificationHub.cs:9,66-75`, `DashboardHub.cs`, `ChatEngine.cs:65` | sec 11.1 / api 7.1 / cq 7.1-7.2 | 🔴 |
| 0.8 | Fix sync-over-async `.Result` → `await` (deadlock risk). `[independent]` | `TasksController.cs:581,610` | api 10.1 / arch 5.2 / cq 3.1 | 🔴 |
| 0.9 | SSRF: validate/whitelist AI provider URLs; validate webhook `CallbackUrl`. | `ChatEngine.cs:311-375,536-537`, `WebhooksController.cs:52`, `AIController.cs:64-141` | sec 7.2 | 🔴 |

---

## Phase 1 — Robust permission & role management (P0/P1 — new initiative)

> This phase must land before broad refactors so all later auth checks use the new model.

| # | Task | Files | Source | Status |
|---|------|-------|--------|--------|
| 1.1 | Add immutable **Role Key** (e.g. `superadmin`, `director`, `manager`, …) distinct from display **Name**; migrate identity to use Key for all logic; allow SuperAdmin to rename only the display Name. `[coordinated]` | `ApplicationUser`/Role entity, `RoleScopeService.cs`, seeders | sec 2.2 / overview | ✅ |
| 1.2 | Replace every display-name role check with key/permission check — audit `User.IsInRole("SuperAdmin")`, `_scope.IsSuperAdmin`, `_scope.IsDirector`, hardcoded policy names. App must keep functioning after a role rename. `[coordinated]` | `UsersController.cs:165`, `RoleScopeService.cs`, `PermissionPolicyRegistry.cs`, all controllers | api 4.3 / sec 2.x | 🟡 Core role-name logic moved to role keys; policy-name cleanup remains |
| 1.3 | Add permission for the **primary department** that creates a project (e.g. `ProjectPrimaryDepartment.Manage`); ensure primary department head sees project + milestones even when not in `ProjectDepartments`. Wire into `RoleScopeService` + project scoping. `[coordinated]` | `PermissionCodes.cs`, `Project.cs` (PrimaryDepartment), `RoleScopeService.cs`, `ProjectsController.cs` | overview / new | ✅ |
| 1.4 | DB-backed permission revalidation on sensitive ops (don't trust stale JWT claims); shorten permission-claim staleness or move claims to short-lived tokens. `[coordinated]` with 0.5 | `PermissionAuthorizationHandler.cs:30-40`, `AuthController.cs:295` | sec 2.1 | ✅ DB-backed policy authorization; token lifetime/refresh remains tracked in 0.5 |
| 1.5 | Permission/role edit safety rails: cannot remove own `SystemAdmin`, cannot delete/lock last SuperAdmin, role-key immutable, permission changes invalidate affected sessions. | `RolesController.cs`, `PermissionPolicyRegistry.cs` | sec 2.2 | ✅ Safety rails added; permission changes take effect via DB revalidation |
| 1.6 | Single source of truth: extend `PermissionCodes.cs` (and a new `RoleKeys`) constants; remove duplicated permission-module lists in `RolesController` + `PagesController`. `[coordinated]` | `PermissionCodes.cs`, `RolesController.cs`, `PagesController.cs` | cq 4.4 / api | 🔴 |
| 1.7 | **Update `docs/temp/project-overview.md`** with the full roles/permissions model (keys vs names), the new primary-department permission, scoping rules, file map, and the patterns every future change must follow. | `docs/temp/project-overview.md` | overview | 🔴 |

---

## Phase 2 — Database & provider strategy (P0/P1)

| # | Task | Files | Source | Status |
|---|------|-------|--------|--------|
| 2.1 | **Remove MySQL support entirely** — provider-detection branch, `MySql.EntityFrameworkCore` package refs, configs, seeders, docs. Production = SQL Server; Development = SQLite. `[coordinated]` | `DatabaseConnectionService.cs`, `.csproj`, `appsettings*.json` | db 6.2 / 11.1 | 🔴 |
| 2.2 | **Dev DB fast-fail:** replace the SQL Server 5-retry / 15s startup wait with a **single** connectivity check; if unreachable **in Development**, auto-fallback to SQLite with a clear log. Production must **fail fast** (no silent fallback). `[coordinated]` | `DatabaseConnectionService.cs:100-137,178` | db 6.2 / cq 7.5 / new | 🔴 |
| 2.3 | Replace `EnsureCreatedAsync` with `Database.MigrateAsync` so migrations are tracked for SQL Server. | `DatabaseConnectionService.cs:97` | db 3.2 | 🔴 |
| 2.4 | Make `EnsureSqliteDevelopmentDatabaseAsync` non-destructive (no drop/recreate); use idempotent migration/patch steps. `[coordinated]` | `DatabaseConnectionService.cs:265-283` | db 3.2 | 🔴 |
| 2.5 | **Verify the cascade-delete fix** from `issue-sql-cascade-paths.md` is applied (`ProjectConfiguration` Milestones→Project = `NoAction`; `ProjectDepartmentConfiguration` DepartmentId = `NoAction`) and lock it with a test. (Referenced in db audit §2.1; fix documented only in the issue note.) `[independent]` | `ProjectConfiguration.cs:43-54`, `ProjectDepartmentConfiguration.cs`, `MilestoneConfiguration.cs:21-24` | issue-sql-cascade-paths / db 2.1 | ⚠️ Fix applied — verify + add regression test |
| 2.6 | Configure `RowVersion` as an EF Core concurrency token (`IsConcurrencyToken`/`IsRowVersion`); fix silent overwrite. `[coordinated]` | `BaseEntity.cs`, configurations | db 9.1 | 🔴 |
| 2.7 | `EnableRetryOnFailure()` for SQL Server (transient faults). | DbContext registration | db 6.3 | 🔴 |
| 2.8 | Normalise user-ID types (string vs Guid) across the task aggregate; stop ignoring `TaskAssignment.User` / `TimeEntry.User` navigations. `[coordinated]` | `TaskAssignment.cs`, `TimeEntry.cs`, `TaskComment.cs`, `Project.cs`, configurations | db 2.1 | 🔴 |
| 2.9 | Fix N+1 / read perf: add `Include`/`AsSplitQuery` to `ProjectRepository` & `TaskRepository`; use `AverageAsync`; add `AsNoTracking` to read-only queries; add `Select` projections. `[independent]` per repo | `BaseRepository.cs`, `ProjectRepository.cs`, `TaskRepository.cs`, `UserRepository.cs` | db 1.1–1.4 / 5.2 | 🔴 |
| 2.10 | Add filtered `IsDeleted` indexes + composite indexes (ProjectTask, Notification, TaskAssignment, TimeEntry, Milestone). `[independent]` | configurations | db 5.1 / 8.2 | 🔴 |
| 2.11 | `BaseRepository.DeleteAsync` → soft delete (not hard `Remove`). `[coordinated]` | `BaseRepository.cs`, `UnitOfWork.cs` | db 8.3 | 🔴 |
| 2.12 | Wrap multi-`SaveChanges` seeders in explicit transactions (`ProjectsSeeder.ClearExistingProjectsAsync`, `SeedData.SeedAsync`). `[independent]` | `Seeders/*` | db 3.3 / 7.2 | 🔴 |

---

## Phase 3 — API layer & architecture (P1)

| # | Task | Files | Source | Status |
|---|------|-------|--------|--------|
| 3.1 | Remove Service Locator in `BaseApiController` — constructor-inject `IMediator`. `[coordinated]` | `BaseApiController.cs:14` | arch 3.2 | 🔴 |
| 3.2 | Split God `IAIService` (30+ methods) → `IRecommendationService`, `IPredictionService`, `IProjectHealthService`, `IModelManagementService`, `IChatService`. `[coordinated]` | `IAIService.cs`, `AIService*.cs`, consumers | arch 3.1 / 11.1 | 🔴 |
| 3.3 | Slim God `IUnitOfWork` (34 repos); prefer specific repositories; remove redundant generic `BaseRepository` over EF Core. `[coordinated]` | `IUnitOfWork.cs`, `UnitOfWork.cs`, `BaseRepository.cs` | arch 7.1/7.2 | 🔴 |
| 3.4 | Refactor `TasksController` (1244 lines) — move business logic to application-layer commands/handlers; pull out `Recalculate*`, `ApplyStatusChange*`, `IsUserInProjectOrganization*`. `[coordinated]` | `TasksController.cs`, `Application/Features/Tasks/**` | api 5 / arch 9 | 🔴 |
| 3.5 | Dispatch domain events after `SaveChanges` via MediatR (currently collected but never dispatched). `[coordinated]` | `Program.cs`, `UnitOfWork.cs` | arch 8.2 | 🔴 |
| 3.6 | Move DTO records out of controllers → `PMWDS.Application/DTOs`. `[independent]` per controller | all 17 controllers with inline DTOs | api 5.3 / cq 4.3 | 🔴 |
| 3.7 | Actually wire FluentValidation: validators for DTOs/commands + `AddFluentValidationAutoValidation`; remove ad-hoc manual validation. `[coordinated]` | `Program.cs`, `Application/**`, controllers | api 3 / arch 6.3 | 🔴 |
| 3.8 | Universal `ApiResponse<T>` envelope + one consistent error shape. `[coordinated]` | `ExceptionMiddleware.cs`, controllers | api 2 | 🔴 |
| 3.9 | Add `[ProducesResponseType]` to all actions; expose Swagger/Scalar in staging (configurable, not Dev-only); enable XML doc generation. `[independent]` | controllers, `PMWDS.API.csproj`, `Program.cs` | api 8 | 🔴 |
| 3.10 | Remove redundant `[Authorize]` re-declarations; standardise policy style (prefer fine-grained `Roles.*`/`Permissions.*` over role names) — ties to Phase 1.2. `[coordinated]` | all controllers | api 4.1/4.2 | 🔴 |
| 3.11 | `[ResponseCache]` on GET endpoints; actually use `ICacheService`. `[independent]` | controllers | api 10.2 | 🔴 |

---

## Phase 4 — Layering & code quality (P2)

| # | Task | Files | Source | Status |
|---|------|-------|--------|--------|
| 4.1 | Fix layering violations: remove `Microsoft.AspNetCore.Identity.EntityFrameworkCore` + `FluentValidation` from `PMWDS.Domain`; remove `Microsoft.AspNetCore.Http.Abstractions` from `PMWDS.Application`. `[coordinated]` | `PMWDS.Domain.csproj`, `PMWDS.Application.csproj` | arch 4.1/4.2 | 🔴 |
| 4.2 | Stop controllers bypassing CQRS — `ProjectsController`/`TasksController` direct `ApplicationDbContext`/`IUnitOfWork` → route through MediatR handlers. `[coordinated]` (after 3.4) | `ProjectsController.cs`, `TasksController.cs` | arch 4.3 | 🔴 |
| 4.3 | Add `ConfigureAwait(false)` to all `await` in library projects (Application/Infrastructure/Persistence/AI/Domain). `[independent]` | all library `.cs` | cq 3.4 | 🔴 |
| 4.4 | Replace `Console.WriteLine` with `ILogger<T>` in `DatabaseConnectionService`, `Program.cs`. `[independent]` | `DatabaseConnectionService.cs`, `Program.cs` | cq 8.2 | 🔴 |
| 4.5 | Convert static classes (`DatabaseConnectionService`, `EnvFileLoader`) to injectable services. `[coordinated]` | `DatabaseConnectionService.cs`, `EnvFileLoader.cs` | arch 10.3 / cq 10.3 | 🔴 |
| 4.6 | Remove redundant shadow interfaces (`AuditService`, `CacheService`) — implement Application interfaces directly. `[independent]` | `Infrastructure/Services/*` | arch 3.3 | 🔴 |
| 4.7 | Extract duplicated permission-module lists into shared constants (ties to 1.6). | `RolesController.cs`, `PagesController.cs` | cq 4.4 | 🔴 |
| 4.8 | De-dup: SMTP connection logic in `EmailService`; activity-log creation pattern (introduce `IActivityLogBuilder`). `[independent]` | `EmailService.cs`, controllers | cq 4.5 | 🔴 |
| 4.9 | Extract magic numbers (risk thresholds, allocation weights, expected-delay days) into config/constants. `[independent]` | `DelayPredictionEngine.cs`, `TaskAllocationEngine.cs`, `ChatEngine.cs` | cq 4.4 | 🔴 |
| 4.10 | Enable `<Nullable>enable</Nullable>` in all `.csproj`; fix fallout. `[coordinated]` | all `.csproj` | cq 1 | 🔴 |
| 4.11 | Fix in-memory N+1: `ProjectsController.GetDashboard`, `NotificationsController.GetMine`, `OrganizationsController.GetAll` (filter server-side). `[independent]` per controller | controllers | api 10.4 | 🔴 |

---

## Phase 5 — Testing & hardening (P2)

| # | Task | Files | Source | Status |
|---|------|-------|--------|--------|
| 5.1 | Create a unit-test project; cover domain entities + MediatR handlers + `RoleScopeService`/permission handler. `[independent]` | new `PMWDS.Tests` project | arch / cq 10 | 🔴 |
| 5.2 | Integration tests (EF InMemory / Testcontainers for SQL Server + SQLite). `[coordinated]` | new test project | cq 10 | 🔴 |
| 5.3 | `dotnet list package --vulnerable`; update/replace CVE packages; decide on stable .NET LTS vs preview. `[independent]` | `.csproj` files | sec 8 | 🔴 |
| 5.4 | Security headers (`X-Content-Type-Options`, `X-Frame-Options`, CSP, HSTS). `[coordinated]` with react 0.5 | `Program.cs` | sec 16 | 🔴 |
| 5.5 | Auth/permission audit logging (login failures, password changes, permission/role edits). `[independent]` | `ActivityLogs`, `AuthController`, `RolesController` | sec 16 | 🔴 |
| 5.6 | Obscure Hangfire dashboard path (optional). `[independent]` | `Program.cs:223-227` | sec 11.2 | 🔴 |
| 5.7 | Wrap multi-`SaveChanges` command flows (e.g. `CreateTaskCommand`) in explicit transactions. `[coordinated]` | `Application/Features/Tasks/Commands/*` | arch 5.3 | 🔴 |

---

## Completed ✅ (quick reference)
- 0.1 Hardcoded secrets removed, UserSecretsId added, `.env.example` created
- 0.2 Stack-trace leakage removed from `TasksController` (3 try/catch blocks)
- 0.3 Rate limiting on auth endpoints + account lockout implemented
- 0.4 Password policy strengthened (≥10, complexity), SHA256 fallback removed
- 1.1 Role keys added (`Role.Key`, `RoleKeys`, migration, seeders, JWT role-key claims); display `Role.Name` remains UI-facing and renameable.
- 1.3 Added `PROJECT_PRIMARY_DEPARTMENT_MANAGE`; primary-department project and milestone visibility/control now flows through DB permissions and `RoleScopeService`.
- 1.4 Permission policies now revalidate against active user roles in the database and no longer trust stale JWT permission claims.
- 1.5 Role/permission safety rails added: SuperAdmin role and `SYSTEM_ADMIN` permission are protected, own `SYSTEM_ADMIN` removal is blocked, and the last active SuperAdmin cannot be deactivated.
- 2.5 cascade-delete fix **applied** (per `issue-sql-cascade-paths.md`) — pending verification + regression test.

## High-effort / high-impact (plan accordingly)
- Phase 1 (permission/role model overhaul) — touches identity, scoping, every controller, and the client.
- 2.1 + 2.2 (provider strategy: drop MySQL, dev fast-fail to SQLite).
- 3.4 (refactor `TasksController`) + 4.2 (CQRS compliance).
- 0.5 / 0.6 (JWT + data-at-rest encryption) — security-critical, schema/config impact.

## Open questions to resolve before implementation
- **2.1/2.2** — confirm production stays on SQL Server and dev falls back to SQLite automatically (no MySQL). *Recommended: yes — single prod provider (SQL Server), dev auto-fallback to SQLite, fail-fast in prod.*
- **1.1/1.2** — introduce a separate `RoleKey` column vs reuse the existing role id? *Recommended: add an immutable `NormalizedName`/`Key` column; keep id stable; rename only the display `Name`.*
- **1.3** — model primary department as a dedicated FK on `Project` (one primary) vs a flag on `ProjectDepartment`? *Recommended: dedicated `Project.PrimaryDepartmentId` FK (one primary, enforced) — simpler scoping.*
- **0.5** — refresh-token storage: DB table (revocable) vs stateless rotation? *Recommended: DB-backed refresh tokens for revocation.*
- **0.1** — secrets store: User Secrets (dev) + env vars (prod) vs Azure Key Vault? *Recommended: User Secrets for dev, env vars for prod, Key Vault if deploying to Azure.*
- **3.8** — adopt `ApiResponse<T>` envelope globally (breaking for the React client) vs only for new endpoints? *Recommended: introduce now, migrate endpoints phase-wise, coordinate the client `api/` split (react 1.1).*
