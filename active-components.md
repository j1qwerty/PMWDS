# Active Components & Unused Components

## Active Routes (from sidebar `layout.tsx` + dynamic routes)

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
| `/test-page` | `TestPage` | `pages/temp/TestPage.tsx` |
| `/projects/:projectId/*` | `ProjectNotFound` | `pages/nested/ProjectNotFound.tsx` |

**Layout-level components** (used in `layout.tsx`): `Avatar`, `BgRenderer`, `NavHeaderProvider`, `NavHeader`, `NavActionButton`, `SearchBar`, `ProjectsGroup`, `usePermission`, `PERMISSION_GROUPS`

---

## USED Components

### `pages/shared/` — Used

| Component | Used By |
|-----------|---------|
| `AnimatedBackground` | ProjectsKPage, NotificationsPage, OrgStructurePage, DepartmentsPage, UsersPage, ProfilesPage, SkillsPage, ReportsPage, AIPage, RolesPage, ActivityLogsPage, SettingsPage, NewProjectPage, ProjectTasksPage, ProjectMilestonesPage |
| `Avatar` | Layout (sidebar) |
| `AvatarStack` | TaskEditModal → used by DashboardPage |
| `BgControls` | SettingsPage |
| `BgRenderer` | Layout, AIPage, ProjectTasksPage, ProjectMilestonesPage |
| `Can` | ActivityLogsPage, App.tsx |
| `CustomDropdown` | ProjectsKPage |
| `DeleteConfirmationModal` | NotificationsPage, OrgStructurePage, DepartmentsPage, UsersPage, SkillsPage, RolesPage, ProjectTasksPage, ProjectMilestonesPage |
| `DeptFormModal` | OrgStructurePage, DepartmentsPage |
| `GlassCard` | OrgStructurePage, DepartmentsPage, ProfilesPage, SkillsPage, AIPage, RolesPage, ActivityLogsPage, NewProjectPage, ProjectTasksPage, ProjectMilestonesPage |
| `GradientButton` | ActivityLogsPage, ProjectMilestonesPage |
| `InputF` | Used by OrgFormModal, DeptFormModal (which are used) |
| `LoadingPage` | ProjectsKPage, NotificationsPage, OrgStructurePage, DepartmentsPage, ProfilesPage, SkillsPage, ReportsPage, AIPage, RolesPage, ActivityLogsPage, SettingsPage, NewProjectPage, ProjectTasksPage, ProjectMilestonesPage |
| `MessageBanner` | OrgStructurePage, DepartmentsPage, UsersPage, ProfilesPage, SkillsPage, ReportsPage, RolesPage, ActivityLogsPage, SettingsPage |
| `ModalOverlay` | NotificationsPage, OrgStructurePage, DepartmentsPage, ProfilesPage, SkillsPage, RolesPage, ProjectFormModal (used in DashboardPage, ProjectsKPage) |
| `NavHeaderProvider` | Layout |
| `NavHeader` | Layout |
| `NavActionButton` | Layout |
| `NoAccessPage` | App.tsx (route fallback) |
| `NotificationList` | DashboardPage |
| `OrganizationDepartmentFilter` | ReportsPage, AIPage |
| `OrgFormModal` | OrgStructurePage |
| `PageSkeleton` | DashboardPage, UsersPage |
| `PERMISSION_GROUPS` | Layout + every active page |
| `usePermission` | Layout + every active page |
| `PriorityBadge` | TaskEditModal → used by DashboardPage |
| `ScopedUserSelect` | ProjectFormModal → used by DashboardPage, ProjectsKPage, ProjectTasksPage, ProjectMilestonesPage |
| `SearchBar` | Layout |
| `SelectF` | DeptFormModal → used by OrgStructurePage, DepartmentsPage |
| `Skeleton` | Used internally by PageSkeleton |
| `StatCard` (shared) | UsersPage, RolesPage, ActivityLogsPage |
| `StatusBadge` (from `StatusBadge.tsx`) | Used internally |
| `StatusBadgeMinimal` | TaskEditModal → used by DashboardPage |
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
| `ProjectOverviewChart` (exported as `ProjectOverview`) | DashboardPage |
| `TaskStats` | DashboardPage |
| `TaskPerformanceTable` | DashboardPage |
| `Timer` | DashboardPage |
| `TaskSubtaskBoard` | ProjectTasksPage |

### `pages/shared/modals/` — Used

| Component | Used By |
|-----------|---------|
| `TaskEditModal` | DashboardPage |

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
| `DashboardStats` | `dashboard/dashbaordStats` | DashboardPage, ProjectsKPage |
| `ActiveObjectives` | `dashboard/` | DashboardPage |
| `UserFormModal` | `NewProject/components/` | UsersPage |
| `useProjectWorkspace` | `nested/` | ProjectTasksPage, ProjectMilestonesPage |
| `ProjectInfoCard` | `nested/` | ProjectTasksPage, ProjectMilestonesPage |

---

## UNUSED Components

### `pages/shared/` — Unused (safe to remove)

| Component | File | Notes |
|-----------|------|-------|
| `Avatark` | `Avatark.tsx` | Duplicate of Avatar.tsx — not imported anywhere |
| `AvatarStackk` | `Avatark.tsx` | Duplicate of AvatarStack |
| `FilterButtons` | `FilterButtons.tsx` | Exported from index.ts but not imported by any active page or used sub-component |
| `InfoTile` | `InfoTile.tsx` | Exported from index.ts but not imported anywhere |
| `MilestonesTab` | `MilestonesTab.tsx` | Exported from index.ts but not imported anywhere |
| `OverallProgressRing` | `OverallProgressRing.tsx` | Exported from index.ts but not imported anywhere |
| `PageHeader` | `PageHeader.tsx` | Not used (NavHeader system used instead) |
| `PriorityButtons` | `PriorityBadge.tsx` | Only `PriorityBadge` is used; `PriorityButtons` is not imported |
| `ProfilePictureUploader` | `ProfilePictureUploader.tsx` | Not imported by any active page |
| `RoleGate` | `RoleGate.tsx` | `usePermission` hook is used instead of the `RoleGate` component |
| `SimpleProjectList` | `SimpleProjectList.tsx` | Not imported anywhere |
| `StatusBadgeK` | `StatusBadgeK.tsx` | Not imported (StatusBadge from StatusBadge.tsx is used) |
| `StatusButtonsK` | `StatusBadgeK.tsx` | Exported but not imported |
| `StatusButtonsMin` | `StatusBadgeMininmal.tsx` | Exported but not imported |
| `TaskList` | `TaskList.tsx` | Not imported anywhere |

### `pages/shared/dash/` — Unused (safe to remove)

| Component | File |
|-----------|------|
| `ActivityCompact` | `dash/ActivityCompact.tsx` |
| `HighRiskInterventionsCompact` | `dash/HighRiskInterventionsCompact.tsx` |
| `TaskBoard` | `dash/TaskBoard.tsx` |
| `TaskPerformance` | `dash/TaskPerformance.tsx` |
| `TaskProgressBoard` | `dash/TaskProgressBoard.tsx` |
| `TaskProgressBoards2` | `dash/TaskProgressBoards2.tsx` |

### `pages/shared/modals/` — Unused (safe to remove)

| Component | File |
|-----------|------|
| `SubtaskEditModal` | `modals/SubtaskEditModal.tsx` |

### Page-specific components — Unused or orphaned

| Component | File | Notes |
|-----------|------|-------|
| `CreateProjectModal` | `projects/components/` | ProjectsPage is commented out in sidebar, but App.tsx route exists → may still be accessible |
| `DeleteProjectModal` | `projects/components/` | Same as above |
| `DepartmentCards` | `projects/components/` | Same as above |
| `EditProjectModal` | `projects/components/` | Same as above |
| `ProjectCard` | `projects/components/` | Same as above |
| `ProjectDetailPane` | `projects/components/` | Same as above |
| `ProjectsBoard` | `projects/components/` | Same as above |
| `ProjectsBoardK` | `projects/components/` | Same as above |
| `MilestoneDetail` | `milestones/` | MilestonesPage is commented out in sidebar, route exists |
| `MilestoneFormModal` | `milestones/` | Same |
| `MilestoneList` | `milestones/` | Same |
| `MilestonesPage` | `milestones/` | Page itself is not in sidebar but route exists |
| `DependencyManagement` | `tasks/` | TasksPage is commented out in sidebar, route exists |
| `SubtaskUpdatePanel` | `tasks/` | Same |
| `TaskDetail` | `tasks/` | Same |
| `TaskFormModal` | `tasks/` | Same |
| `TasksPage` | `tasks/` | Page itself is not in sidebar but route exists |
| `TaskSubtaskDetails` | `tasks/` | Same |
| `ProjectsPage` | `projects/` | Page itself is not in sidebar but route exists |
| `DepartmentUsersModal` | `NewProject/components/` | Check if used — not imported by any active page directly |
| `DeptFormModal` (NewProject) | `NewProject/components/DeptFormModal.tsx` | Duplicate of shared DeptFormModal — not imported |
| `OrgFormModal` (NewProject) | `NewProject/components/OrgFormModal.tsx` | Duplicate of shared OrgFormModal — not imported |
| `KanbanFilters` | `projectsK/components/` | Not imported by any active page |
| `OrgDeptFilterK` | `projectsK/components/` | Not imported by any active page |
| `ProjectCard` | `projectsK/components/` | Not imported by any active page |
| `ProjectCardK` | `projectsK/components/` | Exported from index but not imported by active pages |
| `AIInsightsSection` | `projectsK/components/` | Exported from index but not imported by active pages |
| `DocumentsSection` | `projectsK/components/` | Exported from index but not imported by active pages |
| `Tasksubcard` | `projectsK/components/` | Not imported (likely a typo variant of TaskSubtaskCard) |
| `WorkspaceStats` | `projectsK/components/` | Exported from index but not imported by active pages |
| `ViewTabs` | `projectsK/components/` | Exported from index but not imported by active pages |
| `TaskCard` | `projectsK/components/` | Not imported by active pages |
| `TaskDetailPanel` | `projectsK/components/` | Exported from index but not imported by active pages |
| `TaskDetailModal` | `projectsK/components/` | Exported from index but not imported by active pages |
| `TasksKanbanBoard` | `projectsK/components/` | Exported from index but not imported by active pages |
| `MilestoneCard` | `projectsK/components/` | Not imported by active pages |
| `MilestoneDetailk` | `projectsK/components/` | Not imported by active pages |
| `ProjectBasicDetails` | `projectsK/components/` | Exported from index but not imported by active pages |
| `SubtaskFormModal` | `projectsK/components/` | Exported from index but not imported by active pages |
| `LoginSidebar` | `login/` | Only used internally by LoginPage — not unused per se |
| `RegisterUserForm` | `users/` | Not imported by any active page |
| `UserDepartmentManager` | `users/` | Not imported by any active page |
| `WorkloadView` | `users/` | Not imported by any active page |
| `kpiCard` | `dashboard/` | Not imported by active pages |
| `Badge` | `organisations/` | Not imported by active pages |
| `DepartmentCard` | `organisations/` | Not imported by active pages |
| `DepartmentDetailCard` (orgs) | `organisations/` | Not imported by active pages |
| `DepartmentListView` | `organisations/` | Not imported by active pages |
| `DetailRow` | `organisations/` | Not imported by active pages |
| `OrganizationCard` | `organisations/` | Not imported by active pages |
| `OrganizationDetailCard` | `organisations/` | Not imported by active pages |
| `ProgressBar` | `organisations/` | Not imported by active pages |
| `StatCard` (orgs) | `organisations/StatCard.tsx` | Local StatCard, not imported by active pages |

---

## Summary

- **Active pages**: 19 (including Layout-level, dynamic routes, login)
- **Used shared components**: ~45
- **Unused shared components** (safe to delete): 13
- **Unused dash components** (safe to delete): 6
- **Unused modal components** (safe to delete): 1
- **Unused page-specific components** (review needed): ~45+ (some may be used by commented-out pages still routed in App.tsx)
