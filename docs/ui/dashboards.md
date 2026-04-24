# Dashboards Page

## Purpose

Allow users to view, create, reorder, and configure dashboards and widgets.

## Routes

- `/dashboards`
- `/dashboards/:dashboardId`

## APIs Needed

- `GET /dashboards`
- `GET /dashboards/{dashboardId}`
- `POST /dashboards`
- `PUT /dashboards/{dashboardId}`
- `DELETE /dashboards/{dashboardId}`
- `POST /dashboards/{dashboardId}/widgets`
- `PUT /dashboards/widgets/{widgetId}`
- `PATCH /dashboards/{dashboardId}/widgets/reorder`
- `DELETE /dashboards/widgets/{widgetId}`

## Page Structure

- Dashboard list
- Dashboard detail with drag/reorder-capable widget layout

## Components Needed

- `DashboardListPage`
- `DashboardCanvas`
- `DashboardWidgetCard`
- `DashboardFormModal`
- `WidgetFormModal`

## Interaction Rules

- Widget configuration should use schema-driven forms where possible.
