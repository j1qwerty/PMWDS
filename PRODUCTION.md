# PRODUCTION.md — PMWDS deployment, environments, and dev↔prod differences

Branch: `production`. Live URLs:
- `https://pmwds.dharmaatribe.app` — HTTPS, primary
- `http://147.93.155.185` — bare IP, **HTTP only** (no TLS possible for a bare IP)

Host: Contabo VPS `147.93.155.185` (`ssh contabo`), Ubuntu 24.04, nginx 1.24, `aspnetcore-runtime-10.0`.

Related: [README.md](README.md), [CONFIG.md](CONFIG.md), [config-sqlite.md](config-sqlite.md).

> **Live as of 2026-10-02.** Deployed and verified end to end (§4a). The two deploy failures recorded
> in §2.1 and §5f are the ones most likely to be repeated — read those before deploying.

Deploy with **`.\deploy.ps1`** — it runs the checklist below and enforces every rule in §2.1, §2.2 and
§2a for you. Details in [Deploying](#deploying).

## Deploying

### The script (normal way)

```powershell
.\deploy.ps1
```

Run it from the repo root. It prompts for what to ship:

```
         [1] both  - API + web client
         [2] api   - API only (leaves the current client build in place)
         [3] web   - web client only (no service restart)
```

Then it runs every step with per-step timing and a pass/fail line: preflight, target selection,
build, package, confirm, upload, remote deploy, verify.

| Flag | Effect |
|---|---|
| `-Target api\|web\|both` | skip the prompt |
| `-SkipConfirm` | deploy without the y/N check (CI) |
| `-SkipVerify` | skip the post-deploy verification pass |
| `-Host_ contabo` | override the SSH alias |

Example, web-only client fix with no service restart:

```powershell
.\deploy.ps1 -Target web -SkipConfirm
```

Exit code is `0` on success and `1` if any check failed, so it is usable from CI.

### What the script enforces for you

Every item below is a mistake that actually happened during this deploy (§2.1, §2.2, §5a, §6):

- **Preflight** — requires `git`, `dotnet`, `node`, `pnpm`, `tar`, `ssh`, `scp` on PATH, confirms
  `PMWDS.slnx` is present (catches running it from the wrong directory), prints branch and HEAD, and
  **warns loudly about uncommitted changes because they get deployed**.
- **Relative API base** — sets `VITE_API_BASE_URL=/api/v1` for the client build so one bundle serves
  both the subdomain and the bare IP (§2a), then restores the previous value.
- **Asset hashes are read, never assumed** — parses `/assets/...` out of the freshly built
  `dist/index.html`, so verification targets the files that were actually produced.
- **`tar`, never `Compress-Archive`** — and it additionally inspects `tar -tzf` output and **refuses
  to deploy** if any entry contains a backslash, which is the exact signature of the blank-page bug.
- **Ownership and permissions** — `chown -R www-data:www-data` and `chmod -R 755` on both trees.
- **Service restart only when the API changed** — a web-only deploy does not bounce the API.
- **Temporary archives cleaned** — including on failure, via `finally`.
- **Verification** — every asset in `dist/index.html` must return `200` with a body over 1 KB **on
  every public host** (IP and subdomain), a SPA deep link must return `200`, and the journal must
  show `Now listening` with no unhandled exceptions. A `200` on `/` is deliberately *not* accepted as
  proof of a working client, because `index.html` is static and succeeds even when every asset it
  references 404s.
- **Database is never touched** — only `app/` and `html/` are replaced, so `/var/lib/pmwds` and the
  SQLite file are untouched by construction.

### Requirements

- Windows PowerShell 5.1 or later (developed and tested on 5.1).
- `pnpm` on PATH — the client is built with `pnpm build`, not `npm run build`.
- The `contabo` SSH alias and its key already configured.
- SSH host key acceptance; the script uses `BatchMode=yes` so it never blocks on a prompt.

### Manual checklist (fallback / debugging)

Use when the script cannot run, or to reason about what it does.

1. `git checkout production`, `git pull`
2. `dotnet publish PMWDS.API -c Release -o .\pmwds-pub`
3. `$env:VITE_API_BASE_URL="/api/v1"; cd Client; pnpm build`
4. Package with **`tar`** — never `Compress-Archive` (§2.1)
5. `scp` both archives, extract on the server, `chown -R www-data:www-data`
6. **Verify every asset returns `200` with a real size** (§2.2) — a blank page otherwise
7. `systemctl restart pmwds.dharmaatribe.app`
8. `journalctl -u pmwds.dharmaatribe.app -n 30 --no-pager` — expect `Now listening on: http://127.0.0.1:5001`
9. Confirm login works and `/var/lib/pmwds/database/pmwds.sqlite` is still the same file

---

1. `git checkout production`, `git pull`
2. `dotnet publish PMWDS.API -c Release -o .\pmwds-pub`
3. `$env:VITE_API_BASE_URL="/api/v1"; cd Client; npm run build` — **relative**, so one build serves both the subdomain and the bare IP (§2a)
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
   $env:VITE_API_BASE_URL="/api/v1"
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
| `VITE_API_BASE_URL` | `http://localhost:5177/api/v1` | `/api/v1` (relative — serves both hosts) |

`EnvFileLoader` (`PMWDS.API/Services/EnvFileLoader.cs`) reads `.env` from the content root or its
parent, but **only when the variable is not already set** — real environment variables and the
systemd `EnvironmentFile` always win. Keep `.env` out of the deployed folder.

### Moving Production → Development

Nothing to undo. Dev uses a different SQLite file and `EnsureCreated`. If dev startup fails on
`SQL Server is required outside Development`, that means `ASPNETCORE_ENVIRONMENT` is not
`Development` — check the launch profile / `.env`.

---

## 2a. Serving on the bare IP alongside the subdomain

One React build serves both. The client is built with a **relative** API base:

```powershell
$env:VITE_API_BASE_URL="/api/v1"     # NOT the absolute subdomain URL
cd Client; npm run build
```

so it calls whichever origin served it. `appsettings.Production.json` and the systemd
`EnvironmentFile` are unchanged; only `AllowedOrigins` gained a second entry:

```
AllowedOrigins__0=https://pmwds.dharmaatribe.app
AllowedOrigins__1=http://147.93.155.185
```

nginx adds `/etc/nginx/sites-available/pmwds-ip`, a `listen 80 default_server; server_name _;`
block serving the same webroot and proxying the same locations. Without `default_server`, a bare-IP
request matched the first `server` block on port 80 (the Certbot-generated `return 404` stub for
`dharmaatribe.com`) and returned 404.

### Why HTTP only on the IP

A bare IP cannot get a normal TLS certificate. Options were rejected because:

- **Self-signed** — full-page browser warning on every visit, still interceptable.
- **Let's Encrypt IP certificates** — exist but are short-lived (~6 days) and certbot 2.9 (the
  Ubuntu 24.04 version) predates reliable support. Needs an upgrade plus renewal automation or the
  site breaks weekly.

**Consequence: on `http://147.93.155.185` the login password and JWTs travel in clear text.** Anyone
on the path can read them. Use the subdomain whenever that matters, and treat the IP as a convenience
or dev entry point only. Do not put real credentials behind it.

### Avatar and file URLs depend on the API base

`Avatar.tsx` / `Avatark.tsx` derive an origin from `VITE_API_BASE_URL` for `/avatars/...` and
`/files/...` paths. They previously fell back to `http://localhost:5177` whenever stripping the
`/api/vN` suffix left an empty string — which is exactly what a relative base produces. On a
same-origin deployment that silently pointed avatar and file requests at a developer's machine.

They now distinguish the two cases: the base is only replaced with `http://localhost:5177` when
`VITE_API_BASE_URL` is **unset** (local dev). A configured relative base stays empty, so composed
paths remain root-relative.

---

## 2b. nginx must proxy `/hubs/` (SignalR) — manual VPS step

Live updates travel over a SignalR WebSocket to `/hubs/dashboard` (and `/hubs/notifications`),
mapped in `Program.cs`. nginx therefore needs a `location /hubs/` block with WebSocket upgrade
headers.

> **This config lives on the VPS, not in this repo. It must be applied by hand.**
> `Client/nginx.conf` is only the Docker/Compose config — production does not read it.
>
> **Both** server blocks need it:
> - `/etc/nginx/sites-available/pmwds-ip` — the bare-IP block from §2a
> - the Certbot block for `pmwds.dharmaatribe.app`
>
> If you skip this, SignalR works perfectly in local development and **silently fails in
> production**: the browser gets a 404 on `/hubs/dashboard/negotiate`, `onclose` fires, and the
> client quietly drops to the 60s poll. Nothing errors visibly. Treat it as a required deploy
> step.

Add to each block:

```nginx
location /hubs/ {
    proxy_pass http://127.0.0.1:5000;   # match whatever upstream the existing /api/ block uses
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    proxy_buffering off;
}
```

The long timeouts are required, not cosmetic: nginx drops an idle WebSocket at its 60s
default, which would reconnect every client every minute even when nothing is wrong.

Apply and verify:

```bash
ssh contabo
sudo cp /etc/nginx/sites-available/pmwds-ip{,.bak-$(date +%s)}
sudo nano /etc/nginx/sites-available/pmwds-ip
sudo nginx -t && sudo systemctl reload nginx
# Repeat for the domain block.
# Expect 400 (missing access_token) or a 101 upgrade. A 404 means the location is
# missing or still spelled /hub/ (singular).
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" \
  http://127.0.0.1/hubs/dashboard/negotiate
```

Design and verification notes: `docs/realtime-sync-and-data-durability.md`.

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

## 3a. Moving production from SQLite to SQL Server

**Production currently runs SQLite** (`/var/lib/pmwds/database/pmwds.sqlite`, see §3).
This section covers switching it to SQL Server. SQL Server and Hangfire have been
verified end to end against a real instance — see §2c for the verification table.

### Windows authentication will not work here

`Integrated Security=True` / `Trusted_Connection=True` is a **Windows-only** mechanism.
There is no domain to authenticate against on Ubuntu, so such a connection string works
on a Windows dev box and fails on the VPS. Everything below uses SQL Server
authentication.

### ⚠️ This is a new, empty database

**Nothing in this codebase migrates data between providers.** The production data lives
in the SQLite file and will not carry over. On a fresh SQL Server database the seeder
rebuilds the demo workspace (users, roles, the seeded project, milestones, tasks), but
any real edits made in production are lost.

Back up first, then decide:

```bash
sudo systemctl stop pmwds.dharmaatribe.app
mkdir -p /var/lib/pmwds/backup
sqlite3 /var/lib/pmwds/database/pmwds.sqlite \
  ".backup /var/lib/pmwds/backup/pmwds-$(date +%F).sqlite"
sudo systemctl start pmwds.dharmaatribe.app
```

Migrating that data across to SQL Server needs a one-off script. Treat the seeded rebuild
as a fresh start unless that data matters.

### 1. Run SQL Server in a container

The Windows service cannot be installed on Ubuntu, so SQL Server runs as a container.
`docker-compose.yml` already defines it:

```yaml
mssql-server:
  image: mcr.microsoft.com/mssql/server:2022-latest
  ports: ["1433:1433"]
  environment:
    ACCEPT_EULA: ${ACCEPT_EULA}
    MSSQL_SA_PASSWORD: ${SA_PASSWORD}
  volumes: [mssql_data:/var/opt/mssql]
  mem_limit: 2g
```

```bash
docker compose up -d mssql-server
docker exec -it mssql-server /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$SA_PASSWORD" -C -Q "SELECT @@VERSION"
```

Needs roughly **2 GB of RAM**. `-C` is required: the container generates a self-signed
certificate on first run, and sqlcmd 18 verifies certificates by default.

Wait for `docker compose up` to report the service healthy before starting the API —
SQL Server takes ~15 seconds to become ready on a cold volume, and a premature start
makes the app log a connection failure.

### 2. Create the databases and a least-privilege application login

`sa` is sysadmin. Prefer a dedicated login for the app.

Create the databases **first, as `sa`**. The app does have an `EnsureDatabasesExist` step
that runs `CREATE DATABASE` against `master` at startup, but a least-privilege login
cannot do that — it will fail with *"permission denied to create database"*. Creating them
up front sidesteps that:

```sql
CREATE DATABASE [PMWDS];
CREATE DATABASE [PMWDS_Hangfire];
GO
CREATE LOGIN [pmwds_app] WITH PASSWORD = 'CHANGE_ME_Strong_Passw0rd', CHECK_POLICY = ON;
GO
USE [PMWDS];
CREATE USER [pmwds_app] FOR LOGIN [pmwds_app];
CREATE ROLE [pmwds_rw];
EXEC sp_addrolemember 'db_datareader', 'pmwds_rw';
EXEC sp_addrolemember 'db_datawriter', 'pmwds_rw';
ALTER ROLE [pmwds_rw] ADD MEMBER [pmwds_app];
GO
USE [PMWDS_Hangfire];
CREATE USER [pmwds_app] FOR LOGIN [pmwds_app];
-- Hangfire installs its own schema objects on first run, so it needs to create
-- tables and indexes here. db_owner on this database only is the simplest grant.
EXEC sp_addrolemember 'db_owner', 'pmwds_app';
GO
```

If you skip the least-privilege setup and just use `sa`, the databases do not need to be
created by hand — `EnsureDatabasesExist` will handle it, since `sa` can.

### 3. Point the app at SQL Server

Edit `/etc/pmwds/pmwds.env` (the systemd `EnvironmentFile`, **not** a file in the repo):

```bash
ConnectionStrings__Default=Server=127.0.0.1,1433;Database=PMWDS;User Id=pmwds_app;Password=CHANGE_ME_Strong_Passw0rd;MultipleActiveResultSets=true;TrustServerCertificate=True
ConnectionStrings__Hangfire=Server=127.0.0.1,1433;Database=PMWDS_Hangfire;User Id=pmwds_app;Password=CHANGE_ME_Strong_Passw0rd;TrustServerCertificate=True
Database__ForceSqlite=false
Database__AllowSqliteInProduction=false
```

Both databases must already exist if you are using a least-privilege login — see step 2.
With `sa`, the app creates them itself via `EnsureDatabasesExist`.

Use `127.0.0.1`, **not** `localhost`. The container does not always answer on `::1`, and
the connection hangs until it times out rather than failing fast — an easy trap to
misdiagnose as an application bug.

### 4. Restart and verify

```bash
sudo systemctl restart pmwds.dharmaatribe.app
sudo journalctl -u pmwds.dharmaatribe.app -n 80 --no-pager
```

Expect these lines, in this order:

```
[PMWDS] Using SQL Server database (127.0.0.1,1433).
[PMWDS] Database 'PMWDS' ensured.
[PMWDS] Database 'PMWDS_Hangfire' ensured.
Start installing Hangfire SQL objects...
Hangfire SQL objects installed.
[PMWDS] Applying database migrations...
Now listening on: ...
```

`Using SQLite database` instead means the connection string is not being read — check the
variable names in `/etc/pmwds/pmwds.env` and that `Database__AllowSqliteInProduction` is
not still `true`.

Confirm live updates still work (§2b nginx step) and that the Hangfire dashboard is
reachable at `/hangfire`.

### Things that change behaviour

- **Hangfire starts running in production for the first time.** All four recurring jobs
  have never executed there. `escalation-checker` calls the AI provider, so it will begin
  making real outbound API calls hourly. Watch the Hangfire dashboard after enabling.
- **Persist the Data Protection keys.** `PRODUCTION.md` §6 item 9 records that keys are
  currently ephemeral under systemd, so protected fields are re-encrypted on every
  restart. Set `FileStorage__KeysPath` to a durable path under `/var/lib/pmwds` before
  this matters.
- **SQLite backups stop being backups.** Once the app is on SQL Server, `sqlite3 .backup`
  no longer protects anything. Back up the container volume instead.
- Keep the existing SQLite file at `/var/lib/pmwds/database/pmwds.sqlite` until the
  switch is confirmed good; it is the only copy of the old data.

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
4. Client built with `VITE_API_BASE_URL=/api/v1` (relative), packaged with tar,
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
| `POST /api/v1/auth/login` | `200`, JWT issued for `superadmin@org1.com` (SuperAdmin) |
| Authenticated `GET /api/v1/projects` | `200`, project returned |
| CORS preflight, `https://pmwds.dharmaatribe.app` | `204`, origin echoed + credentials true |
| CORS preflight, `https://evil.example` | `204`, **no** `Access-Control-Allow-Origin` |
| Document upload → restart → list → download | `1` doc before and after, `200`, correct content |
| `dharmaatribe.com` (neighbouring site) | unaffected |
| Bare IP `http://147.93.155.185` | root `200`, login `200`, projects + reports list and download all `200` |
| Both hosts, JS/CSS assets | `200` at full size; stale asset hash correctly `404` |

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
2. **Seeded credentials are live on a public URL** — `superadmin@org1.com` / `Pmwds@123` plus ~20 more,
   reachable at `https://pmwds.dharmaatribe.app`. Rotate or disable before real users.
3. **Seeded emails in the docs are wrong.** `README.md` and `CONFIG.md` say `admin@pmwds.com`,
   `manager@pmwds.com`, `viewer@pmwds.com`. The actual seed is `superadmin@org1.com` (SuperAdmin),
   `admin@org1.com` (the `director` role, shown as Admin), `manager@org1.com`, `head.bstr@org1.com`,
   and others. Update the docs.
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

14. **SQL Server path — now tested.** Superseded; see §2c below.

---

## 2c. SQL Server and Hangfire verified locally

The SQL Server branch had never been run against a real instance. It is now, and it was
broken. See `docs/realtime-sync-and-data-durability.md` for the full write-up.

**Result:** `AddUtilizationCertificate` could not run on SQL Server at all. Startup dropped
the database, retried, and crashed. Three provider bugs stacked:

1. SQLite column types (`TEXT`/`INTEGER`). SQL Server parses `TEXT` — it is the legacy LOB
   type — so the DDL was accepted right up to `PRIMARY KEY ([Id])`, which then failed with
   *"is of a type that is invalid for use as a key column in an index"*.
2. `ProjectId` CASCADE gave a second cascade path, because `ProjectDocuments` already
   cascades from `Projects`.
3. `TaskId` `SET NULL` was a third, because `Tasks` also cascades from `Projects`. SQL Server
   counts `SET NULL` as cascading for that check and allows only one path per table.

Fixed by branching on `migrationBuilder.ActiveProvider`; the SQLite branch is byte-identical to
what shipped. **SQLite is unaffected** — EF matches applied migrations by id, not file
contents — and a fresh SQLite database still migrates under Production's forward-only path.

### Verified working on SQL Server 2022 Express

| Check | Result |
|---|---|
| Provider selection | `Using SQL Server database (127.0.0.1,1433)` |
| `EnsureDatabasesExist` | `PMWDS` and `PMWDS_Hangfire` created |
| Hangfire schema | installed, schema version 9 |
| Migrations | all 5 applied |
| `HasExpectedSqlServerSchemaAsync` | passed (no reset) |
| Seeding | ran |
| `/hangfire` dashboard | 200 with a valid JWT |
| Recurring jobs | all 4 scheduled: `0 * * * *`, `30 * * * *`, `0 2 * * *`, `0 7 * * 1` |
| Job execution | `escalation-checker` fired on schedule at 20:30:14 UTC, worker picked it up, `EscalationCheckerJob started` |
| API endpoints | `/pages`, `/projects`, `/users`, `/workspace/bootstrap`, `/tasks`, `/milestones/by-project` → all 200 |
| SignalR | `DataChanged` delivered over a real WebSocket |
| Fresh SQLite (Production mode) | migrates clean, forward-only, no destructive reset |

### Local instance prerequisites

- **SQL logins must be enabled.** The local instance ships in Windows-only auth mode
  (`SERVERPROPERTY('IsIntegratedSecurityOnly') = 1`), so `sa` fails with *"Login failed"*
  regardless of the password, and `ALTER LOGIN sa WITH PASSWORD = ...` appears to succeed
  while changing nothing. Switching to mixed mode needs
  `HKLM\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL16.MSSQLSERVER\LoginMode = 2` plus a
  service restart, both of which require Administrator. Until then, test with
  `Integrated Security=True` as a local sysadmin.
- **`Server=localhost` can time out.** `localhost` resolves to `::1` first and this instance
  does not answer there. `127.0.0.1` works. Worth knowing before blaming the app.
- Express Edition caps databases at 10 GB each.

### Known behaviour difference introduced on SQL Server only

Deleting a **task** that a utilization certificate references now raises a foreign-key error
instead of nulling the reference, because `TaskId` had to become `NO ACTION` to satisfy the
single-cascade-path rule. SQLite keeps `SET NULL`. Fixing it properly needs a design decision
— unlink during task deletion, or drop the foreign key — so it is flagged, not papered over.
`TODO.md` already tracks the underlying multiple-cascade-path problem.

### No automated tests

There is no test project anywhere in the solution, no xUnit/NUnit/MSTest/Testcontainers
package reference, no `[Fact]`/`[Theory]`/`Assert` usage, and no client test runner
(`package.json` has no `test` script and no vitest/jest/playwright). Everything above was
verified by hand against a running instance. This migration bug would have been caught
immediately by a single test that runs `MigrateAsync` against each provider.

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