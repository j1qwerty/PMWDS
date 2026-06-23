# responsive.md 
# Development Tasks & Improvements


## clarification
- reclarification departments specific milestones in prject creation workflow 
- 

## 🚨 Immediate Fixes
- [ ] Fix deptFormModal - select none to unassign head functionality
- [ ] Remove any UI elements using pagedata API, use manual API instead
- [ ] Role management for director - manage specific permissions and roles

## 🔴 High Priority

### Role & Access Management
- [ ] Role management for director with proper UI (hide superadmin features)
- [ ] Settings page for both roles (add create organizations button for superadmin)
- [ ] Organization page only for superadmin, director only sees department page
- [ ] Hide organization-related info from director and other users (all elements)
- [ ] Test page and pages API restricted to superadmin only (clean up if unnecessary)
- [ ] Hide manual activity creation for director

### Modals & Overlays
- [ ] Refactor all modals and overlays for consistency
- [ ] Redesign modals with unified styling
- [ ] Add delete buttons for projects, milestones, and tasks in proper positions with confirmation modals

### UI Components
- [ ] ProjectMilestone page - show details on side only on big screens, or show on view icon click
- [ ] Decide on TaskSubtask card vs TaskCard usage across all places
- [ ] Add escalate task button and mentions functionality
- [ ] Add more buttons to projects page top navigation
- [ ] Consistent toasts and stat cards design
- [ ] User assignment in departments page

### Task Management
- [ ] Add project detailed cleaned UI to workspace page in new tab with proper tab management
- [x] New project creation flow with modal steps:
  - [x] Project details
  - [x] Departments select or create new
  - [x] Milestones and tasks boxes
  - [x] Tasks and subtasks

### Data Display
- [ ] Implement paginated results for documents and other sections (audit all sections, create list)
- [ ] Fix dashboard TaskPerformanceTable opening older task modals

## 🟡 Medium Priority

### Layout & Navigation
- [ ] Refactor layout.tsx with more features and organized structure (home, project, departments at top)
- [ ] Reorganize and refactor navigation and sidebar

### User Management
- [ ] Add workload column to users table (fix inconsistencies)
- [ ] Merge users and profiles pages
- [ ] Merge skills, new users, and departments pages into new tabular page

### Status Management
- [ ] Hide manual status changes for milestones and projects

## 🟢 Lower Priority

### UI Styling & Responsiveness
- [ ] Responsive design for all elements
- [ ] Hover and shadow effects matching color scheme for all components
- [ ] Add max height with "view more" options to all components
- [ ] Animate bars and graphs (similar to AI page)
- [ ] Optimize space utilization and update headers
- [x] Task performance table UI update (hover, view/edit modals, sort filters, cursor-pointer)
- [ ] All types of settings and settings API

### Activity & Logging
- [ ] Refine activity logs for better readability with metadata
- [ ] Make activity logs more user-friendly

### Code Organization
- [ ] Rearrange file locations and rename components logically
- [ ] Remove old/unused components and pages
```