# responsive.md 
# Development Tasks & Improvements


## 🚨 Immediate Fixes
- [ ] directors for each departments ( if needed lets rename director to departmnetadmin) 
- [x] Fix deptFormModal - select none to unassign head functionality
- [x] Role management for director - manage specific permissions and roles
- [x] frontend : multiple task creation , idempotency for all modals creation and edit
- [x] deactivated users do not show up anywhere(in assignment lists ) but show up on existing tasks or proejcts but with visible hint for deactivated, but show in users page
- [x] deactivated users cant even login
- [ ] due date cant be more than that of parent component and by default select the parent's date in modals for creation



## 🔴 High Priority

### feature
- [ ] milestone dependencies 
- [ ] Implement paginated results for documents and other sections (audit all sections, create list of sections/components for update)
- [ ] Settings page for both roles (add create organizations button for superadmin)
- [ ] All types of settings and settings API
- [ ] new project creation flow - auto selected input feilds on each step

### Role & Access Management
- [x] Role management for director with proper UI (hide superadmin features)
- [ ] Hide organization-related info from director and other users (all elements)
- [ ] Hide manual activity creation for director

### Modals & Overlays
- [ ] Refactor all modals and overlays for consistency
- [ ] Redesign modals with unified styling
- [ ] Add delete buttons for projects, milestones, and tasks in proper positions with confirmation modals

### UI Components
- [x] projecttaskpage when there are no tasks for a milestone no board is displayed, instead display the empty board, add setting if needed
- [ ] ProjectMilestone page - show details on side only on big screens, or show on view icon click
- [x] Decide on TaskSubtask card vs TaskCard usage across all places
- [ ] Add escalate task button and mentions functionality
- [ ] Add more buttons to projects page top navigation
- [x] Consistent toasts 
- [ ] consistent stat cards design
- [x] User assignment in departments page

### Task Management
- [ ] Add project detailed cleaned UI to workspace page in new tab with proper tab management
- [x] New project creation flow with modal steps:
  - [x] Project details
  - [x] Departments select or create new
  - [x] Milestones and tasks boxes
  - [x] Tasks and subtasks

### Data Display
- [x] Fix dashboard TaskPerformanceTable opening older task modals

## 🟡 Medium Priority

### Layout & Navigation
- [x] Refactor layout.tsx with more features and organized structure (home, project, departments at top)
- [ ] Reorganize and refactor navigation and sidebar

### User Management
- [x] Add workload column to users table (fix inconsistencies)
- [x] Merge users and profiles pages
- [x] Merge skills, new users, and departments pages into new tabular page

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

### Activity & Logging
- [ ] Refine activity logs for better readability with metadata
- [ ] Make activity logs more user-friendly

### Code Organization
- [ ] Rearrange file locations and rename components logically
- [x] Remove old/unused components and pages

## MISC 
- [ ] Remove any UI elements using pagedata API, use manual API instead / or fix pagedata to send role specific data only
- [ ] Test page and pages API restricted to superadmin only (clean up if unnecessary)
- [ ] backend idempotency


```