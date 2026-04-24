# SQLite Development Database Issue Report

Date: April 24, 2026

## Summary

The solution was originally built around SQL Server migrations, but local development currently uses SQLite at `PMWDS.API/App_Data/pmwds-dev.sqlite` because SQL Server is not available on the developer laptop.

The API works locally with SQLite because startup uses a fallback bootstrap flow that recreates the SQLite schema when required. However, `dotnet ef database update` against the existing SQLite development database is not reliable and currently fails because the historical migration chain is not compatible with the already-created SQLite schema and earlier SQL Server-oriented assumptions.

This means:

- Local API execution works.
- Local development against SQLite works.
- EF design-time migrations can still be created.
- Applying the full historical migration chain directly to the existing SQLite file is not a safe or repeatable process today.

This is acceptable as a temporary development workaround, but it is not a production-ready database lifecycle strategy.

## Current Process

### Runtime Selection

The entry point is `PMWDS.API`.

At application startup:

- In development, the app decides whether to use SQL Server or SQLite.
- If SQL Server is unavailable, the app falls back to SQLite.
- The SQLite database path is `PMWDS.API/App_Data/pmwds-dev.sqlite`.

Relevant implementation:

- [Program.cs](/E:/saturday/PMWDS.S/PMWDS.API/Program.cs)

Current logic:

1. Read database settings.
2. Try SQL Server connectivity.
3. If development mode is active and SQL Server is unavailable, switch to SQLite.
4. For SQLite, do not run `db.Database.MigrateAsync()`.
5. Instead, run `EnsureSqliteDevelopmentDatabaseAsync(db)`.

### SQLite Bootstrap Flow

For SQLite development, the current bootstrap is:

1. Check whether the SQLite database is reachable.
2. Check whether a set of expected tables exists.
3. If the schema is missing or invalid:
   recreate the database with `EnsureDeletedAsync()` and `EnsureCreatedAsync()`.
4. Run seed data.

This gives a working development schema quickly, but it bypasses the full EF migration history.

### Design-Time DbContext Behavior

The EF design-time factory was updated to use SQLite for tooling:

- [ApplicationDbContextFactory.cs](/E:/saturday/PMWDS.S/PMWDS.Persistence/Context/ApplicationDbContextFactory.cs)

Current behavior:

- If `PMWDS_SQLITE_CONNECTION_STRING` is not set, it resolves the solution root and points EF tools to:
  `PMWDS.API/App_Data/pmwds-dev.sqlite`
- This allows commands like `dotnet ef migrations add ...` to succeed for the SQLite-backed model.

## Current Failure

### What Works

These were verified successfully on April 24, 2026:

- `dotnet build PMWDS.slnx`
- API startup on SQLite
- Swagger response from `http://localhost:5177/swagger/v1/swagger.json`
- EF migration creation, including `20260424092701_AddAiFeatureCoverage`

### What Fails

This still fails against the existing SQLite file:

```powershell
dotnet ef database update --project PMWDS.Persistence --startup-project PMWDS.API
```

Observed failure:

- EF starts applying historical migrations.
- It attempts to create tables that already exist in the SQLite database.
- Example error:
  `SQLite Error 1: 'table "AuditLogs" already exists'`

### Why It Fails

The failure is caused by a mismatch between three different realities:

1. Historical migration chain
   The original migration history was built with SQL Server as the main target and assumes a migration-driven schema lifecycle.

2. Current SQLite development file
   The local SQLite file has been created through runtime bootstrap using `EnsureCreated`, not by replaying the full migration chain from an empty database in a clean, migration-consistent way.

3. EF migration history expectations
   When `dotnet ef database update` runs, EF relies on `__EFMigrationsHistory` and the migration chain to understand what has already been applied. If the real schema already exists but the migration history does not match, EF tries to create objects that are already present.

In short:

- The schema exists.
- EF does not fully trust or know that it exists through its migration history.
- So EF replays migration operations that conflict with the existing database.

## Root Cause Analysis

This is not a single bug. It is a lifecycle inconsistency.

### Root Cause 1: Mixed Schema Creation Strategies

The project currently uses two different schema creation strategies for local SQLite:

- `EnsureCreated`
- migrations

These strategies should not be mixed for the same long-lived database file.

`EnsureCreated` creates the schema directly from the current model and bypasses migrations. Once that happens, EF migration history is no longer authoritative unless it is manually aligned.

### Root Cause 2: Original Migrations Were Not Designed Around SQLite as a First-Class Target

The repository was configured primarily around SQL Server. Even though EF Core can generate provider-specific SQL, the historical lifecycle, assumptions, and testing path were SQL Server-first.

That means:

- the baseline history was not validated as a true SQLite-first migration path
- the development workflow drifted into runtime schema creation instead of migration application

### Root Cause 3: Existing Development DB Has History Drift

The current SQLite file is not just "a database"; it is a database with drift relative to the migration chain.

Schema drift here means:

- actual tables and columns exist
- migration history does not represent how they got there
- EF tooling and runtime can disagree about what the database state is

## Current Workaround

The current workaround is:

- use SQLite only for development
- let the API bootstrap recreate the SQLite database when required
- rely on seed data after recreation
- do not rely on `dotnet ef database update` for the existing SQLite file

This is pragmatic for local development because it keeps the project runnable.

### Advantages

- Fast local recovery.
- No dependency on SQL Server for daily development.
- New features can still be validated through application startup.
- Migration files can still be generated from the model.

### Limitations

- Database recreation can destroy local test data.
- EF migration history for SQLite remains untrusted.
- CI/CD style database validation is weaker.
- The local database process is not representative of production.

## Why This Is Not Production Ready

The current SQLite development flow is acceptable only as a temporary local fallback.

It is not production ready because:

- `EnsureCreated` is not a safe long-term schema evolution strategy.
- Schema changes are not being validated exclusively through migration replay.
- Drift can accumulate silently.
- Roll-forward and rollback strategies are weak.
- Environment parity is low if production remains on SQL Server.

A production-ready database lifecycle must have:

- one authoritative schema evolution mechanism
- repeatable application of schema changes
- deterministic migration history
- validated upgrade path from one version to the next
- backup and rollback planning

## Production-Ready Fix Options

## Option 1: Keep SQL Server as the Only Migration Authority, Use SQLite Only as Disposable Local Cache

This is the lowest-risk strategic option if production will remain on SQL Server.

### Approach

- Treat SQL Server as the only authoritative relational target.
- Keep EF migrations authored and validated against SQL Server only.
- Keep SQLite as a development convenience database only.
- For SQLite, continue using recreate-on-start behavior.
- Explicitly document that SQLite is disposable and non-authoritative.

### Required Changes

- Mark SQLite fallback as development-only in documentation and config.
- Stop expecting `dotnet ef database update` to be the normal SQLite path.
- Optionally rename the current helper to make its destructive nature explicit.
- Add backup/restore or auto-export for any local seed/test data worth preserving.

### Pros

- Lowest implementation risk.
- Matches current production direction if production uses SQL Server.
- No need to rewrite historical migrations.
- Clear operational boundary.

### Cons

- Development environment does not mirror production migration behavior.
- Local persistence remains disposable.
- SQLite-specific bugs may still appear.

### When To Choose

Choose this if:

- production is SQL Server
- local SQLite is only for convenience
- the team wants minimal disruption now

## Option 2: Make SQLite a First-Class Migration Target With a Clean SQLite Baseline

This is the best long-term option if SQLite must be supported as a real, durable environment.

### Approach

- Stop using `EnsureCreated` for long-lived SQLite databases.
- Create a clean SQLite baseline strategy.
- Replay migrations from an empty SQLite database only.
- Ensure all future schema changes are migration-driven.

### Required Changes

1. Create a brand-new SQLite baseline migration strategy.
2. Delete or archive the current drifted development DB.
3. Create a fresh SQLite database only through `dotnet ef database update`.
4. Remove or greatly reduce the recreate-on-start bootstrap logic.
5. Add test coverage that applies all migrations to an empty SQLite database in CI.

### Important Detail

Because the current SQLite DB is already drifted, this option usually requires one of:

- throwing away the current SQLite file and rebuilding cleanly
- or manually stamping migration history after verifying schema parity

The first approach is safer.

### Pros

- Stronger lifecycle discipline.
- Repeatable upgrades.
- Better CI validation.
- SQLite becomes a real supported target.

### Cons

- More engineering work.
- Historical migrations may need cleanup or provider-specific fixes.
- Existing local SQLite data will likely need to be discarded once.

### When To Choose

Choose this if:

- SQLite must be durable and trustworthy
- the team wants repeatable migration-based local environments
- CI should validate SQLite upgrades directly

## Option 3: Re-Baseline Migrations

This is the cleanest architectural reset, but it is also the most invasive.

### Approach

- Freeze the current model as the new baseline.
- Archive old migrations.
- Generate a new baseline migration from the current schema model.
- Apply the new migration strategy consistently going forward.

### Variants

- SQL Server baseline only
- SQLite baseline only
- dual-provider strategy with documented primary/secondary support

### Pros

- Removes historical baggage.
- Easier for new developers.
- Cleaner migration history going forward.

### Cons

- High coordination cost.
- Existing deployed environments must be handled carefully.
- Can be risky if production environments already depend on old migrations.

### When To Choose

Choose this if:

- migration history is already hard to trust
- the project is still early enough to absorb a reset
- the team wants a clean, maintainable base

## Option 4: Maintain Separate Migration Sets Per Provider

This is the most formal multi-provider approach.

### Approach

- Keep one migration set for SQL Server.
- Keep a separate migration set for SQLite.
- Generate and validate each provider independently.

### Pros

- Clear provider-specific control.
- Best fit when both SQL Server and SQLite are real supported environments.

### Cons

- Significant maintenance overhead.
- Developers must understand which migration set applies to which environment.
- Higher chance of divergence if discipline is weak.

### When To Choose

Choose this only if:

- both SQL Server and SQLite are truly supported targets
- the team accepts the operational cost

## Option 5: Use Containers or Local SQL Server Instead of SQLite for Development

This avoids the provider mismatch entirely.

### Approach

- Run SQL Server locally through Docker or LocalDB.
- Use the same provider locally as production.
- Remove SQLite fallback or reduce it to emergency-only use.

### Pros

- Best production parity.
- Migration behavior matches production.
- Fewer provider-specific surprises.

### Cons

- Heavier local setup.
- Not ideal on constrained laptops.
- Requires Docker or SQL Server availability.

### When To Choose

Choose this if:

- production parity matters most
- the team can standardize local infra
- SQLite is no longer needed

## Recommended Path

For this project, the most practical production-ready path is:

1. Short term:
   Keep the current SQLite fallback only for development convenience.
2. Medium term:
   Make SQL Server the only authoritative migration path unless the team explicitly decides to support SQLite as a first-class database.
3. If SQLite must remain durable:
   Rebuild the SQLite lifecycle from a clean baseline and stop using `EnsureCreated` for persistent dev databases.

### Concrete Recommendation

If production is SQL Server, the recommended path is Option 1 plus part of Option 5:

- Keep current local SQLite fallback for immediate productivity.
- Explicitly document it as disposable.
- Validate all official migrations on SQL Server.
- Prefer Docker SQL Server or LocalDB for developers who need production-parity testing.

This balances:

- low risk now
- operational clarity
- production readiness

## Immediate Tactical Improvements

These improvements should be made even if the broader strategy is postponed.

### 1. Document SQLite as Disposable

State clearly in docs:

- the local SQLite database is a development fallback
- it may be recreated automatically
- local data should not be treated as persistent

### 2. Add Automatic Backup Before Recreation

Before calling `EnsureDeletedAsync`, create a timestamped backup if the file exists.

This reduces accidental local data loss.

### 3. Improve Startup Logging

Log clearly:

- why SQLite was selected
- whether schema validation passed
- whether database recreation occurred
- where the backup was written

### 4. Add a Dedicated Dev Command

Provide an explicit development command such as:

```powershell
dotnet run --project PMWDS.API -- --reset-sqlite-dev-db
```

or a script that:

- backs up the SQLite file
- deletes it
- starts the app

That is safer than hiding destructive behavior entirely inside startup.

### 5. Add CI Validation

At minimum, add one of:

- SQL Server migration replay test
- SQLite empty-database migration replay test

depending on the chosen support strategy

## Implementation Plan For a Clean Long-Term Fix

If the team chooses SQL Server as authoritative:

1. Document SQLite as non-authoritative.
2. Keep runtime fallback for development only.
3. Validate migrations only against SQL Server in CI.
4. Add optional Docker SQL Server dev profile.

If the team chooses SQLite as first-class:

1. Archive the current drifted SQLite DB.
2. Remove dependence on `EnsureCreated` for persistent environments.
3. Create a fresh empty SQLite DB.
4. Apply migrations from zero.
5. Verify the resulting schema.
6. Add CI to replay all migrations on SQLite.
7. Only then retire the current workaround.

## Risk Assessment

### If Nothing Changes

Risks:

- repeated confusion around `dotnet ef database update`
- accidental local data loss when SQLite schema is recreated
- migration history remains difficult to trust
- future schema changes may widen the gap between runtime and tooling

### If SQLite Is Declared Disposable

Risks:

- low operational risk
- moderate confusion if not documented well

### If SQLite Is Made First-Class Without Cleanup

Risks:

- high chance of ongoing migration problems
- hidden drift remains
- harder debugging later

### If Migrations Are Re-Baselined Carefully

Risks:

- short-term coordination cost
- lower long-term maintenance risk

## Final Recommendation

The current state is acceptable as a development workaround, not as a final lifecycle design.

Recommended decision:

- treat SQL Server as the production source of truth
- treat SQLite as disposable local fallback unless there is a firm product requirement to support SQLite as a durable database

If SQLite must become a durable supported target, the correct fix is not to keep patching the current drifted file. The correct fix is to establish a clean migration-driven SQLite baseline and remove reliance on `EnsureCreated` for long-lived environments.

## Files Involved

- [Program.cs](/E:/saturday/PMWDS.S/PMWDS.API/Program.cs)
- [ApplicationDbContextFactory.cs](/E:/saturday/PMWDS.S/PMWDS.Persistence/Context/ApplicationDbContextFactory.cs)
- [SeedData.cs](/E:/saturday/PMWDS.S/PMWDS.Persistence/Migrations/SeedData.cs)
- [issue-sqlite.md](/E:/saturday/PMWDS.S/docs/issue-sqlite.md)
