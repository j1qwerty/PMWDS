# Workflow

## Roles
- `SuperAdmin`: global control over all organizations, users, projects, roles, settings, and audits.
- `Director`: organization admin for one organization; manages that organization’s users, departments, projects, milestones, tasks, skills, reports, and notifications.
- `DepartmentHead`: manages their own department, collaborates across departments, and can work on department-scoped projects and tasks.
- `ProjectManager`: manages assigned projects and the milestones, tasks, subtasks, documents, and reports inside them.
- `TeamMember`: works on assigned tasks and subtasks, updates progress, adds comments, and contributes execution data.
- `Viewer`: read-only access to allowed organization data.

## Project Flow
1. `SuperAdmin` creates an organization and registers a `Director`.
2. `Director` creates departments, assigns department heads, creates users, and sets organization scope.
3. `Director` or `ProjectManager` creates projects and assigns the project manager and department context.
4. `Director`, `DepartmentHead`, or `ProjectManager` breaks projects into milestones, tasks, and subtasks.
5. `TeamMember` executes assigned work, updates progress, logs time, and adds comments.
6. `Director`, `DepartmentHead`, and `ProjectManager` monitor progress, resolve risks, and generate reports.
7. `SuperAdmin` can inspect and manage the full system across all organizations.

## Dashboard
- `SuperAdmin`: sees all organizations, all workload widgets, global escalations, all notifications, and all active objectives.
- `Director`: sees only their organization; can inspect org-wide workload, queue, escalations, and notifications.
- `DepartmentHead`: sees only their organization; can inspect department and org-level workload plus notifications for that organization.
- `ProjectManager`: sees only assigned projects and related workload/activity for their organization.
- `TeamMember`: sees only personal workload, assigned objectives, and personal notifications.
- `Viewer`: sees read-only organization-scoped summary data if granted access.

## Organization
- `SuperAdmin`: visible to create, edit, delete organizations and manage all organization cards and side lists.
- `Director`: can view organization details, edit organization data, create departments, and manage org structure; hidden from global organization list.
- `DepartmentHead`: can view organization details and department details; can edit their own department if allowed; no organization create/delete.
- `ProjectManager`: read-only on organization structure.
- `TeamMember`: read-only on organization structure.
- `Viewer`: read-only on organization structure.

## Users
- `SuperAdmin`: sees organization filters, manage tab, directory tab, workload tab, register/edit/deactivate/reactivate all users, and role assignment including `SuperAdmin`.
- `Director`: sees only their organization’s users and workload; can manage users in that organization, edit roles except `SuperAdmin`, deactivate/reactivate users, and register new users with their organization locked.
- `DepartmentHead`: sees directory and workload for their organization only; no manage tab; can view users but not edit them.
- `ProjectManager`: sees directory and workload for allowed organization scope; no manage tab.
- `TeamMember`: sees directory and workload for allowed organization scope; no manage tab.
- `Viewer`: read-only user list for allowed scope.

## Department
- `SuperAdmin`: can create, edit, delete, and inspect all departments across all organizations.
- `Director`: can create, edit, and delete departments in their organization; can assign department heads and users.
- `DepartmentHead`: can edit only the department or departments they head; can view org department lists and collaboration data.
- `ProjectManager`: read-only department data.
- `TeamMember`: read-only department data.
- `Viewer`: read-only department data.

## Project
- `SuperAdmin`: can see and manage every project, all project filters, and all project-level actions.
- `Director`: can see and manage projects in their organization, create/edit/delete projects, and assign users from that organization.
- `DepartmentHead`: can manage projects tied to their departments or organization scope if assigned; can collaborate across departments.
- `ProjectManager`: can manage assigned projects, tasks, milestones, subtasks, reports, and documents.
- `TeamMember`: can view assigned projects and contribute through tasks/subtasks, comments, and progress updates.
- `Viewer`: read-only project view.

## Milestones
- `SuperAdmin`: can create, edit, delete, and view all milestones.
- `Director`: can create, edit, delete, and manage milestones for their organization.
- `DepartmentHead`: can create, edit, and delete milestones for projects they are allowed to manage.
- `ProjectManager`: can create, edit, and delete milestones for assigned projects.
- `TeamMember`: can view milestones and update their own execution progress where permitted.
- `Viewer`: read-only milestone view.

## Tasks
- `SuperAdmin`: can create, edit, delete, assign, and inspect all tasks, subtasks, dependencies, timers, and comments.
- `Director`: can manage tasks in their organization, assign users, edit task details, and control milestone/task flow.
- `DepartmentHead`: can create and edit tasks, subtasks, and dependencies for accessible projects and departments.
- `ProjectManager`: can create, edit, and delete tasks, subtasks, dependencies, and assignments within assigned projects.
- `TeamMember`: can create subtasks for assigned tasks, update progress/status on assigned tasks and subtasks, add comments, and log time.
- `Viewer`: read-only task view.

## Skills
- `SuperAdmin`: can create, edit, delete, and inspect all skills.
- `Director`: can create, edit, and delete skills inside their organization, and can only see org-scoped skills.
- `DepartmentHead`: can add and edit skills for their organization; no global skill control.
- `ProjectManager`: read-only skill catalogue unless granted extra role scope.
- `TeamMember`: read-only skill catalogue unless granted extra role scope.
- `Viewer`: read-only skill catalogue.

## Notifications
- `SuperAdmin`: can see all tabs and all notifications, and can broadcast globally.
- `Director`: can see organization notifications, broadcast within the organization, and manage organization-wide alerts.
- `DepartmentHead`: can see and broadcast organization notifications and department-relevant notifications.
- `ProjectManager`: can see assigned project notifications and the inbox for their scope.
- `TeamMember`: sees inbox notifications tied to their tasks, projects, or organization.
- `Viewer`: sees inbox notifications only, if enabled by scope.

## Profile
- `SuperAdmin`: can see and manage all user profiles.
- `Director`: can see and edit users in their organization.
- `DepartmentHead`: can view users in their organization, but can only edit their own profile picture.
- `ProjectManager`: can view their own profile and allowed user profiles by scope.
- `TeamMember`: can view and edit their own profile picture and self data allowed by policy.
- `Viewer`: can view their own profile only.

## Reports
- `SuperAdmin`: can see, filter, generate, and manage all reports across organizations.
- `Director`: can generate reports for their organization and filter by their organization’s departments and projects.
- `DepartmentHead`: can generate reports for their scope and filter by allowed departments/projects in the organization.
- `ProjectManager`: can generate reports for assigned projects.
- `TeamMember`: can view or generate limited personal/project reports if allowed.
- `Viewer`: read-only report access if granted.

## AI Insights
- `SuperAdmin`: can view and manage all AI insight sections and all organization filters.
- `Director`: can view organization-scoped AI insights and filters for their organization.
- `DepartmentHead`: can view AI insights for their organization and departments.
- `ProjectManager`: can view AI insights for assigned projects.
- `TeamMember`: can view personal and assigned-work insights when allowed.
- `Viewer`: read-only insight access if granted.

## Activity Logs
- `SuperAdmin`: can see and manage every activity log entry across the system.
- `Director`: can see only logs for their organization and can filter users in that organization.
- `DepartmentHead`: can see org/department-relevant activity logs where permitted.
- `ProjectManager`: can view project activity logs for assigned projects if permitted.
- `TeamMember`: can view their own activity logs if permitted.
- `Viewer`: no access by default.

## Roles
- `SuperAdmin`: visible and manageable only here.
- `Director`: hidden from this page.
- `DepartmentHead`: hidden from this page.
- `ProjectManager`: hidden from this page.
- `TeamMember`: hidden from this page.
- `Viewer`: hidden from this page.

## Settings
- `SuperAdmin`: visible and manageable only here.
- `Director`: hidden from this page.
- `DepartmentHead`: hidden from this page.
- `ProjectManager`: hidden from this page.
- `TeamMember`: hidden from this page.
- `Viewer`: hidden from this page.


