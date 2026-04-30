# Subtasks Page

## Purpose

Provide a focused experience for child task management. Subtasks must always be attached to a parent task and should support their own assignee, milestone selection, status, and progress controls.

## Routes

- `/tasks/:taskId/subtasks`
- `/subtasks/:subtaskId` if a dedicated detail route is needed

## APIs Needed

- `GET /tasks/{parentTaskId}/subtasks`
- `POST /tasks/{parentTaskId}/subtasks`
- `GET /tasks/subtasks/{subtaskId}`
- `PUT /tasks/subtasks/{subtaskId}`
- `PATCH /tasks/subtasks/{subtaskId}/progress`
- `PATCH /tasks/subtasks/{subtaskId}/status`
- `POST /tasks/subtasks/{subtaskId}/assign`
- `DELETE /tasks/subtasks/{subtaskId}`
- `GET /projects`
- `GET /milestones`
- `GET /users`

## Page Structure

- Embedded subtask list inside task detail
- Optional dedicated drawer or panel for subtask detail
- Parent task summary strip at the top

## UI Elements

- Parent task breadcrumb
- Status tabs
- Assignee filter
- Milestone filter
- Inline progress indicators
- Completion toggle

## Components Needed

- `SubtaskListSection`
- `SubtaskTable`
- `SubtaskRow`
- `SubtaskFormModal`
- `SubtaskAssignModal`
- `SubtaskProgressModal`
- `SubtaskStatusMenu`
- `SubtaskDeleteModal`
- `ParentTaskSummaryStrip`

## Modals

- Create subtask
- Edit subtask
- Assign subtask
- Update progress
- Change status
- Delete subtask

## Form Inputs

- Parent task context display
- Title
- Description
- Project readonly or inferred
- Milestone dropdown with `None`
- Assignee dropdown
- Priority
- Start date
- Due date
- Estimated hours

## Interaction Rules

- New subtask creation starts from parent task context.
- Parent task summary should remain visible while working with subtasks.
- Milestone choices should come from the parent task project.
- Assignee dropdown should behave the same as on tasks.

## Notes For Implementation

- Treat subtasks as a specialized task workflow, not as a completely separate design system.
- Reuse task form sections where possible.
