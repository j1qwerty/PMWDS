# PMWDS Frontend - AI Agent Prompt (The Kinetic Archive Edition)

## Project Overview

PMWDS (Project Monitoring Work Distribution System) is a comprehensive project monitoring and task management platform with AI-powered insights. This document provides a complete prompt for an AI agent to build or enhance the React frontend using **The Kinetic Archive** design system—a premium, editorial approach to enterprise dashboards that treats data as living, breathing units of work within a sophisticated, multi-layered environment.

## Design Philosophy: The Kinetic Archive

### Core Principles
- **No-Line Rule:** Structural boundaries are defined through background color shifts, not borders. Never use 1px solid borders to section off major interface areas.
- **Tonal Layering:** Stack containers to create depth. Use surface elevation tokens (`surface_dim` → `surface_container` → `surface_container_high`) to establish visual hierarchy.
- **Glass & Gradient:** Floating elements use backdrop-blur (12-20px). Primary actions use 135° linear gradients from `primary` to `primary_container`.
- **Intentional Asymmetry:** Balance large typography with precise metadata positioning for a curated, editorial feel.
- **High Information Density:** White space is intentional but compact. Use `sm` and `md` spacing tokens predominantly.

### Visual Identity
The aesthetic is defined by architectural depth, tonal shifts, and a high-contrast typographic scale that prioritizes clarity and authority. The UI should feel like a high-end financial journal—authoritative headers commanding attention, followed by precise, dense metadata.

---

## Technology Stack

- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Routing:** React Router DOM v6
- **Styling:** CSS Modules with global CSS variables (The Kinetic Archive token system)
- **API Communication:** REST via fetch API
- **Icons:** Lucide React (preferred) or custom SVG
- **Charts:** Recharts (for data visualization)
- **Date Handling:** date-fns

---

## Project Structure

```
client/
├── src/
│   ├── api/
│   │   ├── client.ts           # Base API client with interceptors
│   │   ├── auth.ts             # Auth endpoints
│   │   ├── projects.ts         # Project endpoints
│   │   ├── tasks.ts            # Task endpoints
│   │   ├── users.ts            # User endpoints
│   │   ├── departments.ts      # Department endpoints
│   │   ├── skills.ts           # Skills endpoints (NEW)
│   │   ├── notifications.ts    # Notification endpoints
│   │   ├── ai.ts               # AI endpoints
│   │   └── reports.ts          # Reports endpoints
│   ├── types/
│   │   ├── index.ts            # All TypeScript interfaces
│   │   ├── auth.ts             # Auth types
│   │   ├── projects.ts         # Project types
│   │   ├── tasks.ts            # Task types
│   │   ├── users.ts            # User types
│   │   └── ai.ts               # AI response types
│   ├── context/
│   │   └── AuthContext.tsx     # Authentication context
│   ├── hooks/
│   │   ├── useAuth.ts          # Auth hook
│   │   ├── useRole.ts          # Role-based access hook
│   │   └── useAPI.ts           # API data fetching hook
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   └── MainLayout.tsx
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── StatusBeacon.tsx
│   │   │   ├── ProgressOrb.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── GlassPanel.tsx
│   │   │   └── GradientButton.tsx
│   │   ├── dashboard/
│   │   │   ├── StatCard.tsx
│   │   │   ├── HealthGrid.tsx
│   │   │   ├── WorkloadBar.tsx
│   │   │   └── TrendChart.tsx
│   │   ├── projects/
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── ProjectDetail.tsx
│   │   │   ├── MilestoneList.tsx
│   │   │   └── AIInsightsPanel.tsx
│   │   ├── tasks/
│   │   │   ├── TaskList.tsx
│   │   │   ├── TaskDetail.tsx
│   │   │   ├── TaskTimer.tsx
│   │   │   └── AIDelayPrediction.tsx
│   │   └── ai/
│   │       ├── ChatInterface.tsx
│   │       ├── BurnoutRiskMeter.tsx
│   │       └── ProviderSelector.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Projects.tsx
│   │   ├── ProjectDetailPage.tsx
│   │   ├── Tasks.tsx
│   │   ├── MyTasks.tsx
│   │   ├── Users.tsx
│   │   ├── Departments.tsx
│   │   ├── Skills.tsx                    # NEW
│   │   ├── Notifications.tsx
│   │   ├── AIInsights.tsx
│   │   ├── Reports.tsx
│   │   └── Settings.tsx
│   ├── styles/
│   │   ├── tokens.css          # Design tokens (Kinetic Archive)
│   │   ├── globals.css         # Global styles
│   │   ├── utilities.css       # Utility classes
│   │   └── components/         # Component-specific CSS modules
│   ├── utils/
│   │   ├── formatters.ts       # Date, number, text formatters
│   │   ├── validators.ts       # Form validation
│   │   └── permissions.ts      # Role-based permission checks
│   ├── App.tsx                 # Router configuration
│   └── main.tsx                # Entry point
├── public/
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Design Tokens: The Kinetic Archive

### Color System

```css
:root {
  /* Surface Hierarchy (Obsidian Base) */
  --surface-dim: #0d0d11;           /* Deepest base */
  --surface: #131318;                /* Global background */
  --surface-container-lowest: #16161b;
  --surface-container-low: #1b1b20;  /* Sidebar, large sections */
  --surface-container: #1f1f24;      /* Standard cards */
  --surface-container-high: #2a292f; /* Elevated cards */
  --surface-container-highest: #35343a; /* Floating modals */
  
  /* Primary Gradient Stops */
  --primary: #c0c1ff;
  --primary-container: #8083ff;
  --on-primary: #1000a9;
  --primary-glow: rgba(192, 193, 255, 0.15);
  
  /* Secondary */
  --secondary: #a8c7fa;
  --secondary-container: #004a77;
  
  /* Semantic Colors */
  --success: #34d399;
  --success-container: rgba(52, 211, 153, 0.1);
  --success-glow: rgba(52, 211, 153, 0.2);
  
  --warning: #fbbf24;
  --warning-container: rgba(251, 191, 36, 0.1);
  --warning-glow: rgba(251, 191, 36, 0.2);
  
  --danger: #f87171;
  --danger-container: rgba(248, 113, 113, 0.1);
  --danger-glow: rgba(248, 113, 113, 0.2);
  
  --error: #ffb4ab;
  --error-container: rgba(255, 180, 171, 0.1);
  
  /* Typography */
  --text-primary: #f5f5f5;           /* Headlines */
  --text-body: #e2e2ec;              /* Body text */
  --text-muted: #9a9aad;             /* Secondary text */
  --text-disabled: #5c5c6b;
  
  /* Outline / Ghost Border */
  --outline: #464554;
  --outline-variant: rgba(70, 69, 84, 0.15);
  --outline-focus: rgba(192, 193, 255, 0.4);
  
  /* Glass Surface */
  --glass-bg: rgba(53, 52, 58, 0.6);
  --glass-border: rgba(255, 255, 255, 0.05);
  
  /* Spacing Scale (4px base) */
  --space-xs: 0.25rem;    /* 4px */
  --space-sm: 0.5rem;     /* 8px */
  --space-md: 1rem;       /* 16px */
  --space-lg: 1.5rem;     /* 24px */
  --space-xl: 2rem;       /* 32px */
  --space-2xl: 2.5rem;    /* 40px */
  --space-3xl: 3rem;      /* 48px */
  
  /* Border Radius */
  --radius-xs: 0.25rem;   /* 4px */
  --radius-sm: 0.375rem;  /* 6px */
  --radius-md: 0.5rem;    /* 8px */
  --radius-lg: 0.75rem;   /* 12px */
  --radius-xl: 1rem;      /* 16px */
  --radius-full: 9999px;
  
  /* Shadows (Ambient Occlusion) */
  --shadow-modal: 0 20px 40px rgba(0, 0, 0, 0.4);
  --shadow-card: 0 4px 12px rgba(0, 0, 0, 0.15);
  --shadow-dropdown: 0 8px 24px rgba(0, 0, 0, 0.3);
  
  /* Typography Scale */
  --font-display-lg: 3.5rem;
  --font-display-md: 2.75rem;
  --font-display-sm: 2rem;
  --font-headline-lg: 1.75rem;
  --font-headline-md: 1.5rem;
  --font-headline-sm: 1.25rem;
  --font-title-lg: 1.125rem;
  --font-title-md: 1rem;
  --font-title-sm: 0.875rem;
  --font-body-lg: 1rem;
  --font-body-md: 0.9375rem;
  --font-body-sm: 0.875rem;
  --font-label-md: 0.8125rem;
  --font-label-sm: 0.75rem;
  
  /* Letter Spacing */
  --tracking-tight: -0.02em;
  --tracking-normal: 0;
  --tracking-wide: 0.05em;
}
```

### Typography Classes

```css
/* Display - Hero KPIs */
.display-lg {
  font-size: var(--font-display-lg);
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: var(--tracking-tight);
  color: var(--text-primary);
}

.display-md {
  font-size: var(--font-display-md);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: var(--tracking-tight);
  color: var(--text-primary);
}

.display-sm {
  font-size: var(--font-display-sm);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: var(--tracking-tight);
  color: var(--text-primary);
}

/* Headline - Page Titles */
.headline-lg {
  font-size: var(--font-headline-lg);
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: var(--tracking-tight);
  color: var(--text-primary);
}

.headline-md {
  font-size: var(--font-headline-md);
  font-weight: 600;
  line-height: 1.3;
  color: var(--text-primary);
}

/* Body - Content */
.body-lg {
  font-size: var(--font-body-lg);
  font-weight: 400;
  line-height: 1.6;
  color: var(--text-body);
}

.body-md {
  font-size: var(--font-body-md);
  font-weight: 400;
  line-height: 1.6;
  color: var(--text-body);
}

.body-sm {
  font-size: var(--font-body-sm);
  font-weight: 400;
  line-height: 1.5;
  color: var(--text-muted);
}

/* Label - Metadata, Tables */
.label-md {
  font-size: var(--font-label-md);
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: var(--tracking-normal);
  color: var(--text-muted);
}

.label-sm {
  font-size: var(--font-label-sm);
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--text-muted);
}
```

---

## Component Specifications

### Button

```tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'tertiary' | 'danger';
  size: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

// Primary: Gradient background
// .btn-primary {
//   background: linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%);
//   color: var(--on-primary);
//   border: none;
//   padding: var(--space-sm) var(--space-lg);
//   border-radius: var(--radius-md);
//   font-weight: 500;
//   transition: opacity 0.2s, transform 0.1s;
// }
// .btn-primary:hover:not(:disabled) {
//   opacity: 0.9;
// }
// .btn-primary:active:not(:disabled) {
//   transform: scale(0.98);
// }

// Secondary: Ghost with subtle outline
// .btn-secondary {
//   background: transparent;
//   color: var(--text-body);
//   border: 1px solid var(--outline-variant);
//   padding: var(--space-sm) var(--space-lg);
//   border-radius: var(--radius-md);
//   transition: background 0.2s;
// }
// .btn-secondary:hover:not(:disabled) {
//   background: var(--surface-container-highest);
// }

// Tertiary: Text-only
// .btn-tertiary {
//   background: transparent;
//   color: var(--primary);
//   border: none;
//   padding: var(--space-sm) var(--space-md);
//   border-radius: var(--radius-md);
// }
```

### Card

```tsx
interface CardProps {
  variant: 'default' | 'elevated' | 'glass' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

// .card {
//   background: var(--surface-container);
//   border-radius: var(--radius-lg);
//   padding: var(--space-lg);
//   border: none;
//   box-shadow: var(--shadow-card);
// }
// 
// .card-elevated {
//   background: var(--surface-container-high);
// }
//
// .card-glass {
//   background: var(--glass-bg);
//   backdrop-filter: blur(12px);
//   border: 1px solid var(--glass-border);
// }
//
// .card-interactive {
//   cursor: pointer;
//   transition: transform 0.2s, box-shadow 0.2s;
// }
// .card-interactive:hover {
//   transform: translateY(-2px);
//   box-shadow: var(--shadow-modal);
//   background: var(--surface-container-high);
// }
```

### Input

```tsx
interface InputProps {
  type: 'text' | 'email' | 'password' | 'number' | 'search';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

// .input-wrapper {
//   display: flex;
//   align-items: center;
//   background: var(--surface-container-highest);
//   border-radius: var(--radius-md);
//   padding: 0 var(--space-md);
//   transition: box-shadow 0.2s;
//   border: none;
// }
// 
// .input-wrapper:focus-within {
//   box-shadow: 0 0 0 2px var(--outline-focus);
// }
//
// .input-wrapper.error {
//   background: var(--error-container);
// }
//
// .input {
//   width: 100%;
//   background: transparent;
//   border: none;
//   padding: var(--space-sm) 0;
//   color: var(--text-body);
//   font-size: var(--font-body-md);
// }
// .input::placeholder {
//   color: var(--text-muted);
// }
```

### StatusBeacon

```tsx
interface StatusBeaconProps {
  status: 'success' | 'warning' | 'danger' | 'inactive';
  size?: 'sm' | 'md';
  pulse?: boolean;
  label?: string;
}

// .status-beacon {
//   width: 8px;
//   height: 8px;
//   border-radius: var(--radius-full);
//   display: inline-block;
// }
//
// .status-beacon.success {
//   background: var(--success);
//   box-shadow: 0 0 8px var(--success-glow);
// }
// .status-beacon.warning {
//   background: var(--warning);
//   box-shadow: 0 0 8px var(--warning-glow);
// }
// .status-beacon.danger {
//   background: var(--danger);
//   box-shadow: 0 0 8px var(--danger-glow);
// }
// 
// .status-beacon.pulse {
//   animation: pulse 2s infinite;
// }
```

### ProgressOrb

```tsx
interface ProgressOrbProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  showPercentage?: boolean;
  status?: 'success' | 'warning' | 'danger';
}

// Circular progress using SVG or canvas
// Track: var(--outline-variant)
// Progress: var(--primary) with gradient
// Text: var(--text-body) with appropriate size
```

### DataTable

```tsx
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  loading?: boolean;
  emptyState?: React.ReactNode;
  rowClassName?: (row: T) => string;
}

// .data-table {
//   width: 100%;
//   border-collapse: collapse;
// }
//
// .data-table th {
//   text-align: left;
//   padding: var(--space-md) var(--space-md) var(--space-sm);
//   font-size: var(--font-label-sm);
//   font-weight: 500;
//   letter-spacing: var(--tracking-wide);
//   text-transform: uppercase;
//   color: var(--text-muted);
//   border-bottom: 1px solid var(--outline-variant);
// }
//
// .data-table td {
//   padding: var(--space-md);
//   border-bottom: none;
//   color: var(--text-body);
//   background: transparent;
// }
//
// .data-table tr {
//   transition: background 0.15s;
//   cursor: pointer;
// }
//
// .data-table tr:hover {
//   background: var(--surface-container-low);
// }
```

### GlassPanel

```tsx
interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  blur?: 'sm' | 'md' | 'lg';
  border?: boolean;
}

// .glass-panel {
//   background: var(--glass-bg);
//   backdrop-filter: blur(12px);
//   border-radius: var(--radius-lg);
//   padding: var(--space-lg);
// }
// .glass-panel.border {
//   border: 1px solid var(--glass-border);
// }
```

---

## Pages Specification

### 1. Login Page

**Design Requirements:**
- Full-screen split layout with gradient hero section on left
- Right panel: Glass card with login form
- Use `display-lg` for "PMWDS" branding
- Input fields with ghost borders
- Primary button with full gradient width
- Subtle animated background gradient

```tsx
// Structure:
// <div className="login-container">
//   <div className="login-hero">
//     <h1 className="display-lg">PMWDS</h1>
//     <p className="headline-sm">The Kinetic Archive</p>
//   </div>
//   <div className="login-form-container">
//     <Card variant="glass" padding="lg">
//       // Login form
//     </Card>
//   </div>
// </div>
```

### 2. Dashboard Page

**Hero Panel (Top):**
- Welcome message with user's first name (`headline-lg`)
- Date display with `label-sm`
- Four StatCard components in grid

**StatCard Component:**
```tsx
interface StatCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon: React.ReactNode;
  variant: 'default' | 'success' | 'warning' | 'danger';
}

// Use display-md for value
// Use label-sm for title
// Include subtle gradient border on hover
```

**Main Grid (Two Column):**
- Left column (60%): Task list, Project health grid
- Right column (40%): Notifications, Workload bars, Overdue tasks

**Task List Component:**
- No dividers between items
- 8px vertical spacing between rows
- StatusBeacon for task status
- Hover: `surface-container-low` background
- ProgressOrb for task progress

**Workload Distribution:**
- Horizontal bar chart with gradient fills
- Use `primary` at 80%, `warning` at 60%, `danger` at 40%
- Label-md for user names

**Project Health Grid:**
- 2x2 grid of health metrics
- Each cell: `surface-container` background
- Use ProgressOrb with appropriate status color

### 3. Projects Page

**Header:**
- `headline-md` title
- Search input with icon
- Filter dropdown (GlassPanel)
- "New Project" GradientButton

**Project Cards (Grid View):**
```tsx
interface ProjectCardProps {
  project: Project;
  view: 'grid' | 'list';
}

// Grid Card:
// - Card variant="interactive"
// - Project code: label-sm (top-left)
// - StatusBeacon (top-right)
// - Project name: title-lg
// - ProgressOrb with percentage
// - Health score display
// - Department label with muted color
```

**Project Detail Panel:**
- Slide-out panel from right (GlassPanel with blur)
- Width: 480px
- Project header with gradient
- Tab navigation: Overview, Milestones, AI Insights, Files
- Milestone list with timeline visualization
- AI Health grid (4 metrics)
- Action buttons (secondary and primary)

### 4. Tasks Page

**Layout:**
- Split view: Task list (40%) + Task detail (60%)
- Task list grouped by status (Kanban-style optional)

**Task List Item:**
```tsx
// <div className="task-item">
//   <StatusBeacon status={...} />
//   <div className="task-content">
//     <span className="title-md">{title}</span>
//     <span className="label-sm">{projectName}</span>
//   </div>
//   <div className="task-meta">
//     <span className={`label-sm ${isOverdue ? 'danger' : ''}`}>
//       {dueDate}
//     </span>
//     <ProgressOrb progress={progressPercentage} size={32} />
//   </div>
// </div>
```

**Task Timer:**
- Large circular display
- Start/Stop buttons (primary/secondary)
- Elapsed time display (`display-sm`)
- Estimated vs actual comparison

**AI Assignee Recommendation:**
- Card with `surface-container-high`
- Recommended user with confidence percentage
- Skill match display (pill badges)
- "Assign" button (primary)

**Delay Prediction:**
- Risk level indicator (colored ProgressOrb)
- Expected delay days (`display-sm`)
- Contributing factors list
- Mitigation strategies (collapsible)
- "Escalate" button (danger variant)

### 5. Users Page

**Header:**
- `headline-md` title
- "Add User" button (SuperAdmin/ProjectManager only)

**User Table:**
```tsx
// Columns:
// - Full Name (with avatar)
// - Department
// - Job Title
// - Availability (StatusBeacon + percentage)
// - Workload Score (ProgressOrb)
// - Burnout Risk (color-coded indicator)
// - Active Tasks count
// - Actions menu
```

**Workload Visualization Panel:**
- Horizontal stacked bar for each user
- Color coding: Green (<60%), Yellow (60-80%), Red (>80%)
- Tooltip with detailed breakdown

**User Detail Modal:**
- GlassPanel with blur
- Skills management section (NEW)
- Add/Remove skill chips
- Availability slider control
- Role assignment (multi-select)

### 6. Skills Page (NEW)

**Layout:**
- Two-column layout
- Left: Skills list with search
- Right: Skill detail/Create form

**Skill Card:**
```tsx
interface SkillCardProps {
  skill: Skill;
  userCount: number;
  category: string;
}

// Display:
// - Skill name: title-lg
// - Category: label-sm with background
// - User count: body-sm with icon
// - Action buttons (Edit/Delete)
```

**Skill Form:**
- Input for skill name
- Dropdown for category (Technical, Soft, Domain, Language)
- Textarea for description
- Primary gradient button for save

### 7. Departments Page

**Department Dashboard:**
- Hero metrics (total members, active projects, capacity utilization)
- Department structure tree (GlassPanel)
- Member workload overview

**Department Card:**
```tsx
// <Card variant="interactive">
//   <div className="dept-header">
//     <h3 className="title-lg">{name}</h3>
//     <span className="label-sm">{code}</span>
//   </div>
//   <div className="dept-stats">
//     <Stat items... />
//   </div>
//   <ProgressOrb progress={capacityUtilization} />
// </Card>
```

### 8. Notifications Page

**Inbox Layout:**
- Split view: List + Preview
- Unread indicator (StatusBeacon with pulse)
- Priority color coding (border-left accent)

**Notification Item:**
```tsx
// <div className={`notification-item ${!isRead ? 'unread' : ''}`}>
//   <StatusBeacon status={priority} pulse={!isRead} />
//   <div className="notification-content">
//     <span className="title-md">{title}</span>
//     <p className="body-sm">{message}</p>
//     <span className="label-sm">{formatDate(createdDate)}</span>
//   </div>
// </div>
```

**Broadcast Panel (SuperAdmin):**
- Title input
- Message textarea
- Priority selector
- Department selector (multi-select)
- "Send Broadcast" gradient button

### 9. AI Insights Page

**Provider Configuration:**
- Provider cards with status indicator
- Model search with debounced input
- Test connection button

**Chat Interface:**
```tsx
// <div className="ai-chat">
//   <div className="chat-messages">
//     // Message bubbles with glass background
//   </div>
//   <div className="chat-input">
//     <Input placeholder="Ask about projects, tasks, or risks..." />
//     <Button variant="primary">Send</Button>
//   </div>
// </div>
```

**Project Health Analysis:**
- Project selector dropdown
- Health score gauge (large ProgressOrb)
- Strengths/Weaknesses cards
- Recommendations list with priority indicators
- Risks table with mitigation

**Burnout Risk Dashboard:**
- Department filter
- User risk cards sorted by score
- Risk meter component (gradient progress bar)
- Contributing factors tooltip
- Recommended actions

### 10. Reports Page

**Filter Panel:**
- Date range picker (GlassPanel)
- Project/Dropdown selectors
- Report type chips
- "Generate" button

**Report Preview:**
- Embedded preview with download options
- Format selector (PDF, Excel, CSV)
- Schedule option (for recurring reports)

### 11. Settings Page

**Sections:**
- Profile settings
- Notification preferences
- Appearance (theme options)
- API keys (if applicable)
- Account security

---

## Role-Based Access Control

```tsx
// hooks/useRole.ts
export const useRole = () => {
  const { user } = useAuth();
  
  const hasRole = (roles: Role | Role[]): boolean => {
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    return rolesArray.some(role => user?.roles?.includes(role));
  };
  
  const hasPermission = (permission: Permission): boolean => {
    // Permission matrix implementation
  };
  
  return { hasRole, hasPermission };
};

// Usage in components:
// const { hasRole } = useRole();
// {hasRole(['SuperAdmin', 'ProjectManager']) && (
//   <Button>Delete Project</Button>
// )}
```

### Permission Matrix

| Action | SuperAdmin | ProjectManager | DepartmentHead | TeamLead | TeamMember | Viewer |
|--------|------------|----------------|----------------|----------|------------|--------|
| View all projects | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create project | ✓ | ✓ | ✓ | - | - | - |
| Edit any project | ✓ | ✓ | - | - | - | - |
| Delete project | ✓ | ✓ | - | - | - | - |
| Assign tasks | ✓ | ✓ | ✓ | ✓ | - | - |
| View all users | ✓ | ✓ | Limited | Limited | - | - |
| Manage users | ✓ | - | - | - | - | - |
| Manage departments | ✓ | ✓ | Limited | - | - | - |
| Manage skills (NEW) | ✓ | ✓ | ✓ | - | - | - |
| View AI insights | ✓ | ✓ | Limited | - | - | - |
| AI chat | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| Generate reports | ✓ | ✓ | ✓ | - | - | - |
| Broadcast notifications | ✓ | ✓ | - | - | - | - |

---

## API Integration

### Base API Client

```tsx
// api/client.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

class ApiClient {
  private token: string | null = null;
  private refreshPromise: Promise<string> | null = null;
  
  constructor() {
    this.token = localStorage.getItem('access_token');
  }
  
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    let response = await fetch(url, { ...options, headers });
    
    // Handle token expiration
    if (response.status === 401) {
      this.token = await this.refreshToken();
      headers['Authorization'] = `Bearer ${this.token}`;
      response = await fetch(url, { ...options, headers });
    }
    
    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }
    
    return response.json();
  }
  
  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }
  
  post<T>(endpoint: string, data?: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  put<T>(endpoint: string, data?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  patch<T>(endpoint: string, data?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
```

### Skills API (NEW)

```tsx
// api/skills.ts
import { api } from './client';
import type { Skill, SkillCategory } from '../types';

export const skillsApi = {
  // GET /skills
  getAll: () => api.get<Skill[]>('/skills'),
  
  // GET /skills/:id
  getById: (id: string) => api.get<Skill>(`/skills/${id}`),
  
  // POST /skills
  create: (data: { name: string; category: SkillCategory; description?: string }) =>
    api.post<Skill>('/skills', data),
  
  // PUT /skills/:id
  update: (id: string, data: Partial<Skill>) =>
    api.put<Skill>(`/skills/${id}`, data),
  
  // DELETE /skills/:id
  delete: (id: string) => api.delete<void>(`/skills/${id}`),
  
  // GET /skills/categories
  getCategories: () => api.get<SkillCategory[]>('/skills/categories'),
};
```

### AI API

```tsx
// api/ai.ts
import { api } from './client';
import type {
  AssigneeRecommendation,
  DelayPrediction,
  ProjectHealth,
  BurnoutRiskResponse,
  ChatResponse,
} from '../types';

export const aiApi = {
  // GET /ai/recommend-assignee/:taskId
  recommendAssignee: (taskId: string) =>
    api.get<AssigneeRecommendation>(`/ai/recommend-assignee/${taskId}`),
  
  // GET /ai/predict-delay/:taskId
  predictDelay: (taskId: string) =>
    api.get<DelayPrediction>(`/ai/predict-delay/${taskId}`),
  
  // GET /ai/project-health/:projectId
  getProjectHealth: (projectId: string) =>
    api.get<ProjectHealth>(`/ai/project-health/${projectId}`),
  
  // POST /ai/optimize-resources/:projectId
  optimizeResources: (projectId: string) =>
    api.post<ResourceOptimization>(`/ai/optimize-resources/${projectId}`),
  
  // GET /ai/burnout-risk
  getBurnoutRisk: (departmentId?: string) =>
    api.get<BurnoutRiskResponse>(`/ai/burnout-risk${departmentId ? `?departmentId=${departmentId}` : ''}`),
  
  // GET /ai/insights/:projectId
  getProjectInsights: (projectId: string) =>
    api.get<ProjectInsights>(`/ai/insights/${projectId}`),
  
  // POST /ai/chat
  chat: (message: string, context?: Record<string, unknown>) =>
    api.post<ChatResponse>('/ai/chat', { message, context }),
  
  // POST /ai/train
  triggerTraining: () => api.post<void>('/ai/train'),
};
```

---

## Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Set up Vite + React + TypeScript project
- [ ] Configure CSS Modules with design tokens
- [ ] Create base API client with interceptors
- [ ] Implement authentication context and login page
- [ ] Build MainLayout with Sidebar and TopBar
- [ ] Create core UI components (Button, Card, Input, StatusBeacon, ProgressOrb)

### Phase 2: Dashboard & Core Pages (Week 2)
- [ ] Build Dashboard page with all widgets
- [ ] Implement Projects page (list view with cards)
- [ ] Create ProjectDetail panel with slide-out
- [ ] Build Tasks page with timer functionality
- [ ] Implement MyTasks view for team members

### Phase 3: Management Features (Week 3)
- [ ] Build Users page with management CRUD
- [ ] Implement Skills page (NEW)
- [ ] Create Departments page with dashboard
- [ ] Build Notifications page with inbox
- [ ] Implement broadcast functionality

### Phase 4: AI Features (Week 4)
- [ ] Build AI Insights page with provider config
- [ ] Implement Chat interface
- [ ] Create Project Health analysis view
- [ ] Build Burnout Risk dashboard
- [ ] Integrate assignee recommendation
- [ ] Add delay prediction to task view

### Phase 5: Reports & Polish (Week 5)
- [ ] Build Reports page with filters
- [ ] Implement report generation/download
- [ ] Add Settings page
- [ ] Implement role-based access throughout
- [ ] Add loading states and error boundaries
- [ ] Responsive design adjustments
- [ ] Performance optimization (code splitting, memo)

---

## Common Implementation Patterns

### Data Fetching Hook

```tsx
// hooks/useAPI.ts
export function useAPI<T>(
  fetcher: () => Promise<T>,
  dependencies: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    let cancelled = false;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetcher();
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    return () => { cancelled = true; };
  }, dependencies);
  
  return { data, loading, error, refetch: () => fetchData() };
}
```

### Role-Based Route Guard

```tsx
// components/RouteGuard.tsx
interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles: Role[];
  fallback?: React.ReactNode;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  allowedRoles,
  fallback = <Navigate to="/dashboard" replace />,
}) => {
  const { hasRole, isLoading } = useRole();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  return hasRole(allowedRoles) ? children : fallback;
};
```

### Empty State Component

```tsx
// components/ui/EmptyState.tsx
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Use display-sm for title
// body-md for description
// GlassPanel background
// Centered with generous padding
```

---

## Do's and Don'ts Summary

### ✅ Do:
- Use background color shifts to define layout sections
- Apply `backdrop-blur` for floating elements
- Use 135° gradients for primary actions
- Maintain compact information density with `sm`/`md` spacing
- Use StatusBeacon with outer glow for status indicators
- Apply `surface-container-low` for large layout blocks
- Use asymmetrical layouts for editorial feel
- Include subtle hover transitions (0.15-0.2s)

### ❌ Don't:
- Use 1px solid borders to separate layout sections
- Use pure white (#ffffff) for body text—use `--text-body`
- Use standard drop shadows with small Y-offset
- Add excessive padding that wastes space
- Use opaque, flat backgrounds for modals
- Create outlines that break the glass aesthetic
- Use high-contrast focus rings—use 2px ghost border at 40%

---

## Environment Variables

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_APP_NAME=PMWDS
VITE_DEFAULT_AI_PROVIDER=openai
```

---

## Type Definitions (Extended)

```typescript
// types/skills.ts (NEW)
interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  description?: string;
  createdAt: string;
  updatedAt: string;
  userCount: number;
}

type SkillCategory = 'Technical' | 'Soft' | 'Domain' | 'Language';

// types/ai.ts
interface AssigneeRecommendation {
  taskId: string;
  recommendations: Array<{
    userId: string;
    userName: string;
    confidenceScore: number;
    matchingSkills: string[];
    currentWorkload: number;
    estimatedCompletionDate: string;
  }>;
  reasoning: string;
}

interface BurnoutRiskResponse {
  users: Array<{
    userId: string;
    userName: string;
    department: string;
    riskScore: number;
    riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
    contributingFactors: string[];
    recommendedActions: string[];
  }>;
  summary: {
    averageRisk: number;
    highRiskCount: number;
    criticalRiskCount: number;
  };
}

interface ChatResponse {
  response: string;
  context?: Record<string, unknown>;
  suggestions?: string[];
  sources?: Array<{ title: string; url?: string }>;
}

interface ResourceOptimization {
  taskId: string;
  currentAssignee?: string;
  suggestedAssignee: string;
  expectedImprovement: number;
  impactAnalysis: string;
}
```