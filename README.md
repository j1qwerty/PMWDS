Here is a **cleaned and focused README** with all AI/OpenCode-related content removed and only **setup, credentials, issues, and essential operational details** retained:

---

# PMWDS

PMWDS is a multi-project .NET 10 solution with `PMWDS.API` as the entry application.

---

## Run The API

```powershell
dotnet build PMWDS.API\PMWDS.API.csproj
dotnet run --project PMWDS.API\PMWDS.API.csproj --launch-profile http
```

Default URL: `http://localhost:5177`

All project configuration details (database, JWT, email, AI services, etc.) are documented in [CONFIG.md](CONFIG.md).

---

## Seeded Users

| Email | EmployeeCode | Role |
|-------|-------------|------|
| admin@pmwds.com | ADMIN001 | SuperAdmin |
| manager@pmwds.com | PM001 | ProjectManager |
| head@pmwds.com | DH001 | DepartmentHead |
| lead@pmwds.com | TL001 | TeamLead |
| member@pmwds.com | TM001 | TeamMember |
| viewer@pmwds.com | VW001 | Viewer |

Password: `{EmployeeCode}@123` (e.g., `ADMIN001@123`)

---

## Summary

This setup supports:

* SQL Server (primary)
* SQLite fallback (development resilience)
* Pre-seeded users for immediate access
* Automatic database initialization
* Token-based authentication workflow

---
