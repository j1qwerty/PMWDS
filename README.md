# PMWDS

PMWDS is a project management and workflow decision support system. It combines portfolio planning, organization and department management, task and milestone execution, notification workflows, reporting, integrations, knowledge management, and AI-assisted delivery signals such as task allocation, delay prediction, burnout risk, and project health.

The API entry point is `PMWDS.API`. The frontend lives in `Client`.

## Documentation

| File | Purpose |
|------|---------|
| [CONFIG.md](CONFIG.md) | Full setup, configuration, build, deployment, and operations guide |
| [sqlite.md](sqlite.md) | SQLite fallback notes, reason, flow, and troubleshooting |

## Tech Stack

- Backend: `.NET 10`, ASP.NET Core Web API, EF Core, MediatR, AutoMapper, FluentValidation.
- Persistence: SQL Server for production, SQLite fallback for local development.
- Background jobs: Hangfire on SQL Server only.
- Realtime: SignalR hubs for notifications and dashboard updates.
- AI: OpenAI-compatible provider support for OpenAI and OpenRouter, plus local ML/heuristic services for allocation and delay signals.
- Client: React, TypeScript, Vite.
- Auth: JWT bearer tokens with role-based policies.

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

The development environment currently uses SQLite because SQL Server is not available on the laptop. The SQLite database is:

```text
PMWDS.API/App_Data/pmwds-dev.sqlite
```

The API automatically chooses SQLite in Development because `PMWDS.API/appsettings.Development.json` has `Database:ForceSqlite` set to `true`.

Run the API:

```powershell
dotnet build PMWDS.slnx
dotnet run --project PMWDS.API --urls http://localhost:5177
or 
dotnet run --project PMWDS.API\PMWDS.API.csproj --launch-profile http  
```

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
- Direct `dotnet ef database update` against the existing SQLite file is not the recommended flow for this repo. See [sqlite.md](sqlite.md) and [docs/issue-sqlite.md](docs/issue-sqlite.md).

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
