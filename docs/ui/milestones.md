# Milestones Page

## Purpose

Manage milestone records within projects, including ordering, due dates, status, and grouped tasks.

## Routes

- `/milestones`
- `/projects/:projectId/milestones`

## APIs Needed

- `GET /milestones`
- `GET /milestones/{milestoneId}`
- `POST /milestones`
- `PUT /milestones/{milestoneId}`
- `DELETE /milestones/{milestoneId}`
- `GET /projects`
- `GET /tasks?projectId={projectId}`

## Page Structure

- Milestone list page with project-aware filtering
- Milestone timeline/list hybrid view
- Project-scoped milestone board in project detail

## UI Elements

- Project selector
- Status filter
- Due date filter
- Critical/overdue toggle
- Order indicator
- Inline task counts

## Components Needed

- `MilestoneListPage`
- `MilestoneFilters`
- `MilestoneTable`
- `MilestoneTimeline`
- `MilestoneCard`
- `MilestoneFormModal`
- `MilestoneTasksPanel`
- `MilestoneDeleteModal`

## Modals

- Create milestone
- Edit milestone
- Delete milestone
- Reorder milestones

## Form Inputs

- Project dropdown
- Name
- Description
- Due date
- Status
- Display order

## Interaction Rules

- Project must be selected before milestone creation.
- Milestone detail must show grouped tasks.
- Task counts should distinguish:
  - total tasks
  - completed tasks
  - overdue tasks

## Notes For Implementation

- Use the same project dropdown component as project and task forms.
- Keep reordering logic isolated from form logic.
