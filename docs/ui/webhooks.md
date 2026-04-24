# Webhooks Page

## Purpose

Manage webhook subscriptions and delivery history.

## Routes

- `/webhooks`
- `/webhooks/:webhookId`

## APIs Needed

- `GET /webhooks`
- `GET /webhooks?integrationId={integrationId}`
- `GET /webhooks/{webhookId}`
- `POST /webhooks`
- `PUT /webhooks/{webhookId}`
- `POST /webhooks/{webhookId}/deliveries`
- `DELETE /webhooks/{webhookId}`
- `GET /integrations`

## Components Needed

- `WebhookListPage`
- `WebhookTable`
- `WebhookFormModal`
- `WebhookDeliveryPanel`
- `WebhookDeleteModal`

## Interaction Rules

- Integration selection should reuse integration dropdown logic.
