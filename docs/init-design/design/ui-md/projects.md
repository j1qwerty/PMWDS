# Projects Page

## Purpose

Provide the main project management workspace for listing, filtering, creating, updating, and inspecting projects. This page is the entry point for project-level navigation into milestones, tasks, documents, knowledge items, and reporting.

## Routes

- `/projects`
- `/projects/:projectId`

## APIs Needed

- `GET /projects`
- `GET /projects/{projectId}`
- `POST /projects`
- `PUT /projects/{projectId}`
- `DELETE /projects/{projectId}`
- `PATCH /projects/{projectId}/status` if available in existing API
- `GET /departments`
- `GET /users`
- `GET /milestones?projectId={projectId}` or project detail milestone payload
- `GET /tasks?projectId={projectId}` or project detail task payload

## Page Structure

### Project List View

- Page header with title, summary counts, and create button
- Filter bar
- Projects data table or card grid
- Bulk empty state
- Right-side quick preview drawer or inline summary panel

### Project Detail View

- Project hero summary
- Status and priority chips
- Tabs:
  - Overview
  - Milestones
  - Tasks
  - Documents
  - Knowledge
  - Activity
- Action bar for edit, delete, status change, and create child records

## UI Elements

- Search input
- Department filter
- Project manager filter
- Status filter
- Priority filter
- Date range filter
- Sort selector
- Pagination controls
- KPI cards:
  - Total projects
  - In progress
  - Delayed
  - Completed

## Components Needed

- `ProjectListPage`
- `ProjectListToolbar`
- `ProjectFilters`
- `ProjectTable`
- `ProjectCard`
- `ProjectSummaryPanel`
- `ProjectDetailPage`
- `ProjectOverviewSection`
- `ProjectStatusBadge`
- `ProjectProgressBar`
- `ProjectFormModal`
- `ProjectDeleteModal`
- `ProjectAssignmentsPanel`
- `ProjectRelationsPanel`

## Modals

- Create project modal
- Edit project modal
- Delete confirmation modal
- Change status modal

## Form Inputs

- Project name
- Description
- Category
- Department dropdown
- Project manager dropdown populated from users API
- Priority dropdown
- Planned start date
- Planned end date
- Planned budget
- Client name

## Interaction Rules

- Creating a project should immediately refresh project list and detail cache.
- Department selection should narrow available project managers if needed.
- Project detail should preload milestone and task summaries for quick navigation.
- Deleting a project should require a hard confirmation phrase if the API performs destructive delete.

## Filters And Relationships

- One project can have multiple standalone tasks.
- One project can have multiple milestones.
- Milestones can group tasks.
- Detail view must show:
  - tasks not assigned to milestones
  - tasks grouped under milestones

## Notes For Implementation

- Keep project list and detail concerns in separate containers.
- Reuse table, filter, modal, and summary components across other modules.
- Avoid a monolithic project detail component; split by tab.
