# PMWDS Laravel API

Laravel port of the PMWDS .NET backend. It exposes the same `api/v1` REST contract used by the React client in `../client`.

## Requirements

- PHP 8.3+
- Composer 2.x
- SQLite (default) or MySQL 8+

## Quick start

```bash
cd laravel
composer install
cp .env.example .env   # or use the provided .env
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve --host=0.0.0.0 --port=5177
```

The API listens at **http://localhost:5177/api/v1** (same default as the .NET API).

## React client

In `../client`, point Vite at the Laravel API:

```env
VITE_API_BASE_URL=http://localhost:5177/api/v1
```

```bash
cd ../client
npm install
npm run dev
```

## Seeded users

All seeded accounts use password **`Pmwds@123`**:

| Email | Role |
|-------|------|
| admin@pmwds.com | SuperAdmin |
| director@pmwds.com | Director |
| manager@pmwds.com | ProjectManager |
| head@pmwds.com | DepartmentHead |
| member@pmwds.com | TeamMember |
| viewer@pmwds.com | Viewer |

## Configuration

Credentials mirror `PMWDS.API/appsettings.json`:

| .env key | Purpose |
|----------|---------|
| `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_EXPIRY_MINUTES` | JWT auth (compatible with .NET tokens) |
| `MAIL_*` | SMTP / password reset emails |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | AI chat & insights |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origins |
| `CLIENT_BASE_URL` | Link base for password reset emails |

### MySQL

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=pmwds
DB_USERNAME=pmwds
DB_PASSWORD=change-me
```

Then run `php artisan migrate:fresh --seed`.

## File uploads

Uploads use `move(public_path(...))` — no storage symlinks:

- Profile pictures → `public/avatars/`
- Project documents → `public/documents/{projectCode}/`
- Task attachments → `public/attachments/{taskId}/`

Serve via `php artisan serve` or your web server document root `public/`.

## Project layout

```
app/
  Http/Controllers/Api/V1/   # API controllers (match .NET routes)
  Http/Middleware/             # JWT auth, roles, JSON
  Http/Transformers/           # Response DTOs (camelCase)
  Models/                      # Eloquent models
  Services/                    # Scope, uploads, current user
  Support/                     # JWT, password hashing (.NET compatible)
config/pmwds.php               # App-specific settings
database/migrations/           # Full PMWDS schema
database/seeders/              # Roles, users, sample project
routes/api.php                 # api/v1 route map
```

## Auth

- `POST /api/v1/auth/login` — returns `{ token, expiry, userId, fullName, email, profilePictureUrl, roles }`
- Password hashing matches .NET: `Base64(SHA256(password + userId))`
- Protected routes require header: `Authorization: Bearer <token>`

## Switching from .NET

1. Stop the .NET API on port 5177 (or change Laravel port in `php artisan serve`).
2. Set `VITE_API_BASE_URL` to the Laravel base URL.
3. No client code changes are required when routes and payloads match.

## Branch

This implementation lives on git branch **`laravel`**.
