# Tasks Page

## Purpose

Provide a complete task management interface supporting standalone tasks, milestone-linked tasks, assignees, dependencies, progress, status, and filtering.

## Routes

- `/tasks`
- `/tasks/:taskId`
- `/projects/:projectId/tasks`

## APIs Needed

- `GET /tasks`
- `GET /tasks/{taskId}`
- `GET /tasks?projectId={projectId}`
- `POST /tasks`
- `PUT /tasks/{taskId}`
- `DELETE /tasks/{taskId}`
- `PATCH /tasks/{taskId}/status`
- `PATCH /tasks/{taskId}/progress`
- `POST /tasks/{taskId}/assign`
- `GET /projects`
- `GET /milestones`
- `GET /users`
- `GET /tasks` for dependency dropdown source
- `GET /tasks/{taskId}/subtasks`

## Page Structure

### Task List View

- Header and create button
- Advanced filter toolbar
- Table and board toggle
- Grouping options:
  - by project
  - by milestone
  - by assignee
  - by status

### Task Detail View

- Task summary header
- Metadata sidebar
- Tabs:
  - Overview
  - Subtasks
  - Dependencies
  - Time
  - Comments
  - Attachments

## UI Elements

- Search input
- Project dropdown
- Milestone dropdown
- Assignee dropdown
- Status filter
- Priority filter
- Overdue toggle
- Standalone-only toggle
- Grouped-only toggle

## Components Needed

- `TaskListPage`
- `TaskFilters`
- `TaskTable`
- `TaskBoard`
- `TaskRowActions`
- `TaskDetailPage`
- `TaskSummaryCard`
- `TaskMetaPanel`
- `TaskDependencyList`
- `TaskProgressEditor`
- `TaskStatusBadge`
- `TaskPriorityBadge`
- `TaskFormModal`
- `TaskAssignModal`
- `TaskProgressModal`
- `TaskDeleteModal`

## Modals

- Create task
- Edit task
- Assign task
- Update progress
- Change status
- Delete task

## Form Inputs

- Project dropdown
- Milestone dropdown with `None` option
- Title
- Description
- Start date
- Due date
- Priority
- Estimated hours
- Assignee dropdown
- Dependency multi-select
- Tags input

## Interaction Rules

- Milestone dropdown should load milestones for the selected project only.
- Assignee dropdown should load users and support search.
- Dependency picker should exclude the current task.
- Task list should visually distinguish:
  - standalone tasks
  - milestone-linked tasks
  - parent tasks with subtasks

## Filters And Relationships

- A task can belong only to a project.
- A task may or may not belong to a milestone.
- A task can have an assignee.
- A task can have subtasks.

## Notes For Implementation

- Reuse dropdown selectors for project, milestone, user, and task dependency sources.
- Keep task forms below 100 lines by extracting sections:
  - schedule section
  - assignment section
  - relationship section
