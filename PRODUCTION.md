# PRODUCTION.md — PMWDS deployment, environments, and dev↔prod differences

Branch: `production`. Live URL: `https://pmwds.dharmaatribe.app` (GoDaddy `A pmwds -> 147.93.155.185`).
Host: Contabo VPS `147.93.155.185` (`ssh contabo`), Ubuntu 24.04, nginx 1.24, `aspnetcore-runtime-10.0`.

Related: [README.md](README.md), [CONFIG.md](CONFIG.md), [config-sqlite.md](config-sqlite.md).

> **Live as of 2026-10-02.** Deployed and verified end to end (§4a). The two deploy failures recorded
> in §2.1 and §5f are the ones most likely to be repeated — read those before deploying.

## Deploy checklist

1. `git checkout production`, `git pull`
2. `dotnet publish PMWDS.API -c Release -o .\pmwds-pub`
3. `$env:VITE_API_BASE_URL="https://pmwds.dharmaatribe.app/api/v1"; cd Client; npm run build`
4. Package with **`tar`** — never `Compress-Archive` (§2.1)
5. `scp` both archives, extract on the server, `chown -R www-data:www-data`
6. **Verify every asset returns `200` with a real size** (§2.2) — a blank page otherwise
7. `systemctl restart pmwds.dharmaatribe.app`
8. `journalctl -u pmwds.dharmaatribe.app -n 30 --no-pager` — expect `Now listening on: http://127.0.0.1:5001`
9. Confirm login works and `/var/lib/pmwds/database/pmwds.sqlite` is still the same file

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

### Never build a path by walking up parent directories

`Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "Data")` assumes a local
`bin/Debug/net10.0/` layout. It resolves somewhere entirely different once published and deployed —
this bit three separate places before being removed (§5c, §5f):

| Old | Resolves to on the VPS | New |
|---|---|---|
| `bin/Debug/net10.0/../../../Data` | `/var/Data` | `StoragePathResolver.Resolve(...)` or an explicit value passed in by the host |

Rules:

- Take the base directory from configuration, or accept it as a parameter. Do not infer it.
- In Production, prefer an absolute path outside the app directory (`/var/lib/pmwds/...`).
- If a path must default to something, default **inside** the app directory, never above it.
- Locally the bad paths resolve inside `PMWDS.API/`, which exists and is writable, so local testing
  does **not** surface this class of bug. Only the deployed layout exposes it.

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
3. **Package and upload both.**
   Use `tar`, **never `Compress-Archive`** — see §2.1, this silently produced a blank site.

   ```powershell
   tar -czf pmwds-api.tar.gz -C .\pmwds-pub .
   tar -czf pmwds-web.tar.gz -C .\Client\dist .
   scp pmwds-api.tar.gz pmwds-web.tar.gz contabo:/tmp/
   ```

   Extract on the server:
   ```bash
   rm -rf /tmp/pmwds-api-x /tmp/pmwds-web-x
   mkdir -p /tmp/pmwds-api-x /tmp/pmwds-web-x
   tar -xzf /tmp/pmwds-api.tar.gz -C /tmp/pmwds-api-x
   tar -xzf /tmp/pmwds-web.tar.gz -C /tmp/pmwds-web-x

   rm -rf /var/www/pmwds.dharmaatribe.app/app/*
   cp -a /tmp/pmwds-api-x/. /var/www/pmwds.dharmaatribe.app/app/
   chown -R www-data:www-data /var/www/pmwds.dharmaatribe.app/app

   # Replace the whole html dir so removed build assets cannot linger.
   rm -rf /var/www/pmwds.dharmaatribe.app/html
   mkdir -p /var/www/pmwds.dharmaatribe.app/html
   cp -a /tmp/pmwds-web-x/. /var/www/pmwds.dharmaatribe.app/html/
   chown -R www-data:www-data /var/www/pmwds.dharmaatribe.app/html

   rm -rf /tmp/pmwds-api-x /tmp/pmwds-web-x /tmp/pmwds-api.tar.gz /tmp/pmwds-web.tar.gz
   ```
   Replacing `app/` is safe **only because** the database and uploads live in `/var/lib/pmwds` (§1).
4. **Verify the client actually loaded** — do not skip this, see §2.2:
   ```powershell
   ssh contabo "curl -sk -o /dev/null -w 'js %{http_code} css ' https://pmwds.dharmaatribe.app/assets/index-<hash>.js"
   ssh contabo "curl -sk -o /dev/null -w '%{http_code} root ' https://pmwds.dharmaatribe.app/assets/index-<hash>.css"
   ssh contabo "curl -sk -o /dev/null -w '%{http_code}\n' https://pmwds.dharmaatribe.app/"
   ```
   Both assets must be `200` **with a non-trivial `size`**. Read the real hashes out of
   `dist/index.html` rather than guessing them.
5. **Restart** `systemctl restart pmwds.dharmaatribe.app`.

### 2.1 Never use `Compress-Archive` to package the client

`Compress-Archive` writes ZIP entry names with **backslash** separators. Linux treats `\` as a
valid filename character, not a separator, so extraction creates files literally named:

```
assets\index-DDFDvhPq.js      # a FILE, not a directory + file
```

nginx then 404s on `/assets/index-DDFDvhPq.js` while `find` still *appears* to show the file,
which is what makes this so easy to miss. The symptom is a **blank page** with a working
`index.html`: the SPA entry loads, then its module script fails to load.

`tar` uses forward slashes and does not have this problem. If a `.zip` is unavoidable, extract it
with `unzip` and re-verify with `ls -bR` (the `-b` flag reveals stray backslashes).

### 2.2 Verify assets, not just the entry point

`GET /` returning `200` proves nothing — `index.html` is a static file served by `try_files`, so it
succeeds even when every asset it references is missing. A blank page with no console error is the
expected failure mode.

Minimum check before calling a deploy done:

| Check | Expected |
|---|---|
| `index.html` | `200` |
| **each `<script src>` and `<link href>` in `dist/index.html`** | `200` with real `size_download` |
| SPA deep link, e.g. `/projects` | `200` (tests `try_files` fallback) |
| `GET /api/v1/auth/login` | `401`/`400`, **not** `404` (confirms the proxy reaches dotnet) |

When an asset 404s, read the nginx error log — it names the exact path it tried:

```powershell
ssh contabo "tail -5 /var/log/nginx/pmwds.dharmaatribe.app.error.log"
```

### 2.3 nginx cache headers

Set `Cache-Control` with a **single** `add_header`. Combining `expires` with `add_header` emits two
`Cache-Control` headers (one `max-age` from `expires`, one added), which is ambiguous for clients.

Current behaviour: `/assets/` → `public, max-age=31536000, immutable` (filenames are hashed);
`index.html` → `no-store, must-revalidate` (it references the hashed filenames, so caching it would
pin clients to assets that no longer exist).

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
/etc/systemd/system/pmwds.dharmaatribe.app.service
/var/lib/pmwds/database/pmwds.sqlite    # persistent
/var/lib/pmwds/data/{avatars,documents} # persistent
/etc/pmwds/pmwds.env                    # secrets, 0600 root
```

nginx serves `html/` and proxies `/api/`, `/hubs/`, `/files/`, `/avatars/` to `127.0.0.1:5001`.
The API listens on loopback only and is never exposed in `ufw`.

### systemd unit

Runs as `www-data` from `app/`, with the environment file and a hardening set:

```ini
[Service]
User=www-data
WorkingDirectory=/var/www/pmwds.dharmaatribe.app/app
EnvironmentFile=/etc/pmwds/pmwds.env
ExecStart=/usr/bin/dotnet /var/www/pmwds.dharmaatribe.app/app/PMWDS.API.dll
Restart=always
RestartSec=10
ProtectSystem=full
ProtectHome=true
ReadWritePaths=/var/lib/pmwds
```

`ReadWritePaths=/var/lib/pmwds` is required: `ProtectSystem=full` makes the rest of the filesystem
read-only, which is what surfaces the `/var/Data` write failure from §5f immediately instead of
silently writing uploads somewhere unexpected.

### Useful commands

```bash
systemctl status  pmwds.dharmaatribe.app --no-pager
systemctl restart pmwds.dharmaatribe.app
journalctl -u pmwds.dharmaatribe.app -n 50 --no-pager
tail -f /var/log/nginx/pmwds.dharmaatribe.app.error.log
nginx -t && systemctl reload nginx
```

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

## 4a. First live deploy (what actually happened)

Deployed to `https://pmwds.dharmaatribe.app` on 2026-10-02. What worked, in order:

1. `aspnetcore-runtime-10.0` installed on the VPS.
2. `/var/lib/pmwds/{database,data}` created and owned by `www-data`.
3. API published locally, packaged with `tar`, uploaded, extracted to `app/`.
4. Client built with `VITE_API_BASE_URL=https://pmwds.dharmaatribe.app/api/v1`, packaged,
   extracted to `html/`.
5. `/etc/pmwds/pmwds.env` written with mode `0600`, owner `root`, containing a freshly generated
   88-character `Jwt__Secret`.
6. systemd unit `pmwds.dharmaatribe.app` running as `www-data` on `127.0.0.1:5001`, with
   `ProtectSystem=full` and `ReadWritePaths=/var/lib/pmwds`.
7. nginx vhost proxying `/api/`, `/hubs/`, `/files/`, `/avatars/` and serving the SPA.

Two failures occurred during this deploy, both recorded below because they are easy to repeat:

- **The service crash-looped on first start.** `UsersSeeder.SeedProfileImagesAsync` built its
  storage path with `AppContext.BaseDirectory/../../../Data`, which resolves to `/var/Data` once
  deployed — outside the app directory and unwritable by `www-data`:
  `UnauthorizedAccessException: Access to the path '/var/Data' is denied`. Fixed by passing the
  resolved storage root into `SeedData.SeedAsync` instead of walking parent directories (§5f).
  Note this only failed on the server because the folder did not exist locally.
- **The client served a blank page.** `Compress-Archive` packaging (§2.1).

### Verified working on the live site

| Check | Result |
|---|---|
| `GET /` | `200`, `<title>PMWDS</title>` |
| JS / CSS assets | `200`, 1.70 MB / 160 KB |
| SPA deep links `/projects`, `/login` | `200` |
| `POST /api/v1/auth/login` | `200`, JWT issued for `admin@org1.com` (SuperAdmin) |
| Authenticated `GET /api/v1/projects` | `200`, project returned |
| CORS preflight, `https://pmwds.dharmaatribe.app` | `204`, origin echoed + credentials true |
| CORS preflight, `https://evil.example` | `204`, **no** `Access-Control-Allow-Origin` |
| Document upload → restart → list → download | `1` doc before and after, `200`, correct content |
| `dharmaatribe.com` (neighbouring site) | unaffected |

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

**f. Seeder wrote uploads outside the app directory** — `UsersSeeder.SeedProfileImagesAsync` used the
same `AppContext.BaseDirectory/../../../Data` walk, which on the VPS resolves to `/var/Data`. The
service crash-looped on first start with `UnauthorizedAccessException: Access to the path '/var/Data'
is denied`. `SeedData.SeedAsync` now takes the resolved storage root from the host. The same method
also built avatar URLs as `/files/pmwds-files/{folder}/{file}` while writing to `{root}/{folder}/…`,
so every seeded avatar URL 404'd; corrected to `/files/{folder}/{file}` to match
`AzureStorage:LocalBaseUrl`.

**g. `ProjectsSeeder` deleted all projects on every start** — uploaded documents disappeared after
each restart. It called `ClearExistingProjectsAsync` unconditionally, and since `ProjectDocuments`
has `onDelete: CASCADE` from `Projects`, every document row was deleted with its project and the
project returned under a new GUID, orphaning the files on disk. Now guarded by `ProjectCode`, matching
the `AnyAsync` pattern every other seeder already used. It was the only destructive seeder.

**h. Upload path sanitization was OS-dependent** — `SanitizeFolderName`/`SanitizeFileName` relied on
`Path.GetInvalidPathChars()`/`GetInvalidFileNameChars()`, which return almost nothing on Linux, so
`..`, `:` and friends passed through in production but were blocked on Windows. `ResolvePath` also
trusted the stored `FilePath`, so a stored `documents/../../etc/passwd` resolved outside the storage
root. Both hardened: explicit cross-platform reject set, traversal rejection, and a resolved-path
containment check.

### 5a. Operational mistakes to not repeat

Not code bugs, but each one cost a deploy cycle.

1. **Never `Compress-Archive` for a Linux target** (§2.1). Use `tar`. Produced a blank page.
2. **Never treat `GET /` returning `200` as a successful client deploy** (§2.2). Check every asset.
3. **Test the published output, not `dotnet run`.** Both deploy failures above passed locally and
   only appeared on the server: the `/var/Data` path did not exist locally, and the packaging bug
   is invisible until extracted on Linux.
4. **After any path change, confirm nothing resolves outside the app directory.** The
   `../../../Data` walk survived a full local test cycle twice.
5. **Read hashes out of `dist/index.html`; do not assume them.** They change every build.

---

## 6. Known gaps and follow-ups

Not yet addressed. Listed so they are not lost.

### Must do before real users

1. **Secrets — done, but rotate before real traffic.** A fresh 88-character `Jwt__Secret` was
   generated and written to `/etc/pmwds/pmwds.env` (mode `0600`, owner `root`) at deploy time; nothing
   is committed. Regenerate if that file is ever exposed.
2. **Seeded credentials are live on a public URL** — `admin@org1.com` / `Pmwds@123` plus ~20 more,
   reachable at `https://pmwds.dharmaatribe.app`. Rotate or disable before real users.
3. **Seeded emails in the docs are wrong.** `README.md` and `CONFIG.md` say `admin@pmwds.com`,
   `manager@pmwds.com`, `viewer@pmwds.com`. The actual seed is `admin@org1.com`, `director@org1.com`,
   `manager@org1.com`, `head.bstr@org1.com`, and others. Update the docs.
4. **Email is unconfigured** (`smtp.gmail.com`, blank credentials) — password reset and invite emails
   will fail. Supply real SMTP and set `Email__ClientBaseUrl` to the production URL.
5. **No backups.** A SQLite database on a VPS with no backup is one disk failure from total loss.
   Recommend a daily `sqlite3 .backup` to an off-server location with retention, plus a restore test.
   `/var/lib/pmwds/database/pmwds.sqlite` and `/var/lib/pmwds/data` are currently the only copies.
6. **Email is still unconfigured on the VPS** — `Email__Host/Password` are absent from
   `/etc/pmwds/pmwds.env`, so password reset and invite emails silently fail. `Email__ClientBaseUrl`
   is set to the production URL.

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
   restart. Fine for one instance; required if you scale out. Confirmed in the live logs:
   `Redis connection failed (localhost:6379) ... Caching will fall back to in-memory.`

9. **Data Protection keys are ephemeral.** The live logs warn:
   `Neither user profile nor HKLM registry available. Using an ephemeral key repository. Protected data
   will be unavailable when application exits.` The API runs as `www-data` on Linux with no key ring,
   so protected fields are re-encrypted on every restart and anything depending on them breaks across
   restarts. Persist keys by setting `FileStorage__KeysPath` (or a Data Protection `ApplicationName`)
   to a durable directory under `/var/lib/pmwds`.

10. **Vulnerable packages** (build warnings, not yet addressed):
   - `SQLitePCLRaw.lib.e_sqlite3` 2.1.11 — `GHSA-2m69-gcr7-jv3q` (high)
   - `Microsoft.OpenApi` 2.4.1 — `GHSA-v5pm-xwqc-g5wc` (high)

10. **Client bundle is 1.70 MB** (426 KB gzipped) in a single chunk. Consider route-level code
    splitting via `build.rolldownOptions.output.codeSplitting`.

11. **Client bundle is 1.70 MB** (426 KB gzipped) in a single chunk. Consider route-level code
     splitting via `build.rolldownOptions.output.codeSplitting`.

12. **`EF` warnings during startup**: several queries use `Skip`/`Take` without `OrderBy`, which can
     return unstable pagination. Harmless at seed time, worth auditing in list endpoints.

13. **`.env` in the repo root.** `E:\saturday\PMWDS.S\.env` contains a live OpenRouter API key and
     SMTP credentials and is git-ignored, but it sits one directory above `PMWDS.API/`, and
     `EnvFileLoader` reads the parent directory. It was **not** deployed (only `dotnet publish`
     output was uploaded), but confirm it never ends up inside `app/`.

14. **SQL Server path still untested.** The production SQLite path is verified end to end. The SQL
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