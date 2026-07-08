# PMWDS — Project Overview & Change Reference

> **Purpose:** Single source of truth for the architecture, domain model, roles/permissions, DB strategy, and conventions. **Update this file whenever a pattern, file name, entity, permission, or role changes** so future work respects the established conventions.
>
> **Companion trackers:** `docs/reports/dotnet-todo.md` (backend) · `docs/reports/react-todo.md` (frontend). Each completed task there should land an update here.
>
> **Last updated:** 2026-07-06

---

## 0. Product summary (original notes)

- RBAC system.
- Client: React app in `Client/` folder.
- API entry project: `PMWDS.API` (`dotnet run --project pmwds.api`).
- Users access different pages/sections based on roles + permissions.
- **SuperAdmin** can do everything including organisation management (only SuperAdmin sees organisations; other roles never see organisation mentions even if they belong to one).
- **Director** manages projects and departments (admin for the multi-tenant app).
- A **project** is created, **milestones** are created, each milestone can be assigned to one department.
- **Department head** can create projects. Each project has a **primary department** (the department whose head created the project). Even if none of the milestones/departments are assigned to the primary department, the primary department head can still see project details and milestones.
- Milestones assigned to departments → their **department head** manages tasks and subtasks.
- Some AI features are implemented.

---

## 1. Solution structure & layering

Clean Architecture, .NET 10.0. Six projects (see `PMWDS.slnx`):

| Project | Role | Depends on |
|---|---|---|
| `PMWDS.Domain` | Entities + base classes + domain events (innermost) | (nothing) — **but currently violates purity** |
| `PMWDS.Application` | Interfaces, DTOs, MediatR Features, Security constants, Exceptions | Domain |
| `PMWDS.Persistence` | EF Core `ApplicationDbContext`, configurations, repositories, migrations, seeders | Application, Domain |
| `PMWDS.Infrastructure` | Service implementations, Hangfire jobs, settings, file/AI infra | Application, Domain |
| `PMWDS.API` | Composition root — controllers, auth, middleware, hubs, `Program.cs` | All of the above |
| `PMWDS.AI` | ML.NET + OpenAI services (delay prediction, task allocation, chat) | Application, Domain, Infrastructure, Persistence |

**Dependency direction is correct (no cycles).** Known layering violations to fix (tracked in `dotnet-todo.md` Phase 4.1):
- `PMWDS.Domain` references `Microsoft.AspNetCore.Identity.EntityFrameworkCore` + `FluentValidation` (should be pure C#).
- `PMWDS.Application` references `Microsoft.AspNetCore.Http.Abstractions` (should not depend on ASP.NET).

### Folder conventions (respect these when adding files)

```
PMWDS.API/         Controllers/  Auth/  Middleware/  Hubs/  Services/  Filters/
PMWDS.Application/ Features/  Interfaces/{Services,Repositories}/  DTOs/  Security/  Exceptions/
PMWDS.Domain/      Entities/  Common/  Enums/  Events/
PMWDS.Persistence/ Context/  Configurations/  Repositories/  Migrations/  Migrations/Seeders/
PMWDS.Infrastructure/ Services/  Jobs/  Settings/
```

### Naming conventions (observed — follow them)
- Controllers: `<Resource>Controller`, route `api/v1/[controller]` (set on `BaseApiController`).
- MediatR: `Features/<Aggregate>/{Commands,Queries}/<Verb><Aggregate>Command` (e.g. `CreateProjectCommand`).
- Interfaces: `I` prefix (`IUnitOfWork`, `IEmailService`).
- File-scoped namespaces everywhere (C# 10+).
- `_camelCase` private fields, `PascalCase` members, `camelCase` parameters.
- `Async` suffix on async methods (a few exceptions: `EnvFileLoader.Load`, `BaseApiController.HandleResult`).
- **DTOs are currently defined inline at the bottom of controllers** — convention-to-fix is to move them to `PMWDS.Application/DTOs/<Domain>/`.

### Composition root specifics (`PMWDS.API/Program.cs`)
- `EnvFileLoader.Load(...)` runs **unconditionally** at startup (line 31) — loads `.env` even in production.
- DbContext registration delegated to `AddApplicationDatabase(...)` (returns `DatabaseConnectionStatus`).
- `PrepareDatabaseAsync` + `SeedData.SeedAsync` run inside a startup scope (lines 236–237).
- Hangfire, dashboard, and recurring jobs are **SQL-Server-only** (gated on `databaseStatus.Provider == SqlServer`).
- SignalR hubs mapped at `/hubs/notifications` and `/hubs/dashboard`.
- Middleware pipeline order: `ExceptionMiddleware` → `RequestLoggingMiddleware` → Swagger/Scalar (Dev) →HttpsRedirection → StaticFiles(`/files`, `/avatars`) → SerilogRequestLogging → CORS → Authentication → Authorization → HangfireDashboard → Hubs/Controllers.
- `BaseApiController` constructor-injects `IMediator`; every derived controller must accept `IMediator mediator` and call `base(mediator)`.
- FluentValidation is wired through `AddFluentValidationAutoValidation()` and validators live under `PMWDS.Application/Validators`; prefer validators for request/DTO shape checks and keep database/scope checks in application handlers or controller services.
- API object responses are wrapped centrally by `ApiResponseEnvelopeFilter` as `ApiResponse<T>`; exception middleware and model-validation failures use `ApiError` with `code`, `message`, optional `details`, `traceId`, and `timestamp`.
- `ProducesResponseTypeConvention` adds standard response metadata for API actions. Swagger/Scalar is exposed in Development, Staging, or when `Swagger:Enabled=true`; API XML docs are generated by `PMWDS.API.csproj`.
- The same API convention applies short client-side response-cache metadata to GET actions. `PagesController.Get` also uses `ICacheService` with a per-user/page short TTL for the expensive page aggregation response.
- `BaseApiController` carries the baseline `[Authorize]`; controllers should only add finer-grained policy attributes when an action requires more than an authenticated user.

---

## 2. Domain model (entity map)

Base classes — `PMWDS.Domain/Common/`:
- **`BaseEntity`** — `Id` (Guid), `CreatedDate`, `ModifiedDate`, `CreatedBy` (string), `ModifiedBy`, `IsDeleted` (soft delete), `RowVersion` (int, manually incremented and configured globally as an EF concurrency token). Methods: `SetCreatedBy`, `SetModified`, `SoftDelete`.
- **`AuditableEntity : BaseEntity`** — adds `Notes`, `Tags`, `IsActive`. Methods: `Activate`/`Deactivate`/`SetNotes`/`SetTags`.
- **`ValueObject`** — defined but unused (no value objects exist).
- **`IDomainEvent` / `DomainEvent` / `IHasDomainEvents`** — domain event base plus entity marker. `UnitOfWork.SaveChangesAsync` dispatches collected events after a successful EF save by publishing `DomainEventNotification<TDomainEvent>` wrappers through MediatR, then clears the entity event queues.

### Core entities (`PMWDS.Domain/Entities/`)

**Identity & RBAC**
- **`ApplicationUser : AuditableEntity`** — `Id` is **Guid**. Email, names, `PasswordHash`, reset-token fields, `OrganizationId`, `DepartmentId` (primary dept), `JobTitle`, availability + AI-score fields. Nav: `Department`, `Organization`, `Profile`, `Roles` (many-to-many), `DepartmentAssignments`, `Skills`, `TaskAssignments`, `TimeEntries`. Factory `ApplicationUser.Create(...)`.
- **`Role : AuditableEntity`** — `Key` (immutable logic identifier, unique, max 100), `Name` (mutable display label), `Description`, `PermissionLevel` (int, higher = more power), `PaginationPageSize`, `Permissions` (many-to-many), `Users`. Logic must use `Role.Key` / `RoleKeys`; UI may display or edit `Name`.
- **`Permission`** — `Code` (string, e.g. `PROJECT_MANAGE`), plus `Module`/`Name` for grouping. Referenced by `Role.Permissions`.
- **`UserProfile`** — extended profile/PII (DOB, address, emergency contact, LinkedIn).
- **`UserDepartment`** (join) — user ↔ department assignments (a user can be in multiple departments).
- **`UserSkill`**, **`Skill`** — skill catalog + per-user assignment.

**Organisation & departments**
- **`Organization`** — tenant root.
- **`Department : AuditableEntity`** — `Name`, `Code` (uppercased), `OrganizationId`, `ParentDepartmentId` (tree), **`DepartmentHeadUserId`** (string — the head of the dept), `MaxCapacity`. Methods: `AssignHead`, `AssignToOrganization`.

**Project aggregate**
- **`Project : AuditableEntity`** — `ProjectCode`, `Name`, `Category`, `Priority`, `Status`, **`DepartmentId` (the PRIMARY department)**, `ProjectManagerId` (`Guid?`, FK to `ApplicationUser.Id`), `ClientName`, timeline, budget, progress, AI fields. Holds `_milestones`, `_tasks`, `_documents`, `_projectDepartments`, `_domainEvents`. Key methods: `Create`, `Start`/`Complete`/`PutOnHold`/`UpdateStatus`, `AssignDepartments` (keeps `DepartmentId` as primary; calls `MarkPrimary`/`ClearPrimary` on the join rows), `RecalculateProgressFromMilestones`, `RecalculateStatusFromMilestones`. Raises `ProjectCreatedEvent`, `ProjectStatusChangedEvent`, `ProjectDelayedEvent`, `ProjectBudgetAlertEvent`.
- **`ProjectDepartment` (join)** — `ProjectId`, `DepartmentId`, **`IsPrimary`** flag. Methods: `MarkPrimary`/`ClearPrimary`. (So "primary department" is modelled twice: `Project.DepartmentId` and the `IsPrimary` flag on the join row. `AssignDepartments` keeps them in sync.)
- **`Milestone : AuditableEntity`** — `ProjectId`, **`DepartmentId`?** (nullable — a milestone is assigned to **one** department), `Name`, `Order`, `DueDate`, `Status`, `IsCritical`, progress. Nav: `Project`, `Department`, `Tasks`, prerequisite/dependent `MilestoneDependency`. Methods: `AssignDepartment`, `MarkComplete`, `RecalculateProgressFromTasks`, `RecalculateStatusFromTasks`.
- **`MilestoneDependency`** — `FinishToStart`/`ProgressThreshold` relationships between milestones.

**Task aggregate**
- **`ProjectTask`** — task under a project/milestone; assignment user fields (`AssignedToUserId`, `AssignedByUserId`, `AIRecommendedAssigneeId`) are `Guid?` values aligned with `ApplicationUser.Id`. API DTOs still expose these IDs as strings at the boundary.
- **`TaskAssignment`** — user ↔ task. `UserId` is `Guid` and `TaskAssignment.User` is mapped to `ApplicationUser`.
- **`TaskDependency`**, **`TaskComment`**, **`TaskAttachment`**, **`TimeEntry`**. `TaskComment.UserId` is `Guid?` so system comments can omit a user; `TimeEntry.UserId` is `Guid` and `TimeEntry.User` is mapped to `ApplicationUser`.

**Other aggregates (one-line each)**
- Notifications: `Notification`, `NotificationTemplate`, `AlertRule`.
- Activity/Audit: `ActivityLog`, `AuditLog`.
- Reporting: `Report`, `ReportSchedule`.
- Dashboards: `Dashboard`, `DashboardWidget`.
- AI: `AIGlobalSetting`, `AIModel`, `AIProviderCredential` (ApiKey stored **plaintext** — `dotnet-todo.md` 0.6), `AllocationRecommendation`, `DelayPrediction`, `DelayPredictionModel`, `TaskAllocationModel`, `PredictionResult`, `TrainingDataPoint`.
- Knowledge: `KnowledgeArticle`, `LessonLearned`.
- Integrations: `Integration`, `Webhook`, `WebhookDelivery`.
- Documents: `ProjectDocument`.

**EF configurations** — `PMWDS.Persistence/Configurations/` (one file per entity). Critical delete behaviors to preserve:
- `ProjectConfiguration`: `Milestones → Project` FK = **`NoAction`** (cascade-delete fix, see `docs/issue-sql-cascade-paths.md`). `Tasks → Project` and `Documents → Project` remain `Cascade`.
- `ProjectDepartmentConfiguration`: `Department` FK = **`NoAction`**; `Project` FK remains `Cascade`.
- `MilestoneConfiguration`: `Tasks` FK = `SetNull`.
- Global query filter `IsDeleted == false` applied to all `BaseEntity` subclasses (in `ApplicationDbContext`).
- Soft-delete read paths on tasks, notifications, task assignments, time entries, and milestones have provider-safe `IsDeleted` composite indexes in their EF configurations.
- `TaskAssignment.User` and `TimeEntry.User` are mapped to `ApplicationUser` with `NoAction` user delete behavior after the task aggregate user IDs were normalized to `Guid`.
- `RowVersion` is configured as an EF Core concurrency token for all `BaseEntity` subclasses in `ApplicationDbContext`.

`ApplicationDbContext` (`PMWDS.Persistence/Context/`) exposes ~51 DbSets and applies the soft-delete global filter.

---

## 3. Roles, permissions & authorization ⚠️ (under overhaul — see `dotnet-todo.md` Phase 1)

### Permission codes — single source of truth
**File:** `PMWDS.Application/Security/PermissionCodes.cs`
- Claim type: `PermissionCodes.PermissionClaimType = "permission"`.
- `SystemAdmin = "SYSTEM_ADMIN"` is the **bypass-everything** constant — every policy in `PermissionPolicyRegistry.RequireAny` includes it.
- ~60 module codes follow the pattern `<MODULE>_<ACTION>`: `ORGANIZATION_MANAGE/VIEW/CREATE/EDIT/DELETE`, `DEPARTMENT_*`, `PROJECT_*`, `MILESTONE_*`, `TASK_*` (+ `TASK_ASSIGN`, `TASK_COMMENT_CREATE`, `TASK_ATTACHMENT_CREATE`, `TASK_TIME_TRACK`), `SUBTASK_*`, `USER_*` (+ `USER_DEPARTMENT_MANAGE`, `USER_PROFILE_PICTURE_MANAGE`), `ROLE_*`, `PERMISSION_*`, `NOTIFICATION_*` (+ `NOTIFICATION_BROADCAST`, `NOTIFICATION_TEMPLATE_MANAGE`, `NOTIFICATION_RULE_MANAGE`), `ACTIVITY_LOG_*`, `REPORT_*`, `KNOWLEDGE_*`, `INTEGRATION_*`, `AI_VIEW/AI_MANAGE`, `AUTH_MANAGE`, `SYSTEM_DATABASE_VIEW`.

> **GAP (to fix in Phase 1.3):** there is **no permission for the primary department that creates a project**. Primary-department-head access currently works only because `RoleScopeService.ScopeProjectsAsync` includes `project.DepartmentId` in the department-head scoping — there is no dedicated permission code. A new code (e.g. `ProjectPrimaryDepartment.Manage` / `PROJECT_PRIMARY_DEPARTMENT_MANAGE`) will be added.

### Policies
**File:** `PMWDS.API/Auth/PermissionPolicyRegistry.cs`
- Named role-tier policies: `Authenticated`, `SuperAdmin`, `Director`, `Manager`, `TaskEditor` (each `RequireAny`s a set of permission codes including `SystemAdmin`).
- CRUD policies auto-generated per module via `AddCrud(...)`: `<Module>.View/.Create/.Edit/.Delete/.Manage`.
- `ActivityLogs.View/.Create/.Manage` defined explicitly.

### Permission resolution at request time
**File:** `PMWDS.API/Auth/PermissionAuthorizationHandler.cs`
- **JWT claims are checked FIRST** (`HasPermissionClaim`) — meaning stale permissions embedded in the token are accepted until the token expires.
- Only if the claim check fails does it query the DB (`GetPermissionsForCurrentUserAsync`), with per-HttpContext caching keyed `"__pmwds_permissions"`.
- **Risk:** if a Director/SuperAdmin edits a user's permissions, the user keeps the old permissions until token expiry. `dotnet-todo.md` 1.4 will add DB revalidation for sensitive ops.

### Role keys vs display names
**Files:** `PMWDS.Domain/Entities/Role.cs`, `PMWDS.Application/Security/RoleKeys.cs`, `PMWDS.Persistence/Migrations/20260706120000_AddRoleKeys.cs`
- `Role.Key` is the immutable logic key. Built-in keys: `superadmin`, `director`, `project-manager`, `department-head`, `team-member`, `viewer`.
- `Role.Name` is a display label only. SuperAdmin may rename it without breaking role checks.
- New custom roles created through `Role.Create(name, ...)` receive a generated `custom-...` key.
- Seeders look up built-in roles by key and call `EnsureKey(...)` for legacy rows.
- `UserRoleResolver.ResolveNames(...)` returns display names for API/client compatibility; `ResolveKeys(...)` returns logic keys.
- `CurrentUserService.IsInRole(...)`, `RoleScopeService`, Hangfire auth, user assignment safety checks, and organization director discovery use role keys.
- Existing tier policy names (`SuperAdmin`, `Director`, `Manager`, `TaskEditor`) are permission-backed aliases, not role display-name checks. Phase 1.2 still tracks cleanup toward named policy constants/finer-grained policy names.

**Seeded role display names** (from `PMWDS.Persistence/Migrations/Seeders/RolesAndPermissionsSeeder.cs`): `SuperAdmin`, `Director`, `ProjectManager`, `DepartmentHead`, `TeamMember`, `Viewer`. Treat these as labels only; do not compare them in authorization logic.

**PermissionLevel** — integer on `Role`; higher = more powerful. Non-SuperAdmin creators/editors are blocked from creating/editing roles with `PermissionLevel >= userMaxLevel` (`RolesController`).

### JWT
**File:** `PMWDS.API/Controllers/AuthController.cs`
- `GenerateToken` embeds: `NameIdentifier` (user Id), `Email`, `Name`, `DepartmentId`, `JwtRegisteredClaimNames.Jti`, `ClaimTypes.Role` per role key, `RoleKeys.RoleClaimType = "role_key"` per role key, and `PermissionCodes.PermissionClaimType` per permission code.
- Expiry: `JwtSettings.ExpiryMinutes` (currently **480 min / 8 hours** — too long, `dotnet-todo.md` 0.5).
- `RefreshToken` just mints a new JWT from a valid JWT — **no rotation, no revocation** (`dotnet-todo.md` 0.5).
- Legacy SHA256 password fallback exists at `AuthController.cs:272-274,323-324` (`dotnet-todo.md` 0.4).
- SignalR accepts JWT from `access_token` query string (`Program.cs:80-89`).

### Scoping rules (`RoleScopeService`) — what each role sees
| Role | Organisation | Department | Project | User |
|---|---|---|---|---|
| SuperAdmin | all | all | all | all |
| Director | own orgs | orgs in scope | projects whose primary or assigned dept is in org scope | users in org scope (excluding SuperAdmins) |
| DepartmentHead (not Director) | own orgs | own depts | projects where dept is **primary** (`Project.DepartmentId`), in `ProjectDepartments`, or has a milestone assigned to one of the head's depts | own-dept members + Director/DepartmentHead users in org scope |
| ProjectManager | — | — | projects where `ProjectManagerId == CurrentUserId` | — |
| TeamMember / Viewer | — | — | (only via explicit grants) | — |

> **Note on primary-department head:** today their project visibility depends on `Project.DepartmentId` surviving as their department. If a future change reassigns the primary department, the original head loses access. Phase 1.3 will add an explicit permission + (recommended) a dedicated `Project.PrimaryDepartmentId` FK so the primary department head's access is preserved regardless of `ProjectDepartments` membership.

---

## 4. Service & application layer

### Application service interfaces (`PMWDS.Application/Interfaces/Services/`)
| Interface | Responsibility | Notes |
|---|---|---|
| `IUnitOfWork` | Aggregate-root repositories + transaction methods | **God interface — 36 repos + 4 txn methods** (`dotnet-todo.md` 3.3) |
| `IRecommendationService` | Assignee recommendations and allocation analysis | implemented by shared `AIService` |
| `IPredictionService` | Task/project delay predictions and prediction result reads | implemented by shared `AIService` |
| `IProjectHealthService` | Project health, insights, resource optimization, structured report generation | implemented by shared `AIService` |
| `IModelManagementService` | AI models, training data, provider/model discovery, provider tests, model training | implemented by shared `AIService` |
| `IChatService` | Chat processing and natural-language summaries | implemented by shared `AIService` |
| `ICurrentUserService` | Current JWT user (UserId, FullName, IsInRole) | impl in API: `CurrentUserService` |
| `INotificationService` | Send notifications | impl: `NotificationService` |
| `IEmailService` | Send email (+ attachments) | impl: `EmailService` (duplicated SMTP logic) |
| `IAuditService` | Audit writes | impl: `AuditService` (defines a **shadow interface** in Infrastructure — `dotnet-todo.md` 4.6) |
| `ICacheService` | Cache get/set | impl: `RedisCacheService` (also a shadow interface) |
| `IReportService` | Report rendering | impl: `ReportService` + `ReportPdfRenderer`/`ReportExcelRenderer` |

### Infrastructure services (`PMWDS.Infrastructure/Services/`)
`AuditService`, `BackgroundJobService`, `CacheService` (shadow interface), `EmailService`, `FileStorageService` (Azure blob), `LocalFileStorageService` (fallback), `NotificationService`, `ReportService`, `ReportExcelRenderer`, `ReportPdfRenderer`.

### API-layer services (`PMWDS.API/Services/`)
- **`DatabaseConnectionService`** — **static**, provider detection + DB prep (`dotnet-todo.md` 4.5 will make it injectable). See §5.
- **`RoleScopeService`** — scoped; the central authorisation-scoping helper (see §3).
- **`CurrentUserService`** — scoped; wraps `IHttpContextAccessor` for the JWT user.
- **`UserRoleResolver`** — static; returns role **names** for a user.
- **`EnvFileLoader`** — static; loads `.env` (`dotnet-todo.md` 4.5).

### CQRS / MediatR (`PMWDS.Application/Features/`)
- `Features/Projects/{Commands,Queries}/` — both present.
- `Features/Tasks/Commands/` — **commands only, no query handlers** (queries done inline in `TasksController`).
- `ITaskWorkflowService` / `TaskWorkflowService` owns task workflow recalculation, status transitions, task access checks, and project-organization assignee validation extracted from `TasksController` (Phase 3.4).
- `Features/Users/Queries/` — queries only.
- `Features/AI/{Commands,Queries}/`.
- **Most controllers bypass CQRS** and use `IUnitOfWork`/`ApplicationDbContext` directly (`dotnet-todo.md` 3.4, 4.2).

### Repositories (`PMWDS.Persistence/Repositories/`)
- `IRepository<T>` + `BaseRepository<T>` — thin generic wrapper (flagged as low-value, `dotnet-todo.md` 3.3).
- `BaseRepository.DeleteAsync` soft-deletes `BaseEntity` rows with `SoftDelete("system")`; direct `DbSet.Remove` should be reserved for explicit hard-delete cases.
- Specific: `IProjectRepository`, `ITaskRepository`, `IUserRepository` (these have domain methods).
- `UnitOfWork` implements `IUnitOfWork`; `IDisposable`; transactions exist but are **never called** anywhere.

### Background jobs (`PMWDS.Infrastructure/Jobs/`)
Hangfire jobs, registered SQL-Server-only in `Program.cs`:
- `DeadlineCheckerJob` — hourly.
- `EscalationCheckerJob` — at :30 each hour.
- `AIModelTrainingJob` — daily at 02:00.
- `ScheduledReportJob` — weekly Monday 07:00.

### SignalR hubs (`PMWDS.API/Hubs/`)
- `NotificationHub` — user/department/role groups; `SendBroadcast`/`AcknowledgeNotification`. Uses a **non-thread-safe static `Dictionary`** (`dotnet-todo.md` 0.7). `SendBroadcast` has **no permission check** (`dotnet-todo.md` 0.7).
- `DashboardHub` — `SubscribeToProject`/`UnsubscribeFromProject`; **no scope verification on subscribe**.

### Custom exceptions (`PMWDS.Application/Exceptions/`)
- `NotFoundException`, `ConflictException` only.
- **Missing:** `ForbiddenException`, a custom `ValidationException` (uses the framework's). `dotnet-todo.md` to add.

### Settings (`PMWDS.Infrastructure/Settings/AppSettings.cs`)
Strongly-typed `IOptions<T>` classes: `JwtSettings`, `EmailSettings`, `AzureStorageSettings`, `AISettings`, `HangfireSettings`, `DatabaseSettings`, `LocalFileStorageSettings`.

---

## 5. Database provider strategy ⚠️ (changing — see `dotnet-todo.md` Phase 2)

**File:** `PMWDS.API/Services/DatabaseConnectionService.cs`

### Current behaviour
- Enum supports **three** providers: `SqlServer`, `MySql`, `Sqlite`.
- `SelectProvider` order:
  1. `ForceSqlite` → SQLite.
  2. SQL Server probe (`CanConnectToSqlServer`) — single connectivity check against `master` with a 3s connect timeout.
  3. SQLite fallback in Development only; non-Development fails fast if SQL Server is unreachable.
- SQL Server DB prep uses `Database.MigrateAsync()` so EF migration history is tracked. SQLite development prep still uses the existing compatibility bootstrap until `dotnet-todo.md` 2.4 is handled.
- `EnsureSqliteDevelopmentDatabaseAsync` is **destructive**: drops + recreates the entire SQLite file when the schema sentinel fails (presence of `IX_Departments_Code` or missing tables) — `dotnet-todo.md` 2.4.

### Target strategy (decided, to implement in Phase 2)
- **Production: SQL Server only.** Fail fast — no silent fallback.
- **Development: single SQL Server probe, then auto-fallback to SQLite** with a clear log. No retry loop.
- **MySQL is removed** — `dotnet-todo.md` 2.1:
  - Runtime provider selection supports only `SqlServer` and `Sqlite`.
  - No `MySql.EntityFrameworkCore` package reference remains.
  - Removed config keys: `ConnectionStrings:MySql`, `Database:MySqlConnectionString`, `Database:EnableMySqlFallback`.
  - SQL Server `ApplicationDbContext` registration uses `EnableRetryOnFailure()` for transient faults.

### Migrations (`PMWDS.Persistence/Migrations/`)
- `InitialCreate.cs` (large), `AddMilestoneDepartment.cs`, `AddMilestoneDependencies.cs`, `20260630130938_AddAIGlobalSettings.cs`.
- `ApplicationDbContextModelSnapshot.cs` is **SQLite-typed** (`TEXT`/`INTEGER`/`REAL`) — invalid for SQL Server/MySQL (`dotnet-todo.md` notes this).
- Naming inconsistent (3/4 migrations lack timestamp prefix).
- **Cascade-path fix verified applied** (matches `docs/issue-sql-cascade-paths.md`): `ProjectConfiguration` Milestones→Project = `NoAction`; `ProjectDepartmentConfiguration` DepartmentId = `NoAction`. A regression test is still wanted (`dotnet-todo.md` 2.5).

### Seeders (`PMWDS.Persistence/Migrations/Seeders/`)
13 seeders orchestrated by `SeedData.SeedAsync` in fixed order: `OrganizationsSeeder` → `DepartmentsSeeder` → `RolesAndPermissionsSeeder` → `UsersSeeder` → `ProfilesSeeder` → `ProjectsSeeder` → `MilestonesSeeder` → `TasksSeeder` → `NotificationsSeeder` → `ActivityLogsSeeder` → `MiscSeeder` (+ `SeedConstants`, `PasswordHelper`).
- **~35 `SaveChangesAsync` calls total, NO transactions** — partial-failure can leave a half-seeded DB (`dotnet-todo.md` 2.12).
- Hardcoded department **codes**: `PWD`, `PWDC`, `REV`, `APC`, `TCP`, `PROC`, `JAL`, `ELEC`, `SEW`, `HORT`, `QA`.
- `MilestonesSeeder` wires dependencies by **milestone name strings** (fragile if names change).
- `SeedConstants.DefaultPassword = "Pmwds@123"`, `SeedUser = "system-seed"`.

### Connection strings & env (`PMWDS.API/appsettings*.json`, `.env.example`)
- `ConnectionStrings:Default` (SQL Server), `ConnectionStrings:MySql` (to remove), `ConnectionStrings:Redis`, `ConnectionStrings:Hangfire`.
- `Database:ForceSqlite` (Development only), `Database:SqliteConnectionString`.
- `.env.example` uses `__` nested-config keys (e.g. `ConnectionStrings__Default`).

---

## 6. Controllers (`PMWDS.API/Controllers/`)

21 controllers, all inheriting `BaseApiController` (`[ApiController]`, `[Route("api/v1/[controller]")]`, `[Authorize]`, `[Produces("application/json")]`).

| Controller | Scope | Notable |
|---|---|---|
| `AuthController` | login/signup/forgot/reset/change-password/refresh | manual validation, 8h expiry, legacy SHA256 |
| `UsersController` | users CRUD, dept assignment, profile picture, role mgmt | **874 lines — fat** |
| `RolesController` | roles + permissions CRUD, permission-module visibility | static dicts, `User.IsInRole("SuperAdmin")` gating |
| `ProjectsController` | projects CRUD, progress, AI, documents, dashboard | bypasses CQRS, uses `ApplicationDbContext` directly |
| `TasksController` | tasks + subtasks + deps + comments + attachments + time + escalate | **1244 lines — god controller; stack-trace leaks; `.Result` blocking** |
| `MilestonesController` | milestones + dependencies | 735 lines |
| `DepartmentsController` | departments | scoped queries |
| `OrganizationsController` | organisations | SuperAdmin/Director gated |
| `NotificationsController` | notifications | SuperAdmin-gated mgmt |
| `DashboardsController` | dashboard aggregation | — |
| `ReportsController` | report rendering (PDF/Excel) | — |
| `ActivityLogsController` | activity log read | Director-gated |
| `AIController` | AI settings, predictions, recommendations, chat | SuperAdmin-gated for config |
| `IntegrationsController` | integrations | SuperAdmin-gated |
| `WebhooksController` | webhooks | SSRF risk on `CallbackUrl` |
| `KnowledgeController` | knowledge articles + lessons | — |
| `SkillsController` | skill catalog | — |
| `PagesController` | monolithic page-data aggregation (`getPagesData`) | **652 lines — over-fetch surface** |
| `ProfilesController` | user profile (PII) | — |
| `SystemController` | DB status | SuperAdmin-gated |

**Controllers flagged for stack-trace leakage:** `TasksController.cs:136,661,938` (`dotnet-todo.md` 0.2).

---

## 7. Frontend (React client) — `Client/`

Separate Vite + React 19 + TypeScript app. **Detail and task tracker live in `docs/reports/react-todo.md`.** Key conventions to respect when touching the client:
- API base: `VITE_API_BASE_URL` (default `http://localhost:5177/api/v1`); `api` object in `src/api.ts` (being split into `src/api/`).
- Auth state in `src/auth.tsx` — **JWT currently in `localStorage`** (migrate to httpOnly cookies — `react-todo.md` 0.1).
- Route guards in `src/App.tsx` `ROUTE_GUARDS` + `PermissionControls.tsx` are **UI-hiding only** — every check must be backed by server enforcement.
- Client must stop comparing role **display names** once backend Phase 1 lands (use keys/permissions).
- Client role logic uses immutable `roleKeys` from auth/user/page payloads. Display `roles` remain for labels only. If old localStorage auth has no `roleKeys`, `Client/src/auth.tsx` derives keys from built-in legacy names and `Client/src/appData.tsx` logs out on a 401 page-data response.

---

## 8. Critical security items (do not regress)

Tracked in `dotnet-todo.md` Phase 0 — summarised here so they stay visible:
- Hardcoded secrets in `appsettings*.json` / `.env.example` (JWT secret, OpenRouter key, SMTP, SQL SA password) — rotate + move to env/Key Vault.
- No rate limiting / account lockout on auth endpoints.
- `TasksController` returns `ex.StackTrace` to clients.
- SignalR `SendBroadcast` has no permission check.
- AI provider URLs / webhook callback URLs must be validated by `OutboundUrlGuard` before storing or using them.
- Sensitive data (AI keys, webhook secrets) stored plaintext.

---

## 9. Change checklist (apply before merging any auth/role/permission/entity change)

- [ ] If adding/renaming a permission → add the constant in `PermissionCodes.cs`, register in `PermissionPolicyRegistry` if a new policy is needed, update `RolesController.ManagePermissionCoverage`, and seed it via `RolesAndPermissionsSeeder`.
- [ ] If touching role logic → **never compare on `Role.Name`**; once Phase 1.1 lands, use the immutable Role Key. Update `RoleScopeService`, `UserRoleResolver`, and the controllers listed in §3.
- [ ] If adding a "primary department" rule → respect the dedicated permission (Phase 1.3) and the `Project.DepartmentId` / `ProjectDepartment.IsPrimary` duality.
- [ ] If adding an entity → put it in `PMWDS.Domain/Entities/`, inherit `BaseEntity`/`AuditableEntity`, add a configuration in `PMWDS.Persistence/Configurations/`, register the DbSet, choose `Cascade`/`NoAction`/`SetNull` deliberately (SQL Server rejects multiple cascade paths), and respect the soft-delete global filter.
- [ ] If touching DB providers → MySQL is being removed; dev = SQLite fallback, prod = SQL Server fail-fast.
- [ ] If adding background work → use Hangfire (SQL-Server-only) or a domain event (once dispatch is wired in Phase 3.5).
- [ ] If adding a controller → inherit `BaseApiController`, inject `IMediator` and call `base(mediator)`, prefer `[Authorize(Policy="...")]` fine-grained policies over role-name policies, and move request/response DTOs to `PMWDS.Application/DTOs/Controllers` or a domain-specific DTO folder.
- [ ] **Update this file** with any new pattern, file name, permission code, or role key.

---

## 10. Phase 1 Auth Model Update (2026-07-06)

**Files to follow**
- `PMWDS.Application/Security/RoleKeys.cs` - immutable built-in role keys (`superadmin`, `director`, `project-manager`, `department-head`, `team-member`, `viewer`) and role-key claim type.
- `PMWDS.Application/Security/AuthorizationPolicies.cs` - API policy-name constants; controllers must not inline policy-name strings.
- `PMWDS.Application/Security/PermissionCodes.cs` - permission-code constants, including `PROJECT_PRIMARY_DEPARTMENT_MANAGE`.
- `PMWDS.Application/Security/PermissionCatalog.cs` - visible permission modules, admin-only modules, and manage-permission coverage shared by Roles and Pages APIs.
- `PMWDS.API/Auth/PermissionAuthorizationHandler.cs` - policy authorization queries active user roles/permissions from the DB per request and does not trust stale JWT permission claims.
- `Client/src/permissions.ts` - frontend permission and role-key constants. Keep it aligned with backend `PermissionCodes`/`RoleKeys`, including `PROJECT_PRIMARY_DEPARTMENT_MANAGE`.
- `PMWDS.API/Services/RoleScopeService.cs` - central data-scope helper for organizations, departments, projects, users, and primary-department project access.

**Role rules**
- `Role.Key` is the logic identity and is unique/immutable for authorization. `Role.Name` is display-only and may be renamed.
- JWTs carry role keys in both `ClaimTypes.Role` and `RoleKeys.RoleClaimType`; display role names are returned to the client only for compatibility/UI.
- Auth responses and page/user DTOs expose `roleKeys`; frontend authorization and role-tier UI must use those keys or permissions, not `Role.Name`.
- Built-in seeders locate roles by key and repair old rows with `EnsureKey(...)`.
- Do not use `Role.Name`, display labels, or `User.IsInRole("DisplayName")` in authorization logic. Use `RoleKeys`, `RoleScopeService`, permissions, or `AuthorizationPolicies`.

**Primary department rule**
- The primary project department is `Project.DepartmentId`; `ProjectDepartment.IsPrimary` mirrors that relationship for the project-department join rows.
- `PROJECT_PRIMARY_DEPARTMENT_MANAGE` gives a department head visibility/control over projects created by their headed department, including milestones, even when that department is not otherwise assigned in `ProjectDepartments`.
- `PROJECT_MANAGE` and `SYSTEM_ADMIN` imply `PROJECT_PRIMARY_DEPARTMENT_MANAGE`.
- Milestone dependency/list/detail filtering must preserve the primary-department exception through `RoleScopeService.CanAccessProjectAsPrimaryDepartmentAsync(...)`.

**Safety rails**
- The SuperAdmin role cannot lose `SYSTEM_ADMIN`.
- A user cannot remove their own last effective `SYSTEM_ADMIN` permission.
- Built-in `superadmin` role and `SYSTEM_ADMIN` permission cannot be deleted.
- The last active SuperAdmin user cannot be deactivated.
- Permission edits take effect immediately for server authorization because policies revalidate against the DB.

**JWT/session hardening**
- Access tokens must use a random `Jwt:Secret` of at least 32 bytes and `Jwt:ExpiryMinutes` must stay between 15 and 30.
- `ApplicationUser` stores one active hashed refresh token plus expiry/revocation timestamps. `POST /api/v1/auth/refresh` rotates the refresh token and does not require a valid access token.
- JWTs include `token_version`; `Program.cs` validates it against `ApplicationUser.AccessTokenVersion` on every authenticated request. `RevokeAllTokens()` increments that version and clears the refresh token.
- Password change, password reset, logout, and user deactivation revoke existing access and refresh tokens. React auth stores `refreshToken` and rotates it through `Client/src/auth.tsx`.

**Sensitive data protection**
- `Program.cs` registers `AddDataProtection()` and `ISensitiveDataProtector` (`PMWDS.Infrastructure/Services/SensitiveDataProtector.cs`).
- Protected values use the `dp:v1:` prefix. `Unprotect(...)` intentionally accepts old plaintext values so migrations and legacy rows keep working.
- New writes protect AI provider API keys, webhook secrets, and integration `ConfigurationJson`. `SensitiveDataMigrationService.ProtectExistingAsync(...)` runs after seeding and protects existing plaintext rows idempotently.
- Code that needs to use a protected value must go through `ISensitiveDataProtector`; do not call Data Protection APIs directly from controllers/services.

**SignalR/thread safety**
- `NotificationHub.SendBroadcast` must authorize with `AuthorizationPolicies.NotificationsBroadcast` before sending to all clients.
- Static connection/session state must be thread-safe. `NotificationHub` uses `ConcurrentDictionary`; `OpenAICompatibleChatEngine` uses `ConcurrentDictionary` plus per-session locking around `List<ChatMessagePayload>` mutation.

**Async controller convention**
- Controllers must not use `.Result`/`.Wait()` on repository or EF tasks. Await async work directly to avoid request-thread deadlocks.

**Outbound URL validation**
- `PMWDS.Application/Security/OutboundUrlGuard.cs` is the shared SSRF guard for outbound HTTP destinations.
- AI provider base URLs must be absolute HTTPS URLs and must match the provider host whitelist: OpenAI uses `api.openai.com`; OpenRouter uses `openrouter.ai`.
- Webhook callback URLs must be absolute HTTPS URLs, cannot contain user info, and cannot target localhost or private/link-local/multicast literal IP addresses.
- Validate outbound URLs before saving settings and again before runtime use. New outbound HTTP features must use this guard instead of adding controller-local URL checks.

**Checklist override**
- If adding/renaming a permission, update `PermissionCodes.cs`, `PermissionCatalog`, `PermissionPolicyRegistry` if a new policy is needed, and `RolesAndPermissionsSeeder`.
- If adding a controller, use `[Authorize(Policy = AuthorizationPolicies.X)]` or another policy constant, never an inline policy-name string.
