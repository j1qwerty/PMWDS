# Integrations Page

## Purpose

Manage third-party integrations and status.

## Routes

- `/integrations`
- `/integrations/:integrationId`

## APIs Needed

- `GET /integrations`
- `GET /integrations/{integrationId}`
- `POST /integrations`
- `PUT /integrations/{integrationId}`
- `PATCH /integrations/{integrationId}/sync`
- `DELETE /integrations/{integrationId}`

## Components Needed

- `IntegrationListPage`
- `IntegrationTable`
- `IntegrationFormModal`
- `IntegrationStatusBadge`
- `IntegrationSyncPanel`

## Interaction Rules

- Config editors should use reusable key-value field arrays.
