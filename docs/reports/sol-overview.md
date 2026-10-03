# PMWDS Frontend Rebuild Specification

**Purpose:** Standalone product, domain, authorization, API, data-field, screen, and workflow reference for rebuilding the PMWDS frontend from scratch.  
**Backend:** ASP.NET Core API under `/api/v1`; currently running locally at `http://localhost:5177`.  
**Authoritative sources:** API Swagger, application DTOs, `PermissionCodes`, `RoleKeys`, `RoleScopeService`, controller routes, and domain enums.  
**Important:** This is a frontend contract document. Database entities explain relationships, but the new frontend must consume API DTOs rather than mirror EF entities or infer authorization locally.

---

## 1. Product Model

PMWDS is a multi-organization project and work-management system with permission-based UI and server-enforced data scope.

The business hierarchy is:

```text
Organization
  Departments
    Users and department heads
  Projects
    Primary department
    Additional participating departments
    Project manager
    Milestones
      Optional assigned department
      Milestone dependencies
      Tasks
        Multiple assignees
        Subtasks
        Task dependencies
        Comments
        Attachments
        Time entries
```

Additional modules cover notifications, reports, dashboards, activity logs, profiles, skills, AI, knowledge, integrations, webhooks, roles, and permissions.

### Core rules

- SuperAdmin operates globally.
- Director administers the organizations to which the user belongs and sees all projects, departments, and non-SuperAdmin users in those organizations.
- ProjectManager sees/manages assigned or otherwise server-scoped projects.
- DepartmentHead sees projects connected to headed departments by primary department, participating department, or milestone assignment.
- TeamMember works on assigned tasks/subtasks in accessible projects.
- Viewer is read-only within server scope.
- A project has exactly one primary department (`departmentId`) and may have multiple participating departments (`departmentIds`/`departments`).
- A milestone belongs to one project and may be assigned to one department.
- A task belongs to a project, optionally a milestone, and may have multiple active assignees.
- Frontend permission gates hide or disable actions; they never replace server authorization.

---

## 2. Recommended Greenfield Frontend Architecture

Use React, TypeScript, Vite, React Router, and a query/cache library such as TanStack Query. Keep transport DTOs separate from view models.

```text
src/
  app/                 bootstrap, providers, router, error boundary
  api/
    client.ts          base URL, envelope parsing, auth, abort, typed errors
    auth.ts
    workspace.ts
    organizations.ts
    departments.ts
    projects.ts
    milestones.ts
    tasks.ts
    users.ts
    roles.ts
    notifications.ts
    dashboards.ts
    reports.ts
    ai.ts
    knowledge.ts
    integrations.ts
  auth/                session provider, role/permission helpers
  features/            screen-oriented domain modules
  components/          shared primitives only
  types/
    api/               exact backend DTOs
    domain/            normalized frontend models
  utils/               formatting, dates, IDs, validation
  test/                test setup and factories
```

### Required architectural rules

1. Do not use a monolithic `api.ts`, `types.ts`, or all-pages data context.
2. Fetch data per route/domain. Cache keys must include filters, page, page size, and authenticated scope.
3. Use the workspace bootstrap only for session shell/navigation, not as the canonical store for all modules.
4. Preserve server pagination. Never replace complete navigation data with page 1 of another response.
5. Route guards use immutable role keys and permissions. Data scope comes from API results.
6. All requests accept `AbortSignal`; cancel route-owned requests on navigation.
7. Mutations invalidate only relevant domain queries.
8. Keep IDs as opaque strings in the browser, even when the server stores GUIDs.
9. Parse dates at display boundaries; retain ISO strings in DTO state.
10. Add tests before porting complex task, milestone, and authorization workflows.

---

## 3. API Conventions

### Base URL and authentication

- Default development base: `http://localhost:5177/api/v1`.
- Override through `VITE_API_BASE_URL`.
- Most endpoints require `Authorization: Bearer <access-token>`.
- Current auth returns access and refresh tokens. A future cookie migration must be coordinated with backend CSRF protection.
- Do not persist full auth/profile/permission state in `localStorage` in the rebuilt frontend.

### Success envelope

The API normally wraps object results:

```ts
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string | null;
}
```

The client should tolerate endpoints that return arrays or paginated objects through the same envelope filter. Centralize unwrapping in one transport function.

### Error envelope

```ts
interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  traceId?: string;
  timestamp?: string;
}
```

Never render stack traces or arbitrary server `details` in production. Log `traceId` for support.

### Pagination

List endpoints commonly accept `page` and `pageSize`.

```ts
interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
```

- Default backend page size is 10.
- Standard sizes are 10, 20, 30, 50, and 100; larger values may be normalized/clamped.
- Every table must show server totals and must not claim that `items.length` is the global count.
- Search/filter/sort changes reset to page 1.

### Enum serialization

The API exposes enum names as strings. Use exact values.

| Domain | Values |
|---|---|
| Project status | `NotStarted`, `InProgress`, `OnHold`, `Completed`, `Cancelled`, `Delayed` |
| Project priority | `Low`, `Medium`, `High`, `Critical` |
| Milestone status | `Pending`, `InProgress`, `Completed`, `Delayed` |
| Milestone dependency | `CompletionBased`, `ProgressThreshold` |
| Task status | `NotStarted`, `InProgress`, `OnHold`, `Completed`, `Delayed`, `Cancelled` |
| Task priority | `Low`, `Medium`, `High`, `Critical` |
| Task dependency | `FinishToStart`, `StartToStart`, `FinishToFinish`, `StartToFinish` |
| Availability | `Available`, `Busy`, `OnLeave`, `PartiallyBusy` |
| Notification priority | `Low`, `Normal`, `High`, `Urgent` |

---

## 4. Authentication and Session Contract

### Auth response fields

| Field | Type | Use |
|---|---|---|
| `token` | string | Bearer access token |
| `expiry` | ISO datetime | Proactive refresh/logout scheduling |
| `refreshToken` | string | Refresh rotation; treat as secret |
| `refreshTokenExpiry` | ISO datetime | Refresh validity |
| `userId` | string | Current user ID |
| `email` | string | Account display |
| `fullName` | string | Header/profile display |
| `profilePictureUrl` | string/null | Avatar |
| `roles` | string[] | Display labels only |
| `roleKeys` | role-key[] | Authorization identity |
| `permissions` | string[] | Action gating |

### Auth endpoints

| Method and route | Request | Result/use |
|---|---|---|
| `POST /Auth/login` | `email`, `password` | Auth response |
| `POST /Auth/signup` | `firstName`, `lastName`, `email`, `password`, `jobTitle?` | Account/auth flow |
| `POST /Auth/forgot-password` | `email` | Generic success message |
| `POST /Auth/reset-password` | `email`, `token`, `newPassword` | Resets password and sessions |
| `POST /Auth/change-password` | `oldPassword`, `newPassword` | Authenticated password change |
| `POST /Auth/refresh` | `userId`, `refreshToken` | Rotated tokens |
| `POST /Auth/logout` | none | Revokes current session |

### Workspace bootstrap

`GET /Workspace/bootstrap` is the authenticated shell/navigation request.

```ts
interface WorkspaceBootstrap {
  generatedAt: string;
  currentUser: User;
  permissions: string[];
  projects: ProjectNavigationItem[];
  unreadNotificationCount: number;
  userPageSize: number;
}

interface ProjectNavigationItem {
  id: string;
  projectCode: string;
  name: string;
  status: string;
  priority: string;
  departmentId: string;
  departmentIds: string[];
  progressPercentage: number;
  aiDelayRiskScore: number;
  totalTasks: number;
  isNewForCurrentUser: boolean;
  createdDate: string;
}
```

Use bootstrap for sidebar projects, unread badge, current-user shell, and initial permission setup. Current backend limits navigation projects to at most 100; a greenfield frontend needing more must add a dedicated paginated navigation endpoint rather than using `/Pages`.

---

## 5. Roles, Permissions, and Scope

### Immutable role keys

| Key | Meaning | Typical scope |
|---|---|---|
| `superadmin` | Global system administrator | All organizations and records |
| `director` | Organization administrator | All records in assigned organization(s), excluding protected SuperAdmin management |
| `project-manager` | Project manager | Assigned/server-scoped projects and related work |
| `department-head` | Department administrator | Headed departments and connected projects/milestones |
| `team-member` | Contributor | Assigned work and accessible project context |
| `viewer` | Read-only user | View permissions inside server scope |

Never compare `Role.Name`, UI labels, or legacy names. Custom role display names may change. Use role keys only for role-tier behavior and permissions for actions.

### Permission catalog

`SYSTEM_ADMIN` bypasses all permission checks. Manage permissions cover their module actions.

- System/auth: `SYSTEM_ADMIN`, `SYSTEM_DATABASE_VIEW`, `AUTH_MANAGE`.
- Organizations: `ORGANIZATION_MANAGE`, `ORGANIZATION_VIEW`, `ORGANIZATION_CREATE`, `ORGANIZATION_EDIT`, `ORGANIZATION_DELETE`.
- Departments: `DEPARTMENT_MANAGE`, `DEPARTMENT_VIEW`, `DEPARTMENT_CREATE`, `DEPARTMENT_EDIT`, `DEPARTMENT_DELETE`.
- Projects: `PROJECT_MANAGE`, `PROJECT_VIEW`, `PROJECT_CREATE`, `PROJECT_EDIT`, `PROJECT_DELETE`, `PROJECT_PRIMARY_DEPARTMENT_MANAGE`.
- Milestones: `MILESTONE_MANAGE`, `MILESTONE_VIEW`, `MILESTONE_CREATE`, `MILESTONE_EDIT`, `MILESTONE_DELETE`.
- Tasks: `TASK_MANAGE`, `TASK_VIEW`, `TASK_CREATE`, `TASK_EDIT`, `TASK_DELETE`, `TASK_ASSIGN`, `TASK_COMMENT_CREATE`, `TASK_ATTACHMENT_CREATE`, `TASK_TIME_TRACK`.
- Subtasks: `SUBTASK_MANAGE`, `SUBTASK_VIEW`, `SUBTASK_CREATE`, `SUBTASK_EDIT`, `SUBTASK_DELETE`.
- Users: `USER_MANAGE`, `USER_VIEW`, `USER_CREATE`, `USER_EDIT`, `USER_DELETE`, `USER_DEPARTMENT_MANAGE`, `USER_PROFILE_PICTURE_MANAGE`.
- Roles: `ROLE_MANAGE`, `ROLE_VIEW`, `ROLE_CREATE`, `ROLE_EDIT`, `ROLE_DELETE`.
- Permissions: `PERMISSION_MANAGE`, `PERMISSION_VIEW`, `PERMISSION_CREATE`, `PERMISSION_EDIT`, `PERMISSION_DELETE`.
- Notifications: `NOTIFICATION_MANAGE`, `NOTIFICATION_VIEW`, `NOTIFICATION_BROADCAST`, `NOTIFICATION_TEMPLATE_MANAGE`, `NOTIFICATION_RULE_MANAGE`.
- Activity: `ACTIVITY_LOG_MANAGE`, `ACTIVITY_LOG_VIEW`, `ACTIVITY_LOG_CREATE`.
- Reports: `REPORT_MANAGE`, `REPORT_VIEW`, `REPORT_CREATE`, `REPORT_EDIT`, `REPORT_DELETE`.
- Knowledge: `KNOWLEDGE_VIEW`, `KNOWLEDGE_CREATE`, `KNOWLEDGE_EDIT`, `KNOWLEDGE_DELETE`.
- Integrations: `INTEGRATION_VIEW`, `INTEGRATION_CREATE`, `INTEGRATION_EDIT`, `INTEGRATION_DELETE`.
- AI: `AI_VIEW`, `AI_MANAGE`.

### Seeded default role capabilities

These are defaults, not permanent assumptions: administrators can edit role permissions. Always use the effective `permissions` returned for the logged-in user.

| Role key | Default direct permissions (manage permissions imply covered actions) |
|---|---|
| `superadmin` | Every permission, including `SYSTEM_ADMIN` |
| `director` | Department, project, milestone, task, subtask, user, notification, activity-log, report, role, and permission manage; primary-department project manage; AI view/manage |
| `project-manager` | Department view; project, milestone, task, and subtask manage; primary-department project manage; user view; notification view; activity-log create |
| `department-head` | Department, project, milestone, task, subtask, and user manage; primary-department project manage; notification view; activity-log view/create |
| `team-member` | Project/milestone/task/subtask view; task edit/comment/attachment/time; subtask create/edit; notification view; activity-log create |
| `viewer` | Organization, department, project, milestone, task, subtask, notification, and activity-log view |

### Scope rules the frontend must understand

The server scopes every list/detail independently. The frontend must display returned records and must not apply a second incomplete department/organization filter.

#### Organizations

- SuperAdmin: all.
- Director: assigned organization(s).
- Other roles: only organization context exposed by scoped endpoints; organization management UI normally hidden.

#### Departments

- SuperAdmin: all.
- Others: departments in current user's organization scope.
- DepartmentHead actions are further limited to headed/assigned departments where enforced.

#### Projects

- SuperAdmin: all projects.
- Director: every project whose primary or participating department belongs to the director's organization.
- DepartmentHead: projects where a headed department is the primary department, a participating department, or a milestone-assigned department. Primary department access may depend on `PROJECT_PRIMARY_DEPARTMENT_MANAGE`.
- Other roles: server `ScopeProjectsAsync` result; do not infer from a single `departmentId` in the client.

#### Users

- SuperAdmin: all users.
- Director: non-SuperAdmin users in the director's organization.
- DepartmentHead: non-SuperAdmin users in headed departments, plus relevant director/head context in the same organization.
- Other roles: server-scoped user results.

#### Tasks

- `GET /Tasks` returns top-level tasks in accessible projects and supports stable server pagination/filtering.
- `GET /Tasks/my-tasks` has assignment/status semantics and currently treats SuperAdmin differently; do not substitute it for the general role-scoped task table.
- Editing a task additionally requires task/project manage rules or assignment/workflow permission.
- Subtask access derives from parent task/project access.

### UI gating pattern

```ts
const canViewProjects = covers("PROJECT_VIEW");
const canCreateTask = covers("TASK_CREATE");
const canAssignTask = covers("TASK_ASSIGN");
```

`covers` must expand module manage permissions and `SYSTEM_ADMIN`. Routes should return a friendly No Access page on missing UI permission; API 403 remains authoritative.

---

## 6. Core API DTOs and Required Fields

### Organization

| Field | Type | Table/form use |
|---|---|---|
| `id` | string | Key/navigation |
| `name` | string | Required display/edit field |
| `taxId` | string/null | Detail/edit |
| `address` | string/null | Detail/edit |
| `contactEmail` | string/null | Detail/edit |
| `contactPhone` | string/null | Detail/edit |
| `foundedDate` | ISO date/null | Detail/edit |
| `director` | `{id, fullName, email, profilePictureUrl}`/null | Organization card/detail |
| `departments` | `{id, name, code}[]` | Structure view |
| `departmentCount` | number | Summary table/page DTO |

Requests use the editable fields above. Organization list table columns: name, tax ID, contact, director, department count, status/actions.

### Department

| Field | Type |
|---|---|
| `id` | string |
| `name` | string |
| `code` | string |
| `description` | string/null |
| `organizationId` | string/null |
| `organizationName` | string/null |
| `parentDepartmentId` | string/null |
| `departmentHeadUserId` | string/null |
| `maxCapacity` | number |
| `capacityUtilization` | number |

Department table columns: code, name, organization, parent, head, max capacity, utilization, actions. Create/update form fields: name, code, description, organization, parent department, head user, max capacity.

### User

| Field | Type | Notes |
|---|---|---|
| `id` | string | GUID string |
| `firstName`, `lastName`, `fullName` | string | Identity/display |
| `email` | string | Login/contact |
| `profilePictureUrl` | string/null | Avatar |
| `jobTitle` | string/null | Directory |
| `organizationId` | string/null | Direct organization assignment |
| `departmentId`, `departmentName` | string/null | Primary/legacy department |
| `departments` | UserDepartment[] | Multi-department membership |
| `roles` | string[] | Labels only |
| `roleKeys` | string[] | Logic identity |
| `skills`/`skillDetails` | skill assignments | Skills panel |
| `availabilityStatus` | enum | Availability control |
| `availabilityPercentage` | number | 0–100 |
| `aiWorkloadScore`, `aiBurnoutRiskScore`, `aiPerformanceScore` | number | Workload/AI views |
| `activeTaskCount` | number | Directory/workload |
| `isActive` | boolean | Deactivate/reactivate |
| `lastLoginDate` | ISO datetime/null | Admin detail |

UserDepartment fields: `departmentId`, `departmentName`, `organizationId`, `organizationName`, `isPrimary`. UserSkill fields: `skillId`, `skillName`, `proficiencyLevel`, `experienceMonths`, `lastUsed`.

User table columns: avatar/name, email, job title, organization, primary/all departments, roles, availability, active task count/workload, active status, actions. Never omit users because only page 1 was fetched; implement server pagination or explicitly request the required scoped size.

Register fields: first name, last name, email, password, job title, organization ID, department ID(s), primary department ID, role keys/names as expected by endpoint. Update fields: names, email, job title, organization, department, roles, active/profile-related fields supported by `UpdateUserDto`.

### Profile

Fields: `userId`, date of birth, address, city, state, postal code, country, phone, emergency contact name/phone, LinkedIn URL. Treat as PII; fetch only on profile routes and never cache globally.

### Role and permission

Role fields: `id`, immutable `key`, mutable `name`, `description`, `permissionLevel`, `paginationPageSize`, `permissions` or `permissionCodes`. Permission fields: `id`, `code`, `name`, `description`, `module`, `isGlobal`.

Role table: name, key, description, level, page size, permission count, actions. Permission table: module, code, name, description, global flag, actions. Protect built-in SuperAdmin and `SYSTEM_ADMIN` rules; expect server rejection for unsafe edits.

### Project

| Field | Type |
|---|---|
| `id`, `projectCode`, `name` | string |
| `description` | string/null |
| `category` | string |
| `status` | ProjectStatus |
| `priority` | ProjectPriority |
| `plannedStartDate`, `plannedEndDate` | ISO date |
| `actualStartDate`, `actualEndDate` | ISO date/null |
| `plannedBudget`, `actualCost`, `budgetVariance` | number |
| `progressPercentage` | number |
| `aiHealthScore`, `aiDelayRiskScore`, `aiBudgetRiskScore` | number |
| `aiInsightsSummary` | string/null |
| `departmentId`, `departmentName` | primary department |
| `departmentIds` | string[] |
| `departments` | `{departmentId, departmentName, isPrimary}[]` |
| `projectManagerId`, `projectManagerName` | string/null |
| `totalTasks`, `completedTasks`, `overdueTasks` | number |
| `totalMilestones`, `completedMilestones` | number |
| `createdDate` | ISO datetime |

Project list/card fields: code, name, status, priority, primary/participating departments, manager, dates, progress, task/milestone counts, health/risk. Project form fields: code, name, description, category, priority, planned dates, planned budget, primary department, participating department IDs, project manager.

### Milestone

Current `MilestoneDto` fields: `id`, `projectId`, `departmentId`, `departmentName`, `name`, `description`, `order`, `dueDate`, `completedDate`, `status`, `isCritical`, `progressPercentage`, `hasTasks`, `isBlocked`, `blockedByMessage`. Form: project, name, description, order, due date, critical flag, assigned department. Status/complete actions are separate endpoints. Task counts should come from an explicit task query or a future summary DTO; do not assume they exist on the current milestone response.

Milestone dependency fields: `id`, `projectId`, prerequisite milestone ID/name, dependent milestone ID/name, type, threshold percentage, `isMet`. Validate no self-dependency and let the server reject cycles.

### Task and subtask

| Field | Type |
|---|---|
| `id`, `title` | string |
| `description` | string/null |
| `status` | TaskStatus |
| `priority` | TaskPriority |
| `startDate`, `dueDate`, `completedDate` | ISO date/null |
| `estimatedHours`, `actualHours` | number |
| `progressPercentage` | number |
| `projectId`, `projectName` | string/null |
| `milestoneId`, `milestoneName` | string/null |
| `parentTaskId` | string/null; non-null means subtask |
| `assignedToUserId`, `assignedToUserName` | primary/legacy assignee |
| `assignees` | `{userId, fullName}[]` |
| `isEscalated`, `escalationLevel`, `escalatedDate` | escalation fields |
| `aiDelayProbability`, `aiRiskFactors` | AI risk |
| `isOverdue` | boolean |
| `createdDate` | ISO datetime |
| `dependencies`, `comments`, `attachments`, `timeEntries`, `subTasks` | child collections on detail DTO |

Task create/update fields: project ID, milestone ID, title, description, priority, start/due dates, estimated hours, assignee IDs as supported. Status and progress use dedicated PATCH endpoints. Assignment uses `assigneeId`, `assigneeIds`, and `useAIRecommendation`.

Task dependency fields: ID, predecessor task ID/title, successor task ID/title, dependency type, lag days. Comment: ID, task ID, user ID, content, system-generated flag, parent comment ID, created date. Attachment: ID, task ID, file name/path, content type, byte size, uploader ID, created date. Time entry: ID, task ID, user ID/name, description, start/end, duration minutes, billable flag.

### Notifications

Notification fields: `id`, `title`, `message`, `type`, `priority`, `isRead`, `createdDate`, `readDate`, `actionUrl`. Inbox table/card: read state, title/message, type, priority, time, action. Templates: ID, template type, subject/body templates, variables, supported channels. Rules: ID, name, condition type/expression, action type/parameters, enabled, last triggered.

### Activity logs

Fields: ID, user ID/name, activity type, description, metadata dictionary, project ID, created date. Table: timestamp, user, type, project, description, expandable metadata. Respect mine/team/all/project endpoints and permissions.

### Skills

Fields: ID, name, description, category, proficiency levels/configuration exposed by DTO, active state/usage fields where returned. User skill fields are listed above. Table: name, category, description, usage/member count if available, actions.

### Dashboards

Dashboard fields: ID, user ID, name, layout type, default flag, created date, widgets. Widget fields: ID, dashboard ID, widget type, title, configuration dictionary, refresh interval, required permissions, display order, last refreshed. Render only known widget types and validate configuration by widget schema.

### Reports

Stored report fields: ID, name, report type, parameters, generated date, format, generated-by user ID, size bytes. Schedule fields: ID, report ID, frequency, next run, last run, recipients, delivery options, active. Generated AI report includes title/summary, metrics, sections, tables, insights/recommendations, and generated time.

### AI settings and results

Provider display fields: provider, display name, enabled, environment-default flag, base URL, `hasKey`/masked key state, default model. Never return or render a recoverable API key. Models include ID, name, version, model type, dates, accuracy/precision/recall, features, prediction count. Predictions/recommendations include task/project IDs, probabilities/scores, factors, alternatives, explanations, status, and timestamps.

### Knowledge, integrations, and webhooks

- Knowledge article: ID, optional project ID, title, content, category, tags, author ID, created/updated dates, view count, relevance score.
- Lesson learned: ID, project ID, title, description, category, impact, keywords, recorded date.
- Integration: ID, type, name, configuration dictionary, enabled, last sync, status. Sensitive configuration must be redacted.
- Webhook: ID, integration ID, event type, callback URL, header names, active. Secret is write-only. Delivery: ID, webhook ID, attempted time, status code, response body, success, error.

---

## 7. Screen and Table Specification

| Route/screen | Primary data | Required columns/sections | Core actions |
|---|---|---|---|
| Login/recovery | Auth | email/password, recovery/reset states | login, refresh, logout, reset |
| Dashboard | dashboard, projects, scoped tasks, notifications | KPIs, project health, my objectives, workload, activity, task-performance paginated table | open/edit permitted task/project |
| Projects | paginated projects | code, name, status, priority, departments, manager, dates, progress, health, counts | create, view, edit, status, delete |
| Project overview | project detail | identity, budget, dates, departments, manager, progress, AI | status/edit/documents |
| Project milestones | milestones/dependencies | order, name, department, due, critical, status, progress, task counts | CRUD, complete, dependencies |
| Project tasks | scoped tasks | title, assignees, milestone, status, priority, dates, hours, progress, risk | CRUD, assign, status/progress, escalate |
| Task detail | task detail | all task fields plus subtasks, dependencies, comments, attachments, time | workflow actions |
| Organizations | scoped organizations | name, tax/contact, director, department count | CRUD if permitted |
| Organization detail | organization/departments | organization metadata, director, department tree | manage departments |
| Departments | scoped departments | code, name, organization, parent, head, capacity | CRUD/dashboard |
| Users | paginated scoped users | avatar/name, email, title, org, departments, roles, availability, workload, active | register/edit/departments/skills/photo/deactivate |
| Profiles | profile/user | PII detail and edit form | self/admin edit per permission |
| Roles | roles/permissions | role key/name/level/page size/permissions | create/edit/delete with safety rails |
| Skills | skills/users | catalog plus assignments | CRUD and assign proficiency |
| Notifications | inbox/templates/rules | notification fields and admin configuration | read/read all/broadcast/template/rule CRUD |
| Reports | generated/stored/schedules | filters, report metadata, viewer, exports, schedules | generate/store/download/schedule |
| AI | settings/models/predictions | provider safety state, model metrics, insights/recommendations | test/configure/train/accept/reject |
| Knowledge | articles/lessons | project, category, content, tags/keywords, dates | CRUD |
| Integrations/webhooks | integration/webhook fields | status, last sync, callback/event, delivery history | CRUD/sync/test/log delivery |
| Activity logs | scoped logs | date, user, type, project, description, metadata | filter/create if allowed |
| Settings | profile, AI, database status | account/profile, permitted system panels | update |

Every data table needs: loading skeleton, empty state, retryable error, server pagination when available, accessible column headers, keyboard actions, filters reflected in URL search params, and row actions gated by permission.

---

## 8. Project Creation and Delivery Flow

### Project creation wizard

1. Load scoped organizations/departments/users according to permission.
2. Capture project details: code, name, description, category, priority, dates, budget.
3. Select exactly one primary department.
4. Select zero or more additional participating departments; always include primary in the final department set.
5. Optionally select project manager from a user in the project organization.
6. Define milestones: name, description, order, due date, critical, department.
7. Define milestone dependencies using earlier/local milestone IDs; convert to server IDs only after milestones exist.
8. Define tasks: title, description, priority, dates/hours, milestone, assignees.
9. Submit project first, then milestones, dependencies, and tasks in dependency order. Track partial failure and present a resumable result; the API does not provide one atomic wizard transaction.
10. Invalidate projects/navigation/dashboard queries and navigate to the new project overview.

### Project lifecycle

`NotStarted -> InProgress -> OnHold/Delayed -> Completed`, with cancellation where permitted. Use `PATCH /Projects/{id}/status`; do not calculate authoritative status only in the browser. Project progress derives from milestones/tasks and should be refreshed after child mutations.

### Milestone lifecycle

Create under project, assign one department if needed, define dependencies, add tasks, update status, and complete through the dedicated endpoint. A dependency may require predecessor completion or a progress threshold. Display blocked reasons from dependency-status API.

### Task lifecycle

Create -> assign one/multiple users -> start/progress -> comments/attachments/time -> complete/cancel/escalate. Status reset rules may require `confirmReset`. Timer start/stop is server-backed; local elapsed display is only presentation. Refresh task/project/milestone progress after mutations.

### Deletion

Use accessible confirmation dialogs. Assume soft deletion for most records. On 409 conflict show the server reason; on 403 explain lost permission/scope; on 404 remove stale cached rows.

---

## 9. Endpoint Inventory by Module

This is the minimum route map for the rebuilt API layer. All routes are below `/api/v1`.

### Shell and aggregate

- `GET /Workspace/bootstrap`
- `GET /Pages?page=&pageSize=`: legacy monolithic aggregate; avoid as the primary architecture in a rewrite.

### Organizations and departments

- Organizations: `GET /Organizations`, `GET /Organizations/{id}`, `POST /Organizations`, `PUT /Organizations/{id}`, `DELETE /Organizations/{id}`.
- Organization department membership: `PUT` and `DELETE /Organizations/{id}/departments/{departmentId}`.
- Departments: `GET /Departments`, `GET /Departments/{id}`, `POST /Departments`, `PUT /Departments/{id}`, `DELETE /Departments/{id}`, `GET /Departments/{id}/dashboard`.

### Projects and milestones

- Projects: `GET /Projects`, `GET /Projects/{id}`, `POST /Projects`, `PUT /Projects/{id}`, `DELETE /Projects/{id}`, `PATCH /Projects/{id}/status`, `GET /Projects/{id}/progress`, `GET /Projects/dashboard`.
- Documents: `GET/POST /Projects/{id}/documents`, `GET /Projects/{id}/documents/{docId}/download`.
- Project AI: health, insights, resource optimization endpoints under `/Projects/{id}/ai/...`.
- Milestones: `GET /Milestones/by-project/{projectId}`, `GET /Milestones/{id}`, `POST /Milestones`, `PUT /Milestones/{id}`, `DELETE /Milestones/{id}`, status/complete PATCH routes.
- Milestone dependencies: project list, create, update, delete, and dependency-status routes under `/Milestones`.

### Tasks

- Lists: `GET /Tasks`, `/Tasks/by-project/{projectId}`, `/Tasks/my-tasks`, `/Tasks/overdue`, `/Tasks/escalated`, `/Tasks/unassigned`.
- CRUD/workflow: `GET/POST /Tasks`, `GET/PUT/DELETE /Tasks/{id}`, progress/status PATCH, assign/escalate/comment/attachment/time/AI routes.
- Subtasks: list/create under parent, detail/update/delete/status/progress/assign under `/Tasks/subtasks/{id}`.
- Dependencies: list/create under task; update/delete under `/Tasks/dependencies/{depId}`.

`GET /Tasks` filters: `page`, `pageSize`, `projectId`, `departmentId`, `search`, repeated/comma-compatible statuses and priorities according to client serialization, `sortBy`, `sortDirection`.

### Users, roles, profiles, skills

- Users: scoped list/detail/me, register/update, department assignment, profile picture, availability, skills, workload, available users, deactivate/reactivate.
- Profiles: `GET/PUT /Profiles/{userId}`.
- Roles: role CRUD plus permission CRUD under `/Roles/permissions`.
- Skills: catalog CRUD under `/skills`.

### Notifications and activity

- Notifications: inbox, unread count, mark read/read all, delete, broadcast.
- Templates and rules: CRUD under `/Notifications/templates` and `/Notifications/rules`.
- Activity: mine (`/ActivityLogs`), user, team, all, project, and create.

### Dashboards, reports, AI, and system

- Dashboard definitions and widgets: CRUD/reorder under `/Dashboards`.
- Reports: status/budget/workload/task/delay generation, stored report CRUD/download, schedule CRUD.
- AI: settings, providers/models, provider tests, chat, predictions, recommendations, training, health, burnout, resource optimization.
- System: `GET /System/database` for authorized administrators.

### Knowledge and external integrations

- Knowledge articles and lessons CRUD under `/Knowledge`.
- Integrations CRUD/sync under `/Integrations`.
- Webhooks CRUD and delivery logging under `/Webhooks`.

Use the live Swagger document for exact request schema requiredness while implementing each module. Generate TypeScript DTOs from Swagger if possible, then wrap them with stable domain-specific API functions.

---

## 10. Query, Cache, and Invalidation Design

Suggested query keys:

```ts
['workspace']
['projects', filters, page, pageSize]
['project', projectId]
['project', projectId, 'milestones']
['project', projectId, 'tasks', filters, page]
['task', taskId]
['users', filters, page]
['notifications', unreadOnly, page]
```

Mutation invalidation examples:

- Project create/update/status/delete: projects, workspace navigation, dashboard, project detail.
- Milestone mutation: milestone list/detail, project detail/progress, dashboard.
- Task mutation: task list/detail, milestone detail, project progress, dashboard, my-tasks.
- User role/department change: users, workspace only if current user, available users, permissions-dependent routes after re-auth/refresh.
- Notification read: notifications and workspace unread count.

Do not globally refetch every module after each mutation.

---

## 11. Security and Accessibility Requirements

- Prefer httpOnly, Secure, SameSite cookies when backend auth is migrated; pair with CSRF defenses.
- Never expose AI keys, webhook secrets, integration secrets, refresh tokens, or raw error details.
- Validate uploads client-side and rely on server validation as authority.
- No `dangerouslySetInnerHTML` for generated/user/server content.
- Add production CSP through hosting headers.
- All dialogs require label, focus trap, initial focus, Escape close, focus restoration, and scroll lock.
- All controls require accessible names; labels must reference inputs; errors use `aria-describedby`; async errors use `role=alert` or live regions.
- Custom selects must implement full keyboard semantics or use native controls.
- Test core flows with keyboard and screen reader semantics.

---

## 12. Greenfield Delivery Phases

### Phase A: Foundation

Set up routing, typed API client, envelope/errors, auth/session, permission helpers, query cache, error boundary, design tokens, accessible primitives, tests, and workspace shell.

### Phase B: Core organization and project read paths

Implement dashboard shell, sidebar bootstrap, organizations, departments, projects, project overview, milestones, tasks, and scoped pagination. Validate all six role keys with seeded accounts.

### Phase C: Core mutations

Implement project wizard, milestone/task/subtask CRUD, dependencies, assignment, progress/status, comments, attachments, timer, and confirmation workflows.

### Phase D: Administration

Implement users, profiles, departments, roles, permissions, skills, notification management, and system settings.

### Phase E: Extended modules

Implement reports, AI, knowledge, integrations, webhooks, activity logs, and configurable dashboards.

### Phase F: Hardening

Run authorization matrix tests, accessibility audit, route chunk/bundle budgets, cancellation/race tests, upload/security tests, responsive QA, and end-to-end critical workflows.

---

## 13. Acceptance Matrix

For each role, test with at least two organizations, multiple departments, primary/additional project departments, milestone department assignments, single/multiple task assignees, and more records than one API page.

| Scenario | Expected |
|---|---|
| SuperAdmin | Global records and system administration; protected invariants enforced |
| Director | All projects/users/departments in own organization, none from unrelated organizations |
| DepartmentHead | Projects connected to headed department, including primary and milestone-based access |
| ProjectManager | Assigned/scoped projects and permitted project workflows |
| TeamMember | Assigned task work and permitted project context only |
| Viewer | Read-only scoped pages; no mutation controls |
| Pagination | Page changes never lose totals or substitute page 1 for navigation/global state |
| Permission change | Server denial immediately respected; UI refreshes effective permissions |
| Direct URL | Guarded route and API both enforce access |

---

## 14. Known Current-Backend Caveats

Do not turn these implementation details into new product requirements:

1. `/Pages` is a legacy paginated aggregate and caused data truncation when used as global state.
2. Workspace project navigation is server-scoped but currently capped at 100.
3. `/Tasks/my-tasks` applies different SuperAdmin behavior and should not power the general scoped task table.
4. Some endpoints return paginated envelopes while older callers expect arrays; normalize centrally.
5. Some detail endpoints include richer child collections than list DTOs; model list and detail separately.
6. Role display names are mutable; only role keys are stable.
7. Client-side organization/department re-filtering can incorrectly remove valid server-scoped director/head projects.
8. Current access/refresh-token persistence needs redesign rather than copying.

This document should be updated whenever API DTOs, routes, role keys, permission codes, scope rules, or project workflow rules change.
