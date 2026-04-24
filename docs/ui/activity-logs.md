# Activity Logs Page

## Purpose

Expose user activity records and audit-style operational tracking for admins.

## Routes

- `/activity-logs`

## APIs Needed

- `GET /activitylogs`
- `GET /activitylogs/user/{userId}`
- `POST /activitylogs`
- `GET /users`

## Components Needed

- `ActivityLogPage`
- `ActivityLogTable`
- `ActivityLogFilters`
- `ActivityLogCreateModal`

## Interaction Rules

- User filter should reuse shared user picker.
