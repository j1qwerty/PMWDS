# PMWDS API Documentation

## Base URL
```
http://localhost:5177/api/v1
```

## Authentication
All endpoints require a JWT Bearer token in the `Authorization` header:
```
Authorization: Bearer <token>
```

### Login
```bash
curl -X POST http://localhost:5177/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@pmwds.com", "password": "Admin@12345!"}'
```

### Register User
```bash
curl -X POST http://localhost:5177/api/v1/users/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "email": "dev@pmwds.com",
    "firstName": "John",
    "lastName": "Doe",
    "jobTitle": "Developer",
    "departmentId": "00000000-0000-0000-0000-000000000000",
    "role": "TeamMember"
  }'
```

### Change Password
```bash
curl -X POST http://localhost:5177/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"oldPassword": "Admin@12345!", "newPassword": "NewPass@123"}'
```

### Refresh Token
```bash
curl -X POST http://localhost:5177/api/v1/auth/refresh \
  -H "Authorization: Bearer <token>"
```

---

## Users

### List All Users
```bash
curl -X GET http://localhost:5177/api/v1/users \
  -H "Authorization: Bearer <token>"
```

### Get User by ID
```bash
curl -X GET http://localhost:5177/api/v1/users/{userId} \
  -H "Authorization: Bearer <token>"
```

### Get Current User
```bash
curl -X GET http://localhost:5177/api/v1/users/me \
  -H "Authorization: Bearer <token>"
```

### Update User
```bash
curl -X PUT http://localhost:5177/api/v1/users/{userId} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "firstName": "Jane",
    "lastName": "Doe",
    "phoneNumber": "+1234567890",
    "jobTitle": "Senior Developer",
    "availabilityPercentage": 80
  }'
```

### Get Available Users
```bash
curl -X GET http://localhost:5177/api/v1/users/available \
  -H "Authorization: Bearer <token>"
```

### Get Workload Distribution
```bash
curl -X GET http://localhost:5177/api/v1/users/workload \
  -H "Authorization: Bearer <token>"
```

### Deactivate User
```bash
curl -X PATCH http://localhost:5177/api/v1/users/{userId}/deactivate \
  -H "Authorization: Bearer <token>"
```

---

## User Skills

### Add Skill to User
If user already has the skill, updates ProficiencyLevel and adds to ExperienceMonths. Otherwise creates a new entry.
```bash
curl -X POST http://localhost:5177/api/v1/users/{userId}/skills \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "skillId": "00000000-0000-0000-0000-000000000001",
    "proficiencyLevel": 4,
    "experienceMonths": 24
  }'
```

### Update User Skill (Proficiency / Experience)
```bash
curl -X PUT http://localhost:5177/api/v1/users/{userId}/skills/{skillId} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "proficiencyLevel": 5,
    "experienceMonths": 12
  }'
```

### Remove Skill from User
```bash
curl -X DELETE http://localhost:5177/api/v1/users/{userId}/skills/{skillId} \
  -H "Authorization: Bearer <token>"
```

---

## Skills (Master Data)

### List All Skills
```bash
curl -X GET http://localhost:5177/api/v1/skills \
  -H "Authorization: Bearer <token>"
```

### Get Skill by ID
```bash
curl -X GET http://localhost:5177/api/v1/skills/{skillId} \
  -H "Authorization: Bearer <token>"
```

### Create Skill
```bash
curl -X POST http://localhost:5177/api/v1/skills \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Python",
    "category": "Technical",
    "description": "Python programming language"
  }'
```

### Update Skill
```bash
curl -X PUT http://localhost:5177/api/v1/skills/{skillId} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Python 3",
    "category": "Technical",
    "description": "Python 3.x programming language"
  }'
```

### Delete Skill
```bash
curl -X DELETE http://localhost:5177/api/v1/skills/{skillId} \
  -H "Authorization: Bearer <token>"
```

---

## Departments

### List All Departments
```bash
curl -X GET http://localhost:5177/api/v1/departments \
  -H "Authorization: Bearer <token>"
```

### Get Department by ID
```bash
curl -X GET http://localhost:5177/api/v1/departments/{departmentId} \
  -H "Authorization: Bearer <token>"
```

### Create Department
```bash
curl -X POST http://localhost:5177/api/v1/departments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Data Science",
    "code": "DS",
    "description": "Data Science and Analytics"
  }'
```

### Update Department
```bash
curl -X PUT http://localhost:5177/api/v1/departments/{departmentId} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Data Science",
    "code": "DS",
    "description": "Data Science Department"
  }'
```

### Delete Department
```bash
curl -X DELETE http://localhost:5177/api/v1/departments/{departmentId} \
  -H "Authorization: Bearer <token>"
```

### Get Department Dashboard
```bash
curl -X GET http://localhost:5177/api/v1/departments/{departmentId}/dashboard \
  -H "Authorization: Bearer <token>"
```

---

## Projects

### Get Project Dashboard
```bash
curl -X GET http://localhost:5177/api/v1/projects/dashboard \
  -H "Authorization: Bearer <token>"
```

### List All Projects
```bash
curl -X GET http://localhost:5177/api/v1/projects \
  -H "Authorization: Bearer <token>"
```

### Get Project by ID
```bash
curl -X GET http://localhost:5177/api/v1/projects/{projectId} \
  -H "Authorization: Bearer <token>"
```

### Create Project
```bash
curl -X POST http://localhost:5177/api/v1/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "New Mobile App",
    "description": "Build a new mobile application",
    "category": "Development",
    "plannedStartDate": "2026-05-01T00:00:00Z",
    "plannedEndDate": "2026-08-01T00:00:00Z",
    "plannedBudget": 50000,
    "departmentId": "00000000-0000-0000-0000-000000000000",
    "projectManagerId": "00000000-0000-0000-0000-000000000000",
    "priority": "High"
  }'
```

### Update Project
```bash
curl -X PUT http://localhost:5177/api/v1/projects/{projectId} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Mobile App v2",
    "description": "Updated description",
    "category": "Development",
    "plannedStartDate": "2026-05-01T00:00:00Z",
    "plannedEndDate": "2026-09-01T00:00:00Z",
    "plannedBudget": 60000,
    "priority": "Critical"
  }'
```

### Update Project Status
```bash
curl -X PATCH http://localhost:5177/api/v1/projects/{projectId}/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "newStatus": "InProgress",
    "justification": "Starting the project as per client request"
  }'
```

### Get Project Progress
```bash
curl -X GET http://localhost:5177/api/v1/projects/{projectId}/progress \
  -H "Authorization: Bearer <token>"
```

### Upload Project Document
```bash
curl -X POST http://localhost:5177/api/v1/projects/{projectId}/documents \
  -H "Authorization: Bearer <token>" \
  -F "file=@document.pdf"
```

### Delete Project
```bash
curl -X DELETE http://localhost:5177/api/v1/projects/{projectId} \
  -H "Authorization: Bearer <token>"
```

---

## Tasks

### Get Task by ID
```bash
curl -X GET http://localhost:5177/api/v1/tasks/{taskId} \
  -H "Authorization: Bearer <token>"
```

### Create Task
```bash
curl -X POST http://localhost:5177/api/v1/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "projectId": "00000000-0000-0000-0000-000000000000",
    "title": "Design database schema",
    "description": "Design the database schema for the new module",
    "priority": "High",
    "startDate": "2026-05-01T00:00:00Z",
    "dueDate": "2026-05-15T00:00:00Z",
    "estimatedHours": 16
  }'
```

### Assign Task
```bash
curl -X POST http://localhost:5177/api/v1/tasks/{taskId}/assign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"userId": "00000000-0000-0000-0000-000000000000"}'
```

### Update Task Progress
```bash
curl -X PATCH http://localhost:5177/api/v1/tasks/{taskId}/progress \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"progressPercentage": 50, "completionNotes": "Schema design completed"}'
```

### Escalate Task
```bash
curl -X POST http://localhost:5177/api/v1/tasks/{taskId}/escalate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"reason": "Task is overdue and needs attention"}'
```

---

## Notifications

### Get User Notifications
```bash
curl -X GET http://localhost:5177/api/v1/notifications \
  -H "Authorization: Bearer <token>"
```

---

## AI Features

### Get Project Health Analysis
```bash
curl -X GET http://localhost:5177/api/v1/projects/{projectId}/ai/health \
  -H "Authorization: Bearer <token>"
```

### Get Project AI Insights
```bash
curl -X GET http://localhost:5177/api/v1/projects/{projectId}/ai/insights \
  -H "Authorization: Bearer <token>"
```

### Optimize Resource Allocation
```bash
curl -X POST http://localhost:5177/api/v1/projects/{projectId}/ai/optimize-resources \
  -H "Authorization: Bearer <token>"
```

### AI Chat
```bash
curl -X POST http://localhost:5177/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"message": "What is the status of Project X?"}'
```

### Trigger AI Training
```bash
curl -X POST http://localhost:5177/api/v1/ai/train \
  -H "Authorization: Bearer <token>"
```

---

## Seeded Users
| Email | Password | Role |
|-------|----------|------|
| admin@pmwds.com | Admin@12345! | SuperAdmin |
| manager@pmwds.com | Admin@12345! | ProjectManager |
| head@pmwds.com | Admin@12345! | DepartmentHead |
| lead@pmwds.com | Admin@12345! | TeamLead |
| member@pmwds.com | Admin@12345! | TeamMember |
| viewer@pmwds.com | Admin@12345! | TeamMember |

## Seeded Skills
C#, .NET, React, SQL Server, SQLite, Azure, Project Management, Agile, Testing, DevOps

## User Skill Proficiency Levels
1. Beginner
2. Intermediate
3. Advanced
4. Expert
5. Master