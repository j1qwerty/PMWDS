Here is a **fully updated, production-grade AI agent prompt** for your PMWDS frontend that incorporates **all newly added APIs (Skills, extended Users, AI training, Reports, Documents, advanced Notifications, Milestones, etc.)** and aligns with your **Kinetic Archive design system**.

---

# PMWDS Frontend — AI Agent Master Prompt (v2.0 Expanded)

## 1. Project Overview

PMWDS (Project Monitoring Work Distribution System) is an enterprise-grade platform for:

* Project lifecycle tracking
* Task orchestration
* Workforce optimization
* AI-driven predictive analytics

The frontend must deliver a **high-density, premium UX** based on **The Kinetic Archive design philosophy** .

---

## 2. Technology Stack

* React 18 + TypeScript
* Vite
* React Router DOM v6
* CSS Modules + Global CSS Variables
* Fetch API (no axios unless justified)
* Context API (Auth + Global State)

---

## 3. Updated Project Structure

```
client/
├── src/
│   ├── api.ts              # FULL API client (150+ endpoints)
│   ├── types.ts            # All domain models
│   ├── auth.tsx            # Auth context + RBAC
│   ├── layout.tsx          # Sidebar + Topbar
│   ├── App.tsx             # Routes
│   ├── pages/
│   │   ├── dashboard/
│   │   ├── projects/
│   │   ├── tasks/
│   │   ├── users/
│   │   ├── departments/
│   │   ├── skills/
│   │   ├── notifications/
│   │   ├── ai/
│   │   ├── reports/
│   │   └── settings/
│   ├── ui/                 # Design system components
│   ├── hooks/              # Custom hooks
│   ├── utils/
│   ├── index.css
│   └── App.css
```

---

## 4. API Integration (FULL — Updated)

Base URL:

```
VITE_API_BASE_URL=http://localhost:5177/api/v1
```

---

### 4.1 Authentication

* POST `/Auth/login`
* POST `/Auth/refresh`
* POST `/Auth/change-password`

---

### 4.2 Departments

* GET `/departments`
* GET `/departments/:id`
* GET `/departments/:id/dashboard`
* POST `/departments`
* PUT `/departments/:id`
* DELETE `/departments/:id`

---

### 4.3 Users (Extended)

* GET `/users?departmentId=`
* GET `/users/me`
* GET `/users/:id`
* POST `/users/register`
* PUT `/users/:id`
* PATCH `/users/:id/availability`
* PATCH `/users/:id/deactivate`
* GET `/users/available`
* GET `/users/workload?departmentId=`

#### Skills on User

* POST `/users/:id/skills`
* PUT `/users/:id/skills/:skillId`
* DELETE `/users/:id/skills/:skillId`

---

### 4.4 Skills (NEW MODULE)

* GET `/skills`
* GET `/skills/:id`
* POST `/skills`
* PUT `/skills/:id`
* DELETE `/skills/:id`

---

### 4.5 Projects (Enhanced)

* GET `/projects`
* GET `/projects/dashboard`
* GET `/projects/:id`
* POST `/projects`
* PUT `/projects/:id`
* PATCH `/projects/:id/status`
* DELETE `/projects/:id`

#### Project Analytics

* GET `/projects/:id/progress`
* GET `/projects/:id/ai/health`
* GET `/projects/:id/ai/insights`
* POST `/projects/:id/ai/optimize-resources`

#### Documents (NEW)

* POST `/projects/:id/documents` (file upload)

---

### 4.6 Milestones (Expanded)

* GET `/milestones/by-project/:projectId`
* GET `/milestones/:id`
* POST `/milestones`
* PUT `/milestones/:id`
* PATCH `/milestones/:id/complete`
* DELETE `/milestones/:id`

---

### 4.7 Tasks (Full Engine)

* GET `/tasks/by-project/:projectId`

* GET `/tasks/my-tasks`

* GET `/tasks/overdue`

* GET `/tasks/escalated`

* GET `/tasks/unassigned`

* POST `/tasks`

* PUT `/tasks/:id`

#### Task Actions

* PATCH `/tasks/:id/progress`
* PATCH `/tasks/:id/status`
* POST `/tasks/:id/assign`
* POST `/tasks/:id/escalate`

#### AI

* GET `/tasks/:id/ai/recommend-assignee`
* GET `/tasks/:id/ai/delay-prediction`

#### Collaboration

* POST `/tasks/:id/comments`

#### Time Tracking

* POST `/tasks/:id/time/start`
* POST `/tasks/:id/time/stop`

---

### 4.8 Notifications (Advanced)

* GET `/notifications?unreadOnly=&page=&pageSize=`
* GET `/notifications/unread-count`
* PATCH `/notifications/:id/read`
* PATCH `/notifications/read-all`
* DELETE `/notifications/:id`

#### Broadcast

* POST `/notifications/broadcast`

---

### 4.9 AI (Expanded + Training)

* GET `/ai/recommend-assignee/:taskId`
* GET `/ai/predict-delay/:taskId`
* GET `/ai/project-health/:projectId`
* POST `/ai/optimize-resources/:projectId`
* GET `/ai/burnout-risk?departmentId=`
* GET `/ai/insights/:projectId`

#### Chat

* POST `/ai/chat`

#### NEW

* POST `/ai/train`

---

### 4.10 Reports (FULL MODULE)

#### Project Reports

* GET `/reports/project-status/:projectId?format=pdf|excel`

#### Task Reports

* POST `/reports/task-completion?format=pdf`

#### Department Reports

* POST `/reports/department-workload?format=pdf`

#### Financial

* GET `/reports/budget-variance/:projectId?format=excel`

#### AI Reports

* GET `/reports/ai-insights/:projectId?format=pdf`

#### Risk Reports

* POST `/reports/delay-analysis?format=pdf`

---

## 5. Frontend Responsibilities

### API Client (`api.ts`)

* Centralized fetch wrapper
* Token injection
* Auto refresh before expiry
* Typed responses

---

## 6. Core Pages (Updated Scope)

### Dashboard

* Department-aware filtering
* AI KPIs
* Risk heatmaps
* Workload distribution

---

### Projects

* CRUD + Status transitions
* Document upload UI
* AI health + insights
* Milestones panel

---

### Tasks

* Kanban + List hybrid
* Timer controls
* Escalation UI
* AI insights panel

---

### Users

* Skill matrix view
* Workload charts
* Availability slider
* Burnout indicators

---

### Skills (NEW PAGE)

* CRUD skills
* Categorization
* Skill assignment mapping

---

### Departments

* Hierarchical view
* Capacity utilization
* Budget tracking

---

### Notifications

* Inbox with pagination
* Real-time badge count
* Broadcast UI

---

### AI Center

* Chat interface
* Model testing (future ready)
* Burnout analytics
* Project intelligence dashboards
* Manual training trigger UI

---

### Reports

* Filter panels
* Download manager
* Format selection (PDF/Excel)

---

## 7. RBAC Enforcement

Implement strict guards:

```ts
hasRole("SuperAdmin")
hasRole("ProjectManager")
```

* Route-level protection
* Component-level rendering control

---

## 8. Design System Enforcement (CRITICAL)

Follow **Kinetic Archive rules strictly**:

### DO NOT:

* Use borders for layout separation
* Use flat UI
* Use default tables

### MUST:

* Use layered surfaces
* Use tonal separation
* Use gradient primary actions
* Use glassmorphism for overlays

---

## 9. UI Component Requirements

### Mandatory Components

* Sidebar (collapsible)
* Topbar (notifications + breadcrumbs)
* Card system (multi-layer)
* Progress orbs
* Status beacons
* Data-dense tables (ghost borders only)

---

## 10. State & Data Handling

* Global Auth Context
* Local component state
* Optimistic updates for:

  * Task updates
  * Status changes
  * Comments

---

## 11. Error & Loading Strategy

* Skeleton loaders (not spinners)
* Inline errors (no alerts)
* Retry mechanisms for API failures

---

## 12. Performance Constraints

* Lazy load routes
* Memoize heavy components
* Virtualize long lists (tasks/users)

---

## 13. Deliverables for AI Agent

The AI must:

1. Generate complete `api.ts` with ALL endpoints
2. Create strongly typed `types.ts`
3. Build layout + navigation
4. Implement all pages
5. Enforce RBAC
6. Apply design system strictly
7. Ensure responsive behavior
8. Integrate AI features deeply (not superficial)

---

## 14. Non-Negotiable Standards

* No placeholder UI
* No incomplete API wiring
* No unused types
* No design shortcuts
* No inconsistent spacing

---