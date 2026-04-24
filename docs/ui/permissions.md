# Permissions Page

## Purpose

Manage permission definitions independently from role assignment so access control can be curated by module.

## Routes

- `/permissions`

## APIs Needed

- `GET /roles/permissions`
- `POST /roles/permissions`
- `PUT /roles/permissions/{permissionId}`
- `DELETE /roles/permissions/{permissionId}`

## Page Structure

- Permissions list grouped by module
- Create and edit permission modal
- Optional module summary cards

## UI Elements

- Search input
- Module filter
- Global-only toggle
- Module grouping accordion

## Components Needed

- `PermissionListPage`
- `PermissionTable`
- `PermissionGroupList`
- `PermissionFormModal`
- `PermissionDeleteModal`

## Form Inputs

- Code
- Name
- Description
- Module
- Is global checkbox

## Interaction Rules

- Code should be unique and visible in list views.
- Module grouping should match how permissions are selected on the roles page.
