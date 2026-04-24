# New Non-AI APIs

Base URL:

```bash
export BASE_URL="http://localhost:5177/api/v1"
export TOKEN="paste-jwt-here"
```

Common header:

```bash
-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json"
```

## Roles And Permissions

```bash
curl "$BASE_URL/roles" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/roles/permissions" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE_URL/roles" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"OperationsManager","description":"Operational oversight role","permissionLevel":65,"permissionIds":[]}'
curl -X PUT "$BASE_URL/roles/{roleId}" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"OperationsManager","description":"Operational oversight role updated","permissionLevel":66,"permissionIds":["{permissionId}"]}'
curl -X DELETE "$BASE_URL/roles/{roleId}" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE_URL/roles/permissions" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"code":"OPS.VIEW","name":"View Operations","description":"View operations dashboards","module":"Operations","isGlobal":false}'
curl -X PUT "$BASE_URL/roles/permissions/{permissionId}" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"View Operations Data","description":"View operations dashboards and summaries","module":"Operations","isGlobal":false}'
curl -X DELETE "$BASE_URL/roles/permissions/{permissionId}" -H "Authorization: Bearer $TOKEN"
```

## Profiles

```bash
curl "$BASE_URL/profiles/{userId}" -H "Authorization: Bearer $TOKEN"
curl -X PUT "$BASE_URL/profiles/{userId}" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"bio":"Backend engineer focused on PMWDS operations","jobTitle":"Senior Developer","dateOfBirth":"1995-08-17T00:00:00Z","address":"Jaipur, Rajasthan","emergencyContact":"9999999999","linkedInUrl":"https://www.linkedin.com/in/example"}'
```

## Organizations

```bash
curl "$BASE_URL/organizations" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/organizations/{orgId}" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE_URL/organizations" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"PMWDS Labs","taxId":"PMWDS-LABS-01","address":"Udaipur, Rajasthan","contactEmail":"labs@pmwds.com","contactPhone":"+91-1410000000","foundedDate":"2024-01-01T00:00:00Z"}'
curl -X PUT "$BASE_URL/organizations/{orgId}" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"PMWDS Labs Updated","taxId":"PMWDS-LABS-01","address":"Udaipur, Rajasthan","contactEmail":"labs.updated@pmwds.com","contactPhone":"+91-1410000001","foundedDate":"2024-01-01T00:00:00Z"}'
curl -X PUT "$BASE_URL/organizations/{orgId}/departments/{deptId}" -H "Authorization: Bearer $TOKEN"
curl -X DELETE "$BASE_URL/organizations/{orgId}/departments/{deptId}" -H "Authorization: Bearer $TOKEN"
curl -X DELETE "$BASE_URL/organizations/{orgId}" -H "Authorization: Bearer $TOKEN"
```

## Notification Templates And Rules

```bash
curl "$BASE_URL/notifications/templates" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE_URL/notifications/templates" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"templateType":"TaskReminder","subjectTemplate":"Task reminder for {{taskName}}","bodyTemplate":"Task {{taskName}} is due on {{dueDate}}","variables":["taskName","dueDate"],"supportedChannels":["InApp","Email"]}'
curl -X PUT "$BASE_URL/notifications/templates/{templateId}" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"templateType":"TaskReminder","subjectTemplate":"Task reminder updated for {{taskName}}","bodyTemplate":"Updated reminder for {{taskName}} due on {{dueDate}}","variables":["taskName","dueDate"],"supportedChannels":["InApp","Email"]}'
curl -X DELETE "$BASE_URL/notifications/templates/{templateId}" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/notifications/rules" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE_URL/notifications/rules" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Overdue Task Rule","conditionType":"Task","conditionExpression":"status == \"Delayed\"","actionType":"NotifyManager","actionParameters":{"channel":"InApp","severity":"High"},"isEnabled":true}'
curl -X PUT "$BASE_URL/notifications/rules/{alertRuleId}" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Overdue Task Rule Updated","conditionType":"Task","conditionExpression":"status == \"Delayed\" || status == \"OnHold\"","actionType":"NotifyManager","actionParameters":{"channel":"Email","severity":"High"},"isEnabled":true}'
curl -X DELETE "$BASE_URL/notifications/rules/{alertRuleId}" -H "Authorization: Bearer $TOKEN"
```

## Dashboards

```bash
curl "$BASE_URL/dashboards" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/dashboards/{dashboardId}" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE_URL/dashboards" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Operations Dashboard","layoutType":"Grid","isDefault":false}'
curl -X PUT "$BASE_URL/dashboards/{dashboardId}" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Operations Dashboard Updated","layoutType":"Masonry","isDefault":false}'
curl -X POST "$BASE_URL/dashboards/{dashboardId}/widgets" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"widgetType":"Chart","title":"Workload Split","configuration":{"metric":"workloadByUser","chart":"bar"},"refreshInterval":300,"requiredPermissions":["REPORTS.MANAGE"],"displayOrder":0}'
curl -X PUT "$BASE_URL/dashboards/widgets/{widgetId}" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"widgetType":"Chart","title":"Workload Split Updated","configuration":{"metric":"workloadByDepartment","chart":"line"},"refreshInterval":600,"requiredPermissions":["REPORTS.MANAGE"],"displayOrder":1}'
curl -X PATCH "$BASE_URL/dashboards/{dashboardId}/widgets/reorder" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"widgetIds":["{widgetId}"]}'
curl -X DELETE "$BASE_URL/dashboards/widgets/{widgetId}" -H "Authorization: Bearer $TOKEN"
curl -X DELETE "$BASE_URL/dashboards/{dashboardId}" -H "Authorization: Bearer $TOKEN"
```

## Stored Reports And Schedules

```bash
curl "$BASE_URL/reports/stored" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/reports/stored/{storedReportId}" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/reports/stored/{storedReportId}/download" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE_URL/reports/stored" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Operations Snapshot","reportType":"Custom","parameters":{"scope":"department","departmentId":"{deptId}"},"format":"json","contentBase64":"eyJzdGF0dXMiOiJPayJ9"}'
curl -X PUT "$BASE_URL/reports/stored/{storedReportId}" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Operations Snapshot Updated","reportType":"Custom","parameters":{"scope":"organization","organizationId":"{orgId}"},"format":"json","contentBase64":"eyJzdGF0dXMiOiJVcGRhdGVkIn0="}'
curl -X DELETE "$BASE_URL/reports/stored/{storedReportId}" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/reports/schedules" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE_URL/reports/schedules" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"reportId":"{storedReportId}","frequency":"Weekly","nextRun":"2026-05-01T09:00:00Z","recipients":["manager@pmwds.com"],"deliveryOptions":{"channel":"Email"},"isActive":true}'
curl -X PUT "$BASE_URL/reports/schedules/{reportScheduleId}" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"reportId":"{storedReportId}","frequency":"Daily","nextRun":"2026-05-02T09:00:00Z","recipients":["manager@pmwds.com","head@pmwds.com"],"deliveryOptions":{"channel":"Email"},"isActive":true}'
curl -X DELETE "$BASE_URL/reports/schedules/{reportScheduleId}" -H "Authorization: Bearer $TOKEN"
```

## Integrations And Webhooks

```bash
curl "$BASE_URL/integrations" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/integrations/{integrationId}" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE_URL/integrations" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"integrationType":"ERP","name":"SAP Sync","configuration":{"endpoint":"https://example.com/api","apiKey":"demo-key"},"isEnabled":true,"status":"Configured"}'
curl -X PUT "$BASE_URL/integrations/{integrationId}" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"integrationType":"ERP","name":"SAP Sync Updated","configuration":{"endpoint":"https://example.com/api/v2","apiKey":"demo-key"},"isEnabled":true,"status":"Connected"}'
curl -X PATCH "$BASE_URL/integrations/{integrationId}/sync" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"status":"Synced"}'
curl -X DELETE "$BASE_URL/integrations/{integrationId}" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/webhooks" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/webhooks?integrationId={integrationId}" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/webhooks/{webhookId}" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE_URL/webhooks" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"integrationId":"{integrationId}","eventType":"Project.Created","callbackUrl":"https://example.com/hooks/project-created","secret":"super-secret","headers":["x-source:pmwds"],"isActive":true}'
curl -X PUT "$BASE_URL/webhooks/{webhookId}" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"integrationId":"{integrationId}","eventType":"Project.Updated","callbackUrl":"https://example.com/hooks/project-updated","secret":"super-secret-updated","headers":["x-source:pmwds","x-env:test"],"isActive":true}'
curl -X POST "$BASE_URL/webhooks/{webhookId}/deliveries" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"statusCode":202,"responseBody":"Accepted","success":true,"errorMessage":null}'
curl -X DELETE "$BASE_URL/webhooks/{webhookId}" -H "Authorization: Bearer $TOKEN"
```

## Knowledge And Activity Logs

```bash
curl "$BASE_URL/knowledge/articles" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/knowledge/articles?projectId={projectId}" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/knowledge/articles/{articleId}" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE_URL/knowledge/articles" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"projectId":"{projectId}","title":"Deployment checklist","content":"Validate migrations, seed data, and smoke-test APIs.","category":"Operations","tags":["deployment","checklist"],"relevanceScore":0.85}'
curl -X PUT "$BASE_URL/knowledge/articles/{articleId}" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"projectId":"{projectId}","title":"Deployment checklist updated","content":"Validate migrations, seed data, APIs, and background jobs.","category":"Operations","tags":["deployment","checklist","jobs"],"relevanceScore":0.90}'
curl -X DELETE "$BASE_URL/knowledge/articles/{articleId}" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/knowledge/lessons" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/knowledge/lessons?projectId={projectId}" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE_URL/knowledge/lessons" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"projectId":"{projectId}","title":"Schema drift handling","description":"Keep sqlite fallback migrations validated during feature work.","category":"Engineering","impact":"High","keywords":["sqlite","migration","schema"]}'
curl -X PUT "$BASE_URL/knowledge/lessons/{lessonId}" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"projectId":"{projectId}","title":"Schema drift handling updated","description":"Validate sqlite fallback migrations and API smoke tests during feature work.","category":"Engineering","impact":"High","keywords":["sqlite","migration","api"]}'
curl -X DELETE "$BASE_URL/knowledge/lessons/{lessonId}" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/activitylogs" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/activitylogs/user/{userId}" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE_URL/activitylogs" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"activityType":"ManualAudit","description":"Created during Postman verification run","metadata":{"source":"postman","scope":"non-ai-feature-check"}}'
```
