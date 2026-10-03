# PR.md — SQL Server read-path performance review (PRs #38–#42)

Branch under test: `main` (`57eb70c`)
Review date: 2026-10-04
Target: the reported **25–27 s** local SQL Server 2022 Express page load.

---

## Verdict

| PR | Title | Compiles? | Verdict |
|----|-------|-----------|---------|
| #38 | limit concurrent API reads on cold starts | yes (after nothing) | **Do not merge** — regresses latency at measured scale |
| #39 | cache short-lived auth and scope snapshots | **no** (6 errors) | Fixed, but adds a security window |
| #40 | reduce EF tracking and read-graph pressure | yes | Safe, small win |
| #41 | bound SQL Server transient retries | **no** (1 error) | Fixed, safe |
| #42 | rebuild API and client read pipeline | **no** — API + client | **Do not merge** — breaks the app |

**Nothing was merged to `main`.** The merge condition set for this review — "fixed
*and* under 1 second" — was not met. At repro scale the page load is still
**3.9–6.8 s** after PRs #38–41, versus **5.0–7.7 s** before. That is a marginal
improvement, not a fix.

---

## 1. Two of the four "small" PRs do not compile

Both are trivially fixable, but both were pushed broken.

**PR #41 — `DatabaseConnectionService.cs`**
`EnableRetryOnFailure` has no 2-argument overload:

```
error CS7036: There is no argument given that corresponds to the required
parameter 'errorNumbersToAdd' of
'SqlServerDbContextOptionsBuilder.EnableRetryOnFailure(int, TimeSpan, IEnumerable<int>?)'
```

Fix: pass `errorNumbersToAdd: null`.

**PR #39 — `Program.cs`, `RoleScopeService.cs`**
`IMemoryCache.TryGetValue<T>` and `CacheExtensions.Set` are **extension
methods**, not interface members. Without the import the calls bind to the
non-generic `TryGetValue(object, out object?)`, producing 6 errors:

```
error CS1503: cannot convert from 'out bool' to 'out object?'
error CS1061: 'IMemoryCache' does not contain a definition for 'Set'
```

Fix: add `using Microsoft.Extensions.Caching.Memory;` to both files.
(`AddMemoryCache()` is already registered at `Program.cs:68`.)

Both fixes are committed on `temp` as `8fcb43b`.

## 2. PR #42 must not be merged

It does not build, on either side of the pipeline.

**API — 7 syntax errors**
```
TasksController.cs(213): error CS1519: Invalid token 'return' in a member declaration
RoleScopeService.cs(450): error CS1513: } expected
UsersController.cs(203):  error CS1002: ; expected
```

**Client — 18 TypeScript errors, 9 of them unresolved imports.**
The PR deletes `Client/src/pages/projectsK/components/` (~4,900 lines, 17 files)
while seven live modules still import from it:

```
pages/nested/ProjectTasksPage.tsx        -> MilestoneDetailModal, MilestoneFormModal,
                                            TaskSubtaskDetailsModal, TaskFormModal,
                                            ConfirmDeleteModal, DependencyFormModal
pages/nested/ProjectMilestonesPage.tsx   -> ../projectsK/components, Tasksubcard
pages/nested/ProjectDocumentsPage.tsx    -> DocumentsSection
pages/nested/ProjectDependenciesPage.tsx -> MilestoneDependencyPanel
pages/nested/ProjectInfoCard.tsx         -> ../projectsK/components
pages/shared/MilestonesTab.tsx           -> ProjectTaskCardk, DocumentsSection
pages/shared/dash/TaskSubtaskBoard.tsx    -> TaskSubtaskCard
```

Every project-detail page fails to compile. A PR titled "perf" that removes a
project-management UI tree is a restructuring change wearing a performance label;
it needs its own review, and the author should restore the deleted components
and fix the syntax errors.

## 3. Measurements

### Environment
- SQL Server 2022 Express, `MAXDOP = 0`, `max server memory` uncapped (2147483647)
  — the "sick" configuration from the original investigation, confirmed unchanged.
- `localhost,1433` **times out** (resolves to `::1`); `127.0.0.1,1433` works.
- Redis is not running (falls back to in-memory).

### Why the default dev database cannot reproduce the problem
`PMWDS` holds 14 projects / 311 tasks / 21 users. The whole `Projects` table is
**4 logical reads**. The documented failure needed ~2,200 reads per request.
On that data `main` is already **0.2 s warm / 0.48 s cold**, so any test there
passes vacuously.

### Repro-scale harness
`docs/scripts/scale-perf-db.sql` builds `PMWDS_Perf` at the volumes from the
investigation:

| Table | Rows |
|---|---|
| Users / UserProfiles | 631 |
| UserSkills | 1,830 |
| Projects | 4,004 |
| ProjectDepartments | 4,011 |
| Milestones | 4,028 |
| Tasks | 8,308 |

with `Description` at 1,980 chars and `AIInsightsSummary` at 3,984 chars, so the
`/projects` hot path costs **4,022 logical + 4,000 LOB reads**.

`docs/scripts/measure-burst.ps1` fires the page-load reads concurrently and
reports wall time; `-ColdCache` drops the buffer and plan cache first.

### Result — 3 cold-cache rounds each, identical data

| | main | temp (#38–41) |
|---|---|---|
| burst wall | 5.04 / 7.74 / 7.22 s | 5.46 / 3.90 / 6.78 s |
| `/pages` | 5.06 – 7.78 s | 3.92 – 6.80 s |
| `/projects` | 1.77 – 2.58 s | 0.98 – 1.76 s |
| `/users` | 0.76 – 1.05 s | 0.45 – 1.21 s |

**Still 4–7 s, not under 1 s.** All responses were HTTP 200 with comparable
payload sizes (1.54 MB vs 1.62 MB for `/pages`), so this is a genuine timing
comparison and not an artefact of truncated data.

An earlier run appeared to show 0.6 s on `temp`. That measurement was taken
against a partially-recreated database and is **not** valid; the table above is
the reliable result.

### Why these PRs cannot reach sub-second
The bottleneck is not concurrency — it is payload. `/pages` returns **1.6 MB**
and `/users?pageSize=500` **844 KB** because the list DTOs still serialise the
full AI and description columns. Serialising 1.6 MB of JSON over EF is the cost.
PR #40 adds `AsNoTracking`/`AsSplitQuery`, which helps tracking overhead but
does not shrink the response.

The effective fix is to project the list queries to the fields the UI actually
renders, dropping `AIInsightsSummary` and the long description from list
endpoints. That is closer to what PR #42 attempts, but PR #42 needs to be
reworked and re-reviewed first.

### PR #38 is a latency regression at this scale
Capping client reads at 2 is sound advice for a genuinely grant-starved server,
but on this instance there is no grant starvation to relieve. Round 1 service
times sum to **9.78 s**; the unlimited burst completes in **5.46 s**. A
2-lane schedule lands near **7.2–7.6 s**, i.e. roughly **1.8 s slower** than
leaving reads parallel. Keep #38 only if the target is the pathological
VPS-style configuration, and prefer a server-side fix.

### PR #39 trades correctness for latency
Caching token validity for 5 s means a token revoked via `AccessTokenVersion`,
or a user deactivated via `IsActive`, keeps working for up to 5 s. The scope and
permission caches have the same 5 s staleness. Acceptable for a local dev box,
worth avoiding in production.

## 4. Pre-existing bugs found while testing (unrelated to these PRs)

These are on `main` today and will block any future perf work.

1. **Development startup can silently delete the database.**
   `DatabaseConnectionService.PrepareDatabaseAsync`:
   ```csharp
   catch when (environment.IsDevelopment())
   {
       await db.Database.EnsureDeletedAsync(ct);   // drops the whole database
       await db.Database.MigrateAsync(ct);
   }
   ```
   Any transient migration failure destroys all local data. This wiped the
   4,000-row perf database mid-review.

2. **`Projects.ProjectManagerId` schema does not match the model.**
   The column is `uniqueidentifier` in both `PMWDS` and `PMWDS_Perf`, but
   `Project.ProjectManagerId` is `string` and `InitialCreate` declares
   `t.Column<string>`. `MilestonesSeeder` (`context.Projects.ToListAsync()`)
   therefore throws:
   ```
   System.InvalidCastException: Unable to cast object of type 'System.Guid'
   to type 'System.String'.
   ```
   `main` failed to start against `PMWDS_Perf` on 3 of 4 attempts. The same
   crash is why `main` will not start against the `PMWDS` dev database, which
   also has a NULL in a required `Projects` string column.

3. `UsersController.UserGraph` dropped `.Include(u => u.Organization)` in PR #40.
   Verified safe: `UserDto` only reads `OrganizationId` /
   `Department.OrganizationId` foreign keys, never that navigation.

## 5. Recommended sequence

1. Fix `Projects.ProjectManagerId` (model vs migration) and the NULL column in
   the `PMWDS` dev database, so `main` starts against a real database again.
2. Replace the `EnsureDeleted` recovery path with a rethrow or an explicit
   opt-in flag.
3. Re-open #42 with the deleted `projectsK` components restored and the syntax
   errors fixed; scope it as the read-pipeline rebuild it actually is.
4. Introduce list projections that omit the AI/long-text columns, then
   re-measure with `docs/scripts/measure-burst.ps1` against `PMWDS_Perf`.
5. Merge #40 and #41 (with the compile fix) once #4 lands; treat #38 and #39
   as separate decisions.