# SQLite Development Fallback

PMWDS is configured for SQL Server as the production database, but the local development environment currently falls back to SQLite because SQL Server is not working on the laptop.

## Current Development Database

```text
PMWDS.API/App_Data/pmwds-dev.sqlite
```

The API creates the `App_Data` directory if needed.

## Configuration

File: `PMWDS.API/appsettings.Development.json`

```json
"Database": {
  "ForceSqlite": true,
  "SqliteConnectionString": "Data Source=App_Data/pmwds-dev.sqlite"
}
```

## Selection Logic

SQLite is selected only in Development:

```csharp
var useSqlite = builder.Environment.IsDevelopment() &&
    (databaseSettings.ForceSqlite ||
     !CanConnectToSqlServer(sqlServerConnection));
```

Behavior:

- `ForceSqlite: true` always uses SQLite in Development.
- `ForceSqlite: false` tries SQL Server first, then uses SQLite in Development if SQL Server cannot connect.
- Non-development environments use SQL Server.

## Startup Bootstrap

When SQLite is active, `PMWDS.API/Program.cs` validates that the expected schema exists. If the schema is missing or stale, the dev database is deleted and recreated from the EF Core model, then `SeedData.SeedAsync` runs.

This is intentional for local development because the historical migration set was created for SQL Server and is not fully portable to SQLite.

## Seeded Data

First run seeds representative records for:

- Organizations and departments.
- Users, roles, permissions, profiles, and skills.
- Projects, milestones, tasks, subtasks, dependencies, comments, assignments, and time entries.
- Notifications, templates, alert rules, dashboards, reports, schedules.
- Integrations, webhooks, deliveries, knowledge articles, lessons, and activity logs.
- AI models, training data, prediction results, allocation recommendations, and delay predictions.

Default password:

```text
Pmwds@123
```

## Hangfire

Hangfire is disabled when SQLite is active. Hangfire requires SQL Server storage in this project.

## EF Migration Caveat

Do not depend on this command for the existing local SQLite database:

```powershell
dotnet ef database update --project PMWDS.Persistence --startup-project PMWDS.API --context ApplicationDbContext
```

Use the API startup path instead:

```powershell
dotnet run --project PMWDS.API --urls http://localhost:5177
```

For the deeper root-cause and production fix options, see [docs/issue-sqlite.md](docs/issue-sqlite.md).

## Production Recommendation

Use SQL Server for production. If SQLite must become a supported runtime database, create provider-specific migrations and test both migration paths independently.
