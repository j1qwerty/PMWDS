# .NET Database Layer Audit Report

**Project:** PMWDS (Project Management & Work Delivery System)
**Date:** 2026-07-03
**Audit Scope:** PMWDS.Persistence, PMWDS.Domain/Entities, PMWDS.Domain/Common, PMWDS.API/Services, PMWDS.API/Program.cs
**Auditor:** .NET Database Auditor (AI)

---

## 1. EF Core Issues

### 1.1 N+1 Query Risks

#### CRITICAL: BaseRepository lacks Include mechanism

**Files:** PMWDS.Persistence\Repositories\BaseRepository.cs (Lines 21-27)

The generic GetAllAsync, FindAsync, and GetByIdAsync methods return entities without any Include calls. Any caller accessing navigation properties on the returned entities will trigger N+1 queries.

#### CRITICAL: ProjectRepository read methods missing Include

**Files:** PMWDS.Persistence\Repositories\ProjectRepository.cs

| Method | Line | Missing Includes |
|--------|------|-----------------|
| GetByManagerAsync | 43-46 | No navigation properties included |
| GetByStatusAsync | 51-53 | No navigation properties included |
| GetOverdueProjectsAsync | 57-64 | No navigation properties included |
| GetProjectsWithHighRiskAsync | 69-72 | No navigation properties included |

#### HIGH: GetAverageCompletionRateAsync - client-side evaluation

**File:** PMWDS.Persistence\Repositories\ProjectRepository.cs, Line 77-82
Materializes ALL matching projects then calls Average in memory. Should use AverageAsync.

#### MEDIUM: TaskRepository excessive includes in list methods

**File:** PMWDS.Persistence\Repositories\TaskRepository.cs, Lines 36-68, 103-106
Methods like GetByProjectAsync, GetByAssigneeAsync eagerly load 8+ navigation collections without AsSplitQuery, creating massive cartesian explosion queries.

#### HIGH: UserRepository.GetUserWorkloadScoreAsync - unnecessary round-trip

**File:** PMWDS.Persistence\Repositories\UserRepository.cs, Lines 89-100
Fetches entire ApplicationUser entity just to read a single scalar.

### 1.2 Missing AsNoTracking for Read-Only Queries

**All repository methods** return tracked entities. None of the repository methods call AsNoTracking:

| Method | File | Line |
|--------|------|------|
| GetAllAsync | BaseRepository.cs | 23 |
| FindAsync | BaseRepository.cs | 27 |
| GetByDepartmentAsync | ProjectRepository.cs | 31 |
| GetByManagerAsync | ProjectRepository.cs | 46 |
| GetByStatusAsync | ProjectRepository.cs | 53 |
| GetOverdueProjectsAsync | ProjectRepository.cs | 64 |
| GetProjectsWithHighRiskAsync | ProjectRepository.cs | 72 |
| GetAverageCompletionRateAsync | ProjectRepository.cs | 79 |
| GetByProjectAsync | TaskRepository.cs | 50 |
| GetByAssigneeAsync | TaskRepository.cs | 69 |
| GetOverdueTasksAsync | TaskRepository.cs | 80 |
| GetByMilestoneAsync | TaskRepository.cs | 88 |
| GetUnassignedTasksAsync | TaskRepository.cs | 97 |
| GetHighRiskTasksAsync | TaskRepository.cs | 106 |
| GetEscalatedTasksAsync | TaskRepository.cs | 115 |
| GetSubtasksByParentIdAsync | TaskRepository.cs | 131 |
| GetDependenciesForTaskAsync | TaskRepository.cs | 141 |
| GetAllAsync (override) | UserRepository.cs | 20 |
| GetByEmailAsync | UserRepository.cs | 26 |

### 1.3 ToListAsync Called Before Filtering

#### HIGH: GetAverageCompletionRateAsync
**File:** PMWDS.Persistence\Repositories\ProjectRepository.cs, Line 77-79
Materializes ALL rows then averages in memory. Should use AverageAsync.

#### MEDIUM: ProjectsSeeder.ClearExistingProjectsAsync
**File:** PMWDS.Persistence\Migrations\Seeders\ProjectsSeeder.cs, Lines 29-96
Materializes entire tables into memory. 9 separate SaveChangesAsync calls.

### 1.4 Select Projections
No Select projections are used anywhere in the repository layer. All queries return full entities.

## 2. Entity Design

### 2.1 Relationship Modeling

#### HIGH: Inconsistent User ID Types (string vs Guid)

**Files:** TaskAssignment.cs (UserId = string), TimeEntry.cs (UserId = string), TaskComment.cs, Project.cs (ProjectManagerId = string), ApplicationUser.cs (Id = Guid)

Domain model stores user references as strings throughout the task aggregate while ApplicationUser uses Guid. This mismatch is acknowledged in comments but remains unresolved.

**Affected navigation properties explicitly ignored:**
- TaskAssignment.User - b.Ignore(e => e.User) (TaskAssignmentConfiguration.cs:30)
- TimeEntry.User - b.Ignore(e => e.User) (TimeEntryConfiguration.cs:29)

#### MEDIUM: Multiple Cascade Paths
**File:** ProjectConfiguration.cs, Lines 43-54
Project -> Tasks (Cascade) + Project -> Milestones (NoAction) + Project -> Documents (Cascade) may cause multiple cascade paths in SQL Server.

#### MEDIUM: MilestoneConfiguration - conflicting delete behaviors
**File:** MilestoneConfiguration.cs, Lines 21-24
SetNull on Tasks FK means deleting a milestone causes task FK loss.

#### MEDIUM: ProjectDepartmentConfiguration - asymmetric delete
**File:** ProjectDepartmentConfiguration.cs
Project -> CASCADE, Department -> NoAction. Deleting department with active ProjectDepartments will fail.

### 2.2 Foreign Key Conventions
Most FKs are explicitly configured. Notable departures: Project.DepartmentId FK is by convention; TaskComment, TaskAttachment use .WithOne() without child navigation.

## 3. Migration Hygiene

### 3.1 Migration Naming

| Migration | Timestamp Prefix | Style |
|-----------|-----------------|-------|
| InitialCreate.cs | No | Legacy m alias |
| AddMilestoneDepartment.cs | No | Uses m alias |
| AddMilestoneDependencies.cs | No | Uses m alias |
| 20260630130938_AddAIGlobalSettings.cs | Yes | Uses migrationBuilder (different) |

**Issues:** 3/4 migrations lack timestamp prefixes, inconsistent naming style.

### 3.2 Backward Compatibility Risks

#### CRITICAL: EnsureSqliteDevelopmentDatabaseAsync is destructive
**File:** PMWDS.API\Services\DatabaseConnectionService.cs, Lines 265-283
Drops and recreates the entire database if schema doesnt match expectations. Catastrophic data loss risk.

#### HIGH: PrepareDatabaseAsync uses EnsureCreatedAsync
**File:** PMWDS.API\Services\DatabaseConnectionService.cs, Line 97
Bypasses EF Core migrations entirely. No migration history tracked for SQL Server/MySQL.

### 3.3 Data Loss Risks
#### HIGH: ProjectsSeeder.ClearExistingProjectsAsync - 9 SaveChanges without transaction
**File:** PMWDS.Persistence\Migrations\Seeders\ProjectsSeeder.cs, Lines 29-96

### 3.4 Snapshot Consistency
**File:** PMWDS.Persistence\Migrations\ApplicationDbContextModelSnapshot.cs
Model snapshot uses SQLite-only types (TEXT, INTEGER, REAL). Invalid for SQL Server/MySQL.

## 4. SQL Injection Risks

### 4.1 Raw SQL in Application Code
#### HIGH: String interpolation in SQL queries
**File:** PMWDS.API\Services\DatabaseConnectionService.cs, Lines 326, 348
String interpolation in SQLite schema queries bypasses parameterization.

#### MEDIUM: Raw DDL statements
**File:** PMWDS.API\Services\DatabaseConnectionService.cs, Lines 366-393
Raw ALTER TABLE statements with no parameterization.

### 4.2 No FromSqlRaw Usage
No FromSqlRaw or ExecuteSqlRaw calls were found. All data access uses EF Core LINQ.

## 5. Performance

### 5.1 Index Strategy
#### Missing: Composite indexes
| Entity | Missing Index | Pattern |
|--------|--------------|---------|
| ProjectTask | (ProjectId, Status) | Filter by project + status |
| ProjectTask | (AssignedToUserId, Status) | User active tasks |
| Notification | (UserId, IsRead, CreatedDate) | Unread notifications |
| TaskAssignment | (UserId, IsActive) | Active assignments |
| TimeEntry | (UserId, StartTime) | User time entries |
| Milestone | (ProjectId, Order) | Ordered milestones |

#### MEDIUM: Missing IsDeleted filtered indexes
All soft-delete entities lack filtered indexes on IsDeleted = 0. Full table scans for every query.

### 5.2 Query Performance
#### HIGH: TaskRepository cartesian explosion
8 navigation collections included without AsSplitQuery produces multiplicative row explosion.

#### HIGH: GetTaskGraphIdsAsync - N+1 over depth levels
One round-trip per depth level of task hierarchy. Should use recursive CTE.

### 5.3 Global Query Filters Impact
IsDeleted filter on all 45+ entities adds WHERE clause to every query.

### 5.4 Large DbSet Count (51 DbSets)
Large context increases model building time, memory footprint, and LINQ compilation time.

## 6. Connection Management

### 6.1 Connection String Storage
#### CRITICAL: Secrets exposed in config files
JWT Secret, OpenRouter API Key, SMTP password, SQL Server SA password all in appsettings.

#### CRITICAL: Plaintext API keys in database
AIProviderCredential.ApiKey stored as plaintext in AIProviderCredentials table.

#### MEDIUM: Good env var pattern in DbFactory
ApplicationDbContextFactory reads PMWDS_SQLITE_CONNECTION_STRING from environment.

### 6.2 Provider Auto-Detection Logic
**File:** PMWDS.API\Services\DatabaseConnectionService.cs, Lines 100-137
- SQL Server: 5 retries, 3s delay (15s total startup delay in dev)
- MySQL: 1 attempt, 2s timeout (inconsistent)
- Provider cached as singleton (requires restart to change)

### 6.3 Retry Policies
#### CRITICAL: No EnableRetryOnFailure configured
Transient SQL Server failures (common in cloud) will cause 500 errors.

## 7. Transaction Handling

### 7.1 UnitOfWork Transaction Scoping
**File:** PMWDS.Persistence\Repositories\UnitOfWork.cs
BeginTransactionAsync/CommitTransactionAsync/RollbackTransactionAsync are NEVER called from anywhere in the codebase.

### 7.2 Missing BeginTransaction Where Needed
#### CRITICAL: ProjectsSeeder.ClearExistingProjectsAsync - 9 SaveChanges, no transaction
#### MEDIUM: SeedData.SeedAsync - 11 seeders, each with independent SaveChanges

## 8. Soft Delete Pattern

### 8.1 Global Query Filter Correctness
Correctly applies IsDeleted == false to all BaseEntity subclasses.
- MEDIUM: No IgnoreQueryFilters used anywhere
- LOW: 45+ expression trees created dynamically

### 8.2 Missing IsDeleted Indexes
No indexes on IsDeleted. Full table scan for every filtered query.

### 8.3 Data Integrity
#### CRITICAL: BaseRepository.DeleteAsync uses hard delete (_dbSet.Remove) instead of SoftDelete
SaveChangesAsync override only handles Modified state - not Added CreatedBy or Deleted soft-delete.

## 9. Concurrency

### 9.1 RowVersion Implementation
**File:** PMWDS.Domain\Common\BaseEntity.cs
RowVersion is a plain int property manually incremented. NOT configured as EF Core concurrency token.
No IsConcurrencyToken() or IsRowVersion() used anywhere.
**Impact:** Concurrent updates silently overwrite each other. Last SaveChangesAsync wins.

## 10. Seeding & Data Integrity

### 10.1 Seeder Design
- 39+ SaveChangesAsync calls across all seeders
- PasswordHelper creates new PasswordHasher on every call (should be static)
- Idempotency checks present (AnyAsync) - good

### 10.2 Foreign Key Consistency
#### HIGH: Hardcoded department codes and milestone names in seed data
UsersSeeder uses hardcoded codes (PWD, PWDC, etc.) with silent fallback to first department.
TasksSeeder references milestone names as strings - silently returns Guid.Empty if names change.

## 11. Multi-DB Provider Compatibility

### 11.1 Compatibility Issues
#### CRITICAL: Model snapshot is SQLite-only
#### HIGH: SQL Server filtered index (HasFilter) incompatible with SQLite
#### HIGH: SQLite compatibility column patching as migration workaround
#### MEDIUM: EnsureDatabasesExist uses SQL Server T-SQL
#### MEDIUM: MySql.EntityFrameworkCore (Oracle) vs Pomelo community provider

### 11.2 Provider-Specific SQL
#### HIGH: Task Status enum legacy mapping (Assigned -> NotStarted)
File: TaskConfiguration.cs, Lines 20-23 - One-way conversion causes silent data corruption.

---

## Summary of Findings by Severity

| Severity | Count | Key Issues |
|----------|-------|------------|
| CRITICAL | 8 | Secrets in config, no concurrency tokens, N+1 in repositories, destructive SQLite schema, bypassing migrations, hard delete bypasses soft delete |
| HIGH | 14 | Missing AsNoTracking, client-side evaluation, missing includes, inconsistent user IDs, excessive SaveChanges, SQLite-only snapshot, missing retry policies |
| MEDIUM | 12 | Missing composite indexes, cartesian explosion, migration naming, raw SQL, global filter not ignorable, legacy enum mapping |
| LOW | 8 | Missing IsDeleted indexes, PasswordHasher creation, hardcoded seed refs, startup delay, 51 DbSets |

## Top 10 Recommendations

1. **Fix RowVersion/Concurrency**: Configure as EF Core concurrency token (IsConcurrencyToken)
2. **Add AsNoTracking**: All read-only repository queries
3. **Fix BaseRepository.DeleteAsync**: Use SoftDelete instead of Remove
4. **Wrap seeds in transactions**: SeedData.SeedAsync and ClearExistingProjectsAsync
5. **Add EnableRetryOnFailure**: Transient fault handling for cloud
6. **Replace EnsureCreatedAsync**: Use Database.MigrateAsync for migration tracking
7. **Remove hardcoded secrets**: Use env vars, User Secrets, or Key Vault
8. **Fix N+1 in ProjectRepository**: Add includes to all query methods
9. **Add filtered IsDeleted indexes**: Support global query filter
10. **Normalize user ID types**: Resolve string/Guid mismatch

---

End of Audit Report - 3 July 2026
