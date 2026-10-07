# PMWDS

PMWDS is a project management and workflow decision support system. It combines portfolio planning, organization and department management, task and milestone execution, notification workflows, reporting and AI-assisted delivery signals such as task allocation, delay prediction, burnout risk, and project health.

The API entry point is `PMWDS.API`. The frontend lives in `Client`.

## Documentation

| File | Purpose |
|------|---------|
| [CONFIG.md](CONFIG.md) | Full setup, configuration, build, deployment, and operations guide |
| [config-sqlite.md](config-sqlite.md) | Combined SQLite config guide with verified implementation and remediation |
| [responsive.md](responsive.md) | Responsive design properties by category - layout, breakpoints, and clamp values |
| [mssql-issue.md](mssql-issue.md) | The 25-second SQL Server latency problem, its root cause, and the fix |
| [vps-mssqlserver.md](vps-mssqlserver.md) | Installing SQL Server and Redis on the VPS, and connecting SSMS to it |
| [vps.md](vps.md) | What is installed on the Contabo VPS and where |
| [tests/e2e/README.md](tests/e2e/README.md) | Browser end-to-end tests - map files, flows, and how to run them |


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
PMWDS.Tests/          xUnit API integration tests (see "Running the tests")
tests/e2e/            Playwright browser tests, map files and flows
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
$env:Database__ForceSqlite="true"; dotnet run --project PMWDS.API
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

The API checks SQL Server once and uses it when reachable. Hangfire and Redis cache are active in this mode.

Reset to SQLite anytime:

```powershell
docker-compose down
```

Then run the API normally in Development — it falls back to SQLite automatically.

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

All seeded accounts share one password, and **it is not stored in the repository**. Set it
before the first run:

```text
# .env
Seed__DefaultPassword=<a strong password>
```

If it is missing, the app refuses to create the seeded accounts and says so, rather than
falling back to a published default. The value is read once, when a user does not yet exist
- it never resets an existing account's password on a later boot. Change it after the first
login.

| Email | Role | Notes |
|-------|------|-------|
| `superadmin@org1.com` | SuperAdmin | Full access |
| `admin@org1.com` | Director | Portfolio and organization oversight |
| `manager@org1.com` | ProjectManager | Project and report management |
| `head.eng@org1.com` | DepartmentHead | Head of PWDC - PWD Civil Division |
| `head.pmo@org1.com` | DepartmentHead | Head of PWD - Public Works Department |
| `head.ops@org1.com` | DepartmentHead | Head of PROC - Procurement & Finance |
| `head.bstr@org1.com` | DepartmentHead | Head of REV - Revenue Department |
| `head.csv@org1.com` | DepartmentHead | Head of QA - Quality Assurance Cell |
| `member@org1.com` | TeamMember | Team execution workflows |
| `viewer@org1.com` | Viewer | Read-only style access |

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
- Direct `dotnet ef database update` against the existing SQLite file is not the recommended flow for this repo. See [config-sqlite.md](config-sqlite.md).
- When running with Docker SQL Server, EF Core migrations (`database.MigrateAsync`) run automatically on startup.
- The app auto-detects the database provider in order: SQL Server → SQLite fallback in Development. Run `docker-compose up -d` before starting the API to use SQL Server.

## Running the tests

There are two suites, and they test different layers:

| Suite | Location | What it covers | Needs the app running? |
|---|---|---|---|
| **API integration tests** | `PMWDS.Tests` | The backend end to end over HTTP - auth, permissions, CRUD, cascades, realtime, the wizard's API call sequence | No - it boots the API itself |
| **Browser end-to-end tests** | `tests/e2e` | The real UI through Playwright - what a user actually sees and clicks, across multiple roles | Yes - API on :5177 and client on :5173 |

### 1. API integration tests (xUnit)

`PMWDS.Tests` holds xUnit integration tests. They boot the real API in-process through
`WebApplicationFactory<PMWDS.API.TestHost>` and talk to it over HTTP, so they exercise the
genuine startup path - database creation, migrations, seeding, authorization - rather than
mocks.

```powershell
# Everything (default)
dotnet test PMWDS.slnx

# Just the API suite
dotnet test PMWDS.Tests\PMWDS.Tests.csproj

# One class
dotnet test PMWDS.Tests\PMWDS.Tests.csproj --filter "FullyQualifiedName~CascadeTests"

# One test
dotnet test PMWDS.Tests\PMWDS.Tests.csproj --filter "FullyQualifiedName~RealtimeTests.Deleting_a_task_broadcasts"

# With coverage
dotnet test PMWDS.Tests\PMWDS.Tests.csproj --collect:"XPlat Code Coverage"
```

No setup is required. Each run creates a throwaway SQLite database and storage directory
under `%TEMP%\pmwds-tests\`, seeds it, and deletes both afterwards. **Your
`App_Data/pmwds-dev.sqlite` is never touched**, and no `.env` or `appsettings` value from
your machine leaks in - the test host is configured entirely from code.

Tests require the seeded accounts, so run them against a seeded database. They use their own
fixed test password, configured in code by the test fixture, so they do not depend on
`Seed__DefaultPassword`.

#### Running against a real server

Set `PMWDS_TEST_BASE_URL` to run the same suite against an already-running instance instead
of the in-process host:

```powershell
# local
dotnet run --project .\PMWDS.API
$env:PMWDS_TEST_BASE_URL = "http://localhost:5177"
dotnet test PMWDS.Tests\PMWDS.Tests.csproj

# the VPS
$env:PMWDS_TEST_BASE_URL = "https://pmwds.dharmaatribe.app"
dotnet test PMWDS.Tests\PMWDS.Tests.csproj
```

This is the only way to cover the SQL Server and Hangfire branches, since Hangfire is
registered solely when the provider is SQL Server.

> **Warning:** the suite creates and deletes real data. Never point it at production
> without a backup.

#### What is covered

| Area | File |
|---|---|
| Login, tokens, anonymous access, per-role permission sets | `AuthenticationTests.cs` |
| The full "New Project" wizard flow - project, milestones, dependencies, tasks - in the same order the React wizard issues them | `WizardFlowTests.cs` |
| Create / read / update / delete for projects, milestones, milestone dependencies, tasks, subtasks, task dependencies, plus validation bounds | `CrudTests.cs` |
| What deleting a project, milestone or task does to everything below it, including recursive subtask removal and certificate unlinking | `CascadeTests.cs` |
| Document upload / list / download, utilization certificates, and the certificate-to-task link on task and milestone deletion | `DocumentsAndCertificatesTests.cs` |
| Departments, users, roles, duplicates, deactivation, and the authorization boundary on each | `OrganizationTests.cs` |
| The live-update path: every mutation must broadcast `DataChanged`, and rejected or forbidden requests must not | `RealtimeTests.cs` |

`CascadeTests` and `RealtimeTests` are the highest-value suites here. Cascade behaviour had
no coverage at all before, and the realtime tests immediately found two mutating endpoints
that never announced themselves.

#### Adding a test

Use the helpers in `PMWDS.Tests/Infrastructure`:

- `ApiFixture` - the collection fixture. Exposes a logged-in `Session` per seeded role
  (`SuperAdmin`, `Admin`, `DepartmentHead`, `ProjectManager`, `TeamMember`, `Viewer`) and
  `CreateAnonymousClient()` for negative tests. Put your class in
  `[Collection(ApiCollection.Name)]` so it shares the one booted host.
- `ApiClient` - typed GET/POST/PUT/PATCH/DELETE that unwraps the `{ success, data, error }`
  envelope, plus `PostFormAsync` for multipart uploads and `DownloadAsync` for binaries.
- `WizardBuilder` - reproduces the client wizard's exact call sequence.
- `TestProject` - creates and disposes a throwaway project so tests cannot collide.
- `HubListener` - opens a real SignalR connection and waits for `DataChanged` by scope.

**One `HttpClient` per session, never a shared one.** `ApiClient.UseToken` writes to
`HttpClient.DefaultRequestHeaders`, so sessions that share a client overwrite each other's
bearer token and every authorization test silently runs as whichever identity logged in
last. The fixture gives each session its own client for this reason.

### 2. Browser end-to-end tests (Playwright)

`tests/e2e` drives the actual UI through a real browser, using **text map files** that
describe every page, form, modal and button. Those files are plain text, so the page
definitions can be read and edited without touching test code.

Full details: [`tests/e2e/README.md`](tests/e2e/README.md).

#### Setup and run

```powershell
# one-time
cd tests\e2e
npm install
npx playwright install chromium

# start the app first - API on :5177, client on :5173
dotnet run --project .\PMWDS.API --urls http://localhost:5177
cd Client; npm run dev -- --host 127.0.0.1 --port 5173

# then, in tests\e2e
npm run smoke                        # offline check: maps parse, every key resolves

npm run e2e                          # interactive, step by step
npm run e2e -- --auto                # automatic, all flows
npm run e2e -- --auto --mode visible # watch it happen in a browser window
```

#### Two display modes, two run modes

On startup the script asks how the browser should run, in **both** run modes:

| Mode | Browser | Behaviour |
|---|---|---|
| `1` Headless *(default)* | no window | fastest; screenshots only on failure |
| `2` Visible | real window | you watch every action, slowed to 250ms, screenshot saved **before and after every step** |

```powershell
npm run e2e -- --mode visible        # skip the question, watch it run
npm run e2e -- --mode headless       # skip the question, stay hidden
npm run e2e -- --no-shots            # visible window, no per-step screenshots
npm run e2e -- --slowmo 500          # slower actions for watching
```

Within a run, **interactive** (the default) stops before every step and asks - `Y` run,
`n` skip, `s` screenshot then re-ask, `q` quit. **Automatic** (`--auto`) picks the flows
once at startup and runs straight through with no per-step prompts, aborting non-zero on
failure.

Screenshots and generated upload files land in `tests/e2e/e2e-artifacts/`; the run prints
the exact paths at startup and again at the end. Shots are named
`NN-<step>-before.png` / `-after.png` / `-FAILED.png`.

#### What it actually does

Seven flows replay one realistic project lifecycle across several people at once. Every role
gets its own isolated browser context, so the project manager and both department heads are
genuinely signed in simultaneously, as in a real multi-user test.

| # | Flow | Users | What it does |
|---|---|---|---|
| 1 | `project-create` | `pm` | Signs in as the project manager, opens the 4-step creation wizard and fills every step: project name, description, priority, budget, start/end dates, attaches a dummy document, adds two milestones, assigns a different department to each, links them with a dependency, then clicks Finish |
| 2 | `head-milestones` | `head-civil`, `head-pmo` | Each department head assigned in wizard step 3 signs in and adds their **own** milestone to the same project |
| 3 | `tasks-subtasks` | both heads | Each head creates two tasks on their milestone - title, dates, estimated hours, priority, milestone - then expands the task card and adds subtasks |
| 4 | `member-progress` | `member`, `electrical` | Ordinary members open their tasks, then raise a subtask's progress to 40% and 65% with a comment, and move one subtask to In Progress |
| 5 | `documents` | `pm` | Generates a dummy `.txt` and a dummy `.pdf`, uploads the text file at **project, milestone and task** level, then submits a dummy utilization certificate as a draft |
| 6 | `edit-delete` | `head-civil` | A department head edits a milestone's name and due date, deletes a milestone through the confirmation modal, and deletes one of their own tasks |
| 7 | `project-edit-delete` | `pm` | The project manager edits the project's name, description and priority, then deletes the project through the confirmation modal as the final step, tearing down what step 1 created |

The run is self-cleaning in the sense that flow 7 deletes the project it created, so a
successful full run leaves nothing behind.

#### Test users

All seeded accounts share the password `Pmwds@123` (whatever `Seed__DefaultPassword` was set
to). Pick one on the command line with `--user <id>`:

| id | Account | Email |
|---|---|---|
| `admin` | Admin / Director | `admin@org1.com` |
| `pm` | Project Manager | `manager@org1.com` |
| `head-civil` | Head - Civil Division | `head.eng@org1.com` |
| `head-pmo` | Head - PWD Coordination | `head.pmo@org1.com` |
| `head-ops` | Head - Procurement | `head.ops@org1.com` |
| `head-revenue` | Head - Revenue Dept | `head.bstr@org1.com` |
| `head-qa` | Head - Quality Assurance | `head.csv@org1.com` |
| `head-tehsildar` | Head - Tehsildar | `sunil.yadav@up.gov.in` |
| `member` | Team Member | `member@org1.com` |
| `viewer` | Viewer | `viewer@org1.com` |
| `ee` | Executive Engineer | `dinesh.kumar@pwd.up.gov.in` |
| `electrical` | Electrical | `suresh.pandey@up.gov.in` |
| `sewerage` | Sewerage | `ramesh.yadav@up.gov.in` |
| `superadmin` | Super Admin | `superadmin@org1.com` |

#### The map files

`tests/e2e/maps/*.txt` - one file per area plus `common.txt` for shared elements (modal
chrome, toasts, nav, progress and status controls). Entry kinds are `field`, `button`, `nav`,
`assert` and `api`, grouped by `@group` so the fields and buttons of one form or modal stay
together:

```text
@group step-details type=wizard page=projects desc="Step 1 of 4: Project Details"

field projectName placeholder="Enter project name" required=1
field priority css="select" nth=0,1,2
button next text="Next"
api   createProject method=POST path=/api/v1/projects
assert created text="Project created successfully!"
@end
```

The driver tries `css` -> `testid` -> `aria` -> `title` -> `placeholder` -> `role`+`name` ->
`label` -> `text`, plus `root`, `nth` and `hover` for scoping. When nothing matches it fails
with the entry, its `file:line`, and every selector it attempted - so a broken map points at
the exact line to edit.

#### Adding a flow

1. Add a file in `tests/e2e/flows/` exporting a `Flow` with a list of `Step`s.
2. Register it in `flows/index.ts`.
3. Run `npm run smoke` - it verifies the maps parse and that every key your flow references
   actually exists, without launching a browser.

### 3. Client build checks

```powershell
cd Client
npm run build
npm run lint
```

### Running everything

```powershell
# API tests (no app needed)
dotnet test PMWDS.slnx

# Client build checks
cd Client; npm run build; npm run lint; cd ..

# Browser tests (needs the API and client running)
cd tests\e2e
npm run smoke
npm run e2e -- --auto
```

## Future Improvements

- Replace development password hashing with ASP.NET Core Identity password hashing or another production-grade password hasher.
- Soft-delete a project's milestones, departments and documents when the project is deleted. Today the project row is only marked deleted, so the `NoAction` foreign keys never cascade and milestone rows are left attached to a project that no longer appears anywhere. `CascadeTests.Deleting_a_project_leaves_its_milestones_undeleted_today` pins the current behaviour.
- Split SQL Server and SQLite migrations into provider-specific migration sets.
- Persist AI chat/session history instead of keeping transient in-memory context.
- Extend the browser test coverage in `tests/e2e` beyond the project lifecycle - dashboard, reports, AI, and the live-update refresh. The creation wizard also has no route or step in the URL, so a test cannot deep-link into it; adding a `?step=` param to `NewProjectPage` would allow partial runs.
- Move secrets to environment variables, user secrets, Azure Key Vault, or another managed secret store.
- Add production deployment scripts for API, client, SQL Server, Redis, storage, and background workers.
