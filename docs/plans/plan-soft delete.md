## note - after soft delete implementation make a new plan for superadmin only api for soft deleted data and option to restore it

## Final Plan - soft delete

### 1. `BaseEntity.cs` — Add `DeletedAt` + Update `SoftDelete()`
- New property: `public DateTime? DeletedAt { get; protected set; }`
- `SoftDelete(userId)` sets `DeletedAt = DateTime.UtcNow` in addition to `IsDeleted = true`

### 2. `BaseRepository.cs` — Stay as-is (hard delete)
- Controllers **will not call** `repo.DeleteAsync()` anymore
- Cleanup job will use `_dbSet.Remove` / `ExecuteDelete` directly

### 3. All Controller Delete Endpoints — Change to Soft Delete
Pattern becomes:
```csharp
var entity = await _uow.Projects.GetByIdAsync(id, ct);
if (entity == null) return NotFound();
entity.SoftDelete(_currentUser.UserId);
// existing cascade logic stays, but sets children to soft delete too
// ... then SaveChangesAsync
```
Affected controllers: `Projects`, `Tasks`, `Milestones`, `Departments`, `Organizations`, `Reports`, `Dashboards`, `Notifications`, `Webhooks`, `Knowledge`, `Integrations`, `Roles`, `Skills`, `Users`, `AIController`.

### 4. `TaskRepository.DeleteTaskGraphsByIdsAsync` — Soft Delete
Replace `RemoveRange` with iterating and calling `SoftDelete()` on each entity (tasks + dependencies).

### 5. Direct `_dbSet.RemoveRange` calls in Controllers
- `MilestonesController.Delete` line 550: `RemoveRange(deps)` → soft delete each milestone dep
- `ProjectsController.Delete` line 412: `RemoveRange(deps)` → soft delete each milestone dep

### 6. New `TrashCleanupJob` (`PMWDS.Infrastructure\Jobs\`)
- Implements `ITrashCleanupJob`
- Runs via Hangfire `Cron.Daily(3)` (3 AM)
- Queries all entity types where `IsDeleted == true AND DeletedAt < DateTime.UtcNow.AddDays(-90)`
- Hard-deletes in topological order: child entities → parent entities
- Registers in `Program.cs` DI + recurring job

### 7. EF Migration
- `dotnet ef migrations add AddDeletedAtToBaseEntity` — adds `DeletedAt` column to all tables

### 8. No Front-End Changes
Global query filter continues to hide soft-deleted items from all existing queries.

---

