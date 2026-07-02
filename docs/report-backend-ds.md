# Backend Deep-Dive Report: PMWDS

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Entity Models](#2-entity-models)
3. [Domain Hierarchy & Flow](#3-domain-hierarchy--flow)
4. [Roles, Permissions & Authorization](#4-roles-permissions--authorization)
5. [Scoping & Data Isolation](#5-scoping--data-isolation)
6. [DTOs & API Contracts](#6-dtos--api-contracts)
7. [Controllers & API Endpoints](#7-controllers--api-endpoints)
8. [Repositories & Unit of Work](#8-repositories--unit-of-work)
9. [Application Layer (CQRS)](#9-application-layer-cqrs)
10. [Middleware & Cross-Cutting Concerns](#10-middleware--cross-cutting-concerns)
11. [Issues & Improvement Recommendations](#11-issues--improvement-recommendations)

---

## 1. Architecture Overview

**Clean Architecture (5-layer):**

```
PMWDS.Domain       → Entities, Enums, Events, ValueObjects, Base classes
PMWDS.Application  → DTOs, CQRS Commands/Queries, Interfaces (Repository, Service)
PMWDS.Persistence  → DbContext, EF Configurations, Migrations, Repository implementations
PMWDS.Infrastructure → External services (Email, FileStorage, Cache, Notifications, Hangfire jobs)
PMWDS.API           → Controllers, Middleware, SignalR Hubs, Auth services, Program.cs
```

**Tech Stack:** .NET 8, EF Core, MediatR (CQRS), JWT Bearer, SignalR, Hangfire, Serilog, FluentValidation, AutoMapper

**API Route prefix:** `/api/v1/[controller]`

---

## 2. Entity Models

All located in `PMWDS.Domain/Entities/`. Each entity uses either `BaseEntity` (lightweight) or `AuditableEntity` (adds IsActive/Notes/Tags).

### Base Classes

| File | Purpose |
|---|---|
| `PMWDS.Domain/Common/BaseEntity.cs` | Id (Guid), CreatedDate, ModifiedDate, CreatedBy, ModifiedBy, IsDeleted (soft-delete), RowVersion |
| `PMWDS.Domain/Common/AuditableEntity.cs` | Extends BaseEntity: Notes, Tags, IsActive, Activate/Deactivate |

### Core Business Entities

| Entity | File | Key Relationships |
|---|---|---|
| **Organization** | `PMWDS.Domain/Entities/Organization.cs` | Has many Departments |
| **Department** | `PMWDS.Domain/Entities/Department.cs` | Belongs to Organization; Has ParentDepartment (self-ref); Has many Members (Users), Projects, SubDepartments |
| **Project** | `PMWDS.Domain/Entities/Project.cs` | Belongs to Department; Has many Milestones, Tasks, Documents; Has ProjectManagerId |
| **Milestone** | `PMWDS.Domain/Entities/Milestone.cs` | Belongs to Project; Has many Tasks |
| **ProjectTask** | `PMWDS.Domain/Entities/ProjectTask.cs` | Belongs to Project/Milestone; Has ParentTaskId (self-ref for subtasks); Has SubTasks, Dependencies, Comments, Attachments, Assignments, TimeEntries, AllocationRecommendations, DelayPredictions |
| **TaskAssignment** | `PMWDS.Domain/Entities/TaskAssignment.cs` | Join table between ProjectTask and User; Has IsActive, AIMatchScore |
| **TaskDependency** | `PMWDS.Domain/Entities/TaskDependency.cs` | PredecessorTaskId → SuccessorTaskId; Has Type (FinishToStart, etc.), LagDays |
| **TaskComment** | `PMWDS.Domain/Entities/TaskComment.cs` | Belongs to Task; Has ParentCommentId (threaded) |
| **TaskAttachment** | `PMWDS.Domain/Entities/TaskAttachment.cs` | Belongs to Task; File metadata |
| **TimeEntry** | `PMWDS.Domain/Entities/TimeEntry.cs` | Belongs to Task/User; StartTime/EndTime timer |
| **ProjectDocument** | `PMWDS.Domain/Entities/ProjectDocument.cs` | Project files, versioned |

### User & Identity Entities

| Entity | File | Key Relationships |
|---|---|---|
| **ApplicationUser** | `PMWDS.Domain/Entities/ApplicationUser.cs` | Has many Roles, DepartmentAssignments (UserDepartment), Skills; Has OrganizationId, DepartmentId (primary) |
| **UserDepartment** | `PMWDS.Domain/Entities/UserDepartment.cs` | Join table: User ↔ Department; IsPrimary flag for multi-department |
| **UserProfile** | `PMWDS.Domain/Entities/UserProfile.cs` | One-to-one with ApplicationUser; Bio, JobTitle, Address, EmergencyContact, LinkedIn |
| **Role** | `PMWDS.Domain/Entities/Role.cs` | Has many Permissions, many Users; Has PermissionLevel (int) |
| **Permission** | `PMWDS.Domain/Entities/Permission.cs` | Code, Name, Module, IsGlobal; Many-to-many with Roles |
| **UserSkill** | `PMWDS.Domain/Entities/UserSkill.cs` | Join table: User ↔ Skill; ProficiencyLevel, ExperienceMonths, LastUsed |

### Notification & Activity Entities

| Entity | File | Key Relationships |
|---|---|---|
| **Notification** | `PMWDS.Domain/Entities/Notification.cs` | Per-user; Has Type/Priority; ActionUrl, RelatedEntityId |
| **NotificationTemplate** | `PMWDS.Domain/Entities/NotificationTemplate.cs` | TemplateType, Subject/Body templates with variable placeholders |
| **ActivityLog** | `PMWDS.Domain/Entities/ActivityLog.cs` | UserId, ActivityType, Description, MetadataJson, ProjectId |
| **AuditLog** | `PMWDS.Domain/Entities/AuditLog.cs` | Tracks OldValues/NewValues JSON, IP, UserAgent |

### Enums

| File | Enums |
|---|---|
| `PMWDS.Domain/Enums/ProjectEnums.cs` | ProjectStatus, ProjectPriority, MilestoneStatus |
| `PMWDS.Domain/Enums/TaskEnums.cs` | TaskStatus, TaskPriority, DependencyType |
| `PMWDS.Domain/Enums/UserEnums.cs` | AvailabilityStatus, NotificationType, NotificationPriority |

### Domain Events

| File | Events |
|---|---|
| `PMWDS.Domain/Events/ProjectEvents.cs` | ProjectCreatedEvent, ProjectStatusChangedEvent, ProjectDelayedEvent, ProjectBudgetAlertEvent |
| `PMWDS.Domain/Events/TaskEvents.cs` | TaskAssignedEvent, TaskStatusChangedEvent, TaskCompletedEvent, TaskDelayedEvent, TaskEscalatedEvent |

---

## 3. Domain Hierarchy & Flow

### Hierarchy Chain

```
Organization
  └── Department (multiple, with optional ParentDepartment self-ref)
        └── Project (multiple)
              └── Milestone (multiple)
                    └── ProjectTask (multiple)
                          └── ProjectTask (subtasks, via ParentTaskId self-ref)
```

### Entity Assignment Flow

1. **User → Organization**: `ApplicationUser.OrganizationId` (direct) OR via `UserDepartment.Department.OrganizationId` (indirect)
2. **User → Department(s)**: `ApplicationUser.DepartmentId` (primary) + `UserDepartment` (multiple)
3. **User → Project**: Via `Project.ProjectManagerId`
4. **User → Task**: Via `TaskAssignment` (join) + `ProjectTask.AssignedToUserId`
5. **Project → Department**: `Project.DepartmentId`
6. **Milestone → Project**: `Milestone.ProjectId`
7. **Task → Milestone**: `ProjectTask.MilestoneId`
8. **Task → SubTask**: `ProjectTask.ParentTaskId` (self-referencing)
9. **Task → Task**: Via `TaskDependency` (PredecessorTaskId → SuccessorTaskId)

### Key Design Decisions

- **Self-referencing subtasks**: Tasks link to parent via `ParentTaskId` on the same `ProjectTask` entity (not a separate table). This means subtasks ARE tasks in the same table.
- **Multi-department for users**: `UserDepartment` join table allows users to belong to multiple departments. Primary department is tracked via `ApplicationUser.DepartmentId`.
- **No direct Organization → User**: Organization membership is derived through Department membership.
- **Domain events are not consumed**: Events are added in entity methods (e.g., `Project.Create()`) but there is no event handler/dispatcher that processes them.

---

## 4. Roles, Permissions & Authorization

### Role Hierarchy (6 roles)

| Role | PermissionLevel (int) | Authority |
|---|---|---|
| **SuperAdmin** | Highest | Full system access; bypasses all scoping |
| **Director** | High | Manages organization-level entities; scoped to their organizations |
| **DepartmentHead** | Medium-High | Manages department-level; scoped to their department |
| **ProjectManager** | Medium | Manages projects; scoped to their assigned projects |
| **TeamMember** | Low | Can work on assigned tasks; view scoped data |
| **Viewer** | Lowest | Read-only access (default signup role) |

### Authorization Policies

Defined in `PMWDS.API/Program.cs:88-95`:

| Policy | Required Roles |
|---|---|
| `SuperAdmin` | SuperAdmin |
| `Director` | SuperAdmin, Director |
| `Manager` | SuperAdmin, Director, ProjectManager, DepartmentHead |
| `TaskEditor` | SuperAdmin, Director, ProjectManager, DepartmentHead |
| `Authenticated` | Any authenticated user |

These are **role-based**, NOT permission-based. The `Permission` entity is defined in domain but **not used** for authorization checks at the API layer.

### Permission Entity (Unused)

The `Permission` entity (`PMWDS.Domain/Entities/Permission.cs`) has:
- `Code` (unique, e.g., "PROJECT_CREATE")
- `Module`, `Name`, `Description`
- `IsGlobal`
- Many-to-many with `Role`

Roles are seeded with ~200 permissions via `SeedData.cs`, but the API **never checks permissions**. Only role string checks via `[Authorize(Policy = "...")]` are used.

### UserRoleResolver (Fallback)

`PMWDS.API/Services/UserRoleResolver.cs` — Resolves user roles from the `Role` entity collection. If no roles found, falls back to heuristic based on `JobTitle` string matching:
- "admin@pmwds.com" email → SuperAdmin
- "SuperAdmin" in JobTitle → SuperAdmin
- "Director" in JobTitle → Director
- "ProjectManager"/"Manager" in JobTitle → ProjectManager
- "DepartmentHead"/"Head" in JobTitle → DepartmentHead
- Default → TeamMember

### CurrentUserService

`PMWDS.API/Services/CurrentUserService.cs` — Extracts user info from JWT claims:
- `ClaimTypes.NameIdentifier` → UserId
- `ClaimTypes.Email` → Email
- `ClaimTypes.Name` → FullName
- `ClaimTypes.Role` (multiple) → Roles list
- `"DepartmentId"` claim → DepartmentId

### Auth Flow

1. `POST /api/v1/auth/login` → validates credentials
2. JWT token generated with claims: NameIdentifier, Email, Name, DepartmentId, Roles
3. `AuthController.cs:224-252` — `GenerateToken()` creates JWT with roles as `ClaimTypes.Role`
4. `Program.cs:88-95` — `AddAuthorization()` maps policies to required roles
5. Controllers use `[Authorize(Policy = "PolicyName")]` for access control
6. `RoleScopeService` checks access at organization/department level for data scoping

### Issues with Current Authorization

1. **Hardcoded policy names** — "Authenticated", "Manager", "Director", "SuperAdmin", "TaskEditor" are not constant-driven
2. **Permission entity exists but is never used in authorization pipeline** — no permission-based checks
3. **`[Authorize(Roles = "...")]` used in some controllers** alongside policies — inconsistent (e.g., `NotificationsController.cs:141` uses `[Authorize(Roles = "SuperAdmin,Director,DepartmentHead")]` directly)
4. **No centralized claim/permission check** — each controller repeats scoping logic
5. **Role fallback via JobTitle string matching** is fragile and non-deterministic

---

## 5. Scoping & Data Isolation

### RoleScopeService

`PMWDS.API/Services/RoleScopeService.cs` — Central service for data-level scoping.

**How scoping works:**
1. **SuperAdmin**: Bypasses all scoping — sees everything
2. **Non-SuperAdmin**: Scoped to organizations they belong to (derived from `UserDepartment` + primary `Department` → `OrganizationId`)

**Scope methods:**

| Method | What it does |
|---|---|
| `GetOrganizationIdsAsync()` | Gets all organization IDs a user belongs to (via `UserDepartment.Department.OrganizationId` + primary `Department`) |
| `GetDepartmentIdsAsync()` | Gets all department IDs a user belongs to |
| `ScopeOrganizationsAsync()` | Filters to user's organizations |
| `ScopeDepartmentsAsync()` | Filters to departments in user's organizations |
| `ScopeProjectsAsync()` | Filters to projects whose department is in user's organizations |
| `ScopeUsersAsync()` | Complex: Filters users in same organizations, with special rules for DepartmentHead (sees their department's users + Directors/DepartmentHeads in org) |
| `CanAccessOrganizationAsync()` | Checks org access |
| `CanAccessDepartmentAsync()` | Checks if department's org is accessible + optional DepartmentHead ownership |
| `CanManageDepartmentAsync()` | SuperAdmin/always, Director if org accessible, DepartmentHead if they are the head |
| `CanManageProjectAsync()` | SuperAdmin/always, ProjectManager if assigned, Director/DepartmentHead if org accessible |
| `CanAccessProjectAsync()` | If project's org is accessible |
| `CanAccessUserAsync()` | SuperAdmin/self/always, checks user is in scoped org (hides other SuperAdmins) |
| `CanManageUserAsync()` | Only SuperAdmin and Director |

**Example scoping flow for `GET /api/v1/projects`:**

```
ProjectsController.GetAll()
  → _scope.ScopeProjectsAsync(query, ct)
    → If SuperAdmin: returns all
    → Else: filters projects WHERE project.Department.OrganizationId IN (user's organization IDs)
```

### Issues with Scoping

1. **N+1 queries**: Each scope/can-access method hits the database independently (e.g., `CanAccessProjectAsync` queries project → then calls `CanAccessOrganizationAsync` which queries departments → then calls `GetOrganizationIdsAsync` which queries UserDepartments + Users)
2. **No caching**: Organization/Department IDs re-queried on every request
3. **BL in API layer**: Scoping logic lives in API services (`RoleScopeService`), not in Application/Domain layer — breaks Clean Architecture
4. **No tenant context**: No `TenantId` or `OrganizationId` filter baked into the DbContext automatically
5. **Some controllers bypass scoping** (e.g., `OrganizationsController.GetAll()` does manual LINQ filtering instead of using `ScopeOrganizationsAsync`)

---

## 6. DTOs & API Contracts

All DTOs are `record` types in `PMWDS.Application/DTOs/`.

### Project DTOs (`PMWDS.Application/DTOs/Projects/ProjectDto.cs`)

| DTO | Usage |
|---|---|
| `ProjectDto` | List/detail response with summary stats |
| `ProjectDetailDto` | Full project detail (includes Tasks, Milestones, TeamMembers lists) |
| `ProjectSummaryDto` | Minimal card info (code, name, status, progress, health) |
| `CreateProjectDto` | Create request |
| `UpdateProjectDto` | Update request |
| `MilestoneDto` | Milestone response with progress from tasks |

### Task DTOs (`PMWDS.Application/DTOs/Tasks/TaskDto.cs`)

| DTO | Usage |
|---|---|
| `TaskDto` | Full task with nested subtasks, dependencies, comments, attachments, time entries, assignees |
| `TaskSummaryDto` | Minimal task info |
| `CreateTaskDto` | Create request |
| `UpdateTaskDto` | Update request |
| `UpdateTaskProgressDto` | Progress patch request |
| `TaskDependencyDto` | Dependency response |
| `TaskCommentDto` | Comment response |
| `TaskAttachmentDto` | Attachment response |
| `TaskTimeEntryDto` | Time entry response |
| `TaskAssigneeDto` | Assignee summary |
| `CreateDependencyDto` / `UpdateDependencyDto` | Dependency CRUD requests |

### User DTOs (`PMWDS.Application/DTOs/Users/UserDto.cs`)

| DTO | Usage |
|---|---|
| `UserDto` | Full user with departments, roles, skills |
| `UserSummaryDto` | Minimal user for team lists |
| `UserDepartmentDto` | Department assignment detail |
| `UserSkillDto` | Skill proficiency |
| `RegisterUserDto` | Create user request |
| `UpdateUserDto` | Update user request |
| `WorkloadDistributionDto` | Team workload report |
| `UserWorkloadItem` | Per-user workload detail |

### Notification DTOs (`PMWDS.Application/DTOs/Notifications/NotificationDto.cs`)

| DTO | Usage |
|---|---|
| `NotificationDto` | Notification response |
| `SendNotificationDto` | Send notification request (internal) |

### Inline Controller DTOs

Many controllers define DTOs as `record` types at the bottom of the controller file (mixed concerns):
- `OrganizationsController.cs:179-193` — `OrganizationResponse`, `OrganizationDirectorResponse`, `OrganizationDepartmentResponse`, `UpsertOrganizationRequest`
- `DepartmentsController.cs:250-276` — `DepartmentDto`, `CreateDepartmentDto`, `UpdateDepartmentDto`
- `MilestonesController.cs:144-158` — `CreateMilestoneDto`, `UpdateMilestoneDto`
- `TasksController.cs:744-747` — `UpdateTaskStatusRequest`, `AssignTaskRequest`, `AddCommentRequest`, `StartTimerRequest`
- `UsersController.cs:746-761` — `UpdateAvailabilityRequest`, `AddUserSkillRequest`, `UpdateUserSkillRequest`, `AssignUserDepartmentsRequest`
- `AuthController.cs:272-276` — `LoginRequest`, `ChangePasswordRequest`, `SignupRequest`, `ForgotPasswordRequest`, `ResetPasswordRequest`
- `RolesController.cs:157-175` — `RoleResponse`, `PermissionResponse`, `CreateRoleRequest`, `UpdateRoleRequest`, `CreatePermissionRequest`, `UpdatePermissionRequest`
- `NotificationsController.cs:272-309` — `BroadcastNotificationRequest`, `NotificationTemplateResponse`, `UpsertNotificationTemplateRequest`, `AlertRuleResponse`, `UpsertAlertRuleRequest`
- `ProfilesController.cs:83-99` — `UserProfileResponse`, `UpsertProfileRequest`
- `ActivityLogsController.cs:134-135` — `ActivityLogResponse`, `CreateActivityLogRequest`

### Issues with DTOs

1. **Mixed locations**: DTOs are split between `Application/DTOs/` and inline in controllers — no consistency
2. **No validation attributes**: No `[Required]`, `[StringLength]`, or FluentValidation rules on most DTOs (except `AuthController` inline checks)
3. **Domain enum strings exposed**: Status/Priority sent as `.ToString()` instead of consistent enums or integer IDs
4. **Inline DTOs in controllers** violate Single Responsibility — controller files contain response models
5. **`ProjectDto.FromEntity()` doesn't resolve ProjectManagerName** — always returns null (line 59)
6. **`TaskDto` is overloaded** — 40 fields including nested collections; no pagination support for comments/attachments

---

## 7. Controllers & API Endpoints

All controllers inherit from `BaseApiController` (`PMWDS.API/Controllers/BaseApiController.cs`) which is `[Route("api/v1/[controller]")]`, `[ApiController]`, `[Authorize]`, `[Produces("application/json")]`.

### AuthController (`PMWDS.API/Controllers/AuthController.cs`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Anonymous | Login, returns JWT + user info |
| POST | `/api/v1/auth/signup` | Anonymous | Register as Viewer |
| POST | `/api/v1/auth/forgot-password` | Anonymous | Sends reset email |
| POST | `/api/v1/auth/reset-password` | Anonymous | Resets password with token |
| POST | `/api/v1/auth/change-password` | Authenticated | Changes own password |
| POST | `/api/v1/auth/refresh` | Authenticated | Refreshes JWT token |

**Issues**: 
- Password hashing uses `SHA256(userId + password)` — NOT bcrypt/Argon2 (vulnerable to rainbow tables)
- Fallback passwords ("Pmwds@123", "Admin@12345!") are hardcoded in `IsPasswordValid()`

### OrganizationsController (`PMWDS.API/Controllers/OrganizationsController.cs`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/organizations` | Authenticated | List all (scoped) with departments + director |
| GET | `/api/v1/organizations/{id}` | Authenticated | Get by ID |
| POST | `/api/v1/organizations` | SuperAdmin | Create |
| PUT | `/api/v1/organizations/{id}` | Director | Update (scoped) |
| DELETE | `/api/v1/organizations/{id}` | SuperAdmin | Delete |
| PUT | `/api/v1/organizations/{id}/departments/{departmentId}` | SuperAdmin | Assign department |
| DELETE | `/api/v1/organizations/{id}/departments/{departmentId}` | SuperAdmin | Remove department |

### DepartmentsController (`PMWDS.API/Controllers/DepartmentsController.cs`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/departments` | Authenticated | List all (scoped) |
| GET | `/api/v1/departments/{id}` | Authenticated | Get by ID (scoped) |
| GET | `/api/v1/departments/{id}/dashboard` | Manager | Department dashboard stats |
| POST | `/api/v1/departments` | Manager | Create (scoped to org) |
| PUT | `/api/v1/departments/{id}` | Manager | Update (scoped) |
| DELETE | `/api/v1/departments/{id}` | SuperAdmin | Delete |

### ProjectsController (`PMWDS.API/Controllers/ProjectsController.cs`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/projects/dashboard` | Authenticated | Project dashboard data |
| GET | `/api/v1/projects` | Authenticated | List (scoped, filterable by departmentId/status) |
| GET | `/api/v1/projects/{id}` | Authenticated | Get by ID with details (scoped) |
| POST | `/api/v1/projects` | Manager | Create (scoped to department) |
| PUT | `/api/v1/projects/{id}` | Manager | Update (scoped) |
| PATCH | `/api/v1/projects/{id}/status` | Manager | Update status |
| GET | `/api/v1/projects/{id}/progress` | Authenticated | Progress summary for project |
| GET | `/api/v1/projects/{id}/documents` | Authenticated | List documents |
| POST | `/api/v1/projects/{id}/documents` | Authenticated | Upload document |
| GET | `/api/v1/projects/{id}/documents/{docId}/download` | Authenticated | Download document |
| DELETE | `/api/v1/projects/{id}` | Manager | Delete (cascades to tasks) |
| GET | `/api/v1/projects/{id}/ai/health` | Manager | AI health analysis |
| GET | `/api/v1/projects/{id}/ai/insights` | Manager | AI insights |
| POST | `/api/v1/projects/{id}/ai/optimize-resources` | Manager | AI resource optimization |

### MilestonesController (`PMWDS.API/Controllers/MilestonesController.cs`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/milestones/by-project/{projectId}` | Authenticated | List by project (scoped) |
| GET | `/api/v1/milestones/{id}` | Authenticated | Get by ID (scoped) |
| POST | `/api/v1/milestones` | Manager | Create (scoped) |
| PUT | `/api/v1/milestones/{id}` | Manager | Update |
| PATCH | `/api/v1/milestones/{id}/complete` | Manager | Mark complete |
| DELETE | `/api/v1/milestones/{id}` | Manager | Delete (cascades to tasks) |

### TasksController (`PMWDS.API/Controllers/TasksController.cs`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/tasks/by-project/{projectId}` | Authenticated | List by project (scoped) |
| GET | `/api/v1/tasks/my-tasks` | Authenticated | Current user's tasks |
| GET | `/api/v1/tasks/{id}` | Authenticated | Get by ID with full details |
| POST | `/api/v1/tasks` | Manager | Create |
| PUT | `/api/v1/tasks/{id}` | TaskEditor | Update details |
| PATCH | `/api/v1/tasks/{id}/progress` | Authenticated | Update progress |
| PATCH | `/api/v1/tasks/{id}/status` | Authenticated | Update status |
| POST | `/api/v1/tasks/{id}/assign` | Manager | Assign/reassign users |
| POST | `/api/v1/tasks/{id}/comments` | Authenticated | Add comment |
| POST | `/api/v1/tasks/{id}/attachments` | Authenticated | Upload attachment |
| POST | `/api/v1/tasks/{id}/time/start` | Authenticated | Start timer |
| POST | `/api/v1/tasks/{id}/time/stop` | Authenticated | Stop timer |
| GET | `/api/v1/tasks/overdue` | Manager | Overdue tasks (scoped) |
| GET | `/api/v1/tasks/escalated` | Manager | Escalated tasks (scoped) |
| GET | `/api/v1/tasks/unassigned` | Manager | Unassigned tasks (scoped) |
| GET | `/api/v1/tasks/{id}/subtasks` | Authenticated | List subtasks |
| POST | `/api/v1/tasks/{id}/subtasks` | Authenticated | Create subtask |
| GET | `/api/v1/tasks/subtasks/{id}` | Authenticated | Get subtask by ID |
| PUT | `/api/v1/tasks/subtasks/{id}` | TaskEditor | Update subtask |
| PATCH | `/api/v1/tasks/subtasks/{id}/progress` | Authenticated | Update subtask progress |
| PATCH | `/api/v1/tasks/subtasks/{id}/status` | Authenticated | Update subtask status |
| POST | `/api/v1/tasks/subtasks/{id}/assign` | Manager | Assign subtask |
| DELETE | `/api/v1/tasks/subtasks/{id}` | Manager | Delete subtask (cascading) |
| DELETE | `/api/v1/tasks/{id}` | Manager | Delete task (cascading) |
| GET | `/api/v1/tasks/{id}/dependencies` | Authenticated | List dependencies |
| POST | `/api/v1/tasks/{id}/dependencies` | Authenticated | Create dependency |
| PUT | `/api/v1/tasks/dependencies/{depId}` | Authenticated | Update dependency |
| DELETE | `/api/v1/tasks/dependencies/{depId}` | Authenticated | Delete dependency |

### UsersController (`PMWDS.API/Controllers/UsersController.cs`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/users` | Authenticated | List (scoped, filterable by departmentId) |
| GET | `/api/v1/users/{id}` | Authenticated | Get by ID (scoped) |
| GET | `/api/v1/users/me` | Authenticated | Current user profile |
| PUT | `/api/v1/users/{id}` | Authenticated | Update user (scoped) |
| POST | `/api/v1/users/register` | Director | Create user |
| PUT | `/api/v1/users/{id}/departments` | Director | Assign departments |
| POST | `/api/v1/users/{id}/profile-picture` | Authenticated | Upload avatar |
| PATCH | `/api/v1/users/{id}/availability` | Authenticated | Update availability |
| POST | `/api/v1/users/{id}/skills` | Authenticated | Add skill |
| PUT | `/api/v1/users/{id}/skills/{skillId}` | Authenticated | Update skill |
| DELETE | `/api/v1/users/{id}/skills/{skillId}` | Authenticated | Remove skill |
| GET | `/api/v1/users/available` | Manager | Available users |
| GET | `/api/v1/users/workload` | Manager | Workload distribution |
| PATCH | `/api/v1/users/{id}/deactivate` | Director | Deactivate user |
| PATCH | `/api/v1/users/{id}/reactivate` | Director | Reactivate user |

### RolesController (`PMWDS.API/Controllers/RolesController.cs`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/roles` | Authenticated | List roles with permissions |
| GET | `/api/v1/roles/permissions` | Authenticated | List all permissions |
| POST | `/api/v1/roles` | SuperAdmin | Create role |
| PUT | `/api/v1/roles/{id}` | SuperAdmin | Update role |
| DELETE | `/api/v1/roles/{id}` | SuperAdmin | Delete role |
| POST | `/api/v1/roles/permissions` | SuperAdmin | Create permission |
| PUT | `/api/v1/roles/permissions/{id}` | SuperAdmin | Update permission |
| DELETE | `/api/v1/roles/permissions/{id}` | SuperAdmin | Delete permission |

### NotificationsController (`PMWDS.API/Controllers/NotificationsController.cs`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/notifications` | Authenticated | User's notifications (paginated) |
| GET | `/api/v1/notifications/unread-count` | Authenticated | Unread count |
| PATCH | `/api/v1/notifications/{id}/read` | Authenticated | Mark read |
| PATCH | `/api/v1/notifications/read-all` | Authenticated | Mark all read |
| DELETE | `/api/v1/notifications/{id}` | Authenticated | Delete notification |
| POST | `/api/v1/notifications/broadcast` | SuperAdmin/Director/DeptHead | Broadcast to department or all |

### ProfilesController (`PMWDS.API/Controllers/ProfilesController.cs`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/profiles/{userId}` | Authenticated | Get profile |
| PUT | `/api/v1/profiles/{userId}` | Authenticated | Create/update profile |

### ActivityLogsController (`PMWDS.API/Controllers/ActivityLogsController.cs`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/activitylogs` | Authenticated | Current user's activity |
| GET | `/api/v1/activitylogs/user/{userId}` | Director | User's activity (scoped) |
| GET | `/api/v1/activitylogs/team` | Authenticated | Team activity (scoped) |
| GET | `/api/v1/activitylogs/all` | Director | All activity (scoped) |
| GET | `/api/v1/activitylogs/project/{projectId}` | Authenticated | Project activity (scoped) |
| POST | `/api/v1/activitylogs` | Authenticated | Create activity entry |

**Note**: Activity logs are also auto-created by `RequestLoggingMiddleware` for non-GET requests.

---

## 8. Repositories & Unit of Work

### Generic Repository Pattern

**Interface:** `PMWDS.Application/Interfaces/Repositories/IRepository.cs`
```
GetByIdAsync, GetAllAsync, FindAsync( predicate), AddAsync, UpdateAsync, DeleteAsync, ExistsAsync, CountAsync
```

**Implementation:** `PMWDS.Persistence/Repositories/BaseRepository.cs`
- Uses `DbSet<T>` with full CRUD
- `FindAsync` uses `Expression<Func<T, bool>>` — materializes into list in-memory (no IQueryable returned!)

### Specialized Repositories

| Repository | Interface | Implementation | Additional Methods |
|---|---|---|---|
| Project | `IProjectRepository` | `ProjectRepository.cs` | `GetWithDetailsAsync`, `GetByDepartmentAsync`, `GetByManagerAsync`, `GetByStatusAsync`, `GetOverdueProjectsAsync`, `GetProjectsWithHighRiskAsync`, `GetAverageCompletionRateAsync` |
| Task | `ITaskRepository` | `TaskRepository.cs` | `GetWithDetailsAsync`, `GetByProjectAsync`, `GetByAssigneeAsync`, `GetOverdueTasksAsync`, `GetByMilestoneAsync`, `GetUnassignedTasksAsync`, `GetHighRiskTasksAsync`, `GetEscalatedTasksAsync`, `GetSubtasksByParentIdAsync`, `GetDependenciesForTaskAsync`, `DeleteTaskGraphAsync`, `DeleteTasksByMilestoneAsync`, `DeleteTasksByProjectAsync` |
| User | `IUserRepository` | `UserRepository.cs` | `GetByEmailAsync`, `GetByIdWithSkillsAsync`, `GetByDepartmentAsync`, `GetAllWithSkillsAsync`, `GetByDepartmentWithSkillsAsync`, `GetAvailableUsersAsync`, `GetUsersBySkillAsync`, `GetUsersByRoleAsync`, `GetUserWorkloadScoreAsync` |

### UnitOfWork

**Interface:** `PMWDS.Application/Interfaces/Services/IUnitOfWork.cs`
**Implementation:** `PMWDS.Persistence/Repositories/UnitOfWork.cs`

Exposes **30+ typed repository properties** (every entity has a repository), plus:
- `SaveChangesAsync()` — delegates to DbContext
- `BeginTransactionAsync()` / `CommitTransactionAsync()` / `RollbackTransactionAsync()`

### Issues with Repositories

1. **`IRepository.FindAsync()` returns `IEnumerable` (in-memory)**, not `IQueryable` — breaks query composition; all filtering happens client-side after loading all rows
2. **Massive UnitOfWork** with 30+ properties — violates Interface Segregation Principle
3. **`BaseRepository.UpdateAsync()`** sets `EntityState.Modified` on the entire entity — no change tracking, always updates all columns
4. **No pagination** support in base repository — `GetAllAsync()` loads everything into memory. Some controllers manually do `.Skip().Take()` in-memory after fetching all
5. **`UserRepository.IncludeIdentityGraph()`** eagerly loads Department + DepartmentAssignments + Department.Organization + Profile + Roles on EVERY query — even when not needed

---

## 9. Application Layer (CQRS)

### Commands & Handlers

| Command | File | Purpose |
|---|---|---|
| `CreateProjectCommand` | `PMWDS.Application/Features/Projects/Commands/CreateProjectCommand.cs` | Creates project, audits |
| `UpdateProjectCommand` | `PMWDS.Application/Features/Projects/Commands/` | Updates project |
| `UpdateProjectStatusCommand` | `PMWDS.Application/Features/Projects/Commands/` | Status change |
| `CreateTaskCommand` | `PMWDS.Application/Features/Tasks/Commands/CreateTaskCommand.cs` | Creates task with AI prediction |
| `AssignTaskCommand` | `PMWDS.Application/Features/Tasks/Commands/` | Assigns user with notification |
| `UpdateTaskProgressCommand` | `PMWDS.Application/Features/Tasks/Commands/` | Progress update |
| `EscalateTaskCommand` | `PMWDS.Application/Features/Tasks/Commands/` | Escalate task |

### Queries

| Query | File | Purpose |
|---|---|---|
| `GetProjectDashboardQuery` | `PMWDS.Application/Features/Projects/Queries/` | Dashboard aggregation |
| `GetProjectDetailsQuery` | `PMWDS.Application/Features/Projects/Queries/GetProjectDetailsQuery.cs` | Single project detail |
| `GetProjectHealthQuery` | `PMWDS.Application/Features/Projects/Queries/` | AI health data |
| `GetAIAssigneeRecommendationQuery` | `PMWDS.Application/Features/AI/Queries/` | AI assignee suggestion |
| `GetBurnoutRiskQuery` | `PMWDS.Application/Features/AI/Queries/` | Burnout analysis |
| `GetTaskDelayPredictionQuery` | `PMWDS.Application/Features/AI/Queries/` | Delay prediction |
| `GetWorkloadDistributionQuery` | `PMWDS.Application/Features/Users/Queries/GetWorkloadDistributionQuery.cs` | Workload analysis |

### Issues with CQRS

1. **Inconsistent usage**: Some operations go through CQRS handlers (projects/tasks), others manipulate entities directly in controllers (departments, milestones, users, organizations, roles, notifications)
2. **Handlers duplicate scoping checks**: Controllers check scoping before calling `Mediator.Send()`, but handlers don't re-verify (relying on controller layer)
3. **No validation pipeline**: FluentValidation is registered but not used for request validation
4. **No transaction handling**: Handlers use `SaveChangesAsync` directly without wrapping in transactions

---

## 10. Middleware & Cross-Cutting Concerns

### ExceptionMiddleware

`PMWDS.API/Middleware/ExceptionMiddleware.cs` — Global exception handler mapping:
- `NotFoundException` → 404
- `ValidationException` → 400
- `UnauthorizedAccessException` → 401
- `ConflictException` → 409
- All others → 500

### RequestLoggingMiddleware

`PMWDS.API/Middleware/RequestLoggingMiddleware.cs` — Logs all requests + auto-creates `ActivityLog` for non-GET, successful requests.

### SignalR Hubs

| Hub | Route | Groups |
|---|---|---|
| `NotificationHub` | `/hubs/notifications` | User/department/role groups |
| `DashboardHub` | `/hubs/dashboard` | Department/project groups |

---

## 11. Issues & Improvement Recommendations

### 🚨 Critical Security Issues

| Issue | Location | Recommendation |
|---|---|---|
| **SHA256 password hashing** (no salt per standard, uses userId as salt) | `AuthController.cs:254-255` | Replace with `BCrypt.Net` or `ASP.NET Core Identity PasswordHasher` |
| **Hardcoded fallback passwords** | `AuthController.cs:218-221` | Remove fallbacks; require proper password setup |
| **JWT secret** could be weak | `appsettings.json` → Jwt:Secret | Enforce minimum 32-char secret; rotate periodically |
| **No rate limiting** on auth endpoints | `AuthController` | Add rate limiting (e.g., 5 login attempts/minute) |
| **No email verification** | `AuthController.Signup()` | Require email verification before allowing login |

### 🔴 High Priority Issues

| Issue | Location | Recommendation |
|---|---|---|
| **IRepository.FindAsync returns IEnumerable** (in-memory filtering) | `BaseRepository.cs:24-27` | Return `IQueryable<T>` for composability and SQL-level filtering |
| **No pagination in base repository** | `BaseRepository.cs` | Add `PaginatedList<T>` with skip/take + total count |
| **Permissions model exists but unused** | `Role.cs`, `Permission.cs` | Implement permission-based authorization, not just role-name checks |
| **Cross-contamination of DTOs** | Mixed across `Application/DTOs/` and controller files | Move ALL DTOs to `Application/DTOs/` — never inline in controllers |
| **Inconsistent CQRS usage** | Some operations via MediatR, some direct | Standardize: ALL write operations go through CQRS Commands |
| **No request validation** | FluentValidation registered but unused | Add `FluentValidation` validators for all DTOs + pipeline behavior |
| **Massive UnitOfWork** | `IUnitOfWork.cs` — 30+ properties | Split into domain-specific interfaces (`IOrganizationUnitOfWork`, `IProjectUnitOfWork`) or use `DbContext` directly |

### 🟡 Medium Priority Issues

| Issue | Location | Recommendation |
|---|---|---|
| **Controllers mixed with DTOs** | DTO records at bottom of controller files | Extract to `Application/DTOs/` namespace |
| **RoleScopeService in API layer** (breaks Clean Architecture) | `RoleScopeService.cs` | Move scoping logic to Application layer as pipeline behaviors/mediator middleware |
| **N+1 scope queries** | `RoleScopeService.cs` — multiple DB calls per request | Cache organization/department IDs per request (use `IMemoryCache` scoped to HttpContext) |
| **No global tenant filter** | All scope methods manually filter | Use EF Core `HasQueryFilter` with `ITenantService` injected at DbContext level |
| **Eager loading in UserRepository** | `UserRepository.cs:102-109` — always loads everything | Use split queries or projection (`Select`) |
| **ProjectManagerName always null** | `ProjectDto.cs:59` | Resolve from Users table |
| **Domain events registered but never consumed** | `ProjectEvents.cs`, `TaskEvents.cs` | Add `INotificationHandler<T>` implementations in Application layer |
| **No soft-delete global filter for AuditLog** | `ApplicationDbContext.cs:61-69` | Add to global query filter |
| **`RoleScopeService.ScopeUsersAsync()` complex logic** | `RoleScopeService.cs:117-153` | Simplify; extract DepartmentHead-specific logic into separate method |
| **`TasksController.CanWorkOnTaskAsync()` duplicates scope logic** | `TasksController.cs:683-708` | Move to `RoleScopeService` |
| **`IsUserInProjectOrganizationAsync()` duplicated** | `ProjectsController.cs:299-322` and `TasksController.cs:718-741` | Extract to shared service |

### 🟢 Low Priority / Nice-to-Have

| Issue | Location | Recommendation |
|---|---|---|
| **No API versioning** | All routes are `/api/v1/` hardcoded | Use `Asp.Versioning.Mvc` for proper versioning |
| **No caching layer for reads** | Projects/Users/Departments endpoints | Add `[ResponseCache]` or distributed cache with invalidation |
| **No Swagger annotations** | Controllers | Add `[ProducesResponseType]` attributes for API documentation |
| **Error response format inconsistent** | Some controllers return `{message}`, others `{Message}` | Standardize to camelCase JSON |
| **No audit trail for read operations** | `AuditLog.cs` only logs writes | Add read audit for sensitive data (optional) |
| **`ActivityLog.UserId` is Guid, `AuditLog.UserId` is string** | Inconsistency | Make consistent — use string for both |
| **`UserDto.LastLoginDate` always null** | `UserDto.cs:59` | Track last login in `AuthController.Login()` |
| **No `CancellationToken` in some calls** | Various places | Ensure all async calls pass `ct` |
| **SignalR hubs have empty implementation** | `DashboardHub.cs`, `NotificationHub.cs` | Add hub methods or remove if unused |

### Architecture Improvements

#### 1. Permission-Based Authorization Pipeline

```csharp
// Instead of role checks, implement:
[Authorize(Policy = "Permission")]
// With a PermissionAuthorizationHandler that checks:
// User.Roles.Permissions.Any(p => p.Code == "PROJECT_CREATE")
```

This would use the existing `Permission` entity that's already seeded with data.

#### 2. Tenant/Organization Scoping via EF Core Interceptors

Create an `ITenantService` that provides the current user's organization IDs, and use EF Core `SaveChangesInterceptor` + `QueryFilter` to auto-scope:

```csharp
builder.Entity<Project>().HasQueryFilter(p => 
    _tenant.OrganizationIds.Contains(p.Department.OrganizationId));
```

#### 3. API Consolidation — Role-Wise Data API

**New endpoint pattern:** `GET /api/v1/{scope}/dashboard`

Where `{scope}` could be:
- `/api/v1/my/dashboard` — returns all data for current user (their org → dept → projects → milestones → tasks)
- `/api/v1/organizations/{orgId}/dashboard` — org-level dashboard with all nested entities

This would be a **single optimized query** that returns the full hierarchy in one response, avoiding N+1 API calls from the frontend.

#### 4. Split UnitOfWork

```csharp
public interface IProjectUnitOfWork : IDisposable
{
    IProjectRepository Projects { get; }
    IRepository<Milestone> Milestones { get; }
    IRepository<ProjectDocument> ProjectDocuments { get; }
}

public interface IUserUnitOfWork : IDisposable
{
    IUserRepository Users { get; }
    IRepository<Role> Roles { get; }
    IRepository<UserProfile> UserProfiles { get; }
}
```

#### 5. Add Pagination Support

```csharp
public class PaginatedList<T>
{
    public List<T> Items { get; }
    public int Page { get; }
    public int PageSize { get; }
    public int TotalCount { get; }
    public int TotalPages { get; }
}
```

Update `IRepository` to include paginated queries.

#### 6. Standardize Error Response

Create a consistent `ApiResponse<T>` wrapper:
```csharp
public record ApiResponse<T>(T Data, string? Message = null, List<string>? Errors = null);
```

---

## Summary of File Locations

### Domain Layer
| Component | Path |
|---|---|
| Base classes | `PMWDS.Domain/Common/BaseEntity.cs`, `AuditableEntity.cs`, `ValueObject.cs`, `DomainEvent.cs` |
| Entities | `PMWDS.Domain/Entities/*.cs` |
| Enums | `PMWDS.Domain/Enums/ProjectEnums.cs`, `TaskEnums.cs`, `UserEnums.cs` |
| Events | `PMWDS.Domain/Events/ProjectEvents.cs`, `TaskEvents.cs` |

### Application Layer
| Component | Path |
|---|---|
| DTOs | `PMWDS.Application/DTOs/Projects/`, `Tasks/`, `Users/`, `Notifications/` |
| CQRS Commands | `PMWDS.Application/Features/Projects/Commands/`, `Tasks/Commands/` |
| CQRS Queries | `PMWDS.Application/Features/Projects/Queries/`, `Users/Queries/`, `AI/Queries/` |
| Repository Interfaces | `PMWDS.Application/Interfaces/Repositories/IRepository.cs`, `IProjectRepository.cs`, `ITaskRepository.cs`, `IUserRepository.cs` |
| Service Interfaces | `PMWDS.Application/Interfaces/Services/IUnitOfWork.cs`, `ICurrentUserService.cs`, `INotificationService.cs`, etc. |

### Persistence Layer
| Component | Path |
|---|---|
| DbContext | `PMWDS.Persistence/Context/ApplicationDbContext.cs` |
| EF Configurations | `PMWDS.Persistence/Configurations/` |
| Migrations | `PMWDS.Persistence/Migrations/` |
| Repositories | `PMWDS.Persistence/Repositories/BaseRepository.cs`, `ProjectRepository.cs`, `TaskRepository.cs`, `UserRepository.cs`, `UnitOfWork.cs` |

### API Layer
| Component | Path |
|---|---|
| Controllers | `PMWDS.API/Controllers/AuthController.cs`, `OrganizationsController.cs`, `DepartmentsController.cs`, `ProjectsController.cs`, `MilestonesController.cs`, `TasksController.cs`, `UsersController.cs`, `RolesController.cs`, `NotificationsController.cs`, `ProfilesController.cs`, `ActivityLogsController.cs`, `BaseApiController.cs` |
| Services | `PMWDS.API/Services/RoleScopeService.cs`, `UserRoleResolver.cs`, `CurrentUserService.cs` |
| Middleware | `PMWDS.API/Middleware/ExceptionMiddleware.cs`, `RequestLoggingMiddleware.cs` |
| Hubs | `PMWDS.API/Hubs/NotificationHub.cs`, `DashboardHub.cs` |
| Startup | `PMWDS.API/Program.cs` |

### Infrastructure Layer
| Component | Path |
|---|---|
| Services | `PMWDS.Infrastructure/Services/NotificationService.cs`, `AuditService.cs`, `EmailService.cs`, `AzureBlobStorageService.cs`, `LocalFileStorageService.cs`, `ReportService.cs`, `RedisCacheService.cs` |
| Jobs | `PMWDS.Infrastructure/Jobs/DeadlineCheckerJob.cs`, `EscalationCheckerJob.cs`, `AIModelTrainingJob.cs`, `ScheduledReportJob.cs` |
| Settings | `PMWDS.Infrastructure/Settings/AppSettings.cs` (with nested settings) |
