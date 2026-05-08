# PMWDS Dashboard UI Documentation

## Current UI Structure Overview

This document outlines the current sidebar, top bar, and dashboard elements along with improvement suggestions for a complete UI redesign.

---

## 1. SIDEBAR (Left Navigation)

### Current Structure

**File:** `Client/src/layout.tsx`

#### Header
- Company logo/app name: "PMWDS" with accent dot indicator
- Fixed width: 240px (w-60)

#### Navigation Items (Grouped Sections)

**Navigation Section:**
| Label | Route | Icon | Roles |
|-------|------|------|-------|
| Dashboard | / | home | All |
| Projects | /projects | projects | All |
| Milestones | /milestones | projects | All |
| Tasks | /tasks | tasks | All |
| Inbox | /notifications | inbox | All |

**People Section:**
| Label | Route | Icon | Roles |
|-------|------|------|-------|
| Organizations | /organizations | organization | Admins |
| Departments | /departments | departments | Admins |
| Users | /users | users | Admins/TeamLead |
| Profiles | /profiles | users | Admins/TeamLead |
| Roles and permissions | /roles | users | SuperAdmin |

**Resources Section:**
| Label | Route | Icon | Roles |
|-------|------|------|-------|
| Skills | /skills | skill | Admins/TeamLead |
| Knowledge | /knowledge | knowledge | All |
| AI Insights | /ai | ai | Admins |
| Reports | /reports | reports | Admins |

**System Section:**
| Label | Route | Icon | Roles |
|-------|------|------|-------|
| Activity Logs | /activity-logs | activity | All |
| Settings | /settings | settings | All |

#### User Profile Section (Bottom)
- User avatar/initials in circle
- User full name
- User roles listed
- Logout button

### Issues/Observations
- Group headers use small text (text-[0.64rem]) with uppercase tracking
- Active state shows light blue background with ring
- Notification badge shows red dot for unread items
- No collapse/expand functionality

### Suggested Improvements
1. Add collapse/expand toggle button to minimize sidebar
2. Add tooltips showing full names when collapsed
3. Add hover tooltips with descriptions for each menu item
4. Group similar items with expandable sub-menus
5. Add keyboard shortcuts display on hover
6. Show active page breadcrumb trail
7. Add drag-to-reorder customization for frequently used items
8. Add favorite/starred items section at top

---

## 2. TOP BAR (Header)

### Current Structure

**File:** `Client/src/layout.tsx`

#### Left Section
- Current page title displayed (dynamic from route)

#### Right Section
- Notification bell icon with unread count badge
- Click navigates to /notifications

### Issues/Observations
- Very minimal header
- No search functionality
- No quick actions dropdown
- No user avatar dropdown
- No breadcrumbs

### Suggested Improvements
1. Add global search bar with Cmd+K shortcut hint
2. Add breadcrumb navigation
3. Add user avatar with dropdown menu (profile, settings, logout)
4. Add quick actions menu (+ New Task, + New Project, etc.)
5. Add theme toggle (dark/light)
6. Add help/documentation link
7. Add system status indicator

---

## 3. DASHBOARD MAIN AREA

### Current Sections

#### A. HERO SECTION (System Overview Banner)

**Elements:**
- Title: "System Overview"
- Description text with project count
- Two buttons: "Report Center", "New Objective"
- Decorative gradients in background

**Suggested Improvements:**
1. Show today's date and greeting (Good morning, [Name])
2. Add weather/welcome banner with system status
3. Add quick stats summary in hero
4. Add action buttons with icons and shortcuts
5. Add pinned/recent projects carousel

---

#### B. KPI CARDS ROW (5 Cards)

**Card 1: Total Projects**
- Label: Total Projects
- Icon: folder
- Value: totalProjects count when available

**Card 2: Active Projects**
- Label: Active Projects
- Icon: layers
- Value: activeProjects count
- Trend indicator: arrow_upward 12%

**Card 3: Pending Tasks**
- Label: Pending Tasks
- Icon: checklist
- Value: totalTasks count
- Conditional: overdueTasks shown if > 0

**Card 4: AI Health Score**
- Label: AI Health Score
- Icon: auto_awesome
- Value: overallHealthScore percentage
- Progress bar showing score

**Card 5: Budget Variance**
- Label: Budget Variance
- Icon: account_balance_wallet
- Value: budgetVariance formatted as currency
- Status: Under/Over budget indicator

### Issues/Observations
- All cards use glass-card styling
- Small font sizes (text-2xl for values)
- Gap-4 between cards
- Responsive: 1 col mobile, 3 col sm, 5 col lg

### Suggested Improvements
1. Add more KPI cards (Team Members, Departments, Milestones)
2. Add click-through to detailed views
3. Add sparkline trends in cards
4. Add date range selector for metrics
5. Add comparison to previous period
6. Color-code based on health thresholds
7. Add card-specific context tooltips

---

#### C. MAIN CONTENT SECTION (2-Column Grid)

**Left Column (xl:col-span-2):**

**C1. Active Objectives Section**
- Title: "Active Objectives"
- Subtitle: "View Full Ledger" button
- TaskList component showing myTasks
- Shows progress bars

**C2. High-Risk Interventions Section** (Conditional - Admin only)
- Conditional: hasRole("SuperAdmin", "ProjectManager", "DepartmentHead")
- Title with pulsing dot indicator
- Grid of 2 project cards showing:
  - Project name
  - CRITICAL/WARNING badge
  - Delay risk prediction text
  - Delay estimate in days
  - ACTION PLAN button

**Right Column (xl:col-span-1):**

**C3. AI Intelligence Section**
- Title: "AI Intelligence" with icon
- Shows top 3 notifications by priority
- Burnout alert if workload risk detected

**C4. Escalations Section**
- Title: "Escalations" with count badge
- Shows overdue tasks
- DISMISS and REVIEW buttons

### Issues/Observations
- Sections are in glass-card containers
- TaskList shows progress bars
- High-risk section is conditional based on role

### Suggested Improvements
1. Add drag-to-reorder for sections
2. Add minimize/expand toggles on sections
3. Add section-specific filters
4. Add real-time updates indicator
5. Add bulk action capabilities

---

#### D. SECONDARY PANELS ROW

**Row 1:**
- Left: High Risk Projects Panel
- Right: Unread Notifications Panel

**Row 2:**
- Left: My Work Queue Panel
- Right: Workload Distribution Panel

### Issues/Observations
- 2-column grid layout
- Panels show list components

### Suggested Improvements
1. Add filter tabs within panels
2. Add inline quick actions
3. Add "Mark all read" functionality
4. Add sort options dropdowns

## 5. COMPONENTS TO IMPROVE

### TaskList Component
- Add due date highlighting
- Add assignee avatars
- Add priority badges
- Add drag-to-reorder
- Add bulk actions

### NotificationList Component
- Add timestamp display
- Add mark as read toggle
- Add priority color coding

### SimpleProjectList Component
- Add progress bars
- Add risk indicators
- Add quick actions

### WorkloadBars Component
- Add percentage labels
- Add burnout risk color coding
- Add trend indicators

---

## 6. GENERAL UX IMPROVEMENTS

### Visual Design
1. Consistent button sizes across app
2. Unified icon sizes (16px, 20px, 24px)
3. Consistent spacing scale (4px base unit)
4. Defined color palette with semantic names
5. Consistent border radii (4px, 8px, 12px, 16px)
6. Glass-morphism consistency

### Interactions
1. Add loading skeletons
2. Add pull-to-refresh
3. Add infinite scroll where appropriate
4. Add keyboard shortcuts
5. Add toast notifications for actions

### Accessibility
1. Add ARIA labels
2. Add focus indicators
3. Add screen reader support
4. Add high contrast mode

### Responsive Design
1. Mobile-first approach
2. Collapsible sidebar on mobile
3. Bottom navigation on mobile
4. Touch-friendly tap targets (44px min)

---

## 7. PRIORITY IMPROVEMENTS LIST

### High Priority (Critical Issues)
1. Fix input styling in all forms
2. Add proper borders to modals
3. Fix table column alignment
4. Make sidebar collapse on mobile
5. wherever the users are shown show them in circular avatars if more than 3 users then show 3 users slightly stacked and 4th with "+ x more "  where x is number of more people

### Medium Priority (Usability)
1. Add global search
2. Add breadcrumbs
3. Improve KPI cards click-through
4. Add tooltips throughout
5. Add keyboard shortcuts

