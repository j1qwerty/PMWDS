# Users Page

## Purpose

Provide directory and management access for users across assignment flows.

## Routes

- `/users`
- `/users/:userId`

## APIs Needed

- `GET /users`
- `GET /users/{userId}` if available
- `POST /users` if available
- `PUT /users/{userId}` if available
- `DELETE /users/{userId}` if available
- `GET /departments`
- `GET /roles`
- `GET /skills`

## Page Structure

- Directory list
- User detail panel
- Reusable user picker support

## Components Needed

- `UserListPage`
- `UserTable`
- `UserFilters`
- `UserPicker`
- `UserSummaryCard`
- `UserFormModal`

## Interaction Rules

- This page should supply shared picker logic used by project manager, assignee, profile, and activity log contexts.
