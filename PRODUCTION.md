# PRODUCTION.md — PMWDS deployment, environments, and dev↔prod differences

Two independent deployments, on two branches, on one VPS:

| Branch | Variant | URL | TLS | API port | systemd service |
|---|---|---|---|---|---|
| `prod-mssql` | **MSSQL Server** + Redis | `https://pmwds.dharmaatribe.app` | HTTPS | `127.0.0.1:5002` | `pmwds-mssql` |
| `prod-sqlite` | **SQLite** only | `http://147.93.155.185` | none possible | `127.0.0.1:5001` | `pmwds-sqlite` |

Host: Contabo VPS `147.93.155.185` (`ssh contabo`), Ubuntu 24.04, nginx 1.24, `aspnetcore-runtime-10.0`.
4 vCPU / 7.8 GiB RAM.

Related: [README.md](README.md), [CONFIG.md](CONFIG.md), [config-sqlite.md](config-sqlite.md),
[mssql-issue.md](mssql-issue.md), [vps.md](vps.md),
[vps-mssqlserver.md](vps-mssqlserver.md) (how SQL Server and Redis are installed on the VPS,
what broke on the way, and how to connect SSMS to it through an SSH tunnel).

> ⚠ **Read this before deploying the MSSQL variant**
>
> **`mssql-issue.md` documents the 25-second request latency this variant suffered and how it
> was fixed.** The two settings below are the fix, and they are load-bearing — an instance
> without them will serve requests in ~25 seconds:
>
> ```
> max degree of parallelism = 1
> max server memory (MB)    = 2048
> ```
>
> Full procedure, the Ubuntu 24.04 OpenLDAP problem you will hit on a fresh install, the SA
> password traps, and how to point SSMS at the VPS through an SSH tunnel:
> **[vps-mssqlserver.md](vps-mssqlserver.md)**.

> **Never deploy one variant's paths, service or port using the other variant's settings.**
> `deploy.ps1` keeps them in a single table and will warn loudly on a branch/variant mismatch.

Deploy with **`.\deploy.ps1`** — it runs the checklist below and enforces every rule in §2.1, §2.2 and
§2a for you. Details in [Deploying](#deploying).

## Deploying

### The script (normal way)

```powershell
# from the prod-mssql branch
.\deploy.ps1

# from the prod-sqlite branch
.\deploy.ps1
```

Run it from the repo root. It prompts for which deployment, then what to ship:

```
      Which deployment?
        [1] sqlite - bare IP  http://147.93.155.185            (branch prod-sqlite owns this)
        [2] mssql  - subdomain https://pmwds.dharmaatribe.app

      What should be deployed?
        [1] both  - API + web client
        [2] api   - API only (leaves the current client build in place)
        [3] web   - web client only (no service restart)
```

The variant defaults to whichever one the current branch owns, so on a correctly checked-out
branch you only need to answer the target question. Passing a `-Variant` that contradicts the
branch prints a warning rather than silently doing the wrong thing.

Then it runs every step with per-step timing and a pass/fail line: preflight, variant and target
selection, build, package, confirm, upload, remote deploy, verify.

| Flag | Effect |
|---|---|
| `-Variant sqlite\|mssql` | skip the variant prompt |
| `-Target api\|web\|both` | skip the target prompt |
| `-SkipConfirm` | deploy without the y/N check (CI) |
| `-SkipVerify` | skip the post-deploy verification pass |
| `-KeepBackups 5` | how many archives per option (and DB copies) to keep, locally and on the server. `0` keeps everything |
| `-BackupRoot <path>` | local backup folder, defaults to `<repo>\backups` |
| `-Host_ contabo` | override the SSH alias |

Examples:

```powershell
# client-only fix to the MSSQL deployment, no service restart
.\deploy.ps1 -Variant mssql -Target web -SkipConfirm

# everything to the SQLite deployment
.\deploy.ps1 -Variant sqlite -Target both -SkipConfirm
```

Exit code is `0` on success and `1` if any check failed, so it is usable from CI.

### Backups taken on every deploy

Each run stamps everything it produces with `<yyyyMMdd-HHmmss>-<short HEAD>` and keeps the
newest `-KeepBackups` (default 5) of each option, so a bad deploy can be rolled back from a
folder listing.

| What | Local | Server |
|---|---|---|
| API archive | `backups/<variant>/api/pmwds-api-<stamp>.tar.gz` | `/var/backups/pmwds-<variant>/api/` |
| Web archive | `backups/<variant>/web/pmwds-web-<stamp>.tar.gz` | `/var/backups/pmwds-<variant>/web/` |
| SQLite database | `backups/<variant>/db/pmwds-<stamp>.sqlite` | `/var/backups/pmwds-<variant>/db/` |

The server archive is the exact tarball that was uploaded — the script `mv`s it out of `/tmp`
into the backup folder and extracts from there, so one artifact has one name. The database
copy uses SQLite's online `.backup` API (taken while the service is running, so it is
consistent), is `chmod 600`, and is then **pulled back down** to the local folder, because a
backup that only lives on the machine that was just replaced is not a backup. Every directory
the deployment needs is created with `mkdir -p` first, so a first deploy onto a clean box
needs no manual setup; if the server has neither `sqlite3` nor `python3` the deploy **fails**
rather than falling back to `cp`, which would not produce a usable copy of a live database.

The MSSQL variant has no SQLite file, so its database backup is reported as skipped.

### What each variant maps to

Every path, service and port lives in one `$VariantTable` at the top of `deploy.ps1`:

| | sqlite | mssql |
|---|---|---|
| API directory | `/var/www/pmwds-sqlite/app` | `/var/www/pmwds-mssql/app` |
| Client directory | `/var/www/pmwds-sqlite/html` | `/var/www/pmwds-mssql/html` |
| systemd service | `pmwds-sqlite` | `pmwds-mssql` |
| env file | `/etc/pmwds/pmwds-sqlite.env` | `/etc/pmwds/pmwds-mssql.env` |
| data directory | `/var/lib/pmwds-sqlite` | `/var/lib/pmwds-mssql` |
| backup directory | `/var/backups/pmwds-sqlite` | `/var/backups/pmwds-mssql` |
| API port | 5001 | 5002 |
| nginx vhost | `sites-available/pmwds-ip` | `sites-available/pmwds.dharmaatribe.app` |

The deploy script **never writes to the data directory**. Databases, uploads and avatars
survive every deploy by construction — the API directory is emptied and repopulated, and
nothing else.

Verification also asserts the **other** variant's service is still active afterwards, so a
deploy that accidentally takes down the neighbouring deployment fails loudly instead of
quietly.

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
- **Database is never touched** — only `app/` and `html/` are replaced, so `/var/lib/pmwds-sqlite` and the
  SQLite file are untouched by construction.
- **Backups before replacement** — the SQLite file is snapshotted (`.backup`, online, `chmod 600`) and
  both archives are filed under a stamped name before anything is overwritten, locally and on the server,
  keeping the newest `-KeepBackups` of each (§ *Backups taken on every deploy*).

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
7. `systemctl restart pmwds-sqlite`
8. `journalctl -u pmwds-sqlite -n 30 --no-pager` — expect `Now listening on: http://127.0.0.1:5001`
9. Confirm login works and `/var/lib/pmwds-sqlite/database/pmwds.sqlite` is still the same file

---

1. `git checkout production`, `git pull`
2. `dotnet publish PMWDS.API -c Release -o .\pmwds-pub`
3. `$env:VITE_API_BASE_URL="/api/v1"; cd Client; npm run build` — **relative**, so one build serves both the subdomain and the bare IP (§2a)
4. Package with **`tar`** — never `Compress-Archive` (§2.1)
5. `scp` both archives, extract on the server, `chown -R www-data:www-data`
6. **Verify every asset returns `200` with a real size** (§2.2) — a blank page otherwise
7. `systemctl restart pmwds-sqlite`
8. `journalctl -u pmwds-sqlite -n 30 --no-pager` — expect `Now listening on: http://127.0.0.1:5001`
9. Confirm login works and `/var/lib/pmwds-sqlite/database/pmwds.sqlite` is still the same file

---

## 1. Does switching to Development create a new SQLite database?

**Yes. Development and Production use physically different files, and Production refuses to run on one inside the app folder.**

| | Development | Production |
|---|---|---|
| Config file | `appsettings.Development.json` | `appsettings.Production.json` |
| SQLite file | `App_Data/pmwds-dev.sqlite` (inside app dir) | `/var/lib/pmwds-sqlite/database/pmwds.sqlite` |
| Uploads / avatars | `App_Data` under app dir | `/var/lib/pmwds-sqlite/data` |
| Schema created by | `EnsureCreated` (model-driven) | `MigrateAsync` (migration-driven) |
| Data on restart | **wiped every start** (known bug, see §7) | **kept** |
| Hangfire | disabled | disabled |

Consequences:

- You never touch production data while developing. Two files, two lifecycles.
- To start from a clean dev database, delete `PMWDS.API/App_Data/pmwds-dev.sqlite` (or the whole `App_Data/`).
- To reset production data, stop the service and delete `/var/lib/pmwds-sqlite/database/pmwds.sqlite`. **This is irreversible** — back it up first.

### Guard rail

Outside Development, the app refuses to start if the SQLite file resolves inside the application
directory (`DatabaseConnectionService.GuardSqliteOutsideAppDirectory`):

```
System.InvalidOperationException: Database:SqliteConnectionString points inside the application
directory (.../Database/pmwds.sqlite). A deploy replaces that directory, which would delete the
database. Use a durable absolute path outside the app folder, e.g.
/var/lib/pmwds-sqlite/database/pmwds.sqlite.
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
- In Production, prefer an absolute path outside the app directory (`/var/lib/pmwds-sqlite/...`).
- If a path must default to something, default **inside** the app directory, never above it.
- Locally the bad paths resolve inside `PMWDS.API/`, which exists and is writable, so local testing
  does **not** surface this class of bug. Only the deployed layout exposes it.

---

## 2. Moving Development → Production

1. **Merge to the branch for that variant** — `prod-sqlite` or `prod-mssql` — then publish
   locally (SDK only needed on the build host):
   ```powershell
   git checkout prod-sqlite      # or prod-mssql
   dotnet publish PMWDS.API -c Release -o .\pmwds-pub
In practice use `.\deploy.ps1`, which does all of this and knows which variant the branch
owns. The manual steps below are for when you need to do it by hand.

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
   Replacing `app/` is safe **only because** the database and uploads live in `/var/lib/pmwds-sqlite` (§1).
4. **Verify the client actually loaded** — do not skip this, see §2.2:
   ```powershell
   ssh contabo "curl -sk -o /dev/null -w 'js %{http_code} css ' https://pmwds.dharmaatribe.app/assets/index-<hash>.js"
   ssh contabo "curl -sk -o /dev/null -w '%{http_code} root ' https://pmwds.dharmaatribe.app/assets/index-<hash>.css"
   ssh contabo "curl -sk -o /dev/null -w '%{http_code}\n' https://pmwds.dharmaatribe.app/"
   ```
   Both assets must be `200` **with a non-trivial `size`**. Read the real hashes out of
   `dist/index.html` rather than guessing them.
5. **Restart** `systemctl restart pmwds-sqlite`.

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
| `Database__SqliteConnectionString` | `Data Source=App_Data/pmwds-dev.sqlite` | `Data Source=/var/lib/pmwds-sqlite/database/pmwds.sqlite` |
| `Database__AllowSqliteInProduction` | n/a | `true` (required for SQLite outside Development) |
| `ConnectionStrings__Default` | empty → SQLite fallback | empty → SQLite (or set SQL Server) |
| `FileStorage__BasePath` | unset | `/var/lib/pmwds-sqlite/data` |
| `AzureStorage__LocalUploadPath` | unset | `/var/lib/pmwds-sqlite/data` |
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

> **Status: applied on the VPS as of 2026-10-03** (both blocks, verified in `vps.md`).
> Re-check after any nginx edit — `deploy.ps1` does not touch nginx at all.

> ### The other half of this bug is in the client, not nginx
>
> nginx proxies `/hubs/` but forwards `/api/...` straight to the API. `resolveHubUrl()` in
> `Client/src/realtime.ts` used to keep the `/api/v1` segment when the API base was
> **relative**, producing `/api/v1/hubs/dashboard`. Local development uses an absolute base,
> so it passed there and only ever broke in a deployed bundle — which is exactly what
> `deploy.ps1` produces, since it builds with `VITE_API_BASE_URL=/api/v1` so one bundle serves
> both hosts.
>
> That 404 was invisible to every existing deploy check: `/`, `/projects` and the assets are
> static files served by `try_files`, so all of them return 200 while live updates are
> completely broken. `deploy.ps1` now asserts the negotiate **body** advertises WebSockets.

Add to each block, pointing at **that variant's** port:

```nginx
location /hubs/ {
    proxy_pass http://127.0.0.1:5001;   # sqlite variant; 5002 for the mssql variant
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

Two fully independent deployments. Nothing is shared — not a directory, not a service, not a
port, not a database. That is deliberate: a bad deploy of one must not be able to damage the other.

### SQLite variant — `http://147.93.155.185`, branch `prod-sqlite`

```
/var/www/pmwds-sqlite/html/              # React dist (static)
/var/www/pmwds-sqlite/app/               # published .NET output  <- replaced on every deploy
/etc/nginx/sites-available/pmwds-ip
/etc/systemd/system/pmwds-sqlite.service
/var/lib/pmwds-sqlite/database/pmwds.sqlite     # persistent
/var/lib/pmwds-sqlite/data/{avatars,documents}  # persistent
/etc/pmwds/pmwds-sqlite.env               # secrets, 0600 root
```

#### Environment file — `/etc/pmwds/pmwds-sqlite.env`

This deployment has **no SQL Server and no Redis**, and that is a decision rather than an
accident, so both are switched off explicitly rather than left to fail a connectivity probe
on every boot:

```ini
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://127.0.0.1:5001
DOTNET_ENVIRONMENT=Production

Jwt__Secret=<long random secret, different from the mssql variant>
Jwt__Issuer=PMWDS
Jwt__Audience=PMWDS_Users
Jwt__ExpiryMinutes=1440

# SQLite is the intended provider, not a fallback. EnableSqlServer=false means the app never
# opens a connection to port 1433, and cannot silently promote itself to SQL Server if some
# other service happens to be listening there.
Database__EnableSqlServer=false
Database__AllowSqliteInProduction=true
Database__SqliteConnectionString=Data Source=/var/lib/pmwds-sqlite/database/pmwds.sqlite

# Must be set, even though it looks redundant. appsettings.json, appsettings.Development.json
# and appsettings.Production.json all default this to "localhost:6379", and an environment
# variable is the only thing that overrides them. Without an explicit empty value here the app
# probes Redis on every start and prints a large connection-failure warning for a service this
# deployment does not have. An empty value here is not the same as an absent variable - see
# the note below.
ConnectionStrings__Redis=
ConnectionStrings__Hangfire=

FileStorage__BasePath=/var/lib/pmwds-sqlite/data
AzureStorage__LocalUploadPath=/var/lib/pmwds-sqlite/data
AzureStorage__LocalBaseUrl=/files

Email__ClientBaseUrl=http://147.93.155.185
AllowedOrigins__0=http://147.93.155.185
AllowedOrigins__1=https://pmwds.dharmaatribe.app

Serilog__MinimumLevel__Default=Information
AI__DefaultProvider=OpenRouter
AI__OpenRouter__ApiKey=<key>
AI__OpenRouter__BaseUrl=https://openrouter.ai/api/v1
AI__OpenRouter__DefaultModel=nvidia/nemotron-3-ultra-550b-a55b:free
```

The resulting startup banner is unambiguous, which matters because a silent provider change is
how the SQLite deployment was previously mistaken for the SQL Server one:

```
[PMWDS] Using SQLite database (/var/lib/pmwds-sqlite/database/pmwds.sqlite).
[PMWDS] Database selection: SQL Server disabled by Database:EnableSqlServer=false - not probed.
[PMWDS] Redis disabled (ConnectionStrings:Redis is empty). Caching uses in-memory.
```

> **Gotcha: an empty variable is not the same as an absent one, depending on the shell.**
> systemd writes `ConnectionStrings__Redis=` to the process environment as an *empty* value,
> and .NET reads that as an override, so the appsettings default is correctly replaced. But in
> PowerShell, `$env:X = ""` **deletes** the variable rather than setting it empty, which
> silently restores the appsettings default. Locally, use a single space or test with .env
> moved aside.

### MSSQL variant — `https://pmwds.dharmaatribe.app`, branch `prod-mssql`

```
/var/www/pmwds-mssql/html/
/var/www/pmwds-mssql/app/                # replaced on every deploy
/etc/nginx/sites-available/pmwds.dharmaatribe.app
/etc/systemd/system/pmwds-mssql.service
/var/lib/pmwds-mssql/data/{avatars,documents}   # persistent (SQLite is the fallback db)
/etc/pmwds/pmwds-mssql.env
```

MSSQL itself is **not** under `/var/lib`: SQL Server owns its own data directory
(`/var/opt/mssql`), and its databases are `PMWDS` plus `PMWDS_Hangfire`. Redis is a separate
service with its own persistence.

### Ports and listeners

| Port | Bound to | Service |
|---|---|---|
| 5001 | `127.0.0.1` | `pmwds-sqlite` (loopback only, never in `ufw`) |
| 5002 | `127.0.0.1` | `pmwds-mssql` (loopback only, never in `ufw`) |
| 1433 | `127.0.0.1` | SQL Server |
| 6379 | `127.0.0.1` | Redis |
| 80 / 443 | public | nginx |

nginx serves each variant's `html/` and proxies `/api/`, `/hubs/`, `/files/`, `/avatars/` to that
variant's own port. Neither API is ever exposed outside loopback.

### systemd unit

Identical for both except the paths and the env file:

```ini
[Service]
User=www-data
WorkingDirectory=/var/www/pmwds-mssql/app          # or /var/www/pmwds-sqlite/app
EnvironmentFile=/etc/pmwds/pmwds-mssql.env         # or /etc/pmwds/pmwds-sqlite.env
ExecStart=/usr/bin/dotnet /var/www/pmwds-mssql/app/PMWDS.API.dll
Restart=always
RestartSec=10
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=/var/lib/pmwds-mssql                # must match that variant's data dir
```

`ReadWritePaths` is required: `ProtectSystem=full` makes the rest of the filesystem read-only,
which is what surfaces a wrong storage path immediately instead of silently writing uploads
somewhere unexpected. **It must point at the variant's own data directory** — the wrong value
here is a failure mode that only shows up as missing uploads much later.

### Useful commands

```bash
# both variants
systemctl status  pmwds-sqlite pmwds-mssql --no-pager
systemctl restart pmwds-sqlite pmwds-mssql
journalctl -u pmwds-sqlite -n 50 --no-pager
journalctl -u pmwds-mssql  -n 50 --no-pager
tail -f /var/log/nginx/pmwds-ip.error.log
tail -f /var/log/nginx/pmwds.dharmaatribe.app.error.log
nginx -t && systemctl reload nginx
ss -tlnp | grep -E '5001|5002|1433|6379'
```

---

## 3a. Moving production from SQLite to SQL Server

**Production currently runs SQLite** (`/var/lib/pmwds-sqlite/database/pmwds.sqlite`, see §3).
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
mkdir -p /var/lib/pmwds-sqlite/backup
sqlite3 /var/lib/pmwds-sqlite/database/pmwds.sqlite \
  ".backup /var/lib/pmwds-sqlite/backup/pmwds-$(date +%F).sqlite"
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
ConnectionStrings__Default=Server=127.0.0.1,1433;Database=PMWDS;User Id=pmwds_app;Password=CHANGE_ME_Strong_Passw0rd;TrustServerCertificate=True
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
sudo systemctl restart pmwds-sqlite
sudo journalctl -u pmwds-sqlite -n 80 --no-pager
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
  restart. Set `FileStorage__KeysPath` to a durable path under `/var/lib/pmwds-sqlite` before
  this matters.
- **SQLite backups stop being backups.** Once the app is on SQL Server, `sqlite3 .backup`
  no longer protects anything. Back up the container volume instead.
- Keep the existing SQLite file at `/var/lib/pmwds-sqlite/database/pmwds.sqlite` until the
  switch is confirmed good; it is the only copy of the old data.

---

## 3b. Provisioning the MSSQL variant on the VPS

> ⚠ **Read [mssql-issue.md](mssql-issue.md) first.** SQL Server on a 4-vCPU / 7.8 GiB box
> currently produces ~25 s requests. Provisioning is documented here; whether it is *usable*
> is a separate, unresolved question. Step 3 below exists specifically to try to fix that,
> because the same setting is blocked on Windows and may well be settable on Linux.

### 1. Install SQL Server

Ubuntu 24.04 is supported by SQL Server 2022. Microsoft does not publish a native 24.04 repo,
so pin 22.04:

```bash
curl -fsSL https://packages.microsoft.com/keys/microsoft.asc \
  | sudo tee /etc/apt/trusted.gpg.d/microsoft.asc > /dev/null
curl -fsSL https://packages.microsoft.com/config/ubuntu/22.04/mssql-server-2022.list \
  | sudo tee /etc/apt/sources.list.d/mssql-server-2022.list

sudo apt-get update
sudo apt-get install -y mssql-server mssql-tools18 unixodbc-dev
sudo /opt/mssql/bin/mssql-conf -n setup accept-eula
```

`accept-eula` picks the Developer edition and an autogenerated strong SA password. **Write that
password down.** For a real deployment pick the edition explicitly with `-e` instead.

### 2. Create the databases and a least-privilege login

The app creates its own databases at startup only if it can — with a least-privilege login it
cannot, so create them up front.

```bash
sudo /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P '<SA_PASSWORD>' -C -Q "
CREATE DATABASE [PMWDS];
CREATE DATABASE [PMWDS_Hangfire];
"
```

```bash
sudo /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P '<SA_PASSWORD>' -C -Q "
CREATE LOGIN [pmwds_app] WITH PASSWORD = '<STRONG_PASSWORD>', CHECK_POLICY = ON;
USE [PMWDS];
CREATE USER [pmwds_app] FOR LOGIN [pmwds_app];
ALTER ROLE db_datareader ADD MEMBER [pmwds_app];
ALTER ROLE db_datawriter ADD MEMBER [pmwds_app];
USE [PMWDS_Hangfire];
CREATE USER [pmwds_app] FOR LOGIN [pmwds_app];
ALTER ROLE db_datareader ADD MEMBER [pmwds_app];
ALTER ROLE db_datawriter ADD MEMBER [pmwds_app];
"
```

Hangfire needs more than DDL on its own tables, so grant DDL at the database level:

```sql
ALTER DATABASE [PMWDS_Hangfire] SET TRUSTWORTHY ON;
```

Do **not** run the app as `sa`. See §3a for why Windows authentication is unavailable here.

### 3. Constrain SQL Server's memory — the fix for mssql-issue.md

The Windows instance refused both `MAXDOP` and `max server memory` because advanced options
are locked. On Linux use `mssql-conf`, which is a different mechanism and may well work:

```bash
# Cap the buffer pool. Leave ~1.5-2 GB for nginx, the API and the OS.
sudo /opt/mssql/bin/mssql-conf set memory.memorylimitmb 2048

# Restart, then verify
sudo systemctl restart mssql-server
sudo /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P '<SA_PASSWORD>' -C \
  -Q "SELECT name, value_in_use FROM sys.configurations
      WHERE name IN ('max server memory (MB)','max degree of parallelism');"
```

Then, as `sa`, try the option Windows refused:

```sql
EXEC sp_configure 'show advanced options', 1; RECONFIGURE;
EXEC sp_configure 'max degree of parallelism', 1; RECONFIGURE;
EXEC sp_configure 'max server memory (MB)', 2048; RECONFIGURE;
```

If `show advanced options` still refuses to change, fall back to limiting parallelism at the
instance level:

```bash
echo "[sqlagent]" | sudo tee -a /var/opt/mssql/mssql.conf
# or, per-database once the databases exist:
#   ALTER DATABASE [PMWDS] SET MAXDOP 1;
```

**Record whichever path worked in `mssql-issue.md` §4.2/§4.3** so the next person does not
repeat the investigation. Then re-measure — the parallel burst that took 33 s is the
benchmark.

### 4. Redis

Redis is optional. Without it the app logs a warning and falls back to an in-memory cache,
which is fine for a single instance but means cache contents die on every restart.

```bash
sudo apt-get install -y redis-server
sudo systemctl enable --now redis-server
```

Bind it to loopback. In `/etc/redis/redis.conf` set `bind 127.0.0.1 ::1` and
`protected-mode yes`, then restart. **Never expose 6379 publicly** — it has no authentication
by default and would be an open remote-code-execution path.

### 5. Environment file

`/etc/pmwds/pmwds-mssql.env`, `chmod 640 root:www-data`. Do not copy the SQLite one — the two
variants must not share a database.

```ini
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://127.0.0.1:5002
DOTNET_ENVIRONMENT=Production

Jwt__Secret=<long random secret, different from the sqlite variant>
Jwt__Issuer=PMWDS
Jwt__Audience=PMWDS_Users
Jwt__ExpiryMinutes=1440

# MSSQL is now reachable, so do NOT permit the SQLite fallback. A misconfigured connection
# string should fail loudly rather than silently start writing to a local file.
Database__AllowSqliteInProduction=false
ConnectionStrings__Default=Server=127.0.0.1,1433;Database=PMWDS;User Id=pmwds_app;Password=<password>;TrustServerCertificate=True
ConnectionStrings__Hangfire=Server=127.0.0.1,1433;Database=PMWDS_Hangfire;User Id=pmwds_app;Password=<password>;TrustServerCertificate=True
ConnectionStrings__Redis=localhost:6379

FileStorage__BasePath=/var/lib/pmwds-mssql/data
AzureStorage__LocalUploadPath=/var/lib/pmwds-mssql/data
AzureStorage__LocalBaseUrl=/files

Email__ClientBaseUrl=https://pmwds.dharmaatribe.app
AllowedOrigins__0=https://pmwds.dharmaatribe.app
AllowedOrigins__1=http://147.93.155.185

Serilog__MinimumLevel__Default=Information
AI__DefaultProvider=OpenRouter
AI__OpenRouter__ApiKey=<key>
AI__OpenRouter__BaseUrl=https://openrouter.ai/api/v1
AI__OpenRouter__DefaultModel=nvidia/nemotron-3-ultra-550b-a55b:free
```

`Database__AllowSqliteInProduction=false` is deliberate and is the single most important line
here. With it true, an unreachable or malformed `ConnectionStrings__Default` degrades to a
local SQLite file and the app looks healthy while quietly writing to the wrong database —
exactly the confusion documented in `mssql-issue.md` §7.

### 6. Directories, service, nginx

```bash
sudo mkdir -p /var/www/pmwds-mssql/{app,html} /var/lib/pmwds-mssql/data /etc/pmwds
sudo chown -R www-data:www-data /var/www/pmwds-mssql /var/lib/pmwds-mssql
sudo chmod 640 /etc/pmwds/pmwds-mssql.env && sudo chown root:www-data /etc/pmwds/pmwds-mssql.env
```

Copy the unit from §3, substituting the `pmwds-mssql` paths and `ReadWritePaths=/var/lib/pmwds-mssql`.
Then point the existing `pmwds.dharmaatribe.app` nginx block at the new port — **only** its
`/api/`, `/hubs/`, `/files/` and `/avatars/` `proxy_pass` lines, from `127.0.0.1:5001` to
`127.0.0.1:5002`. The bare-IP `pmwds-ip` block must keep pointing at `127.0.0.1:5001`.

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 7. Verify

```bash
systemctl is-active pmwds-sqlite pmwds-mssql mssql-server redis-server
curl -s -o /dev/null -w 'sqlite %{http_code}\n' http://147.93.155.185/api/v1/pages?page=1
curl -s -o /dev/null -w 'mssql  %{http_code}\n' https://pmwds.dharmaatribe.app/api/v1/pages?page=1
journalctl -u pmwds-mssql -n 60 --no-pager | grep -E 'Using|Now listening|Redis|WARNING'
```

Both must report the provider you expect in the startup banner, and `deploy.ps1` will now check
the negotiate body on whichever host you deployed to.

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
2. `/var/lib/pmwds-sqlite/{database,data}` created and owned by `www-data`.
3. API published locally, packaged with `tar`, uploaded, extracted to `app/`.
4. Client built with `VITE_API_BASE_URL=/api/v1` (relative), packaged with tar,
   extracted to `html/`.
5. `/etc/pmwds/pmwds.env` written with mode `0600`, owner `root`, containing a freshly generated
   88-character `Jwt__Secret`.
6. systemd unit `pmwds.dharmaatribe.app` running as `www-data` on `127.0.0.1:5001`, with
   `ProtectSystem=full` and `ReadWritePaths=/var/lib/pmwds-sqlite`.
   *(Historical: a single unit served both hosts. Superseded by the two-variant layout in §3;
   that unit is now `pmwds-sqlite`.)*
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

### Deployment prerequisite: the seed password

The seeded accounts no longer have a password in source. `SeedConstants` used to hardcode
`Pmwds@123`, which meant a committed credential was live on any deployment that never set
one. It now reads `Seed__DefaultPassword`, and **seeding fails with a message naming the key
if it is absent** rather than creating accounts with a published default.

Both server-side env files must therefore gain this line before the next deploy, or the API
will refuse to start:

```
# /etc/pmwds/pmwds-sqlite.env and /etc/pmwds/pmwds-mssql.env
Seed__DefaultPassword=<a strong password>
```

`deploy.ps1` does not write these files - it reads the ones already on the server - so this is
a manual one-time edit. Choose a different value per environment. Existing accounts are not
affected: the value is only read when a user does not yet exist, so it never resets a password
on a later boot.

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
   `/var/lib/pmwds-sqlite/database/pmwds.sqlite` and `/var/lib/pmwds-sqlite/data` are currently the only copies.
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
   to a durable directory under `/var/lib/pmwds-sqlite`.

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

### Known behaviour difference on SQL Server only - now resolved

`TaskId` has to be `NO ACTION` on SQL Server rather than `SET NULL`, because Tasks cascade
from Projects and Projects already reaches the certificate table through ProjectDocuments, so
a second cascade path makes SQL Server reject the table.

That originally meant deleting a task linked to a certificate raised a foreign-key error. It
no longer does: `TaskRepository.DeleteTaskGraphsByIdsAsync` now clears the link in the
application before the delete. Every task-deletion path funnels through that one method, so
task delete, subtask delete and milestone delete are all covered.

Both providers now behave identically - verified by creating a certificate against a task,
deleting the task, and confirming on SQL Server and on a fresh SQLite database that the
certificate survives with a null `TaskId` instead of being deleted or blocking the delete.

`MilestoneId` keeps `SET NULL` on both providers; that FK is not a second cascade path
because Milestones does not cascade from Projects.

### First request after start is slow on SQL Server (warm is fine)

`GET /api/v1/pages` issues a few hundred queries. Measured on SQL Server 2022 Express,
fresh process:

| Call | Time |
|---|---|
| 1st | 138s |
| 2nd | 120s |
| 3rd | 64s |
| 4th (after a later restart-free warm-up) | 1.9s |
| steady state | 0.41-0.53s |

Two warm-up curves overlap: EF Core compiles each distinct LINQ query on first use, and
SQL Server compiles a plan per distinct batch. Once both are warm the endpoint is on par
with every other endpoint (`/tasks` 0.34s, `/projects` 0.28s, `/workspace/bootstrap` 0.23s)
and SQLite is 1.17s for the same call.

This matters after each deploy or service restart: the first user to load the app waits up
to about two and a half minutes. It is a cold-start cost, not a steady-state regression -
`/pages` was never fast on a cold SQL Server. If that is unacceptable, the fix is the
monotonic version-counter cache described in
`docs/realtime-sync-and-data-durability.md`, which restores caching without the stale-data
bug that the 30s TTL caused. Do not reinstate the TTL.

Payload is ~326 KB, which is also worth addressing separately.
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