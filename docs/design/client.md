# PMWDS Frontend - AI Agent Prompt

## Project Overview

PMWDS (Project Monitoring Work Distribution System) is a comprehensive project monitoring and task management platform with AI-powered insights. This document provides a complete prompt for an AI agent to build or enhance the React frontend.

## Technology Stack

- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Routing:** React Router DOM v6
- **Styling:** Custom CSS (CSS Modules approach with global CSS variables)
- **API Communication:** REST via fetch API

## Project Structure

```
client/
├── src/
│   ├── api.ts          # All API endpoints (80+ methods)
│   ├── types.ts        # TypeScript interfaces
│   ├── auth.tsx        # Authentication context
│   ├── layout.tsx      # Main layout component
│   ├── App.tsx         # Router configuration
│   ├── pages.tsx       # All page components
│   ├── ui.tsx          # Reusable UI components
│   ├── index.css      # Global styles
│   └── App.css        # App-specific styles
├── package.json
└── vite.config.ts
```

## Roles & Permissions

| Role | Dashboard | Projects | Tasks | Users | Departments | Inbox | AI | Reports | Settings |
|------|-----------|----------|-------|-------|-------------|-------|-----|---------|----------|
| SuperAdmin | ✓ | Full | Full | Full | Full | ✓ | Full | Full | ✓ |
| ProjectManager | ✓ | Full | Full | Limited | Full | ✓ | Full | Full | ✓ |
| DepartmentHead | ✓ | View/Create | Full | Limited | Full | ✓ | Limited | Full | ✓ |
| TeamLead | ✓ | View | Full | View | - | ✓ | - | - | ✓ |
| TeamMember | ✓ | View | Own | - | - | ✓ | - | - | ✓ |
| Viewer | ✓ | View | View | - | - | ✓ | - | - | ✓ |

## API Endpoints Summary

### Authentication
- `POST /api/v1/auth/login` - Login with email/password
- `POST /api/v1/auth/refresh` - Refresh token

### Dashboard
- `GET /api/v1/projects/dashboard` - Get dashboard data with metrics

### Projects
- `GET /api/v1/projects` - List projects
- `GET /api/v1/projects/:id` - Get project details
- `POST /api/v1/projects` - Create project
- `PUT /api/v1/projects/:id` - Update project
- `PATCH /api/v1/projects/:id/status` - Update project status
- `GET /api/v1/projects/:id/progress` - Get project progress
- `GET /api/v1/projects/:id/ai/insights` - Get AI insights
- `GET /api/v1/projects/:id/ai/health` - Get AI health score
- `POST /api/v1/projects/:id/ai/optimize-resources` - Optimize resources
- `DELETE /api/v1/projects/:id` - Delete project

### Milestones
- `GET /api/v1/milestones/by-project/:projectId` - Get milestones
- `POST /api/v1/milestones` - Create milestone
- `PUT /api/v1/milestones/:id` - Update milestone
- `PATCH /api/v1/milestones/:id/complete` - Complete milestone
- `DELETE /api/v1/milestones/:id` - Delete milestone

### Tasks
- `GET /api/v1/tasks/by-project/:projectId` - Get tasks by project
- `GET /api/v1/tasks/my-tasks` - Get current user's tasks
- `GET /api/v1/tasks/overdue` - Get overdue tasks
- `GET /api/v1/tasks/escalated` - Get escalated tasks
- `GET /api/v1/tasks/unassigned` - Get unassigned tasks
- `POST /api/v1/tasks` - Create task
- `PUT /api/v1/tasks/:id` - Update task
- `PATCH /api/v1/tasks/:id/progress` - Update progress
- `PATCH /api/v1/tasks/:id/status` - Update status
- `POST /api/v1/tasks/:id/assign` - Assign task
- `GET /api/v1/tasks/:id/ai/recommend-assignee` - AI recommendation
- `GET /api/v1/tasks/:id/ai/delay-prediction` - Delay prediction
- `POST /api/v1/tasks/:id/escalate` - Escalate task
- `POST /api/v1/tasks/:id/comments` - Add comment
- `POST /api/v1/tasks/:id/time/start` - Start timer
- `POST /api/v1/tasks/:id/time/stop` - Stop timer

### Users
- `GET /api/v1/users` - List users
- `GET /api/v1/users/me` - Get current user
- `GET /api/v1/users/available` - Get available users
- `GET /api/v1/users/workload` - Get workload report
- `POST /api/v1/users/register` - Register user
- `PATCH /api/v1/users/:id/availability` - Update availability
- `POST /api/v1/users/:id/skills` - Add skill
- `PATCH /api/v1/users/:id/deactivate` - Deactivate user

### Departments
- `GET /api/v1/departments` - List departments
- `GET /api/v1/departments/:id/dashboard` - Department dashboard
- `POST /api/v1/departments` - Create department
- `PUT /api/v1/departments/:id` - Update department
- `DELETE /api/v1/departments/:id` - Delete department

### Notifications
- `GET /api/v1/notifications` - Get notifications
- `GET /api/v1/notifications/unread-count` - Unread count
- `PATCH /api/v1/notifications/:id/read` - Mark read
- `PATCH /api/v1/notifications/read-all` - Mark all read
- `DELETE /api/v1/notifications/:id` - Delete notification
- `POST /api/v1/notifications/broadcast` - Broadcast notification

### AI
- `GET /api/v1/ai/providers` - Get AI providers
- `GET /api/v1/ai/providers/:provider/models` - Search models
- `POST /api/v1/ai/providers/:provider/test` - Test provider
- `POST /api/v1/ai/chat` - Chat with AI
- `GET /api/v1/ai/burnout-risk` - Burnout risk analysis
- `GET /api/v1/ai/insights/:projectId` - Project insights
- `GET /api/v1/ai/project-health/:projectId` - Project health
- `POST /api/v1/ai/optimize-resources/:projectId` - Optimize resources
- `GET /api/v1/ai/predict-delay/:taskId` - Predict delay

### Reports
- Downloads available via `GET /api/v1/reports/*`

## Core Data Types

```typescript
type Role = "SuperAdmin" | "ProjectManager" | "DepartmentHead" | "TeamLead" | "TeamMember" | "Viewer";

interface AuthResponse {
  token: string;
  expiry: string;
  userId: string;
  fullName: string;
  email: string;
  roles: Role[];
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  jobTitle?: string;
  department?: string;
  departmentId?: string;
  availabilityStatus: string;
  availabilityPercentage: number;
  aiWorkloadScore: number;
  aiBurnoutRiskScore: number;
  aiPerformanceScore: number;
  activeTaskCount: number;
  isActive: boolean;
  roles: string[];
  skills: string[];
}

interface Project {
  id: string;
  projectCode: string;
  name: string;
  description?: string;
  category: string;
  status: string;
  priority: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  plannedBudget: number;
  actualCost: number;
  budgetVariance: number;
  progressPercentage: number;
  aiHealthScore: number;
  aiDelayRiskScore: number;
  aiBudgetRiskScore: number;
  departmentId: string;
  departmentName?: string;
  projectManagerId: string;
  projectManagerName?: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  startDate: string;
  dueDate: string;
  completedDate?: string;
  estimatedHours: number;
  actualHours: number;
  progressPercentage: number;
  projectId: string;
  projectName?: string;
  milestoneId?: string;
  milestoneName?: string;
  assignedToUserId?: string;
  assignedToUserName?: string;
  isEscalated: boolean;
  escalationLevel: number;
  aiDelayProbability: number;
  aiRiskFactors?: string;
  isOverdue: boolean;
}

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentDepartmentId?: string;
  departmentHeadUserId?: string;
  maxCapacity: number;
  capacityUtilization: number;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  createdDate: string;
  readDate?: string;
  actionUrl?: string;
}

interface DashboardData {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  escalatedTasks: number;
  totalTeamMembers: number;
  availableMembers: number;
  overallHealthScore: number;
  overallDelayRisk: number;
  totalBudget: number;
  totalActualCost: number;
  budgetVariance: number;
  highRiskProjects: ProjectSummary[];
  recentEscalations: Task[];
  projectHealthBreakdown: HealthItem[];
  workloadDistribution: WorkloadItem[];
  taskCompletionTrend: TrendItem[];
}

interface ProjectHealth {
  projectId: string;
  projectName: string;
  overallHealthScore: number;
  scheduleHealth: number;
  budgetHealth: number;
  teamHealth: number;
  qualityHealth: number;
  healthStatus: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  risks: RiskItem[];
}

interface DelayPrediction {
  taskId: string;
  delayProbability: number;
  expectedDelayDays: number;
  predictedCompletionDate: string;
  riskLevel: string;
  contributingFactors: string[];
  mitigationStrategies: string[];
  shouldEscalate: boolean;
}
```

## UI Component Requirements

### Layout
- Fixed sidebar (240px width) with navigation
- Top bar (56px height) with breadcrumbs and notifications
- Main content area with padding
- Responsive design (mobile: sidebar collapses)

### Dashboard Components
- Hero panel with key metrics
- Stat cards (4-column grid)
- Task list (user's tasks)
- Notification list
- Project list (high risk)
- Workload bars
- Overdue tasks (role-restricted)

### Page Features

#### Projects Page
- Project cards/list view
- Project detail panel
- Milestone management
- AI insights display
- Project health grid
- File upload
- Status update buttons

#### Tasks Page
- Task list by project
- Task detail panel
- Progress update slider
- AI assignee recommendation
- Delay prediction
- Timer controls
- Comment system

#### Users Page
- User table with metrics
- Workload visualization
- User registration (SuperAdmin)
- Skill management
- Availability controls

#### Departments Page
- Department list
- Department dashboard
- Department creation/editing

#### Notifications Page
- Notification inbox
- Mark read/delete
- Broadcast (SuperAdmin)

#### AI Page
- Provider selection
- Model search
- Test provider
- Chat interface
- Project health view
- Delay prediction
- Burnout risk analysis

#### Reports Page
- Filter controls
- Report generation buttons
- Download functionality

## Styling Guidelines

### Color Palette
```
--bg: #0f0f14 (main background)
--bg-subtle: #18181f (elevated surfaces)
--bg-elevated: #1e1e28 (cards, inputs)
--border: #2a2a3a (borders)
--accent: #6366f1 (primary actions)
--text: #e2e2ec (text)
--text-muted: #8888a0 (secondary text)
--text-h: #fff (headings)
--success: #10b981 (positive)
--warning: #f59e0b (warning)
--danger: #ef4444 (danger)
```

### Component Styles
- Border radius: 6-8px
- Spacing: multiples of 4px (base unit)
- Font: Inter or system-ui
- Icons: inline SVG

## Implementation Checklist

- [ ] Set up Vite + React + TypeScript
- [ ] Create API client with all endpoints
- [ ] Implement authentication (login, logout, token refresh)
- [ ] Build layout with sidebar navigation
- [ ] Create Dashboard page with all widgets
- [ ] Create Projects page with CRUD operations
- [ ] Create Tasks page with full management
- [ ] Create Users page with management
- [ ] Create Departments page
- [ ] Create Notifications page
- [ ] Create AI Insights page
- [ ] Create Reports page
- [ ] Create Settings page
- [ ] Add role-based access control
- [ ] Implement loading/error states
- [ ] Add responsive design

## Common Issues & Solutions

1. **API Base URL:** Set via `VITE_API_BASE_URL` environment variable
2. **CORS:** Ensure backend allows frontend origin
3. **Token Expiry:** Uses automatic refresh 1 minute before expiry
4. **Role Checks:** Use `hasRole()` from auth context
5. **Form Validation:** Server-side validation, display error messages

## Key Files to Modify

- `src/api.ts` - Add new endpoints
- `src/types.ts` - Add new types
- `src/pages.tsx` - Add new pages
- `src/ui.tsx` - Add new components
- `src/index.css` - Add new styles
- `src/layout.tsx` - Modify navigation7
