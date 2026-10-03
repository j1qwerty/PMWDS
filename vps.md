# VPS state — Contabo `147.93.155.185` (survey 2026-10-03)

Host: `vmi3609364`, Ubuntu 24.04.5 LTS, kernel `6.8.0-139-generic`, uptime 7d+.
CPU 4 vCPU, RAM 7.8 GiB (~659 Mi used), disk 96G (`/` 4% used).
Access: `ssh contabo` (root, key `E:\contabo\contabo`). See `README.md`.

## Runtimes (actual)

- nginx `1.24.0`, certbot `2.9.0` (timer active, auto-renew)
- .NET runtime `10.0.12` (AspNetCore + NETCore), **no SDK installed**
- python `3.12.3`, **no `node`, no `gunicorn`, no `pm2`**
- ufw active: `OpenSSH` + `Nginx Full` only. App ports loopback-only.
- listeners: `0.0.0.0:22,80,443`, `127.0.0.1:5001` (dotnet), `127.0.0.53:53` (resolved)

## Sites (3 vhosts, 2 content roots)

| URL | nginx file | root | backend | cert |
|---|---|---|---|---|
| `https://dharmaatribe.com` (+www) | `sites-enabled/dharmaatribe.com` | `/var/www/dharmaatribe.com/html` (27M static SPA) | none, `try_files ... /index.html` | `dharmaatribe.com` (ECDSA, exp 2026-12-24): `dharmaatribe.com, dharmaatribe.app, www.*` |
| parked `dharmaatribe.in, dharmatribe.in, dharmaatribe.app (+www)` | same file, 2nd `server` | — | `301 → https://dharmaatribe.com$request_uri` | covered by same cert |
| `https://pmwds.dharmaatribe.app` | `sites-enabled/pmwds.dharmaatribe.app` | `/var/www/pmwds.dharmaatribe.app/html` (1.8M: `index.html, assets/, favicon.svg, icons.svg`) | `proxy_pass 127.0.0.1:5001` for `/api/ /hubs/ /files/ /avatars/`; SPA `try_files` for `/` | `pmwds.dharmaatribe.app` (ECDSA, exp 2026-12-31) |
| `http://147.93.155.185/` (bare IP) | `sites-enabled/pmwds-ip` (`default_server` port 80, `server_name _`) | same `pmwds` html dir (one build serves both) | same `127.0.0.1:5001` proxy set | none — HTTP only (no cert possible for IP; creds/JWT in cleartext) |

Local copies: `E:\contabo\dharmaatribe.com.nginx.conf`, `pmwds.dharmaatribe.app.nginx.conf`, `pmwds-ip.nginx.conf`.
Note: `sites-available/default` still exists on disk but is **not** enabled (no `default` symlink in `sites-enabled`).

## PMWDS app (dotnet, port 5001)

- systemd: `pmwds.dharmaatribe.app.service` (enabled, active since 2026-10-02 14:31 CEST, ~171M RSS)
  - `User=www-data`, `WorkingDirectory=/var/www/pmwds.dharmaatribe.app/app`
  - `ExecStart=/usr/bin/dotnet .../PMWDS.API.dll` (binds `127.0.0.1:5001` only)
  - `EnvironmentFile=/etc/pmwds/pmwds.env`, `ReadWritePaths=/var/lib/pmwds`, hardening `NoNewPrivileges, PrivateTmp, ProtectSystem=full, ProtectHome`
- deploy tree: `/var/www/pmwds.dharmaatribe.app/app` (202M, `PMWDS.API.dll` + ~40 deps: EF Core SqlServer/Sqlite, Hangfire, MediatR, MailKit, Azure SDKs, ClosedXML)
- same-origin design: SPA built with relative `/api/v1` base, so both subdomain and bare-IP origins work without CORS.
- nginx proxy notes: `client_max_body_size 50M`; `/api/` 300s timeouts; `/hubs/` websocket upgrade + 3600s timeouts; `/assets/` immutable 1y, `index.html` `no-store`.
- logs: `/var/log/nginx/pmwds.dharmaatribe.app.*.log`, `pmwds-ip.*.log`, app → `journalctl -u pmwds.dharmaatribe.app`.

## Certs / firewall / logs

- `certbot certificates`: 2 certs (above). `dharmaatribe.com` cert does **not** cover `.in` names — redirects for `.in` will warn until expanded.
- ufw numbered: `[1] OpenSSH, [2] Nginx Full (+v6)`.
- nginx logs in `/var/log/nginx/`: per-site `access/error.log` + rotation; `pmwds-ip.error.log` showed entries 2026-10-03 06:57.

## Quick verify

```powershell
ssh contabo "nginx -t; systemctl reload nginx"
ssh contabo "systemctl status pmwds.dharmaatribe.app --no-pager; ss -tlnp"
ssh contabo "curl -s -I http://dharmaatribe.com/ | head -5; curl -s -I https://pmwds.dharmaatribe.app/ | head -5; curl -s -o /dev/null -w '%{http_code}\n' http://147.93.155.185/"
ssh contabo "certbot certificates"
```
