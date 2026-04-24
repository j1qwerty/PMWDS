# Departments Page

## Purpose

Manage department hierarchy, department heads, and department-level project filtering.

## Routes

- `/departments`
- `/departments/:departmentId`

## APIs Needed

- `GET /departments`
- `GET /departments/{departmentId}` if available
- `POST /departments`
- `PUT /departments/{departmentId}`
- `DELETE /departments/{departmentId}`
- `GET /users`

## Page Structure

- Department list or tree
- Department detail with members and projects

## Components Needed

- `DepartmentListPage`
- `DepartmentTree`
- `DepartmentTable`
- `DepartmentFormModal`
- `DepartmentHeadPicker`

## Interaction Rules

- User picker reuse is required for department head selection.
