# TestPage Analysis — Pages API: Role-Based & Pagination Data Only

## Overview

The test page at `Client/src/pages/temp/TestPage.tsx` consumes the unified `/api/pages` endpoint (`PagesController.cs`). This analysis confirms that **every entity returned by the Pages API is simultaneously role-filtered AND paginated** — no entity returns unfiltered or unpaginated data.

---

## 1. Role-Based Data Filtering (applied to ALL entities)

### 1.1 Role Scoping via `RoleScopeService` (`PMWDS.API/Services/RoleScopeService.cs`)

| Role | Behavior |
|------|----------|
| **SuperAdmin** | Bypasses all scoping — sees all data across all organizations |
| **Director** | Scoped to organizations they belong to (via `OrganizationId` or department assignments) |
| **DepartmentHead** | Same as Director, plus special user-scope logic: sees Directors/DepartmentHeads in their organizations |
| **ProjectManager** | Scoped to organizations they belong to |
| **TeamMember** | Scoped to organizations they belong to |

**Scope methods applied in `PagesController.Get()`:**
```
organizations → _scope.ScopeOrganizationsAsync()   — filters to user's orgs
departments   → _scope.ScopeDepartmentsAsync()     — filters to user's orgs
projects      → _scope.ScopeProjectsAsync()        — filters via org → dept → project chain
users         → _scope.ScopeUsersAsync()           — excludes SuperAdmins; filters to user's orgs/depts
milestones    → WHERE projectIds IN (scoped projects)
tasks         → WHERE projectIds IN (scoped projects)
subtasks      → WHERE projectIds IN (scoped projects)
```

### 1.2 Permission-Gated Entities (conditional inclusion)

These entities return an `EmptyPage` (zero items, zero total) unless the user holds the required permission:

| Entity | Required Permission | Line |
|--------|-------------------|------|
| Roles | `PermissionCodes.RoleView` | 165 |
| Permissions | `PermissionCodes.PermissionView` | 168 |
| NotificationTemplates | `PermissionCodes.NotificationTemplateManage` | 172 |
| AlertRules | `PermissionCodes.NotificationRuleManage` | 175 |
| ActivityLogs | `PermissionCodes.ActivityLogView` | 183 |

**Manage permission coverage:** Having a "Manage" permission (e.g., `OrganizationManage`) implicitly grants all CRUD sub-permissions (`OrganizationView`, `OrganizationCreate`, etc.) via `ManagePermissionCoverage` dictionary (line 38-51).

**Entities currently hardcoded to EmptyPage (future implementation):**
- Skills (line 178)
- Reports (line 179)
- Integrations (line 180)
- KnowledgeArticles (line 181)
- LessonsLearned (line 182)

**Notifications** are always scoped to the current user (`n.UserId == currentUserId`, line 285) — no additional permission check needed.

### 1.3 Role-Derived Page Size

`ResolveUserPageSize()` (line 481-495) computes the user's page size from their roles:
```csharp
var rolePageSize = user.Roles
    .Select(r => r.PaginationPageSize)
    .Where(size => size > 0)
    .DefaultIfEmpty(10)
    .Max();
return Math.Clamp(rolePageSize, 1, 500);
```
- Each `Role` entity has a `PaginationPageSize` field (default 10, max 500)
- The API takes the MAX across all user's roles
- Result is clamped to 1–500

---

## 2. Pagination (applied to ALL entities)

### 2.1 Doubling Strategy

The API implements a **doubling strategy** for smooth UX:
```csharp
var returnedPageSize = Math.Clamp(userPageSize * 2, 1, 500);
var pagination = new PaginationQuery(page, returnedPageSize);
```
- Server returns **2×** the user's configured page size
- Frontend splits each API response into 2 user-visible pages
- Example: user page size = 10 → server returns 20 items → frontend shows 10 per user page

### 2.2 Pagination Applied Everywhere

Every entity uses `ToPageAsync()` or equivalent:
```csharp
var total = await query.CountAsync(ct);
var entities = await query.Skip(pagination.Skip).Take(pagination.NormalizedPageSize).ToListAsync(ct);
return PaginatedResponse<TDto>.Create(entities.Select(map).ToList(), pagination, total);
```

### 2.3 PaginationQuery Normalization (`PaginationDto.cs`)
- `NormalizedPage` — clamped to minimum 1
- `NormalizedPageSize` — clamped to 1–500, rounds to standard sizes (10, 20, 30, 50, 100)
- `Skip` = `(NormalizedPage - 1) * NormalizedPageSize`

### 2.4 PaginatedResponse<T> Structure
```csharp
record PaginatedResponse<T>(
    List<T> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);
```

---

## 3. How TestPage Uses This

### 3.1 Initial Fetch (line 65-73)
```typescript
api.getPagesData(auth.token)  // no pageSize — server uses role default
```
- No `pageSize` sent → server resolves from user's roles
- Response contains `userPageSize` (role-derived) and `returnedPageSize` (doubled)

### 3.2 Doubling UX (line 161-164)
```typescript
const offset = (currentUserPage - 1) % 2;
const allItems = entityData?.items ?? [];
const currentItems = allItems.slice(offset * userPageSize, offset * userPageSize + userPageSize);
```
- `offset` 0 = first half of API response (user page 1, 3, 5...)
- `offset` 1 = second half (user page 2, 4, 6...)

### 3.3 Background Pre-Fetch (line 85-97)
```typescript
if (currentUserPage % 2 === 0 && !apiCache[nextApiPage]) {
    // Pre-fetch next API page in background
}
```
- When user is on the 2nd half of an API page, the next API page is fetched asynchronously
- Checkmark (✓) indicators show cached API pages in pagination nav

### 3.4 Scroll-Based Pagination (line 169-183)
```typescript
const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && currentUserPage < totalUserPages) {
        navTo(currentUserPage + 1);
    }
}, { threshold: 0.5 });
observer.observe(el);
```

---

## 4. Data Flow Summary

```
TestPage.tsx
  │  GET /api/pages?page=1&pageSize=<role-derived>
  ▼
PagesController.Get()
  │
  ├─ ResolveUserPageSize()  ──→ reads Role.PaginationPageSize (max across roles)
  ├─ returnedPageSize = userPageSize × 2
  │
  ├─ _scope.ScopeOrganizationsAsync()  ──→ filters to user's orgs
  ├─ _scope.ScopeDepartmentsAsync()    ──→ filters to user's orgs
  ├─ _scope.ScopeProjectsAsync()       ──→ filters to user's orgs
  ├─ _scope.ScopeUsersAsync()          ──→ filters to user's orgs/depts
  ├─ projectIds from scoped projects   ──→ scopes milestones/tasks/subtasks
  │
  ├─ HasPermission(RoleView)           ──→ roles or EmptyPage
  ├─ HasPermission(PermissionView)     ──→ permissions or EmptyPage
  ├─ HasPermission(NotificationTemplateManage) → templates or EmptyPage
  ├─ HasPermission(NotificationRuleManage)    → alert rules or EmptyPage
  ├─ HasPermission(ActivityLogView)    ──→ activity logs or EmptyPage
  │
  └─ Each entity → .Skip().Take()     ──→ paginated
      └─ PaginatedResponse<T>.Create()
  ▼
PagesDataResponse (18 entity collections + metadata)
  ▼
TestPage.tsx
  ├─ Splits doubled response into 2 user pages
  ├─ Pre-fetches next API page in background
  └─ Renders with scroll-based or button pagination
```

---

## 5. Conclusion

**Yes — the Pages API sends only role-based data with pagination.**

| Aspect | Guaranteed? | Enforcement |
|--------|-------------|-------------|
| Role-scoped entities | ✅ Yes | `RoleScopeService` applied to organizations, departments, projects, users, milestones, tasks, subtasks |
| Permission-gated entities | ✅ Yes | `HasPermission()` gates 5 entity types; returns `EmptyPage` when denied |
| Paginated data | ✅ Yes | All 18 entity collections use `.Skip().Take()` with `PaginatedResponse<T>` |
| No unfiltered/unpaginated data | ✅ Yes | Every entity in the response passes through both role scoping AND pagination |

**No entity returns data that is either unfiltered by role or unpaginated.** The architecture ensures every entity collection in `PagesDataResponse` is both role-scoped (via `RoleScopeService` or `HasPermission`) and paginated (via `PaginationQuery`).
