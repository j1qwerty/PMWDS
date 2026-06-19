# reference - responsive.md

## TODO 
### Status & Progress
- 3 different versions of status components
- Status updates with critical indicators and reasons in milestones and tasks pages
- Status colors and conditions for progress (gray, yellow, orange, red, green)
- Status change should automatically update progress of tasks or subtasks
- Status stats for tasks and milestones in department cards
- all statuse warnings states and error states

### UI Components & Styling
- Responsive design for all elements
- Dark mode (later)
- Hover and shadow effects matching color for all components: `hover:shadow-md hover:border-blue-500 hover:shadow-blue-300 transition-shadow duration-200`
- All components width max height and "view more" options
- Animate bars and graphs (like AI page)
- Workspace with compact sidebar for screens <1200px (hide some trivial boards depending on screen size and can be enabled from the settings icon )
- Task performance table UI update — hover, view/edit modals, sort filters based on columns, cursor-pointer
- Space utilization and header updates
- sidebar project wise nested links for milestones tasks, for each project create nested compactable menu items (in those pages only data related to that particular porject is shown)

### Modals
- Update all modals — X button, outside click dismiss, shared overlay
- Move all modals to shared/modal folder

### Pages & Navigation
- Combined milestone and task page
- Combined organization and departments page
- Kanban board for tasks and milestones
- New ui for all features

### Avatars & Cards
- Avatar stacks on all cards and detail modals
- Avatar stack on project, milestone, tasks, subtask cards and modals for each
- Avatar stack for organisaiton and departments
- Role members and project manager — notification cards and notification list

### Timer
- Timer API-level pause and calculations instead of local only (later, trivial feature )

### Milestones
- Milestone order auto-assigned (editable, currently hidden in UI)

### Document Upload
- new proper Document upload option in ui 

### Cleanup
- Standalone tasks cleanup from seeder
- refactor seeder to make it modular

### API Integrations
- Single-page API integrations for all GET methods (only those called on page load)
- UI renders each component based on permissions from API (instead of hardcoded roles and permissions on each page and and each component in ui)

### Roles & Permissions
- Role scope check for each controller method (role controller sends permissions in groups, e.g., users.manage includes all user-related permissions instead of separate create, edit, delete)
- Role scope check for each element in each component (separate hasRole and hasPermission)
- permissions section in role page - Remove delete permissions from UI permissions; remove create and edit permissions (view-only permissions)

### Project, Milestone & Task Creation
- Create new project even without filling all details
- Auto-generate code for project, milestone, tasks, subtasks
- Create new milestone or task similarly (without all details)

## Plan
- New pages for all features
- [x] API integrations
- [x] Update roles and permissions controller for UI-independent role and permission management

## Implementation Plan

### Priority 1 — Foundation & Core Functionality
1. **API Integrations** - skip 
   - [.] Single-page API integrations for all GET methods (only those called on page load)
   - [x] UI renders each component based on permissions from API (instead of hardcoded roles and permissions on each page and each component)
   - pages api proper response for all required data
   - pages partial api for partial requested data only and update that component only (firstly org specific only)

2. **Roles & Permissions**
   - Role scope check for each controller method (permissions in groups, e.g., users.manage includes all user-related permissions)
   - Role scope check for each element in each component (separate hasRole and hasPermission)
   - Permissions section in role page — remove delete, create, and edit permissions from UI (view-only permissions)
   - Update roles and permissions controller for UI-independent role and permission management

3. **Project, Milestone & Task Creation**
   - Create new project even without filling all details
   - Auto-generate code for project, milestone, tasks, subtasks
   - Create new milestone or task similarly (without all details)

---

### Priority 2 — Status System & Logic
4. **Status & Progress**
   - 3 different versions of status components
   - Status colors and conditions for progress (gray, yellow, orange, red, green)
   - Status change should automatically update progress of tasks or subtasks
   - All status warning states and error states
   - Status updates with critical indicators and reasons in milestones and tasks pages
   - Status stats for tasks and milestones in department cards
   - tasks status update follows similar logic as the tasks and subtasks section ( for tasks progress calculated based on subtasks) similary now calculate the status based on tasks and subtaks states and progress, and similar warning system (if has subtasks and any subtask in progress then task inProgress, any subtask delayed then task delayed, but any subtask cancelled doesnt mean task cancelled, any subtask on hold does not mean task on hold (all subtasks on hold means task on hold) all subtasks comleted task completed) and if we manually try to change status - give warning
   - do the same for milestone progress and status (backned changes needed, reference task and subtasks for this  )

---

### Priority 3 — Pages & Navigation
5. **New Pages for All Features**
   - Combined milestone and task page
   - Combined organization and departments page
   - Kanban board for tasks and milestones
   - archive completed projects options to make ui clean and a section for archived projects (in none of the page the data from archived projects i shown)
   - director manage permissios for users for their respective organization
   - assign users only shows users of that organisation department wise for the assigned depart to that project , never show superadmin in the users list

---

### Priority 4 — UI Components & Polish
6. **Modals**
   - Update all modals — X button, outside click dismiss, shared overlay
   - Move all modals to shared/modal folder

7. **Avatars & Cards**
   - Avatar stacks on project, milestone, tasks, subtask cards and modals
   - Avatar stacks for organization and departments
   - Role members and project manager — notification cards and notification list

8. **UI Styling**
   - Responsive design for all elements
   - Hover and shadow effects matching color for all components
   - All components with max height and "view more" options
   - Animate bars and graphs (like AI page)
   - [x] Task performance table UI update — hover, view/edit modals, sort filters, cursor-pointer
   - Space utilization and header updates

---

### Priority 5 — Later / Trivial Features
9. **Workspace Compact Sidebar** — for screens <1200px, hide trivial boards (toggle via settings icon)
10. **Milestones** — milestone order auto-assigned (editable, hidden in UI for now)
11. **Document Upload** — proper document upload option in UI
12. **Timer** — API-level pause and calculations instead of local only

---


# TODO 
## fixes
- 
- 


## top priority
+ very imp - remove any ui element using pagedate api , instead use the manual api for those elements

- refactor modals and overlays for consistency 
- redesign modals
- delete buttons for projects , milestones and tasks proper place defined and modal
- projectmilestone page - show details on side only on big screens, or only show on view icon click
- tasksubtask card in all places / taskcards at some - decide
- escalate task button and mentions
- user assignement in departments page
- organisation page only for superadmin, director only deparment page
- pojects page add more buttons on top nav
- consistent toasts and stat cards design
- [x] add project detailed cleaned ui to workspace page in new tab, and proper tab management and ui
- paginated results for documents and other sections, find all those sections make a list
- dashboard taskperformanceTable - opens older task modals

### new project creation flow
- [x] new project modal with steps for project creation
1. project details
2. departments select or create new department
3. milestones and tasks boxes like project details pane
4. task and subtasks 


### roles - settings page
- roles for director also but proper ui, hide superadmin for director
- settings page for both ( also create organisations for superadmin button)

## priority 2
- layout.tsx refactor and more features and organise strtucte ( home, project, departments at top)
- reorganise and refactor nav and sidebar 
- users page - users table add workload inside table (implemented but there are inconsitencies)
- merge users and profiles page
- merge skills new users and departments page ( new tabular page )
- hide manual status changes for milestone and projects
- organisation related info hidden for director and other users ( only superadmin can see it in all the elements)

## last 
### UI Styling
   - Responsive design for all elements
   - Hover and shadow effects matching color for all components
   - All components with max height and "view more" options
   - Animate bars and graphs (like AI page)
   - Space utilization and header updates
   + [x] Task performance table UI update — hover, view/edit modals, sort filters, cursor-pointer
   - all types of settings and settings api

### other 
- activity logs more refined and user friendly to read along with metadata
- hide manual activiy creation director 
- test page and pages api only for superadmin and if not needed clean it
- rearrange locations and rename components logically
- remove old components and pages which are not neeeded