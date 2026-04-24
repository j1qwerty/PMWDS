# PMWDS Configuration Guide

This document covers all configuration files and settings required by the PMWDS project.

---

## Configuration Files Overview

| File | Purpose |
|------|---------|
| `PMWDS.API/appsettings.json` | Primary configuration (database, JWT, email, AI, etc.) |
| `PMWDS.API/appsettings.Development.json` | Development environment overrides |
| `PMWDS.API/appsettings.Development.Sqlite.json` | SQLite fallback configuration |
| `PMWDS.API/Properties/launchSettings.json` | Launch URLs and environment |

---

## 1. Database Configuration

### Primary: SQL Server
File: `PMWDS.API/appsettings.json`

```json
"ConnectionStrings": {
  "Default": "Server=.;Database=PMWDS;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True",
  "Redis": "localhost:6379",
  "Hangfire": "Server=.;Database=PMWDS_Hangfire;Trusted_Connection=True;TrustServerCertificate=True"
}
```

### Fallback: SQLite
File: `PMWDS.API/appsettings.Development.Sqlite.json`

```json
{
  "Database": {
    "EnableSqliteFallback": true,
    "ForceSqlite": false,
    "SqliteConnectionString": "Data Source=App_Data/pmwds-dev.sqlite"
  }
}
```

**Behavior:**
- SQL Server is used by default if available
- Falls back to SQLite if SQL Server is unreachable and `EnableSqliteFallback` is true
- Forces SQLite if `ForceSqlite` is true

---

## 2. JWT Authentication

File: `PMWDS.API/appsettings.json`

```json
"Jwt": {
  "Secret": "PMWDS_SuperSecretKey_2025_ChangeInProduction!",
  "Issuer": "PMWDS",
  "Audience": "PMWDS_Users",
  "ExpiryMinutes": 480
}
```

**Required Change:** Replace `Secret` with a strong random value in production.

---

## 3. Email Configuration

File: `PMWDS.API/appsettings.json`

```json
"Email": {
  "Host": "smtp.gmail.com",
  "Port": 587,
  "Username": "noreply@pmwds.com",
  "Password": "your-smtp-password",
  "SenderEmail": "noreply@pmwds.com",
  "SenderName": "PMWDS System",
  "UseSsl": true
}
```

**Required Change:** Replace `Password` with your actual SMTP password or app-specific password for Gmail.

---

## 4. Azure Storage

File: `PMWDS.API/appsettings.json`

```json
"AzureStorage": {
  "ConnectionString": "UseDevelopmentStorage=true",
  "ContainerName": "pmwds-files"
}
```

`UseDevelopmentStorage=true` uses Azure Emulator. Replace with actual storage connection string for production.

---

## 5. AI Services Configuration

File: `PMWDS.API/appsettings.json`

### OpenAI
```json
"OpenAI": {
  "Enabled": true,
  "BaseUrl": "https://api.openai.com/v1",
  "ApiKey": "your-openai-api-key",
  "DefaultModel": "gpt-4o",
  "ModelsPath": "/models"
}
```

### OpenRouter
```json
"OpenRouter": {
  "Enabled": false,
  "BaseUrl": "https://openrouter.ai/api/v1",
  "ApiKey": "sk-or-v1-...",
  "DefaultModel": "openai/gpt-oss-120b:free"
}
```

### OpenCode
```json
"OpenCode": {
  "Enabled": false,
  "BaseUrl": "https://opencode.ai/zen/v1",
  "ApiKey": "your-opencode-zen-api-key",
  "DefaultModel": "bigpickle"
}
```

### Local ML Model
```json
"MLModelPath": "Models/delay-prediction.zip",
"UseLocalModel": false,
"RiskThreshold": 0.7,
"TrainingCronHour": 2
```

**Required Change:** Replace `ApiKey` values with actual API keys for enabled providers.

---

## 6. Hangfire

File: `PMWDS.API/appsettings.json`

```json
"Hangfire": {
  "DashboardPath": "/hangfire"
}
```

**Note:** Automatically disabled when SQLite fallback is active.

---

## 7. CORS / Allowed Origins

File: `PMWDS.API/appsettings.json`

```json
"AllowedOrigins": [
  "http://localhost:3000",
  "http://localhost:4200",
  "http://localhost:5177",
  "http://localhost:5173",
  "https://pmwds.yourdomain.com"
]
```

---

## 8. Logging (Serilog)

File: `PMWDS.API/appsettings.json`

```json
"Serilog": {
  "MinimumLevel": {
    "Default": "Information",
    "Override": {
      "Microsoft.AspNetCore": "Information",
      "Microsoft.EntityFrameworkCore": "Warning",
      "System": "Warning"
    }
  }
}
```

---

## 9. Launch Settings

File: `PMWDS.API/Properties/launchSettings.json`

```json
{
  "profiles": {
    "http": {
      "commandName": "Project",
      "applicationUrl": "http://localhost:5177",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  }
}
```

---

## 10. Seq (Logging Server)

```json
"Seq": {
  "ServerUrl": "http://localhost:5341"
}
```

---

## Quick Reference: Required Changes for Production

| Setting | File | Action |
|---------|------|--------|
| JWT Secret | `appsettings.json` | Replace with strong random key |
| SMTP Password | `appsettings.json` | Set actual password |
| OpenAI ApiKey | `appsettings.json` | Set API key |
| Allowed Origins | `appsettings.json` | Restrict to production domains |
| Connection Strings | `appsettings.json` | Use production database |