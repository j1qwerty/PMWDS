# Reports Page

## Purpose

Manage stored reports, report downloads, and schedules.

## Routes

- `/reports`
- `/reports/schedules`

## APIs Needed

- `GET /reports/stored`
- `GET /reports/stored/{storedReportId}`
- `GET /reports/stored/{storedReportId}/download`
- `POST /reports/stored`
- `PUT /reports/stored/{storedReportId}`
- `DELETE /reports/stored/{storedReportId}`
- `GET /reports/schedules`
- `POST /reports/schedules`
- `PUT /reports/schedules/{reportScheduleId}`
- `DELETE /reports/schedules/{reportScheduleId}`

## Components Needed

- `StoredReportsPage`
- `ReportSchedulePage`
- `ReportTable`
- `ReportFormModal`
- `ReportScheduleFormModal`

## Interaction Rules

- Stored report and schedule pages should share report selector and download action components.
