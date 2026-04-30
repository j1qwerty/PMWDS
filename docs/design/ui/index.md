# UI Specification Index

## Implementation Order

1. Projects
2. Milestones
3. Tasks
4. Subtasks
5. Roles
6. Permissions
7. Profiles
8. Users
9. Departments
10. Organizations
11. Skills
12. Notifications
13. Dashboards
14. Reports
15. Integrations
16. Webhooks
17. Knowledge
18. Activity Logs
19. AI pages after all non-AI pages are complete

## Shared Reuse Rules

- Build selectors as reusable components:
  - project selector
  - milestone selector
  - user selector
  - task selector
  - department selector
- Build generic infrastructure components:
  - filter bar
  - table toolbar
  - status badge
  - priority badge
  - confirm dialog
  - empty state
  - loading state
  - key-value editor
- Keep functions under 100 lines by splitting:
  - page containers
  - data hooks
  - form sections
  - modal wrappers
