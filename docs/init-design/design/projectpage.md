# Project Page API Specification

## Current Implementation

### API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/projects` | GET | List all projects with optional filters |
| `/api/v1/projects/{id}` | GET | Get single project details |
| `/api/v1/projects` | POST | Create new project |
| `/api/v1/projects/{id}` | PUT | Update project |
| `/api/v1/projects/{id}/status` | PATCH | Update project status |
| `/api/v1/projects/{id}/progress` | GET | Get project progress |
| `/api/v1/projects/{id}/ai/insights` | GET | Get AI-generated insights |
| `/api/v1/projects/{id}/ai/health` | GET | Get AI health analysis |
| `/api/v1/projects/{id}/ai/optimize-resources` | POST | Optimize resource allocation |
| `/api/v1/projects/{id}/documents` | POST | Upload document |
| `/api/v1/projects/{id}` | DELETE | Delete project |
| `/api/v1/milestones/by-project/{projectId}` | GET | Get milestones by project |
| `/api/v1/milestones` | POST | Create milestone |
| `/api/v1/milestones/{id}` | PUT | Update milestone |
| `/api/v1/milestones/{id}/complete` | PATCH | Complete milestone |
| `/api/v1/milestones/{id}` | DELETE | Delete milestone |
| `/api/v1/departments` | GET | List all departments |
| `/api/v1/users` | GET | List all users |

---

## Expected Response Types

### Project List (GET /api/v1/projects)

```typescript
interface Project {
  id: string;                    // GUID
  projectCode: string;            // e.g., "MON-20250421-A1B2"
  name: string;
  description?: string | null;
  category: string;               // e.g., "Monitoring"
  status: string;                 // "NotStarted" | "InProgress" | "OnHold" | "Completed" | "Cancelled" | "Delayed"
  priority: string;               // "Low" | "Medium" | "High" | "Critical"
  plannedStartDate: string;       // ISO date string
  plannedEndDate: string;         // ISO date string
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  plannedBudget: number;          // Decimal
  actualCost: number;             // Decimal
  budgetVariance: number;         // plannedBudget - actualCost
  progressPercentage: number;     // 0-100
  aiHealthScore: number;          // 0-100
  aiDelayRiskScore: number;       // 0-1
  aiBudgetRiskScore: number;      // 0-1
  aiInsightsSummary?: string | null;
  departmentId: string;
  departmentName?: string | null;
  projectManagerId: string;
  projectManagerName?: string | null;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  createdDate: string;
}
```

### Create Project Request (POST /api/v1/projects)

```typescript
interface CreateProjectRequest {
  name: string;
  description?: string;
  category: string;
  plannedStartDate: string;       // ISO date
  plannedEndDate: string;          // ISO date
  plannedBudget: number;
  departmentId: string;
  projectManagerId: string;
  priority?: "Low" | "Medium" | "High" | "Critical";  // default: Medium
}
```

### Project Health (GET /api/v1/projects/{id}/ai/health)

```typescript
interface ProjectHealth {
  projectId: string;
  projectName: string;
  overallHealthScore: number;      // 0-100
  scheduleHealth: number;          // 0-100
  budgetHealth: number;            // 0-100
  teamHealth: number;              // 0-100
  qualityHealth: number;           // 0-100
  healthStatus: string;            // "Healthy" | "At Risk" | "Critical"
  strengths: string[];             // List of positive points
  weaknesses: string[];            // List of issues
  recommendations: string[];       // AI suggestions
  risks: Array<{
    category: string;
    description: string;
    probability: number;
    severity: string;
    mitigationStrategy: string;
  }>;
  generatedAt: string;              // ISO datetime
}
```

### Project Insights (GET /api/v1/projects/{id}/ai/insights)

```typescript
type ProjectInsights = string[];  // Array of insight strings
```

### Milestone

```typescript
interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description: string;
  order: number;
  dueDate: string;                 // ISO date
  completedDate?: string | null;
  status: string;                  // "NotStarted" | "InProgress" | "Completed"
  isCritical: boolean;
  progressPercentage: number;
}
```

### Create Milestone Request (POST /api/v1/milestones)

```typescript
interface CreateMilestoneRequest {
  projectId: string;
  name: string;
  description?: string;
  dueDate: string;
  order: number;
  isCritical?: boolean;
}
```

---

## UI Components Needed

### Current Project Page Features

1. **Project List/Selector**
   - Dropdown to select active project
   - Project cards showing summary info
   - Click to select and view details

2. **Project Details Panel**
   - Project name and description
   - Budget metrics (planned vs actual)
   - Progress percentage
   - AI health score
   - AI delay risk score

3. **AI Insights Section**
   - List of AI-generated insights
   - Only visible to Manager+ roles

4. **Project Health Section**
   - Overall health score
   - Schedule/Budget/Team/Quality health
   - Strengths and weaknesses
   - Recommendations
   - Risk factors
   - Only visible to Manager+ roles

5. **Milestones Section**
   - List of project milestones
   - Add new milestone form
   - Mark complete functionality

6. **Project Actions**
   - Update status
   - Optimize resources (AI)
   - Upload documents

7. **Create Project Form**
   - Project name
   - Description
   - Category
   - Start/End dates
   - Budget
   - Department
   - Project Manager
   - Priority

---

## Role-Based Access

| Feature | Viewer | TeamMember | TeamLead | DepartmentHead | ProjectManager | SuperAdmin |
|---------|--------|-------------|----------|---------------|----------------|------------|
| View projects | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View AI insights | - | - | - | - | ✓ | ✓ |
| View AI health | - | - | - | - | ✓ | ✓ |
| Create projects | - | - | - | - | ✓ | ✓ |
| Update projects | - | - | - | - | ✓ | ✓ |
| Delete projects | - | - | - | - | - | ✓ |
| Manage milestones | - | - | ✓ | ✓ | ✓ | ✓ |
| Optimize resources | - | - | - | - | ✓ | ✓ |
| Upload documents | - | ✓ | ✓ | ✓ | ✓ | ✓ |
| View all users | - | - | - | ✓ | ✓ | ✓ |

---

## Error Handling

All endpoints return:
- `200 OK` on success
- `400 Bad Request` for validation errors
- `401 Unauthorized` for invalid/missing auth
- `403 Forbidden` for insufficient permissions
- `404 Not Found` for missing resources
- `500 Internal Server Error` for server issues

Error response format:
```typescript
{
  message: string;  // Human-readable error message
}
```
