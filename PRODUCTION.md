# PRODUCTION.md — PMWDS deployment, environments, and dev↔prod differences

Branch: `production`. Live URL: `https://pmwds.dharmaatribe.app` (GoDaddy `A pmwds -> 147.93.155.185`).
Host: Contabo VPS `147.93.155.185` (`ssh contabo`), Ubuntu 24.04, nginx 1.24, `aspnetcore-runtime-10.0`.

Related: [README.md](README.md), [CONFIG.md](CONFIG.md), [config-sqlite.md](config-sqlite.md).

---

## 1. Does switching to Development create a new SQLite database?

**Yes. Development and Production use physically different files, and Production refuses to run on one inside the app folder.**

| | Development | Production |
|---|---|---|
| Config file | `appsettings.Development.json` | `appsettings.Production.json` |
| SQLite file | `App_Data/pmwds-dev.sqlite` (inside app dir) | `/var/lib/pmwds/database/pmwds.sqlite` |
| Uploads / avatars | `App_Data` under app dir | `/var/lib/pmwds/data` |
| Schema created by | `EnsureCreated` (model-driven) | `MigrateAsync` (migration-driven) |
| Data on restart | **wiped every start** (known bug, see §7) | **kept** |
| Hangfire | disabled | disabled |

Consequences:

- You never touch production data while developing. Two files, two lifecycles.
- To start from a clean dev database, delete `PMWDS.API/App_Data/pmwds-dev.sqlite` (or the whole `App_Data/`).
- To reset production data, stop the service and delete `/var/lib/pmwds/database/pmwds.sqlite`. **This is irreversible** — back it up first.

### Guard rail

Outside Development, the app refuses to start if the SQLite file resolves inside the application
directory (`DatabaseConnectionService.GuardSqliteOutsideAppDirectory`):

```
System.InvalidOperationException: Database:SqliteConnectionString points inside the application
directory (.../Database/pmwds.sqlite). A deploy replaces that directory, which would delete the
database. Use a durable absolute path outside the app folder, e.g.
/var/lib/pmwds/database/pmwds.sqlite.
```

This exists because the standard deploy replaces the publish folder in place — a database inside it
is destroyed on every release. Verified locally: relative path in Production now fails fast instead
of silently losing data.

### Relative path resolution

Relative SQLite and storage paths resolve against the **application base directory**, never the
process working directory. Under systemd the working directory is `/var/www/<domain>/app`, so a
working-directory-relative path would write somewhere unexpected. `StoragePathResolver.Resolve`
(`PMWDS.Infrastructure/Settings/StoragePathResolver.cs`) is the single place this is enforced, used
by `Program.cs`, `FileStorageService`, and `LocalFileStorageSettings`.

---

## 2. Moving Development → Production

1. **Merge to `production`**, then publish locally (SDK only needed on the build host):
   ```powershell
   git checkout production
   dotnet publish PMWDS.API -c Release -o .\pmwds-pub
   ```
2. **Build the client with the production API URL** (baked in at build time — `Client/src/api.ts:60`):
   ```powershell
   $env:VITE_API_BASE_URL="https://pmwds.dharmaatribe.app/api/v1"
   cd Client; npm run build
   ```
3. **Upload both**:
   ```powershell
   scp -r .\pmwds-pub  contabo:/tmp/upload-pmwds-api
   scp -r .\Client\dist contabo:/tmp/upload-pmwds-web
   ssh contabo "cp -a /tmp/upload-pmwds-api/. /var/www/pmwds.dharmaatribe.app/app/; chown -R www-data:www-data /var/www/pmwds.dharmaatribe.app/app; rm -rf /tmp/upload-pmwds-api"
   ssh contabo "rm -rf /var/www/pmwds.dharmaatribe.app/html/*; cp -a /tmp/upload-pmwds-web/. /var/www/pmwds.dharmaatribe.app/html/; chown -R www-data:www-data /var/www/pmwds.dharmaatribe.app/html; rm -rf /tmp/upload-pmwds-web"
   ```
   Replacing `app/` is safe **only because** the database and uploads live in `/var/lib/pmwds` (§1).
4. **Restart** `systemctl restart pmwds.dharmaatribe.app`.

### Environment variables that differ per host

Set these on the VPS via the systemd `EnvironmentFile` (`/etc/pmwds/pmwds.env`, mode `0600`, owned by
`root`). Never commit secrets.

| Variable | Development | Production |
|---|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Development` | `Production` |
| `Jwt__Secret` | dev value | **random ≥32 bytes, unique** |
| `Database__SqliteConnectionString` | `Data Source=App_Data/pmwds-dev.sqlite` | `Data Source=/var/lib/pmwds/database/pmwds.sqlite` |
| `Database__AllowSqliteInProduction` | n/a | `true` (required for SQLite outside Development) |
| `ConnectionStrings__Default` | empty → SQLite fallback | empty → SQLite (or set SQL Server) |
| `FileStorage__BasePath` | unset | `/var/lib/pmwds/data` |
| `AzureStorage__LocalUploadPath` | unset | `/var/lib/pmwds/data` |
| `Email__*` | Mailtrap sandbox | real SMTP |
| `AI__OpenRouter__ApiKey` | local key | production key |
| `VITE_API_BASE_URL` | `http://localhost:5177/api/v1` | `https://pmwds.dharmaatribe.app/api/v1` |

`EnvFileLoader` (`PMWDS.API/Services/EnvFileLoader.cs`) reads `.env` from the content root or its
parent, but **only when the variable is not already set** — real environment variables and the
systemd `EnvironmentFile` always win. Keep `.env` out of the deployed folder.

### Moving Production → Development

Nothing to undo. Dev uses a different SQLite file and `EnsureCreated`. If dev startup fails on
`SQL Server is required outside Development`, that means `ASPNETCORE_ENVIRONMENT` is not
`Development` — check the launch profile / `.env`.

---

## 3. VPS layout

```
/var/www/pmwds.dharmaatribe.app/html/   # React dist (static)
/var/www/pmwds.dharmaatribe.app/app/    # published .NET output  <- replaced on every deploy
/etc/nginx/sites-available/pmwds.dharmaatribe.app
/var/lib/pmwds/database/pmwds.sqlite    # persistent
/var/lib/pmwds/data/{avatars,documents} # persistent
/etc/pmwds/pmwds.env                    # secrets, 0600 root
```

nginx serves `html/` and proxies `/api/`, `/hubs/`, `/files`, `/avatars` to `127.0.0.1:5001`.

---

## 4. CORS

Client and API share one origin (`https://pmwds.dharmaatribe.app`), so the browser makes same-origin
requests and no preflight occurs. CORS is still configured because `Program.cs:280-285` uses
`WithOrigins(...).AllowCredentials()`, which rejects a wildcard `*`.

`AllowedOrigins` in Production is exactly `["https://pmwds.dharmaatribe.app"]`. To add an origin,
edit `appsettings.Production.json` **and** restart — configuration is read at startup.

Verified locally: production origin echoed back with `Access-Control-Allow-Credentials: true`;
`https://evil.example` receives no `Access-Control-Allow-Origin` header.

### Reverse proxy scheme

nginx terminates TLS and proxies over loopback HTTP. `Program.cs` calls
`app.UseForwardedHeaders(XForwardedFor | XForwardedProto)` so `UseHttpsRedirection` and absolute URL
generation see the real scheme instead of redirect-looping.

SignalR needs the `Upgrade`/`Connection` headers preserved on `/hubs/` (mapped at
`Program.cs:337-338`).

---

## 5. Bugs fixed on this branch

**a. `AIGlobalSettings.IsActive` migration drift — would have broken every production deploy.**

`InitialCreate` created an `IsActive` column (`NOT NULL`, no default) that `AIGlobalSetting` does not
have — `BaseEntity` has no such property and the model snapshot does not list it. Development never
hit this because the SQLite dev path uses `EnsureCreated`, which is model-driven and simply never
creates the column. Only migration-built databases are affected, so seeding failed on a fresh
production DB:

```
Microsoft.Data.Sqlite.SqliteException (0x80004005): SQLite Error 19:
  'NOT NULL constraint failed: AIGlobalSettings.IsActive'.
```

Fixed by migration `20261002064626_FixAiGlobalSettingsIsActiveDrift` (drops the column). **Lesson:**
`EnsureCreated` in Development masks migration drift; test schema changes against real migrations.

**b. `PhysicalFileProvider` rejected relative paths** — `The path must be absolute. (Parameter 'root')`
crashed startup. `FileStorage:BasePath` was passed through unresolved.

**c. `AppContext.BaseDirectory/../../../Data` parent-walk** assumed a dev layout (`bin/Debug/net10.0`
three levels up) and resolved outside the publish folder under `dotnet publish`. Replaced with
`StoragePathResolver.Resolve`.

**d. SQLite/storage paths bound to the working directory** — invisible locally, wrong under systemd.
Same fix.

**e. `UseHttpsRedirection` behind nginx** — no forwarded headers, so scheme detection was wrong.

---

## 6. Known gaps and follow-ups

Not yet addressed. Listed so they are not lost.

### Must do before real users

1. **Secrets.** No production values are committed. Generate a unique `Jwt__Secret` (≥32 bytes) and
   write `/etc/pmwds/pmwds.env` with mode `0600`.
2. **Seeded credentials are live** — `admin@org1.com` / `Pmwds@123` plus ~20 more. Rotate or disable
   before exposing the site.
3. **Seeded emails in the docs are wrong.** `README.md` and `CONFIG.md` say `admin@pmwds.com`,
   `manager@pmwds.com`, `viewer@pmwds.com`. The actual seed is `admin@org1.com`, `director@org1.com`,
   `manager@org1.com`, `head.bstr@org1.com`, and others. Update the docs.
4. **Email is unconfigured** (`smtp.gmail.com`, blank credentials) — password reset and invite emails
   will fail. Supply real SMTP and set `Email__ClientBaseUrl` to the production URL.
5. **No backups.** A SQLite database on a VPS with no backup is one disk failure from total loss.
   Recommend a daily `sqlite3 .backup` to an off-server location with retention, plus a restore test.

### Functional gaps

6. **Hangfire is disabled with SQLite.** `Program.cs` only registers the dashboard when the provider
   is SQL Server, and the four recurring jobs are likewise SQL-Server-gated:
   - `deadline-checker` (hourly)
   - `escalation-checker` (hourly)
   - `ai-model-training` (daily 02:00)
   - `scheduled-reports` (weekly, Monday 07:00)

   **These will not run in Production.** Deadlines, escalations, scheduled reports, and automated
   model training are all inactive. Options: install SQL Server 2022 in Docker on the VPS (~2 GB
   RAM) and point `ConnectionStrings__Default`/`Hangfire` at it; or reimplement these on a
   background service that works with SQLite (single-instance only). Document the decision.

7. **SQLite is single-writer.** Fine for one API instance. It does not support horizontal scaling, and
   concurrent writes can hit `SQLITE_BUSY`. `busy_timeout` should be configured if write contention
   appears. Revisit when a second instance or high write concurrency is needed.

8. **Redis is absent** — cache falls back to in-memory, so rate limiting is per-process and lost on
   restart. Fine for one instance; required if you scale out.

9. **Vulnerable packages** (build warnings, not yet addressed):
   - `SQLitePCLRaw.lib.e_sqlite3` 2.1.11 — `GHSA-2m69-gcr7-jv3q` (high)
   - `Microsoft.OpenApi` 2.4.1 — `GHSA-v5pm-xwqc-g5wc` (high)

10. **Client bundle is 1.70 MB** (426 KB gzipped) in a single chunk. Consider route-level code
    splitting via `build.rolldownOptions.output.codeSplitting`.

11. **`EF` warnings during startup**: several queries use `Skip`/`Take` without `OrderBy`, which can
    return unstable pagination. Harmless at seed time, worth auditing in list endpoints.

12. **`.env` in the repo root.** `E:\saturday\PMWDS.S\.env` contains a live OpenRouter API key and
    SMTP credentials and is git-ignored, but it sits one directory above `PMWDS.API/`, and
    `EnvFileLoader` reads the parent directory. Confirm it is never deployed alongside the app.

13. **SQL Server path still untested.** The production SQLite path is verified end to end. The SQL
    Server branch (`HasExpectedSqlServerSchemaAsync` and the `EnsureDeleted` recovery that is
    Development-only) has not been exercised against a real SQL Server in this work. Note
    `TODO.md` already tracks the multiple-cascade-path issue (`status/issue-sqlite-cascade-paths.md`).

---

## 7. Known dev bug: dev database is wiped on every restart

Left as-is by request. It is **not** a stale-file or cache problem — the schema check is inverted:

```csharp
// PMWDS.API/Services/DatabaseConnectionService.cs (EnsureSqliteDevelopmentDatabaseAsync path)
return !await HasSqliteIndexAsync(connection, "IX_Departments_Code", ct);
```

`HasSqliteIndexAsync` returns `true` when the index **exists**, so `!` makes the method report
"schema is not as expected" precisely when the database is healthy. `EnsureSqliteDevelopmentDatabaseAsync`
then calls `EnsureDeletedAsync` + `EnsureCreatedAsync` and reseeds.

So Development loses all data on every restart — expected and separate from the production behaviour
described in §1.

**Fix (one character, unapplied):**

```csharp
return await HasSqliteIndexAsync(connection, "IX_Departments_Code", ct);
```

Confirm the intended semantics first: the neighbouring SQL Server check
(`HasExpectedSqlServerSchemaAsync`) validates *required* tables and columns and returns `true` when
they are present. If `IX_Departments_Code` is the marker for "migrated past the old shape", the
comparison should be inverted (expect the index to be **absent**) rather than simply dropped — worth
checking against the real dev database before changing it.