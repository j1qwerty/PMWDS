# Auth And App Shell

## Purpose

Define the global application shell and authentication entry flows the rest of the pages depend on.

## Routes

- `/login`
- authenticated app shell routes

## APIs Needed

- existing auth APIs
- current user bootstrap endpoint if available

## Components Needed

- `LoginPage`
- `AppShell`
- `SidebarNav`
- `Topbar`
- `ProtectedRoute`
- `PermissionGuard`
- `Breadcrumbs`

## Interaction Rules

- Navigation must be permission-aware.
- Shared selectors for users, projects, milestones, tasks, and departments should live below the app shell in reusable feature folders.
