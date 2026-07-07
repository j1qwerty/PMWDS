# PMWDS Configuration Guide

This guide describes the configuration required to build, run, and deploy PMWDS. The API entry point is `PMWDS.API`; the React client is in `Client`.

## Related Docs

| File | Purpose |
|------|---------|
| [README.md](README.md) | Project overview, local setup, credentials, and operational notes |
| [sqlite.md](sqlite.md) | SQLite fallback behavior and development database notes |
| [issue-sqlite.md](issue-sqlite.md) | Detailed SQLite migration issue and production-ready remediation options |
| [config-sqlite.md](config-sqlite.md) | Combined SQLite config guide with verified implementation and remediation paths |

## Configuration File Order

ASP.NET Core configuration is loaded from standard sources. Use this priority when diagnosing values:

1. Environment variables and command-line arguments.
2. `PMWDS.API/appsettings.{Environment}.json`.
3. `PMWDS.API/appsettings.json`.
4. Code defaults in settings classes such as `DatabaseSettings` and `AISettings`.

## Required Local Tooling

- .NET SDK compatible with `net10.0`.
- Node.js and npm for the React client.
- SQL Server for production-style local runs, optional for development because SQLite fallback is automatic in Development.
- Redis if testing distributed cache behavior.
- Azure Storage Emulator or real Azure Blob Storage if testing file storage.

## Build Commands

```powershell
dotnet restore PMWDS.slnx
dotnet build PMWDS.slnx
```

```powershell
cd Client
npm install
npm run build
```

## Run Commands

API:

```powershell
dotnet run --project PMWDS.API --urls http://localhost:5177
```

Client:

```powershell
cd Client
npm run dev -- --host 127.0.0.1 --port 5173
```

## Core Configuration Files

| File | Purpose |
|------|---------|
| `PMWDS.API/appsettings.json` | Base configuration for connection strings, JWT, email, storage, AI, CORS, Hangfire, and logging |
| `PMWDS.API/appsettings.Development.json` | Development override; currently forces SQLite |
| `PMWDS.API/Properties/launchSettings.json` | Local launch profiles and development URLs |
| `Client/.env` or shell env | Optional Vite client overrides such as `VITE_API_BASE_URL` |

## Database Configuration

### SQL Server

SQL Server is the production target.

File: `PMWDS.API/appsettings.json`

```json
"ConnectionStrings": {
  "Default": "Server=.;Database=PMWDS;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True",
  "Redis": "localhost:6379",
  "Hangfire": "Server=.;Database=PMWDS_Hangfire;Trusted_Connection=True;TrustServerCertificate=True"
}
```

Production changes:

- Replace `Default` with the production SQL Server connection string.
- Replace `Hangfire` with a dedicated production Hangfire database connection.
- Avoid `Trusted_Connection=True` unless the deployment identity is intentionally used.
- Keep `TrustServerCertificate=True` only when the deployment model requires it.

### SQLite Development Fallback

The current local development setup uses SQLite because SQL Server is not working on the development laptop.

File: `PMWDS.API/appsettings.Development.json`

```json
"Database": {
  "ForceSqlite": true,
  "SqliteConnectionString": "Data Source=App_Data/pmwds-dev.sqlite"
}
```

Behavior:

- `ForceSqlite: true` makes Development use SQLite without trying SQL Server.
- If `ForceSqlite` is false and SQL Server cannot be reached, Development falls back to SQLite automatically.
- The database file is `PMWDS.API/App_Data/pmwds-dev.sqlite`.
- The API startup path creates the directory, validates the expected SQLite schema, rebuilds stale development schema when needed, and runs seed data.
- Hangfire is disabled while SQLite is active.

See [sqlite.md](sqlite.md), [issue-sqlite.md](issue-sqlite.md), and [config-sqlite.md](config-sqlite.md) before changing this flow.

### Database Settings Class

File: `PMWDS.Infrastructure/Settings/AppSettings.cs`

```csharp
public class DatabaseSettings
{
    public bool ForceSqlite { get; set; } = false;
    public string SqliteConnectionString { get; set; } = "Data Source=App_Data/pmwds-dev.sqlite";
}
```

### EF Core Commands

Add a migration:

```powershell
dotnet ef migrations add MigrationName --project PMWDS.Persistence --startup-project PMWDS.API --context ApplicationDbContext
```

Apply migrations to SQL Server:

```powershell
dotnet ef database update --project PMWDS.Persistence --startup-project PMWDS.API --context ApplicationDbContext
```

SQLite note:

```powershell
# Do not rely on direct database update against the existing dev SQLite file.
# Use the API startup path for local SQLite schema bootstrap and seed data.
dotnet run --project PMWDS.API --urls http://localhost:5177
```

## JWT Authentication

File: `PMWDS.API/appsettings.json`

```json
"Jwt": {
  "Secret": "PMWDS_SuperSecretKey_2025_ChangeInProduction!",
  "Issuer": "PMWDS",
  "Audience": "PMWDS_Users",
  "ExpiryMinutes": 480
}
```

Production changes:

- Replace `Secret` with a long random value stored outside source control.
- Keep issuer and audience stable across API and clients.
- Review expiry duration for production security requirements.

## Seeded Credentials

Default seeded password:

```text
Pmwds@123
```

Seeded users include:

```text
admin@pmwds.com
manager@pmwds.com
head@pmwds.com
lead@pmwds.com
member@pmwds.com
viewer@pmwds.com
ava.patel@pmwds.com
noah.chen@northwind-labs.example
mia.roberts@contoso-transform.example
```

Production changes:

- Remove or rotate seeded accounts.
- Replace the current development hash strategy with a production-grade password hasher.
- Require password reset or credential rotation after first deployment.

## Email Configuration

File: `PMWDS.API/appsettings.json`

```json
"Email": {
  "Host": "smtp.gmail.com",
  "Port": 587,
  "Username": "noreply@pmwds.com",
  "Password": "your-smtp-password",
  "SenderEmail": "noreply@pmwds.com",
  "SenderName": "PMWDS System",
  "UseSsl": true
}
```

Production changes:

- Store SMTP credentials in a secret manager.
- Use an approved sender domain.
- Configure SPF, DKIM, and DMARC for deliverability.

## File Storage

File: `PMWDS.API/appsettings.json`

```json
"AzureStorage": {
  "ConnectionString": "UseDevelopmentStorage=true",
  "ContainerName": "pmwds-files"
}
```

Production changes:

- Replace `UseDevelopmentStorage=true` with an Azure Storage connection string or managed identity flow.
- Use private containers unless public access is intentionally required.
- Add lifecycle and retention policies for uploaded project/task files.

## AI Configuration

PMWDS currently exposes only OpenAI and OpenRouter provider configuration in the API and client.

File: `PMWDS.API/appsettings.json`

```json
"AI": {
  "OpenAIApiKey": "your-openai-api-key",
  "OpenAIModel": "gpt-4o",
  "DefaultProvider": "OpenAI",
  "DefaultModel": "gpt-4o",
  "AppName": "PMWDS",
  "AppUrl": "http://localhost:5177",
  "OpenAI": {
    "Enabled": true,
    "BaseUrl": "https://api.openai.com/v1",
    "ApiKey": "your-openai-api-key",
    "DefaultModel": "gpt-4o",
    "ModelsPath": "/models"
  },
  "OpenRouter": {
    "Enabled": false,
    "BaseUrl": "https://openrouter.ai/api/v1",
    "ApiKey": "your-openrouter-api-key",
    "DefaultModel": "openai/gpt-4o-mini",
    "ModelsPath": "/models",
    "Headers": {
      "HTTP-Referer": "http://localhost:5177",
      "X-OpenRouter-Title": "PMWDS"
    }
  },
  "MLModelPath": "Models/delay-prediction.zip",
  "UseLocalModel": false,
  "RiskThreshold": 0.7,
  "TrainingCronHour": 2
}
```

Production changes:

- Remove API keys from committed JSON.
- Store OpenAI/OpenRouter keys in environment variables or a secret manager.
- Set `AppUrl` and OpenRouter headers to production URLs.
- Review `RiskThreshold` with real delivery data.
- Persist and monitor model-training artifacts before relying on automated decisions.

## Hangfire

File: `PMWDS.API/appsettings.json`

```json
"Hangfire": {
  "DashboardPath": "/hangfire"
}
```

Runtime behavior:

- Hangfire is enabled only when SQL Server is active.
- Hangfire is disabled when SQLite fallback is active.

Recurring jobs:

- Deadline checker.
- Escalation checker.
- AI model training.
- Scheduled reports.

Production changes:

- Use a SQL Server-backed Hangfire database.
- Restrict dashboard access to administrators.
- Monitor failed jobs and retry queues.

## Redis Cache

Connection string:

```json
"ConnectionStrings": {
  "Redis": "localhost:6379"
}
```

Production changes:

- Use a managed Redis instance where possible.
- Require TLS/authentication when supported.
- Size cache memory for dashboard, notification, and session workloads.

## CORS

File: `PMWDS.API/appsettings.json`

```json
"AllowedOrigins": [
  "http://localhost:3000",
  "http://localhost:4200",
  "http://localhost:5177",
  "http://localhost:5173",
  "https://pmwds.yourdomain.com"
]
```

Production changes:

- Remove unused localhost origins.
- Add only the deployed client origins.
- Keep credentials enabled only for trusted origins.

## Logging

File: `PMWDS.API/appsettings.json`

```json
"Serilog": {
  "MinimumLevel": {
    "Default": "Information",
    "Override": {
      "Microsoft.AspNetCore": "Information",
      "Microsoft.EntityFrameworkCore": "Warning",
      "System": "Warning"
    }
  }
}
```

Optional Seq endpoint:

```json
"Seq": {
  "ServerUrl": "http://localhost:5341"
}
```

Production changes:

- Send structured logs to a central sink.
- Avoid logging secrets, tokens, passwords, or full AI prompts if they can contain sensitive data.
- Add request correlation IDs.

## Client Configuration

The React client defaults to:

```text
http://localhost:5177/api/v1
```

Override with Vite environment variable:

```powershell
$env:VITE_API_BASE_URL = "https://api.yourdomain.com/api/v1"
npm run build
```

Local development:

```powershell
cd Client
npm run dev -- --host 127.0.0.1 --port 5173
```

Production build:

```powershell
cd Client
npm run build
```

Deploy the generated `Client/dist` folder to a static web host or serve it behind the same reverse proxy as the API.

## Deployment Checklist

1. Build and test the API.
2. Build and test the client.
3. Configure production SQL Server connection strings.
4. Configure Redis if distributed caching is required.
5. Configure Azure Storage or equivalent file storage.
6. Configure JWT secret, email credentials, AI keys, and all secrets outside source control.
7. Configure CORS with production origins only.
8. Apply EF migrations to SQL Server.
9. Start the API and verify Swagger/health endpoints.
10. Start Hangfire workers with SQL Server-backed storage.
11. Deploy the React client with `VITE_API_BASE_URL` pointing to the production API.
12. Rotate seeded credentials or disable seeded users.

## Common Issues

| Issue | Cause | Fix |
|------|-------|-----|
| API uses SQLite unexpectedly | Development config has `ForceSqlite: true` | Set `ForceSqlite` to `false` and verify SQL Server connectivity |
| Hangfire dashboard missing | SQLite is active | Use SQL Server for Hangfire-enabled runs |
| SQLite migration update fails | SQL Server-shaped migration history is not fully portable | Use API startup SQLite bootstrap or implement provider-specific migrations |
| Client cannot call API | Wrong API base URL or CORS origin | Set `VITE_API_BASE_URL` and add the client origin to `AllowedOrigins` |
| Login fails | Wrong seeded password or stale database | Use `Pmwds@123`; restart API to rebuild stale SQLite schema if needed |
| AI provider test fails | Missing API key, disabled provider, or wrong model | Enable provider and configure key/model in settings |

## Production Hardening

- Move every secret out of committed JSON.
- Replace development seeded credentials.
- Replace development password hashing.
- Split provider-specific migrations for SQL Server and SQLite if SQLite remains a supported runtime database.
- Add API health checks and readiness probes.
- Add automated smoke tests for seeded workflows.
- Add Playwright coverage for critical client pages.
- Add backup, restore, and retention policies for SQL Server and file storage.
