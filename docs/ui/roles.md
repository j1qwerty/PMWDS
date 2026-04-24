# Roles Page

## Purpose

Manage role definitions, permission level ordering, and role-to-permission mapping.

## Routes

- `/roles`

## APIs Needed

- `GET /roles`
- `POST /roles`
- `PUT /roles/{roleId}`
- `DELETE /roles/{roleId}`
- `GET /roles/permissions`

## Page Structure

- Role list with permission count and permission level
- Side-by-side permission mapping panel
- Create and edit role modal

## UI Elements

- Search input
- Permission level filter
- Permission count display
- Role chip list

## Components Needed

- `RoleListPage`
- `RoleTable`
- `RoleFormModal`
- `RolePermissionMatrix`
- `RoleDeleteModal`

## Modals

- Create role
- Edit role
- Delete role

## Form Inputs

- Role name
- Description
- Permission level
- Permission multi-select

## Interaction Rules

- Editing a role should preload selected permissions.
- Permission matrix should be reusable inside role create and edit flows.
