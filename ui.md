# responsive.md 
# Development Tasks & Improvements


## 🚨 Immediate Fixes
- [ ] directors for each departments ( if needed lets rename director to departmnetadmin) 
- [x] Fix deptFormModal - select none to unassign head functionality
- [x] Role management for director - manage specific permissions and roles
- [x] frontend : multiple task creation , idempotency for all modals creation and edit
- [ ] deactivated users do not show up anywhere(in assignment lists ) but show up on existing tasks or proejcts but with visible hint for deactivated, but show in users page
- [ ] deactivated users cant even login


## 🔴 High Priority

### feature
- [ ] milestone dependencies ( project creator decides which milestones are dependent on other milestone and set conditions(progress based ), dept heads can see the msg for dependencies , and based on that they can start tasks or halt after certain progress  )
  we need to have a feature step 4  called dependencies in Client\src\pages\NewProject\NewProjectPage.tsx create a new step 4 for dependencies, and also in projects page a section to manage dependencies.
  dependencies can be like:  untill one marked milestone is completed the other milestone cant start,  
  like untill certain milestones are partially completed to certain progress , other selected certain mmilestones cant be started,
  also for those conditions are shown inside the milestones in the ui clearly and tasks cant be started 
  so we a need a proper plan. we need plan to implement backend changes and the plan for ui in all relevant pages and modals 
  
  

- [ ] Settings page for both roles (add create organizations button for superadmin)
- [ ] All types of settings and settings API

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