# pmwdsA React UI Integration Changes

Backend branch: `pmwdsA`

New flow supported by API: organizations -> projects -> milestones -> tasks -> subtasks, plus organizations -> departments and projects -> assigned departments.

Compatibility rule: `departmentId` remains the primary/legacy department. `departmentIds` is the assigned department list. Sending one department keeps the old flow. Sending multiple departments enables the new flow.

1. `Client/src/types.ts`
   - Update `Project` with:
     - `departmentIds: string[]`
     - `departments: { departmentId: string; departmentName?: string | null; isPrimary: boolean }[]`
   - Update the Pages API `ProjectDto` type with the same fields.
   - Keep `departmentId` and `departmentName` because the backend still uses these as the primary department for backward compatibility.
   - Any UI code that currently checks only `project.departmentId` should be able to use `project.departmentIds` when filtering or showing assigned departments.

2. `Client/src/api.ts`
   - Keep `createProject()` and `updateProject()` paths unchanged.
   - Update project payload call sites to send:
     - `departmentId`: primary department ID
     - `departmentIds`: all selected department IDs, including the primary department
   - Keep existing `getProjects(token, { departmentId })` usage. The backend now matches projects where the selected department is either primary or assigned.

3. `Client/src/pages/projects/projects.tsx`
   - Extend local `form` state with `departmentIds: string[]`.
   - When creating a project, submit both `departmentId` and `departmentIds`.
   - When editing a project, initialize:
     - `departmentId` from `selectedProject.departmentId`
     - `departmentIds` from `selectedProject.departmentIds ?? [selectedProject.departmentId]`
   - Update project filtering:
     - Organization filter should match any project assigned department whose `organizationId` belongs to the selected organization.
     - Department filter should use `project.departmentIds?.includes(selectedDepartmentId)` and fall back to `project.departmentId === selectedDepartmentId`.
   - Update selected project summaries/cards to show all assigned departments, not only `departmentName`.

4. `Client/src/pages/projects/components/CreateProjectModal.tsx`
   - Extend `ProjectFormState` with `departmentIds: string[]`.
   - Replace the single department `<select>` with a multi-select or checkbox list.
   - Keep one primary department selector or infer primary from the first selected department.
   - On organization change, clear `departmentId`, `departmentIds`, and `projectManagerId`.
   - `ScopedUserSelect` should receive an organization derived from the selected departments. If multiple organizations are possible, filter users by any selected department organization.

5. `Client/src/pages/projects/components/EditProjectModal.tsx`
   - Mirror the create modal changes.
   - Preselect all assigned departments from `project.departmentIds`.
   - Keep `project.departmentId` selected as the primary department.
   - When the primary department is changed, ensure it is included in `departmentIds`.

6. `Client/src/pages/projects/components/ProjectsBoard.tsx`
   - Update grouping, counts, and department labels to support multiple assigned departments.
   - When filtering by a department, include projects where `project.departmentIds` contains that department.
   - When rendering a project card, show the primary department plus a compact count or list of additional departments.

7. `Client/src/pages/projects/components/ProjectCard.tsx`
   - Replace single `departmentName` display with:
     - primary department name from `project.departments.find(d => d.isPrimary)`
     - assigned department chips from `project.departments`
   - Fall back to `departmentName` if `departments` is missing.

8. `Client/src/pages/projects/components/ProjectDetailPane.tsx`
   - Add an assigned departments section using `project.departments`.
   - Keep primary department visible.
   - Any department-based metrics should aggregate over all assigned departments where possible.

9. `Client/src/pages/projects/components/DepartmentCards.tsx`
   - Update project counts to include projects assigned to the department through `project.departmentIds`.
   - Fall back to `project.departmentId` for older responses.

10. `Client/src/pages/projectsK/projectsK.tsx`
    - Extend `emptyProjectForm()` with `departmentIds: []`.
    - Update project create/edit submit payloads to include `departmentIds`.
    - Update `filteredProjects` organization and department filtering to check all assigned department IDs.
    - Update edit form initialization from `target.departmentIds ?? [target.departmentId]`.

11. `Client/src/pages/projectsK/components/ProjectFormModal.tsx`
    - Extend `ProjectFormState` with `departmentIds: string[]`.
    - Replace single department selection with multi-department assignment UI.
    - Preserve `departmentId` as primary department.
    - Ensure the selected primary department remains inside `departmentIds`.
    - Update project manager filtering to include users from any selected department organization.

12. `Client/src/pages/projectsK/components/ProjectSidebar.tsx`
    - Update any department display and filtering assumptions to use assigned departments.
    - Show primary department first and optionally display additional department count.

13. `Client/src/pages/projectsK/components/ProjectHeaderCard.tsx`
    - Show all assigned departments in the project header.
    - Continue showing the primary department as the main label.

14. `Client/src/pages/projectsK/components/ProjectDetailModal.tsx`
    - Add assigned departments to the detail view.
    - Use `project.departments` for display and fall back to `departmentName`.

15. `Client/src/pages/projectsK/components/WorkspaceStats.tsx`
    - If stats are grouped by department, aggregate a project into every assigned department instead of only `departmentId`.
    - Avoid double-counting project totals when showing global totals.

16. `Client/src/pages/projectsK/components/KanbanFilters.tsx`
    - No API path change is required.
    - Ensure the selected department filter is interpreted by parent components as an assigned-department filter.

17. `Client/src/pages/shared/OrganizationDepartmentFilter.tsx`
    - No API path change is required.
    - Existing organization and department selection can remain single-select for filtering.
    - Parent project pages must apply the selected department to `project.departmentIds`.

18. `Client/src/pages/shared/ScopedUserSelect.tsx`
    - Add support for `organizationIds?: string[]` or `departmentIds?: string[]`.
    - Existing `organizationId` can remain for backward compatibility.
    - Project forms should pass all selected department organization IDs so managers from any assigned department organization can be selected.

19. `Client/src/pages/tasks/TaskFormModal.tsx`
    - When a project is selected, show assigned departments from the project so the user understands cross-department project context.
    - If assignee filtering depends on project department, filter by all project assigned departments, not only the primary department.

20. `Client/src/pages/projectsK/components/TaskFormModal.tsx`
    - Same update as `Client/src/pages/tasks/TaskFormModal.tsx`.
    - For project-scoped task creation, no payload change is required because tasks still send `projectId`.

21. `Client/src/pages/milestones/MilestoneFormModal.tsx`
    - No payload change is required.
    - If the UI displays project department context, use `project.departments`.

22. `Client/src/pages/milestones/MilestoneDetail.tsx`
    - No API path change is required.
    - Any project department display should use the assigned department list.

23. `Client/src/pages/dashboard/dashboard.tsx`
    - `api.getDashboard(token, departmentId)` can stay unchanged.
    - The backend now treats `departmentId` as assigned-department filtering.
    - Any local dashboard project filtering should use `project.departmentIds`.

24. `Client/src/pages/dashboard/dashbaordStats.tsx`
    - If it consumes project lists directly, update department counts and labels to use assigned departments.

25. `Client/src/pages/users/WorkloadView.tsx`
    - No payload change is required.
    - If project context is displayed for workload, show assigned departments instead of only primary department.

26. `Client/src/pages/departments/DepartmentsPage.tsx`
    - Department dashboard API path stays unchanged.
    - Project counts returned by backend now include projects assigned to the department.
    - Any local project count calculations should use `project.departmentIds`.

27. `Client/src/pages/departments/DepartmentDetailCard.tsx`
    - Update project list/count display to include assigned projects, not only primary-department projects.

28. `Client/src/pages/organisations/OrganizationDetail.tsx`
    - If showing projects under an organization, include projects assigned to any department in that organization.
    - Use `project.departmentIds` and the department list to determine organization membership.

29. `Client/src/pages/organisations/OrganizationStructurePage.tsx`
    - Keep organization -> departments display unchanged.
    - If project membership is shown under departments, include assigned projects.

30. `Client/src/pages/organisations/DepartmentListView.tsx`
    - Any project count per department should include `project.departmentIds`.

31. `Client/src/pages/reports/ReportFilters.tsx`
    - If project filtering by department exists, update it to use assigned departments.
    - No backend API change was made for reports in this branch.

32. `Client/src/pages/activity/ActivityFilters.tsx`
    - No payload change is required.
    - If project department filtering is added locally, use assigned departments.

33. `Client/src/pages/shared/SimpleProjectList.tsx`
    - Display all assigned departments for each project.
    - Filter by `project.departmentIds` when a department filter is provided.

34. `Client/src/pages/shared/TaskList.tsx`
    - No task payload change is required.
    - If showing project department context, use assigned project departments from the selected project data.

35. `Client/src/pages/shared/dash/ProjectOverviewChart.tsx`
    - If chart buckets projects by department, count project membership by assigned departments.
    - Avoid double-counting in total project count.

36. `Client/src/pages/shared/dash/TaskPerformance.tsx`
    - If task/project rows display department, use the selected task's project assigned departments when available.

37. `Client/src/pages/shared/dash/TaskPerformanceTable.tsx`
    - Same as `TaskPerformance.tsx`; use primary department plus assigned department list for labels.

38. `Client/src/pages/projects/components/CreateProjectModal.tsx` and `Client/src/pages/projectsK/components/ProjectFormModal.tsx` JSON examples
    - Old-compatible payload:
      ```json
      {
        "name": "Client Portal",
        "departmentId": "primary-department-id",
        "departmentIds": ["primary-department-id"],
        "projectManagerId": "manager-user-id"
      }
      ```
    - New-flow payload:
      ```json
      {
        "name": "Client Portal",
        "departmentId": "primary-department-id",
        "departmentIds": ["primary-department-id", "support-department-id", "qa-department-id"],
        "projectManagerId": "manager-user-id"
      }
      ```

39. Response shape expected from project APIs
    - Existing fields remain:
      - `departmentId`
      - `departmentName`
    - New fields:
      - `departmentIds`
      - `departments`
    - UI should prefer the new fields when present and fall back to the existing fields.

40. Integration order
    - First update `Client/src/types.ts`.
    - Then update project form state and payloads in both project experiences.
    - Then update filtering helpers to use `project.departmentIds`.
    - Then update display components to show assigned departments.
    - Finally update dashboard, organization, department, and shared summary components that perform local project grouping.
