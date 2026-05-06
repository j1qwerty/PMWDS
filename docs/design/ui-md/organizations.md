# Organizations Page

## Purpose

Manage organizations and department associations.

## Routes

- `/organizations`
- `/organizations/:organizationId`

## APIs Needed

- `GET /organizations`
- `GET /organizations/{orgId}`
- `POST /organizations`
- `PUT /organizations/{orgId}`
- `DELETE /organizations/{orgId}`
- `PUT /organizations/{orgId}/departments/{deptId}`
- `DELETE /organizations/{orgId}/departments/{deptId}`
- `GET /departments`

## Page Structure

- Organization list
- Organization detail with linked departments
- Department assignment manager

## Components Needed

- `OrganizationListPage`
- `OrganizationTable`
- `OrganizationFormModal`
- `OrganizationDepartmentPanel`
- `OrganizationDeleteModal`

## Interaction Rules

- Department assignment UI should use available departments not already linked.
