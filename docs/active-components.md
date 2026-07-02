# Active Components & Unused Components

## Active Routes

| Route | Page Component | File |
|-------|---------------|------|
| `/` (Dashboard) | `DashboardPage` | `pages/dashboard/dashboard.tsx` |
| `/projectsK` | `ProjectsKPage` | `pages/projectsK/projectsK.tsx` |
| `/notificationsPage` | `NotificationsPage` | `pages/notifications/notifications.tsx` |
| `/organizationStructure` | `OrganizationStructurePage` | `pages/organisations/OrganizationStructurePage.tsx` |
| `/departmentsPage` | `DepartmentsPage` | `pages/departments/DepartmentsPage.tsx` |
| `/users` | `UsersPage` | `pages/users/users.tsx` |
| `/profiles` | `ProfilesPage` | `pages/profiles/ProfilesPage.tsx` |
| `/skills` | `SkillsPage` | `pages/skills/SkillsPage.tsx` |
| `/reports` | `ReportsPage` | `pages/reports/reports.tsx` |
| `/ai` | `AIPage` | `pages/ai/ai.tsx` |
| `/roles` | `RolesPage` | `pages/roles/RolesPage.tsx` |
| `/activity-logs` | `ActivityLogsPage` | `pages/activity/ActivityLogsPage.tsx` |
| `/settings` | `SettingsPage` | `pages/settings/settings.tsx` |
| `/projects/:projectId/tasks` | `ProjectTasksPage` | `pages/nested/ProjectTasksPage.tsx` |
| `/projects/:projectId/milestones` | `ProjectMilestonesPage` | `pages/nested/ProjectMilestonesPage.tsx` |
| `/new-project` | `NewProjectPage` | `pages/NewProject/NewProjectPage.tsx` |
| `/login` | `LoginPage` | `pages/login/login.tsx` |
| `/projects/:projectId/*` | `ProjectNotFound` | `pages/nested/ProjectNotFound.tsx` |

**Layout-level components**: `Avatar`, `BgRenderer`, `NavHeaderProvider`, `NavHeader`, `NavActionButton`, `SearchBar`, `ProjectsGroup`, `usePermission`, `PERMISSION_GROUPS`

---

## USED Components

### `pages/shared/` — Used

| Component | Used By |
|-----------|---------|
| `AnimatedBackground` | ProjectsKPage, NotificationsPage, OrgStructurePage, DepartmentsPage, UsersPage, ProfilesPage, SkillsPage, ReportsPage, AIPage, RolesPage, ActivityLogsPage, SettingsPage, NewProjectPage, ProjectTasksPage, ProjectMilestonesPage |
| `Avatar` | Layout (sidebar) |
| `AvatarStack` | TaskEditModal → used by DashboardPage |
| `Avatark` | ProjectInfoCard, ProjectBasicDetails, Tasksubcard, TaskSubtaskCard |
| `AvatarStackk` | Tasksubcard, TaskSubtaskCard |
| `BgControls` | SettingsPage |
| `BgRenderer` | Layout, AIPage, ProjectTasksPage, ProjectMilestonesPage |
| `Can` | ActivityLogsPage, App.tsx |
| `CustomDropdown` | ProjectsKPage |
| `DeleteConfirmationModal` | NotificationsPage, OrgStructurePage, DepartmentsPage, UsersPage, SkillsPage, RolesPage, ProjectTasksPage, ProjectMilestonesPage |
| `DeptFormModal` | OrgStructurePage, DepartmentsPage |
| `GlassCard` | OrgStructurePage, DepartmentsPage, ProfilesPage, SkillsPage, AIPage, RolesPage, ActivityLogsPage, NewProjectPage, ProjectTasksPage, ProjectMilestonesPage |
| `GradientButton` | ActivityLogsPage, ProjectMilestonesPage |
| `InfoTile` | OrganizationDetail |
| `InputF` | OrgFormModal, DeptFormModal |
| `LoadingPage` | ProjectsKPage, NotificationsPage, OrgStructurePage, DepartmentsPage, ProfilesPage, SkillsPage, ReportsPage, AIPage, RolesPage, ActivityLogsPage, SettingsPage, NewProjectPage, ProjectTasksPage, ProjectMilestonesPage |
| `MessageBanner` | OrgStructurePage, DepartmentsPage, UsersPage, ProfilesPage, SkillsPage, ReportsPage, RolesPage, ActivityLogsPage, SettingsPage |
| `MilestonesTab` | ProjectDetailk → used by ProjectsKPage |
| `ModalOverlay` | NotificationsPage, OrgStructurePage, DepartmentsPage, ProfilesPage, SkillsPage, RolesPage, ProjectFormModal |
| `NavHeaderProvider` | Layout |
| `NavHeader` | Layout |
| `NavActionButton` | Layout |
| `NoAccessPage` | App.tsx (route fallback) |
| `NotificationList` | DashboardPage |
| `OrganizationDepartmentFilter` | ReportsPage, AIPage |
| `OrgFormModal` | OrgStructurePage |
| `OverallProgressRing` | AIInsightsSection → used by ProjectDetailk, ProjectDetailModal |
| `PageSkeleton` | DashboardPage, UsersPage |
| `PERMISSION_GROUPS` | Layout + every active page |
| `usePermission` | Layout + every active page |
| `PriorityBadge` | TaskEditModal, TaskHeaderCard |
| `ProfilePictureUploader` | ProfileDetail, UsersTable, ProfileSettings |
| `ScopedUserSelect` | ProjectFormModal, TaskFormModal, SubtaskFormModal |
| `SearchBar` | Layout |
| `SelectF` | DeptFormModal |
| `Skeleton` | Used internally by PageSkeleton |
| `StatCard` (shared) | UsersPage, RolesPage, ActivityLogsPage |
| `StatusBadge` (from `StatusBadge.tsx`) | SubtasksSection, TaskDetailPanel (unused), MilestonesTab |
| `StatusBadgeMinimal` | TaskEditModal, TaskHeaderCard |
| `TabButton` (shared) | UsersPage, RolesPage, SettingsPage |
| `ToastProvider` / `useToast` | DashboardPage, ProjectsKPage, ProfilesPage, NewProjectPage, ProjectTasksPage, ProjectMilestonesPage |
| `useUserOrganization` | DashboardPage, ProjectsKPage, DepartmentsPage, NewProjectPage |
| `WorkloadBars` | DashboardPage |
| `getProjectDepartmentIds` | ProjectsKPage, ReportsPage, AIPage |
| `projectBelongsToDepartment` | ProjectsKPage, ReportsPage, AIPage |
| `projectBelongsToAnyDepartment` | ProjectsKPage |
| `getProjectDepartments` | Exported from index, used internally |
| `getStatusColor` | ProjectsGroup, ProjectTasksPage, ProjectMilestonesPage |
| `RoutePermissionGuard` | App.tsx |

### `pages/shared/dash/` — Used

| Component | Used By |
|-----------|---------|
| `Activity` | DashboardPage |
| `HighRiskInterventions` | DashboardPage |
| `ProjectOverviewChart` (as `ProjectOverview`) | DashboardPage |
| `TaskStats` | DashboardPage |
| `TaskPerformanceTable` | DashboardPage |
| `Timer` | DashboardPage |
| `TaskSubtaskBoard` | ProjectTasksPage |

### `pages/shared/modals/` — Used

| Component | Used By |
|-----------|---------|
| `TaskEditModal` | DashboardPage |
| `SubtaskEditModal` | Tasksubcard → ProjectMilestonesPage, TaskSubtaskCard |

### Page-specific components used cross-page

| Component | Defined In | Used By |
|-----------|-----------|---------|
| `ProjectFormModal` | `projectsK/components/` | DashboardPage, ProjectsKPage, ProjectTasksPage, ProjectMilestonesPage |
| `ConfirmDeleteModal` | `projectsK/components/` | ProjectsKPage, ProjectTasksPage, ProjectMilestonesPage |
| `ProjectDetailModal` | `projectsK/components/` | ProjectsKPage, ProjectTasksPage, ProjectMilestonesPage |
| `ProjectDetailk` | `projectsK/components/` | ProjectsKPage |
| `ProjectSidebar` | `projectsK/components/` | ProjectsKPage |
| `MilestoneDetailModal` | `projectsK/components/` | ProjectTasksPage, ProjectMilestonesPage |
| `MilestoneFormModal` | `projectsK/components/` | ProjectTasksPage, ProjectMilestonesPage |
| `MilestonesPanel` | `projectsK/components/` | ProjectMilestonesPage |
| `TaskFormModal` | `projectsK/components/` | ProjectTasksPage, ProjectMilestonesPage |
| `TaskSubtaskCard` | `projectsK/components/` | ProjectMilestonesPage |
| `TaskSubtaskDetailsModal` | `projectsK/components/` | ProjectTasksPage, ProjectMilestonesPage |
| `Tasksubcard` | `projectsK/components/` | ProjectMilestonesPage |
| `TaskCard` | `projectsK/components/` | MilestoneDetailk, MilestoneDetailModal, MilestonesPanel |
| `MilestoneCard` | `projectsK/components/` | MilestonesPanel |
| `MilestoneDetailk` | `projectsK/components/` | MilestonesPanel |
| `ProjectBasicDetails` | `projectsK/components/` | ProjectDetailk, ProjectDetailModal |
| `SubtaskFormModal` | `projectsK/components/` | TaskSubtaskCard, Tasksubcard |
| `DashboardStats` | `dashboard/dashbaordStats` | DashboardPage, ProjectsKPage |
| `ActiveObjectives` | `dashboard/` | DashboardPage |
| `UserFormModal` | `NewProject/components/` | UsersPage, DepartmentDetailCard |
| `DepartmentUsersModal` | `NewProject/components/` | DepartmentDetailCard, UsersStep (NewProjectPage) |
| `useProjectWorkspace` | `nested/` | ProjectTasksPage, ProjectMilestonesPage |
| `ProjectInfoCard` | `nested/` | ProjectTasksPage, ProjectMilestonesPage |

---

## DELETED — Removed from codebase

### Entire page directories (routes removed from App.tsx + files deleted)

| Directory | Reason |
|-----------|--------|
| `pages/projects/` | Commented-out in sidebar; route removed |
| `pages/milestones/` | Commented-out in sidebar; route removed |
| `pages/tasks/` | Commented-out in sidebar; route removed |
| `pages/temp/` (TestPage) | Only used for testing; route removed |

### Unused shared component files deleted

| File | Reason |
|------|--------|
| `pages/shared/FilterButtons.tsx` | Not imported by any active page |
| `pages/shared/PageHeader.tsx` | Not imported anywhere (NavHeader used instead) |
| `pages/shared/SimpleProjectList.tsx` | Not imported anywhere |
| `pages/shared/TaskList.tsx` | Not imported anywhere |
| `pages/shared/StatusBadgeK.tsx` | Only used by deleted tasks pages |
| `pages/shared/dash/ActivityCompact.tsx` | Not imported |
| `pages/shared/dash/HighRiskInterventionsCompact.tsx` | Not imported |
| `pages/shared/dash/TaskBoard.tsx` | Not imported |
| `pages/shared/dash/TaskPerformance.tsx` | Not imported |
| `pages/shared/dash/TaskProgressBoard.tsx` | Not imported |
| `pages/shared/dash/TaskProgressBoards2.tsx` | Not imported |

### Unused projectsK/components/ files deleted

| File | Reason |
|------|--------|
| `KanbanFilters.tsx` | Not imported |
| `OrgDeptFilterK.tsx` | Not imported |
| `ProjectCardK.tsx` | Only used by deleted projects page |
| `TaskDetailModal.tsx` | Not imported by any active page |
| `TaskDetailPanel.tsx` | Only used by deleted TaskDetailModal |
| `TasksKanbanBoard.tsx` | Not imported |
| `ViewTabs.tsx` | Not imported |
| `WorkspaceStats.tsx` | Not imported |

### Unused exports removed from barrel files

| File | Removed Export |
|------|---------------|
| `pages/shared/index.ts` | `FilterButtons`, `InfoTile` (file kept, direct-imported), `MilestonesTab` (file kept, direct-imported), `OverallProgressRing` (added back), `SimpleProjectList`, `TaskList`, `StatusButtons`, `PriorityButtons` |
| `projectsK/components/index.ts` | `WorkspaceStats`, `ViewTabs`, `TasksKanbanBoard`, `TaskDetailPanel`, `TaskDetailModal`, `ProjectCardK` |

---

## Components That REMAIN Unused in Codebase (not deleted — need review)

| Component | File | Notes |
|-----------|------|-------|
| `RoleGate` | `pages/shared/RoleGate.tsx` | `usePermission` hook is used instead; component itself unused |
| `StatusButtons` | `pages/shared/StatusBadge.tsx` | Only `StatusBadge` is used by active pages |
| `PriorityButtons` | `pages/shared/PriorityBadge.tsx` | Only `PriorityBadge` is used |
| `StatusButtonsMin` | `pages/shared/StatusBadgeMininmal.tsx` | Only `StatusBadgeMinimal` is used |
| `DeptFormModal` (NewProject) | `NewProject/components/DeptFormModal.tsx` | Duplicate of shared version |
| `OrgFormModal` (NewProject) | `NewProject/components/OrgFormModal.tsx` | Duplicate of shared version |
| `RegisterUserForm` | `users/` | Not imported |
| `UserDepartmentManager` | `users/` | Not imported |
| `WorkloadView` | `users/` | Not imported |
| `kpiCard` | `dashboard/` | Not imported |
| `Badge` | `organisations/` | Not imported |
| `DepartmentCard` | `organisations/` | Not imported |
| `DepartmentDetailCard` (orgs) | `organisations/` | Not imported |
| `DepartmentListView` | `organisations/` | Not imported |
| `DetailRow` | `organisations/` | Not imported |
| `OrganizationCard` | `organisations/` | Not imported |
| `OrganizationDetailCard` | `organisations/` | Not imported |
| `ProgressBar` | `organisations/` | Not imported |
| `StatCard` (orgs) | `organisations/StatCard.tsx` | Local StatCard, not imported |

---

## Summary of Changes

- **Active pages**: 17 (removed `/test-page`, `/projects`, `/milestonesPage`, `/tasks`)
- **Entire page directories deleted**: 4 (`projects/`, `milestones/`, `tasks/`, `temp/`)
- **Shared component files deleted**: 12
- **projectsK component files deleted**: 8
- **Barrel export cleanups**: 12 unused exports removed
- **Build status**: ✅ Passes cleanly
