# PMWDS Performance Optimization Plan

Last updated: 2026-07-10

## Objective

PMWDS is slow because the backend often loads complete EF entity graphs, maps them in memory, and sends broad page-level payloads to React. SQL Server exposes the cost more than SQLite because large joined result sets cross the database boundary, require SQL Server query planning, and transfer many duplicated rows over the connection.

This report is a phase-wise implementation plan. Each phase is split into commit-sized work items that can be assigned to smaller models.

## Current Hotspots

### 1. Project details cartesian explosion

`PMWDS.Persistence/Repositories/ProjectRepository.cs:13` loads one project with multiple collection includes:

- `Milestones -> Tasks`
- `Tasks -> Assignments`
- `Tasks -> Comments`
- `Documents`
- `ProjectDepartments -> Department`

Unlike `PMWDS.Persistence/Repositories/TaskRepository.cs:12`, this query does not use `AsSplitQuery()`. On SQL Server this can multiply rows across independent collections before EF reconstructs the object graph.

Immediate fix:

- Add `AsSplitQuery()` to `ProjectRepository.GetWithDetailsAsync`.
- Use `AsNoTracking()` only for read-only detail endpoints. Do not use it for command flows that update the loaded aggregate.
- Add a focused integration test or query-count test around project details.

Commit:

- `perf(api): split project detail query`

### 2. DTO mapping causes hidden read work and mutations

`PMWDS.Application/DTOs/Projects/ProjectDto.cs:40` calls `RecalculateAndReturnProgress`, which mutates project progress/status during DTO mapping.

`PMWDS.Application/DTOs/Projects/MilestoneDto.cs:20` calls `RecalculateProgressFromTasks()` and `RecalculateStatusFromTasks()` while building a read DTO.

`PMWDS.Application/DTOs/Tasks/TaskDto.cs:43` recursively maps full subtask, assignment, dependency, comment, attachment, and time-entry collections.

Problems:

- Read endpoints need task and milestone collections just to compute display counts.
- Mapping is not a pure projection, so read paths can do domain work repeatedly.
- Projection to SQL is hard because DTO construction depends on loaded navigation collections.

Immediate fix:

- Introduce lightweight list DTOs: `ProjectListItemDto`, `TaskListItemDto`, `MilestoneListItemDto`.
- Keep full DTOs only for detail endpoints.
- Move progress/status recalculation to command handlers and workflow services, not read mappers.
- For list endpoints, compute counts and progress in SQL projection.

Commits:

- `perf(api): add lightweight project list dto`
- `perf(api): add lightweight task list dto`
- `perf(api): make read dto mapping side-effect free`

### 3. Projects API fetches graphs before pagination and aggregation

`PMWDS.API/Controllers/ProjectsController.cs:54` loads projects with departments and project departments, then materializes all matching rows for dashboard counts.

`PMWDS.API/Controllers/ProjectsController.cs:92` includes departments, project departments, tasks, and milestones before paginating. Even though `Skip`/`Take` is applied before `ToListAsync`, collection includes still create wide SQL and unnecessary entity materialization for list cards.

Fix:

- `GET /projects/dashboard`: replace full materialization with SQL aggregate queries.
- `GET /projects`: project directly to list DTOs with task/milestone counts.
- Only load `Tasks` and `Milestones` in detail endpoints or dedicated child endpoints.
- Add optional `search`, `departmentId`, `status`, `sort`, `page`, `pageSize` filters at SQL level.

Commits:

- `perf(api): project project list from sql`
- `perf(api): aggregate project dashboard in sql`
- `perf(api): add project list filters`

### 4. Tasks API paginates in memory

`PMWDS.API/Controllers/TasksController.cs:83` loads all matching tasks for `my-tasks`, then applies `Skip`/`Take` in memory.

`PMWDS.API/Controllers/TasksController.cs:604`, `TasksController.cs:617`, `TasksController.cs:630`, and `TasksController.cs:643` use repository methods that return full lists, then filter and paginate in memory.

`PMWDS.Persistence/Repositories/TaskRepository.cs:35` and similar methods include assignments, subtasks, comments, attachments, dependencies, time entries, project, and milestone for list use cases.

Fix:

- Add queryable task list methods or move read queries into handlers.
- Apply project scope, filters, ordering, `CountAsync`, `Skip`, and `Take` in SQL.
- Return task list DTOs without comments, attachments, time entries, and recursive subtasks.
- Load comments, attachments, time entries, dependencies, and subtasks from dedicated endpoints on demand.

Commits:

- `perf(api): paginate my tasks in sql`
- `perf(api): paginate task status queues in sql`
- `perf(api): slim task repository list queries`

### 5. Pages API is a monolithic over-fetch surface

`PMWDS.API/Controllers/PagesController.cs:41` returns organizations, departments, projects, milestones, tasks, subtasks, users, roles, permissions, notifications, templates, alert rules, and activity logs in one response.

`PagesController.cs:54` doubles the user's page size and caps each resource at 500. One request can therefore execute many `CountAsync` and `ToListAsync` calls.

`PagesController.cs:70` includes project departments and tasks before the project page is built.

`PagesController.cs:77` includes department, department assignments, profile, roles, and skills for user lists.

`PagesController.cs:108` builds task queries from all scoped project IDs, which can create very large `IN (...)` filters.

`PagesController.cs:185` caches the entire response for 30 seconds, but the cache is keyed only by user/page/size. This reduces repeated hits briefly but does not solve initial payload cost or targeted invalidation.

Fix:

- Convert `/pages` into a bootstrap endpoint only:
  - current user
  - permissions/role keys
  - small navigation project list
  - unread notification count
  - user page size/settings
- Move each resource to dedicated paged endpoints.
- Add optional `sections=projects,users,notifications` only as a temporary migration bridge.
- Return ETags or `generatedAt`/version metadata per section so React can avoid full refreshes.
- Add cache keys per resource and invalidate on writes.

Commits:

- `perf(api): add workspace bootstrap endpoint`
- `perf(api): add section filter to pages endpoint`
- `perf(api): split pages cache by resource`
- `perf(api): deprecate broad pages payload`

### 6. Frontend duplicates large requests

`Client/src/appData.tsx:156` calls `api.getPagesData()` globally after login.

`Client/src/pages/dashboard/dashboard.tsx:95` then calls, in parallel:

- `getDashboard`
- `getMyTasks`
- `getPagesData(..., 500)`
- `getNotifications`
- `getDepartments`
- `getOrganizations`
- `getUsers`
- `getProjects`
- `getOverdueTasks`
- `getEscalatedTasks`

This duplicates data already loaded by the global provider and also asks `/pages` for 500 items per section.

`Client/src/pages/projectsK/projectsK.tsx:94` copies app data into local state and reloads project details on selection.

`Client/src/pages/nested/nestedShared.ts:48` fetches project, milestones, tasks, and dependencies for every nested project route.

Fix:

- Replace global `AppDataProvider` with a smaller `WorkspaceBootstrapProvider`.
- Use route-level data hooks for each page: dashboard, project workspace, users, activity logs.
- Stop calling `/pages?pageSize=500` from dashboard.
- Use a client data cache such as TanStack Query, or implement a small typed cache with keys and invalidation.
- After mutations, invalidate only affected keys instead of refreshing the entire app data payload.

Commits:

- `perf(client): replace dashboard pages fetch`
- `perf(client): add route scoped workspace data hooks`
- `perf(client): invalidate targeted resources after mutations`
- `perf(client): remove copied app data state from projects page`

### 7. Frontend does large client-side filtering repeatedly

Examples:

- `Client/src/pages/dashboard/dashboard.tsx:163` maps departments and repeatedly filters users/tasks inside the loop.
- `Client/src/pages/projectsK/projectsK.tsx:192` filters all projects by organization and department on the client.
- `Client/src/pages/shared/ProjectsGroup.tsx:119` sorts and filters all projects for navigation.
- `Client/src/pages/nested/ProjectTasksPage.tsx:108` groups all tasks client-side and renders one board per milestone.

Fix:

- Push search, department, status, and assigned-user filters to API endpoints.
- For navigation, use a small project-nav DTO instead of full project DTOs.
- Memoize lookup maps (`usersById`, `departmentsByOrgId`, `tasksByMilestoneId`) once per data version.
- Add list virtualization for project sidebar and task boards if any list can exceed 100 visible rows.

Commits:

- `perf(client): add lookup maps for dashboard`
- `perf(client): use server filters for project workspace`
- `perf(client): virtualize long project and task lists`

## Phase Plan

### Phase 0: Measurement Baseline

Goal:

Create repeatable numbers before changing behavior.

Tasks:

1. Enable EF Core command timing logs for development and staging.
2. Add request timing middleware output for route, status, elapsed ms, and response size.
3. Add SQL Server test seed scale: small, medium, large projects with many milestones/tasks/comments/assignments.
4. Capture baseline for:
   - `GET /api/v1/pages`
   - `GET /api/v1/projects`
   - `GET /api/v1/projects/{id}`
   - `GET /api/v1/tasks/my-tasks`
   - `GET /api/v1/tasks/by-project/{projectId}`
   - dashboard initial load in browser devtools

Verification:

- `dotnet build PMWDS.slnx`
- Manual SQL Server run with timing logs saved under `docs/reports/perf-baseline-YYYYMMDD.md`
- Browser Network tab export or screenshot for dashboard load

Suggested commits:

- `chore(perf): add request and ef timing diagnostics`
- `test(perf): add scalable sql server seed scenario`

### Phase 1: Quick Backend Query Wins

Goal:

Remove the worst SQL Server query shapes without changing API contracts.

Tasks:

1. Add `AsSplitQuery()` to project detail and other unavoidable multi-collection detail queries.
2. Add `AsNoTracking()` to read-only controller queries.
3. Add `AsSplitQuery()` to task list repository methods until they are replaced by projections.
4. Fix `PagesController.GetRolesAsync` synchronous `FirstOrDefault` at `PagesController.cs:331`.
5. Replace dashboard full-list aggregation with SQL aggregates.

Verification:

- `dotnet build PMWDS.slnx`
- Hit project details and dashboard against SQL Server.
- Confirm no EF warning for multiple collection include without split query.

Suggested commits:

- `perf(api): split heavy detail includes`
- `perf(api): no-track read endpoints`
- `perf(api): aggregate dashboard in sql`

### Phase 2: Backend Read Projections

Goal:

Stop loading entity graphs for list endpoints.

Tasks:

1. Add list DTOs for projects, tasks, milestones, users, and navigation.
2. Convert `ProjectsController.GetAll` to SQL projection.
3. Convert task queue endpoints to SQL projection and SQL pagination.
4. Convert `MilestonesController` list endpoints to SQL projection.
5. Keep detail endpoints full, but split child collections into separate endpoints where practical.

Verification:

- API contract tests for list endpoints.
- SQL Server query plans show no large multi-collection joins for list endpoints.
- Response payload size is lower than baseline.

Suggested commits:

- `perf(api): add list read models`
- `perf(api): project project lists`
- `perf(api): project task lists`
- `perf(api): project milestone lists`

### Phase 3: Pages API Decomposition

Goal:

Stop sending every resource through one page aggregation API.

Tasks:

1. Add `GET /api/v1/workspace/bootstrap`.
2. Change `/pages` to accept `sections` and default to bootstrap-compatible minimal sections.
3. Move roles, permissions, users, notifications, activity logs, projects, milestones, and tasks to dedicated route-level fetches.
4. Add resource-specific cache keys and invalidation rules.
5. Update API docs and mark broad `/pages` use as deprecated.

Verification:

- `GET /workspace/bootstrap` is under a small fixed payload target.
- Dashboard no longer calls `/pages?pageSize=500`.
- Login-to-first-render requires only bootstrap plus route-specific data.

Suggested commits:

- `feat(api): add workspace bootstrap`
- `perf(api): support pages section selection`
- `docs(api): document pages deprecation`

### Phase 4: Frontend Data Architecture

Goal:

Make the UI fetch only what the active route needs.

Tasks:

1. Replace `AppDataProvider` with bootstrap-only auth/permission/navigation data.
2. Add route hooks:
   - `useDashboardData`
   - `useProjectList`
   - `useProjectWorkspace(projectId)`
   - `useUsersPage`
   - `useActivityLogs`
3. Use targeted invalidation after create/update/delete.
4. Remove duplicate dashboard calls and copied local state where values already come from cached query data.
5. Add lookup maps for repeated joins in React.

Verification:

- `npm run build` from `Client/`
- Dashboard Network tab shows no duplicate pages/projects/users requests.
- Route changes do not refetch unrelated data.

Suggested commits:

- `perf(client): add bootstrap provider`
- `perf(client): add route data hooks`
- `perf(client): remove dashboard duplicate fetches`
- `perf(client): target mutation invalidation`

### Phase 5: Pagination, Search, and Virtualization

Goal:

Keep both API and browser work bounded as data grows.

Tasks:

1. Add server-side search and filters to projects, users, tasks, milestones, activity logs, notifications.
2. Update frontend tables/lists to use paged endpoints.
3. Add virtualization to long project sidebars and task boards.
4. Avoid rendering all milestone boards at once when projects are large.

Verification:

- Large seed project opens without freezing the browser.
- API requests remain page-sized.
- React profiler shows fewer renders during filter changes.

Suggested commits:

- `feat(api): add server filters to list endpoints`
- `perf(client): use paged project and task lists`
- `perf(client): virtualize large workspaces`

### Phase 6: Database Hardening

Goal:

Make SQL Server consistently fast for scoped, paged reads.

Tasks:

1. Review query plans after projection work.
2. Add or adjust composite indexes only where measured query plans need them.
3. Candidate indexes:
   - projects: `(IsDeleted, DepartmentId, Status, CreatedDate)`
   - project departments: `(DepartmentId, ProjectId, IsPrimary)`
   - tasks: `(IsDeleted, ProjectId, ParentTaskId, DueDate)`
   - tasks: `(IsDeleted, AssignedToUserId, Status, DueDate)`
   - milestones: `(IsDeleted, ProjectId, DepartmentId, DueDate)`
   - activity logs: `(UserId, Timestamp)` and `(ProjectId, Timestamp)`
4. Add migrations after validating index value on SQL Server.

Verification:

- Compare SQL Server actual execution plans before/after.
- Confirm write paths are not noticeably slower from excess indexes.

Suggested commits:

- `perf(db): add measured read indexes`
- `docs(perf): record sql server query plan results`

## Assignment Template for Smaller Models

Use this template for each task:

```text
You are working in E:\saturday\PMWDS.S.
Goal: implement <one commit-sized task from docs/reports/performance-optimization-plan.md>.
Scope: only touch <specific files>.
Constraints: no unrelated refactors, no destructive git commands, preserve existing user changes.
Implementation: follow existing controller, DTO, and EF patterns. Keep API responses backward compatible unless the task explicitly changes a contract.
Verification: run dotnet build PMWDS.slnx or npm run build from Client as appropriate.
Report: list changed files, commands run, output summary, and residual risks.
Commit: make exactly one commit with the suggested commit message after verification passes.
```

## Commit Discipline

Each phase should be implemented as a sequence of small commits:

- One query shape fix per commit.
- One endpoint projection per commit.
- One frontend route hook per commit.
- One API contract migration step per commit.
- One measured index migration per commit.

Do not combine backend query fixes, frontend rewrites, and DB migrations in the same commit. That makes performance regressions hard to isolate.

## First Three Recommended Commits

1. `perf(api): split project detail query`
   - Touch `ProjectRepository.cs`.
   - Add `AsSplitQuery()` and verify project detail against SQL Server.

2. `perf(api): aggregate project dashboard in sql`
   - Touch `ProjectsController.cs`.
   - Replace `ToListAsync` dashboard aggregation with SQL aggregates and small recent/at-risk projections.

3. `perf(client): remove dashboard pages overfetch`
   - Touch `Client/src/pages/dashboard/dashboard.tsx`.
   - Remove `api.getPagesData(auth.token, 1, 500)` and source only needed dashboard data from dedicated endpoints or bootstrap data.

These three should reduce immediate SQL Server pressure while leaving the larger `/pages` decomposition for a controlled migration.
