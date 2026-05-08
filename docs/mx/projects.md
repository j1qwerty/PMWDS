# PMWDS Projects Page Documentation

## Current UI Structure Overview

This document outlines the Projects page elements, API calls, fields, and UI components.

---

## 1. PROJECTS PAGE

**File:** `Client/src/pages.tsx` (Lines 327-556)

### API Calls

| Endpoint | Function | Description |
|----------|----------|-------------|
| GET /projects | `api.getProjects` | Fetch all projects |
| GET /departments | `api.getDepartments` | Fetch all departments |
| GET /users | `api.getUsers` | Fetch all users (Admin only) |
| GET /projects/{id}/milestones | `api.getMilestonesByProject` | Fetch milestones for selected project |
| GET /projects/{id}/insights | `api.getProjectInsights` | Fetch AI insights for project |
| GET /projects/{id}/health | `api.getProjectHealth` | Fetch health metrics (Admin only) |
| POST /projects | `api.createProject` | Create new project |
| PUT /projects/{id}/status | `api.updateProjectStatus` | Update project status |
| POST /projects/{id}/documents | `api.uploadProjectDocument` | Upload project document |
| DELETE /projects/{id} | `api.deleteProject` | Delete project (SuperAdmin only) |
| POST /projects/{id}/milestones | `api.createMilestone` | Create milestone for project |

### UI Elements

**A. Portfolio Board Panel**

Left Column - Project List:
- Dropdown to select active project
- SimpleProjectCards component showing all projects
- Click to select/deselect project

Right Column - Project Details (when selected):
- Project name (h4)
- Description text
- MetricRow components:
  - Budget (plannedBudget)
  - Actual Cost (actualCost)
  - Progress (progressPercentage)
  - Health (aiHealthScore)
  - Delay Risk (aiDelayRiskScore)
  - Status (status)
  - Department (departmentName)
- Status buttons (conditional - Admins only)
- AI Insights tags (inline spans)
- Health tiles grid (schedule, budget, team, quality)
- File upload input + Upload Document button
- Delete Project button (SuperAdmin only)

**B. Create Project Panel** (Admin only)
- Form fields:
  - Project Code (text input)
  - Name (text input)
  - Description (textarea)
  - Category (text input)
  - Start Date (date input)
  - End Date (date input)
  - Budget (number input)
  - Priority (select: Low, Medium, High, Critical)
  - Department (select dropdown)
  - Project Manager (select dropdown)
- Submit button: "Create Project"

**C. Create Milestone Panel** (Admin only, requires selected project)
- Form fields:
  - Name (text input)
  - Due Date (date input)
  - Description (textarea)
  - Order (number input)
  - Critical (checkbox)
- Submit button: "Create Milestone"

---

## 2. TASKS PAGE (From Projects Context)

**File:** `Client/src/pages.tsx` (Lines 558-607)

### API Calls

| Endpoint | Function | Description |
|----------|----------|-------------|
| GET /projects | `api.getProjects` | Fetch all projects |
| GET /available-users | `api.getAvailableUsers` | Fetch available users |
| GET /projects/{id}/tasks | `api.getTasksByProject` | Fetch tasks by project |
| GET /my-tasks | `api.getMyTasks` | Fetch current user tasks |
| GET /tasks/{id}/recommendation | `api.getTaskRecommendation` | Get AI recommendation |
| GET /tasks/{id}/delay-prediction | `api.getTaskDelayPrediction` | Get delay prediction |
| PUT /tasks/{id}/status | `api.updateTaskStatus` | Update task status |
| PUT /tasks/{id}/progress | `api.updateTaskProgress` | Update progress |
| POST /tasks | `api.createTask` | Create new task |
| PUT /tasks/{id} | `api.updateTask` | Update task |
| DELETE /tasks/{id} | `api.deleteTask` | Delete task |

### Task Form Fields

| Field | Type | Required | Notes |
|-------|------|---------|-------|
| title | string | Yes | Task title |
| description | string | No | Task description |
| startDate | string | No | ISO date string |
| dueDate | string | No | ISO date string |
| estimatedHours | number | Default: 8 | Estimated hours |
| projectId | string | Yes | Associated project |
| milestoneId | string \| null | No | Associated milestone (optional) |
| parentTaskId | string \| null | No | Parent task for subtasks |
| assignedToUserId | string | No | Assigned user |
| priority | string | Default: "Medium" | Low/Medium/High/Critical |

### Task Display Fields

- Title (h4)
- Description
- MetricRow components:
  - Project (projectName)
  - Assignee (assignedToUserName)
  - Progress (progressPercentage)
  - Priority
  - Due (dueDate)
  - Delay Risk (aiDelayProbability)
- Status buttons (NotStarted, Assigned, InProgress, OnHold, Completed, Delayed, Cancelled)
- Progress update form (percentage slider, notes input)
- Timer section

### Task Statuses
- NotStarted
- Assigned
- InProgress
- OnHold
- Completed
- Delayed
- Cancelled

### Task Priorities
- Low
- Medium
- High
- Critical

---

## 3. PROJECT/ TASK RELATIONSHIP

### Current Implementation

Tasks can be associated with:
1. **Project** (required) - Every task must belong to a project
2. **Milestone** (optional) - Tasks can be grouped under milestones
3. **Parent Task** (optional) - Tasks can have subtasks

### Milestone Behavior

- Tasks with `milestoneId` = milestone ID → Grouped under that milestone
- Tasks with `milestoneId` = null → Isolated/ungrouped tasks
- Milestones are project-specific

### Creating Tasks Without Milestone

Currently the form allows milestoneId to be null:
```typescript
const [form, setForm] = useState({ 
  ...,
  milestoneId: null as string | null,
  ...
});
```

When submitting:
```typescript
const payload = { 
  ...form, 
  milestoneId: form.milestoneId || null,  // Allows null for no milestone
  parentTaskId: null,
  assignedToUserId: form.assignedToUserId || null 
};
```

### Task Filtering by Milestone

Tasks can be filtered/displayed in two ways:
1. **Grouped by Milestone** - Tasks under each milestone
2. **Isolated Tasks** - Tasks without milestone assignment

---

## 4. BUTTONS & INTERACTIONS

### Project Page Buttons

| Button | Location | Roles | Action |
|--------|---------|------|--------|
| Status buttons | Project details | Admin | Change project status |
| Upload Document | Project details | All | Upload file |
| Delete Project | Project details | SuperAdmin | Delete project |
| Create Project | Form panel | Admin | Submit project form |
| Create Milestone | Form panel | Admin | Submit milestone form |

### Task Page Buttons

| Button | Location | Roles | Action |
|--------|---------|------|--------|
| Status buttons | Task details | All | Change task status |
| Update Progress | Task details | All | Submit progress form |
| Add Comment | Task details | All | Submit comment |
| Start Timer | Task details | All | Start timer |
| Stop Timer | Task details | All | Stop timer |

---

## 5. DATA TYPES

### Project Fields

```typescript
interface Project {
  id: string;
  projectCode: string;
  name: string;
  description?: string;
  category: string;
  status: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  plannedBudget: number;
  actualCost: number;
  progressPercentage: number;
  aiHealthScore: number;
  aiDelayRiskScore: number;
  departmentId?: string;
  departmentName?: string;
  projectManagerId?: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}
```

### Task Fields

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  progressPercentage: number;
  priority: string;
  startDate?: string;
  dueDate?: string;
  estimatedHours: number;
  projectId: string;
  projectName?: string;
  milestoneId?: string | null;
  parentTaskId?: string | null;
  assignedToUserId?: string;
  assignedToUserName?: string;
  aiDelayProbability: number;
  createdAt: string;
  updatedAt: string;
}
```

### Milestone Fields

```typescript
interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  dueDate: string;
  order: number;
  isCritical: boolean;
  isCompleted: boolean;
  createdAt: string;
}
```

---

## 6. COMPONENTS USED

### Project Components
- SimpleProjectCards - Project list display
- SimpleProjectList - Project list (alternative)
- MetricRow - Key-value display row
- MetricTile - Single metric tile

### Task Components
- TaskList - Task list with selection
- TaskFormDialog - Task creation/editing modal

### Common Components
- Panel - Section container
- EmptyState - Empty state message
- Notice - Status message

---

## 7. ROLE-BASED VISIBILITY

| Section | SuperAdmin | ProjectManager | DepartmentHead | TeamLead | TeamMember | Viewer |
|--------|----------|-------------|---------------|---------|----------|--------|
| Create Project | Yes | Yes | Yes | No | No | No |
| Delete Project | Yes | No | No | No | No | No |
| Create Milestone | Yes | Yes | Yes | No | No | No |
| Project Health | Yes | Yes | Yes | No | No | No |
| All Users | Yes | Yes | Yes | Yes | No | No |

---