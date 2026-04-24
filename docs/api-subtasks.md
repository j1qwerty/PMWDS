# Subtask API Endpoints

Base URL: `http://localhost:5000/api/v1`

## Get all subtasks for a parent task
```bash
curl -X GET "http://localhost:5000/api/v1/tasks/{parentTaskId}/subtasks" \
  -H "Authorization: Bearer <your-jwt-token>"
```

## Create a subtask under a parent
```bash
curl -X POST "http://localhost:5000/api/v1/tasks/{parentTaskId}/subtasks" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Subtask Title",
    "description": "Subtask description",
    "startDate": "2026-04-01T00:00:00Z",
    "dueDate": "2026-04-15T00:00:00Z",
    "estimatedHours": 8,
    "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "milestoneId": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
    "assignedToUserId": "user-id",
    "priority": "Medium"
  }'
```

## Get a specific subtask
```bash
curl -X GET "http://localhost:5000/api/v1/tasks/subtasks/{subtaskId}" \
  -H "Authorization: Bearer <your-jwt-token>"
```

## Update a subtask
```bash
curl -X PUT "http://localhost:5000/api/v1/tasks/subtasks/{subtaskId}" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Subtask Title",
    "description": "Updated description",
    "startDate": "2026-04-01T00:00:00Z",
    "dueDate": "2026-04-20T00:00:00Z",
    "estimatedHours": 12,
    "priority": "High",
    "milestoneId": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
  }'
```

## Update subtask progress
```bash
curl -X PATCH "http://localhost:5000/api/v1/tasks/subtasks/{subtaskId}/progress" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "progressPercentage": 50,
    "notes": "Halfway done"
  }'
```

## Update subtask status
```bash
curl -X PATCH "http://localhost:5000/api/v1/tasks/subtasks/{subtaskId}/status" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{ "newStatus": "InProgress" }'
```

Status values: `NotStarted`, `Assigned`, `InProgress`, `OnHold`, `Completed`, `Cancelled`, `Delayed`

Priority values: `Low`, `Medium`, `High`, `Critical`

## Assign subtask
```bash
curl -X POST "http://localhost:5000/api/v1/tasks/subtasks/{subtaskId}/assign" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "assigneeId": "user-id",
    "useAIRecommendation": false
  }'
```

## Delete a subtask
```bash
curl -X DELETE "http://localhost:5000/api/v1/tasks/subtasks/{subtaskId}" \
  -H "Authorization: Bearer <your-jwt-token>"
```