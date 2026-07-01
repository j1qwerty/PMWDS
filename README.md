# PMWDS

PMWDS is a project management and workflow decision support system. It combines portfolio planning, organization and department management, task and milestone execution, notification workflows, reporting and AI-assisted delivery signals such as task allocation, delay prediction, burnout risk, and project health.

The API entry point is `PMWDS.API`. The frontend lives in `Client`.

## Documentation

| File | Purpose |
|------|---------|
| [CONFIG.md](CONFIG.md) | Full setup, configuration, build, deployment, and operations guide |
| [config-sqlite.md](config-sqlite.md) | Combined SQLite config guide with verified implementation and remediation |
| [responsive.md](responsive.md) | Responsive design properties by category — layout, breakpoints, and clamp values |


## Tech Stack

- Backend: `.NET 10`, ASP.NET Core Web API, EF Core, MediatR, AutoMapper, FluentValidation.
- Persistence: SQL Server for production, SQLite fallback for local development.
- Background jobs: Hangfire on SQL Server only.
- Realtime: SignalR hubs for notifications and dashboard updates.
- AI: OpenAI-compatible provider support for OpenAI and OpenRouter, plus local ML/heuristic services for allocation and delay signals.
- Client: React, TypeScript, Vite.
- Auth: JWT bearer tokens with role-based policies.
- Containerization: Docker Compose (SQL Server 2022 + Redis) for local development.

## Solution Layout

```text
PMWDS.API/             API entry point, controllers, middleware, SignalR hubs
PMWDS.Application/     DTOs, CQRS commands/queries, service interfaces
PMWDS.Domain/          Entities, enums, domain events, core rules
PMWDS.Persistence/     EF Core DbContext, repositories, migrations, seed data
PMWDS.Infrastructure/  Email, cache, audit, file storage, reports, background jobs
PMWDS.AI/              AI services, chat engine, recommendation and prediction logic
PMWDS.AI.Tests/        AI service tests
Client/                React client application
```

## Local Development

The app supports two database modes:

| Mode | Setup | Features |
|------|-------|----------|
| **SQLite** (default) | No setup required | Quick start, no Hangfire, no cache |
| **SQL Server + Redis** (Docker) | Docker Desktop required | Full features including Hangfire + cache |

### SQLite Mode (No Setup)

```powershell
dotnet build PMWDS.slnx
dotnet run --project PMWDS.API --urls http://localhost:5177
```

The SQLite database is at `PMWDS.API/App_Data/pmwds-dev.sqlite`. The API automatically uses SQLite because `appsettings.Development.json` has `Database:ForceSqlite: true`.

### Docker Mode (SQL Server + Redis)

Run the full stack (SQL Server 2022 + Redis) with docker-compose:

```powershell
docker-compose up -d
```

The stack uses 2GB RAM for SQL Server and minimal memory for Redis. Data persists in Docker volumes across restarts.

Run the API pointing to Docker SQL Server:

```powershell
dotnet build PMWDS.slnx
dotnet run --project PMWDS.API --urls http://localhost:5177
```

The API auto-detects the Docker SQL Server and uses it (no manual config needed). Hangfire and Redis cache are active in this mode.

Reset to SQLite anytime:

```powershell
docker-compose down
```

Then run the API normally — it falls back to SQLite automatically.

Run the client:

```powershell
cd Client
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Default URLs:

```text
API:    http://localhost:5177
Client: http://127.0.0.1:5173
Swagger: http://localhost:5177/swagger
Scalar:  http://localhost:5177/scalar
```

## Docker Setup

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) for Windows (WSL2 backend).

### Images

Pull the required images manually if not using docker-compose:

```powershell
docker pull mcr.microsoft.com/mssql/server:2022-latest
docker pull redis:alpine
```

### docker-compose

The project includes a `docker-compose.yml` at the root that defines both services:

| Service | Port | Image | Memory |
|---------|------|-------|--------|
| mssql-server | `1433` | `mcr.microsoft.com/mssql/server:2022-latest` | 2GB |
| redis | `6379` | `redis:alpine` | ~5MB idle |

Start the stack:

```powershell
docker-compose up -d
```

Stop without losing data:

```powershell
docker-compose down
```

Stop and delete volumes (wipes databases):

```powershell
docker-compose down -v
```

View logs:

```powershell
docker-compose logs -f
```

### Connection Strings

The Docker SQL Server uses SQL authentication. `appsettings.Development.json` is pre-configured with these defaults:

```json
"Default": "Server=localhost,1433;Database=PMWDS_Dev;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=True;MultipleActiveResultSets=true"
```

The SA password is set in `.env` (gitignored). Change it before any non-local use.

### Managing Containers from GUI

Open Docker Desktop → **Containers** tab to start, stop, restart, or inspect the running services.

### Creating Databases for Other Projects

The Docker SQL Server can serve multiple projects. Connect from any app:

```
Server=localhost,1433;Database=YourAppDb;User Id=sa;Password=YourStrong!Passw0rd;...
```

Create a new database via sqlcmd:

```powershell
docker exec mssql-server sqlcmd -S localhost -U sa -P "YourStrong!Passw0rd" -Q "CREATE DATABASE YourAppDb"
```

### Storage Location

Docker images and containers are stored in a WSL2 virtual disk. To relocate to a different drive:

```powershell
wsl --shutdown
wsl --export docker-desktop-data D:\docker\docker-desktop-data.tar
wsl --unregister docker-desktop-data
wsl --import docker-desktop-data D:\docker\wsl\ D:\docker\docker-desktop-data.tar --version 2
```

## Default Credentials

All seeded accounts use this default password:

```text
Pmwds@123
```

| Email | Role | Notes |
|-------|------|-------|
| `admin@pmwds.com` | SuperAdmin | Full access |
| `manager@pmwds.com` | ProjectManager | Project and report management |
| `head@pmwds.com` | DepartmentHead | Department and capacity management |
| `lead@pmwds.com` | TeamLead | Team execution workflows |
| `member@pmwds.com` | TeamMember | Task execution workflows |
| `viewer@pmwds.com` | Viewer | Read-only style access |
| `ava.patel@pmwds.com` | TeamMember | Seeded engineering user |
| `noah.chen@northwind-labs.example` | TeamLead | Seeded operations user |
| `mia.roberts@contoso-transform.example` | TeamMember | Seeded strategy user |

Change these passwords before using the project outside local development.

## Seed Data

On first run, the API seeds representative data across the full product surface:

- Organizations and departments.
- Roles, permissions, users, profiles, and skills.
- Projects, milestones, standalone tasks, milestone tasks, subtasks, dependencies, comments, assignments, and time entries.
- Notifications, templates, alert rules, dashboards, widgets, reports, schedules.
- Integrations, webhooks, webhook deliveries.
- Knowledge articles, lessons learned, activity logs.
- AI models, training data, prediction results, allocation recommendations, and delay predictions.

## Important Runtime Notes

- SQL Server remains the production database target.
- SQLite is a development fallback and is bootstrapped with `EnsureCreated` style schema creation because older SQL Server migrations are not fully portable to SQLite.
- Hangfire is disabled when SQLite is active.
- The API startup path creates or rebuilds the SQLite development database if the expected schema is missing or stale.
- Direct `dotnet ef database update` against the existing SQLite file is not the recommended flow for this repo. See [sqlite.md](sqlite.md), [issue-sqlite.md](issue-sqlite.md), and [config-sqlite.md](config-sqlite.md).
- When running with Docker SQL Server, EF Core migrations (`database.MigrateAsync`) run automatically on startup.
- The app auto-detects the database provider in order: SQL Server → MySQL → SQLite. Run `docker-compose up -d` before starting the API to use SQL Server.

## Build Checks

```powershell
dotnet build PMWDS.slnx
cd Client
npm run build
```

## Future Improvements

- Replace development password hashing with ASP.NET Core Identity password hashing or another production-grade password hasher.
- Split SQL Server and SQLite migrations into provider-specific migration sets.
- Persist AI chat/session history instead of keeping transient in-memory context.
- Add automated API smoke tests for seeded workflows.
- Add Playwright tests for high-value client flows.
- Move secrets to environment variables, user secrets, Azure Key Vault, or another managed secret store.
- Add production deployment scripts for API, client, SQL Server, Redis, storage, and background workers.
