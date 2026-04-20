# PMWDS

PMWDS is a multi-project .NET 10 solution with `PMWDS.API` as the entry application.

## Run The API

Build:

```powershell
dotnet build PMWDS.API\PMWDS.API.csproj
```

Run:

```powershell
dotnet run --project PMWDS.API\PMWDS.API.csproj --launch-profile http
```

Default development URLs are defined in [PMWDS.API/Properties/launchSettings.json](PMWDS.API/Properties/launchSettings.json).

## Database Setup

Primary database settings live in [PMWDS.API/appsettings.json](PMWDS.API/appsettings.json).

Default SQL Server connection:

```json
"ConnectionStrings": {
  "Default": "Server=.;Database=PMWDS;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True"
}
```

### SQLite Failsafe

Development fallback settings live in [PMWDS.API/appsettings.Development.Sqlite.json](PMWDS.API/appsettings.Development.Sqlite.json):

```json
{
  "Database": {
    "EnableSqliteFallback": true,
    "ForceSqlite": false,
    "SqliteConnectionString": "Data Source=App_Data/pmwds-dev.sqlite"
  }
}
```

Behavior in development:

- If SQL Server is reachable, the API uses SQL Server.
- If SQL Server is not reachable and `EnableSqliteFallback` is `true`, the API switches to SQLite automatically.
- If `ForceSqlite` is `true`, the API uses SQLite even when SQL Server is available.
- When SQLite is selected, startup writes this message to the console:

```text
[PMWDS] Using SQLite failsafe database: Data Source=App_Data/pmwds-dev.sqlite
```

Verified local SQLite database path:

```text
PMWDS.API/App_Data/pmwds-dev.sqlite
```

## Migration And Seeding Behavior

When SQLite fallback is active, startup:

1. Creates the SQLite directory if it does not exist.
2. Attempts `Database.MigrateAsync()`.
3. Falls back to `Database.EnsureCreatedAsync()` if migrations cannot run against the SQLite provider.
4. Runs `SeedData.SeedAsync(...)`.

Seeder source:

- [PMWDS.Persistence/Migrations/SeedData.cs](PMWDS.Persistence/Migrations/SeedData.cs)

Verified seeded counts in the SQLite fallback database:

- Departments: `1`
- Skills: `10`
- Users: `6`

## Seeded Users

The default seed creates these users:

| Email | EmployeeCode | JobTitle |
| --- | --- | --- |
| `admin@pmwds.com` | `ADMIN001` | `SuperAdmin` |
| `manager@pmwds.com` | `PM001` | `ProjectManager` |
| `head@pmwds.com` | `DH001` | `DepartmentHead` |
| `lead@pmwds.com` | `TL001` | `TeamLead` |
| `member@pmwds.com` | `TM001` | `TeamMember` |
| `viewer@pmwds.com` | `VW001` | `Viewer` |

## Login Notes

The current development login flow accepts one of the following passwords:

- `Pmwds@123`
- `Admin@12345!`
- The exact `EmployeeCode`
- `{EmployeeCode}@123`

Examples:

- `admin@pmwds.com` with `ADMIN001`
- `manager@pmwds.com` with `PM001@123`

## Notes

- Hangfire startup is disabled while SQLite fallback is active.
- The current domain still contains some string-based user references in task-related entities. The SQLite fallback path works, but further normalization of user IDs would reduce mapping complexity in the rest of the model.
