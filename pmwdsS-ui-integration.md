# pmwdsS UI Integration Report

Branch: `pmwdsS`

Flow supported by this branch:

`organizations -> departments -> projects -> milestones -> tasks -> sub tasks`

This report lists the React app changes needed to consume the backend work already present on `pmwdsS`. Do not touch `Client/src/old`.

## Backend Changes Already Present On pmwdsS

1. Permission-based authorization is now backed by the domain `Permission` entity.
   - Backend files: `PMWDS.Application/Security/PermissionCodes.cs`, `PMWDS.API/Auth/PermissionAuthorizationHandler.cs`, `PMWDS.API/Auth/PermissionAuthorizationRequirement.cs`, `PMWDS.API/Auth/PermissionPolicyRegistry.cs`, `PMWDS.API/Program.cs`.
   - API impact: JWT login responses include `permissions: string[]`; policies check permission codes such as `PROJECT_CREATE`, `TASK_EDIT`, `ROLE_VIEW`, not only role names.
   - UI impact: React should gate buttons/actions with `hasPermission(...)` first and use role checks only for coarse layout fallback.

2. Auth response now carries permissions.
   - Backend files: `PMWDS.API/Controllers/AuthController.cs`.
   - API response shape:
     ```json
     {
       "token": "...",
       "expiry": "...",
       "userId": "...",
       "fullName": "...",
       "email": "...",
       "profilePictureUrl": null,
       "roles": ["ProjectManager"],
       "permissions": ["PROJECT_VIEW", "PROJECT_CREATE", "TASK_EDIT"]
     }
     ```
   - UI impact: `Client/src/types.ts` and `Client/src/auth.tsx` already include permissions, but all feature pages must consistently use permission codes for create/edit/delete visibility.

3. Password hashing was hardened.
   - Backend files: `PMWDS.API/Controllers/AuthController.cs`.
   - API impact: no UI contract change for login forms, but failed login behavior is stricter because fallback passwords were removed.
   - UI impact: login error text in `Client/src/pages/login/login.tsx` and `Client/src/pages/login/LoginSidebar.tsx` should not imply default credentials.

4. Role scoping was cached per request.
   - Backend files: `PMWDS.API/Services/RoleScopeService.cs`.
   - API impact: organization, department, project, and user list endpoints return scoped records based on the current user.
   - UI impact: components should trust API scoping and avoid manually reimplementing security rules client-side. Client filtering can remain for UX only.

5. List endpoints now return paginated envelopes in many places.
   - Backend files: controllers for projects, tasks, users, departments, organizations, activity logs.
   - API response shape:
     ```json
     {
       "items": [],
       "page": 1,
       "pageSize": 10,
       "totalCount": 0,
       "totalPages": 0
     }
     ```
   - UI impact: `Client/src/api.ts` currently unwraps list envelopes through `requestList<T>()`, but pages that need pagination controls must call a new helper returning the full envelope.

6. Role-specific page-size settings were added.
   - Backend files: `PMWDS.Domain/Entities/Role.cs`, `PMWDS.Persistence/Configurations/RoleConfiguration.cs`, migration `AddRolePaginationPageSize`, `PMWDS.API/Controllers/RolesController.cs`.
   - API impact: role records include `paginationPageSize`.
   - UI impact: role management must add page-size controls to create/edit roles and display the configured value in role tables.

7. Consolidated role-scoped page data API was added.
   - Backend files: `PMWDS.API/Controllers/PagesController.cs`, `PMWDS.Application/DTOs/Pages/PagesDataDto.cs`.
   - Endpoint: `GET /api/v1/pages?page=1&pageSize=10`.
   - Behavior: returns role-specific data for the logged-in user. If the user's configured page size is `10`, the endpoint returns `20` records per section.
   - UI impact: dashboard and shell-level data loading can be reduced from many parallel GET calls to one `api.getPagesData(...)` call.

8. Activity log responses now include resolved names.
   - Backend files: `PMWDS.API/Controllers/ActivityLogsController.cs`, activity log helper methods.
   - API impact: activity logs include fields such as `userName`, `projectName`, and resolved metadata values instead of only raw ids.
   - UI impact: activity UI should render resolved names first and keep raw metadata only in advanced/details views.

9. `ProjectDto.ProjectManagerName` is now resolved.
   - Backend files: `PMWDS.Application/DTOs/Projects/ProjectDto.cs`, `PMWDS.API/Controllers/ProjectsController.cs`, project command/query handlers.
   - API impact: project records can return `projectManagerName`.
   - UI impact: project cards, boards, forms, reports, AI pages, and dashboards should show `projectManagerName` instead of doing local user lookup where possible.

10. SQLite compatibility was updated for new columns.
    - Backend file: `PMWDS.API/Services/DatabaseConnectionService.cs`.
    - UI impact: no direct UI contract change.

11. AI tests were updated for the current backend API shape.
    - Backend test file: `PMWDS.AI.Tests/OpenAICompatibleChatEngineTests.cs`.
    - UI impact: no direct UI contract change.

## React App Integration Changes Needed

1. Add shared paginated response types.
   - File: `Client/src/types.ts`.
   - Add:
     ```ts
     export interface PaginatedResponse<T> {
       items: T[];
       page: number;
       pageSize: number;
       totalCount: number;
       totalPages: number;
     }
     ```
   - Reason: the backend returns pagination metadata. Current `requestList<T>()` discards it.

2. Add `PagesDataResponse` and page-specific DTO types.
   - File: `Client/src/types.ts`.
   - Add interfaces matching `PMWDS.Application/DTOs/Pages/PagesDataDto.cs`:
     - `PagesDataResponse`
     - `PageOrganization`
     - `PageDepartment`
     - `PageRole`
     - `PagePermission`
     - `PageNotificationTemplate`
     - `PageAlertRule`
     - `PageSkill`
     - `PageReport`
     - `PageIntegration`
     - `PageKnowledgeArticle`
     - `PageLessonLearned`
     - `PageActivityLog`
   - Important fields:
     - `userPageSize`
     - `returnedPageSize`
     - `currentUser`
     - `organizations.items`
     - `departments.items`
     - `projects.items`
     - `tasks.items`
     - `subtasks.items`
     - `activityLogs.items`

3. Add a full-envelope request helper.
   - File: `Client/src/api.ts`.
   - Keep `requestList<T>()` for existing screens.
   - Add a helper such as:
     ```ts
     async function requestPage<T>(path: string, options: ApiOptions = {}): Promise<PaginatedResponse<T>> {
       return request<PaginatedResponse<T>>(path, options);
     }
     ```
   - Reason: list screens need total counts and page count.

4. Add `api.getPagesData`.
   - File: `Client/src/api.ts`.
   - Add:
     ```ts
     getPagesData(token: string, page = 1, pageSize?: number) {
       return request<PagesDataResponse>("pages", {
         token,
         query: { page, pageSize },
       });
     }
     ```
   - Data source: `GET /api/v1/pages`.
   - Use this on dashboard and optionally as a prefetch/bootstrap source for other pages.

5. Add page-size support to list APIs.
   - File: `Client/src/api.ts`.
   - Update list methods to accept `{ page?: number; pageSize?: number }`, not only feature filters:
     - `getProjects`
     - `getMyTasks`
     - `getOverdueTasks`
     - `getEscalatedTasks`
     - `getUsers`
     - `getDepartments`
     - `getOrganizations`
     - `getActivityLogs`
   - Reason: backend supports pagination, and role page-size settings should be reflected in UI controls.

6. Add a reusable pagination control.
   - Suggested file: `Client/src/pages/shared/PaginationControls.tsx`.
   - Inputs:
     - `page`
     - `pageSize`
     - `totalCount`
     - `totalPages`
     - `allowedSizes={[10, 20, 30, 50, 100]}`
     - optional custom page size input
   - Use this in list pages instead of local slicing.

7. Update dashboard data loading to use consolidated pages API.
   - File: `Client/src/pages/dashboard/dashboard.tsx`.
   - Replace most `Promise.allSettled` calls with `api.getPagesData(auth.token)`.
   - Mapping:
     - `pages.tasks.items` and `pages.subtasks.items` -> task boards and performance panels.
     - `pages.notifications.items` -> `NotificationList`.
     - `pages.departments.items` -> workload calculations.
     - `pages.users.items` -> workload and task detail user lookups.
     - `pages.projects.items` -> project lookup for task detail.
     - `pages.milestones.items` -> milestone lookup for task detail.
   - Keep `api.getDashboard(auth.token)` only if the KPI-specific project dashboard response still contains fields not present in `/pages`.

8. Update dashboard task detail modal to include subtasks from consolidated data.
   - File: `Client/src/pages/dashboard/dashboard.tsx`.
   - Components:
     - `Client/src/pages/tasks/TaskDetail.tsx`
     - `Client/src/pages/shared/dashboard/TaskProgressBoards2.tsx`
     - `Client/src/pages/shared/dashboard/TaskPerformance.tsx`
   - Data change:
     - Use `pages.subtasks.items.filter(item => item.parentTaskId === selectedTask.id)` when `selectedTask.subTasks` is empty.
   - Permission change:
     - `canEditTasks` should use `hasPermission("TASK_EDIT", "TASK_ASSIGN", "SUBTASK_EDIT")`.

9. Update `TaskStats` to support combined task and subtask counts.
   - File: `Client/src/pages/shared/dashboard/TaskStats.tsx`.
   - Current input: `tasks?: Task[]`.
   - Needed behavior: pass `pages.tasks.items.concat(pages.subtasks.items)` or add separate `subtasks` prop.
   - Reason: `/pages` returns root tasks and subtasks separately.

10. Update `TaskProgressBoards2` to use backend project names.
    - File: `Client/src/pages/shared/dashboard/TaskProgressBoards2.tsx`.
    - Data field: `task.projectName`.
    - Behavior: no local project map needed if using `/pages.tasks.items`.
    - On click:
      - `onViewTask(task)` should open `TaskDetail`.
      - `onEditTask(task)` should open `TaskFormModal` only when permission allows.

11. Update `TaskPerformance` to use permission-based edit action.
    - File: `Client/src/pages/shared/dashboard/TaskPerformance.tsx`.
    - Current prop: `canEdit`.
    - Required source:
      - `hasPermission("TASK_EDIT", "TASK_ASSIGN")`
      - include `SUBTASK_EDIT` for subtasks.
    - Reason: role names are no longer the authorization source.

12. Update project list and board pages for `projectManagerName`.
    - Files:
      - `Client/src/pages/projects/projects.tsx`
      - `Client/src/pages/projects/components/ProjectsBoard.tsx`
      - `Client/src/pages/projects/components/ProjectCard.tsx`
      - `Client/src/pages/projects/components/ProjectDetailPane.tsx`
    - Data change:
      - Use `project.projectManagerName` directly.
      - Keep local user lookup only as fallback.
    - Flow impact:
      - Project still belongs to a department through `departmentId`.

13. Add role pagination page-size fields to role types.
    - File: `Client/src/types.ts`.
    - Update `RoleRecord`:
      ```ts
      paginationPageSize: number;
      ```
    - If using consolidated pages role DTO, note that `PageRole` returns `permissionCodes: string[]`, while `RoleRecord` from `/roles` returns `permissions: PermissionRecord[]`.

14. Add role page-size controls to role modal.
    - File: `Client/src/pages/roles/RoleFormModal.tsx`.
    - Add select options:
      - `10`
      - `20`
      - `30`
      - `50`
      - `100`
      - custom numeric value
    - Payload field:
      - `paginationPageSize`
    - API endpoints:
      - `POST /api/v1/roles`
      - `PUT /api/v1/roles/{id}`

15. Display role page size in roles table.
    - File: `Client/src/pages/roles/RolesTable.tsx`.
    - Add a column or secondary text:
      - `Page size: {role.paginationPageSize}`
    - Reason: admins need to see per-role pagination settings.

16. Update all create/edit/delete button gates to permission codes.
    - Files:
      - `Client/src/pages/projects/projects.tsx`
      - `Client/src/pages/projects/components/CreateProjectModal.tsx`
      - `Client/src/pages/projects/components/EditProjectModal.tsx`
      - `Client/src/pages/departments/DepartmentsPage.tsx`
      - `Client/src/pages/organisations/OrganizationStructurePage.tsx`
      - `Client/src/pages/tasks/tasks.tsx`
      - `Client/src/pages/milestones/MilestonesPage.tsx`
      - `Client/src/pages/users/users.tsx`
      - `Client/src/pages/roles/RolesPage.tsx`
      - `Client/src/pages/notifications/notifications.tsx`
      - `Client/src/pages/reports/reports.tsx`
      - `Client/src/pages/skills/SkillsPage.tsx`
    - Replace role-only checks with:
      - organizations: `ORGANIZATION_CREATE`, `ORGANIZATION_EDIT`, `ORGANIZATION_DELETE`
      - departments: `DEPARTMENT_CREATE`, `DEPARTMENT_EDIT`, `DEPARTMENT_DELETE`
      - projects: `PROJECT_CREATE`, `PROJECT_EDIT`, `PROJECT_DELETE`
      - milestones: `MILESTONE_CREATE`, `MILESTONE_EDIT`, `MILESTONE_DELETE`
      - tasks: `TASK_CREATE`, `TASK_EDIT`, `TASK_DELETE`, `TASK_ASSIGN`
      - subtasks: `SUBTASK_CREATE`, `SUBTASK_EDIT`, `SUBTASK_DELETE`
      - users: `USER_CREATE`, `USER_EDIT`, `USER_DELETE`, `USER_DEPARTMENT_MANAGE`
      - roles: `ROLE_CREATE`, `ROLE_EDIT`, `ROLE_DELETE`
      - permissions: `PERMISSION_CREATE`, `PERMISSION_EDIT`, `PERMISSION_DELETE`

17. Update `RoleGate` to support permissions.
    - File: `Client/src/pages/shared/RoleGate.tsx`.
    - Add props:
      - `permissions?: string[]`
      - `requireAllPermissions?: boolean`
    - Use `useAuth().hasPermission`.
    - Reason: the component name can remain, but it must support permission-aware rendering.

18. Update navigation visibility.
    - File: `Client/src/layout.tsx`.
    - Current navigation uses role arrays.
    - Add permission checks for sections:
      - organizations -> `ORGANIZATION_VIEW`
      - departments -> `DEPARTMENT_VIEW`
      - projects -> `PROJECT_VIEW`
      - milestones -> `MILESTONE_VIEW`
      - tasks -> `TASK_VIEW`
      - roles -> `ROLE_VIEW` or `PERMISSION_VIEW`
      - activity -> `ACTIVITY_LOG_VIEW`
      - reports -> `REPORT_VIEW`
      - AI -> `AI_VIEW`
    - Keep role checks only for backwards-compatible fallback.

19. Update activity log types.
    - File: `Client/src/types.ts`.
    - Ensure `ActivityLogRecord` includes:
      - `userName?: string | null`
      - `projectName?: string | null`
      - `resolvedEntities?: Record<string, unknown>`
      - `metadata: Record<string, unknown>`
    - Reason: backend now sends resolved values for display.

20. Update activity list rendering.
    - Files:
      - `Client/src/pages/activity/ActivityLogsPage.tsx`
      - `Client/src/pages/activity/ActivityList.tsx`
      - `Client/src/pages/activity/ActivityFilters.tsx`
    - UI behavior:
      - Show `userName` instead of user id.
      - Show `projectName` instead of project id.
      - Show resolved organization, department, task, and user names from `resolvedEntities` when present.
      - Keep raw metadata in the "View metadata" panel.

21. Add pagination to activity logs.
    - Files:
      - `Client/src/api.ts`
      - `Client/src/pages/activity/ActivityLogsPage.tsx`
    - API:
      - `GET /api/v1/activitylogs?page=1&pageSize=10`
    - Use full `PaginatedResponse<ActivityLogRecord>`.

22. Update organization screens for paginated data.
    - Files:
      - `Client/src/pages/organisations/OrganizationStructurePage.tsx`
      - `Client/src/pages/organisations/OrganizationList.tsx`
      - `Client/src/pages/organisations/OrganizationDetail.tsx`
      - `Client/src/pages/organisations/DepartmentListView.tsx`
      - `Client/src/pages/shared/OrgFormModal.tsx`
      - `Client/src/pages/shared/DeptFormModal.tsx`
    - Existing flow remains department-first under organizations.
    - Use:
      - `GET /api/v1/organizations`
      - `GET /api/v1/departments`
      - or `GET /api/v1/pages` for first-screen bootstrap.

23. Update department screens for role-scoped data.
    - Files:
      - `Client/src/pages/departments/DepartmentsPage.tsx`
      - `Client/src/pages/departments/DepartmentList.tsx`
      - `Client/src/pages/departments/DepartmentDetailCard.tsx`
      - `Client/src/pages/shared/OrganizationDepartmentFilter.tsx`
    - Data:
      - `department.organizationId`
      - `department.departmentHeadUserId`
      - `department.maxCapacity`
    - Permission gates:
      - create/edit/delete must use department permission codes.

24. Update project create/edit modals to keep pmwdsS flow.
    - Files:
      - `Client/src/pages/projects/components/CreateProjectModal.tsx`
      - `Client/src/pages/projects/components/EditProjectModal.tsx`
    - Required fields:
      - `departmentId` remains required.
      - `projectManagerId` remains required.
    - UI dependency:
      - project department selector should remain visible and required.
      - organization selector filters departments only; organization is not submitted as project parent in pmwdsS.

25. Update task form project and milestone selectors.
    - File: `Client/src/pages/tasks/TaskFormModal.tsx`.
    - Data:
      - `projectId`
      - `milestoneId`
      - `parentTaskId`
    - API:
      - create task: `POST /api/v1/tasks`
      - create subtask: `POST /api/v1/tasks/{parentTaskId}/subtasks`
    - Permission:
      - root task create -> `TASK_CREATE`
      - subtask create -> `SUBTASK_CREATE`

26. Update milestones page for paginated project data.
    - Files:
      - `Client/src/pages/milestones/MilestonesPage.tsx`
      - `Client/src/pages/milestones/MilestoneFormModal.tsx`
      - `Client/src/pages/shared/MilestonesTab.tsx`
    - Flow:
      - milestones remain children of projects.
    - API:
      - `GET /api/v1/milestones/by-project/{projectId}`
      - `POST /api/v1/milestones`
      - `PUT /api/v1/milestones/{id}`

27. Update AI and report pages to use scoped data from `/pages`.
    - Files:
      - `Client/src/pages/ai/ai.tsx`
      - `Client/src/pages/ai/ProjectList.tsx`
      - `Client/src/pages/ai/TimelinePredictions.tsx`
      - `Client/src/pages/reports/reports.tsx`
      - `Client/src/pages/reports/ReportFilters.tsx`
    - Current logic filters projects by department and organization.
    - In pmwdsS this remains valid:
      - organization -> departments
      - departments -> projects
    - Use scoped `pages.projects.items` and `pages.departments.items` to reduce duplicate GET calls.

28. Update notification admin screens for permission gates.
    - Files:
      - `Client/src/pages/notifications/notifications.tsx`
      - `Client/src/pages/notifications/NotificationTemplates.tsx`
      - `Client/src/pages/notifications/NotificationRules.tsx`
      - `Client/src/pages/notifications/BroadcastModal.tsx`
    - Permissions:
      - inbox -> `NOTIFICATION_VIEW`
      - broadcast -> `NOTIFICATION_BROADCAST`
      - templates -> `NOTIFICATION_TEMPLATE_MANAGE`
      - rules -> `NOTIFICATION_RULE_MANAGE`

29. Add a page-size setting UX for admins.
    - Files:
      - `Client/src/pages/roles/RoleFormModal.tsx`
      - optionally `Client/src/pages/settings/settings.tsx`
    - Source of truth:
      - role setting from `/roles`, not local storage.
    - Behavior:
      - when the current user has several roles, backend uses the largest configured page size.

30. Make error handling understand permission denials.
    - File: `Client/src/api.ts`.
    - Current request helper throws a generic `Error`.
    - Add optional structured error support:
      - status `401` -> route to login/logout.
      - status `403` -> show "You do not have permission for this action."
    - Reason: permission-based policies will produce more accurate forbidden responses.

31. Keep `client/src/old` untouched.
    - Do not update imports, selectors, knowledge pages, or components under `Client/src/old`.
    - Build new integration through current `Client/src/pages`, `Client/src/api.ts`, `Client/src/types.ts`, `Client/src/auth.tsx`, and shared components.

## Suggested First UI Implementation Order

1. Update `Client/src/types.ts` for permissions, pagination, role page size, activity names, and pages response.
2. Update `Client/src/api.ts` with `requestPage`, pagination query arguments, and `getPagesData`.
3. Update `Client/src/auth.tsx`, `Client/src/pages/shared/RoleGate.tsx`, and `Client/src/layout.tsx` for permission-first rendering.
4. Update `Client/src/pages/roles/*` for role page-size management.
5. Update `Client/src/pages/dashboard/dashboard.tsx` to use `GET /api/v1/pages`.
6. Update task dashboard components:
   - `Client/src/pages/shared/dashboard/TaskStats.tsx`
   - `Client/src/pages/shared/dashboard/TaskProgressBoards2.tsx`
   - `Client/src/pages/shared/dashboard/TaskPerformance.tsx`
7. Add reusable `Client/src/pages/shared/PaginationControls.tsx` and apply it to list pages.
8. Update activity logs to show resolved values.
9. Update projects/departments/organizations pages while preserving the pmwdsS hierarchy.
