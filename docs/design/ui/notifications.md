# Notifications Page

## Purpose

Manage in-app notifications, templates, and alert rules.

## Routes

- `/notifications`
- `/notifications/templates`
- `/notifications/rules`

## APIs Needed

- existing notifications list APIs
- `GET /notifications/templates`
- `POST /notifications/templates`
- `PUT /notifications/templates/{templateId}`
- `DELETE /notifications/templates/{templateId}`
- `GET /notifications/rules`
- `POST /notifications/rules`
- `PUT /notifications/rules/{alertRuleId}`
- `DELETE /notifications/rules/{alertRuleId}`

## Page Structure

- Notification inbox
- Templates management tab
- Rules management tab

## Components Needed

- `NotificationInboxPage`
- `NotificationTemplatePage`
- `AlertRulePage`
- `NotificationList`
- `NotificationTemplateFormModal`
- `AlertRuleFormModal`

## Interaction Rules

- Templates and rules should reuse generic key-value editors.
