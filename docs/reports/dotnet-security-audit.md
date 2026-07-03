# PMWDS .NET Security Audit Report

**Project:** PMWDS (Project Management & Workforce Delivery System)  
**Audit Date:** July 3, 2026  
**Auditor:** .NET Security Auditor (AI-Assisted)  
**Target Framework:** .NET 10.0  
**Architecture:** Clean Architecture (API, Application, Domain, Infrastructure, Persistence, AI)

---

## Executive Summary

This report presents the findings of a comprehensive security audit of the PMWDS solution. The application implements a Clean Architecture pattern with JWT-based authentication, custom permission-based authorization, SignalR real-time communication, Hangfire background jobs, and AI integration features.

**Overall Risk Rating: MEDIUM-HIGH**

While the codebase demonstrates good security consciousness in several areas (base controller with mandatory [Authorize], EF Core usage preventing SQL injection, permission scoping), there are **critical vulnerabilities** in secrets management, error handling, rate limiting, and JWT token management that require immediate attention before production deployment.

---

## 1. Authentication

### 1.1 JWT Configuration

| Finding | Severity | Description |
|---------|----------|-------------|
| **Weak JWT Secret** | HIGH | The JWT signing key "PMWDS_SuperSecretKey_2025_ChangeInProduction!" is only ~44 characters of ASCII (352 bits). While this exceeds the 256-bit minimum for HMAC-SHA256, it is a hardcoded, easily guessable string found in both ppsettings.json and .env.example. The comment "ChangeInProduction" is a dangerous pattern — if forgotten, an attacker can forge arbitrary JWTs. |
| **Long Token Expiry** | MEDIUM | ExpiryMinutes: 480 (8 hours). This excessive window means a stolen token remains valid for an entire working day. Industry best practice is 15-60 minutes. |
| **No Refresh Token Rotation** | MEDIUM | The RefreshToken endpoint (AuthController.cs:231-253) simply generates a new JWT from the existing valid JWT. There is no refresh token rotation or revocation mechanism. If a JWT is stolen, it can be used indefinitely (within the 8-hour window) to generate fresh tokens. |
| **No Token Revocation** | HIGH | There is no mechanism to invalidate JWTs upon logout, password change, or deactivation. The ChangePassword endpoint does not invalidate existing sessions. A user who changes their password can still be impersonated via an already-issued JWT. |

**Evidence:**
- ppsettings.json:12-16: "Secret": "PMWDS_SuperSecretKey_2025_ChangeInProduction!"
- Program.cs:58-77: JWT validation setup  
- AuthController.cs:280-310: JWT generation with 8-hour expiry  
- AuthController.cs:231-253: Refresh token without rotation

### 1.2 Token Transmission

| Finding | Severity | Description |
|---------|----------|-------------|
| **Token in Query String (SignalR)** | MEDIUM | Program.cs:80-90 accepts the JWT via the ccess_token query parameter for WebSocket/SignalR connections. Query strings are commonly logged by web servers, proxies, and load balancers, potentially leaking the token into log files. |

### 1.3 Password Policy

| Finding | Severity | Description |
|---------|----------|-------------|
| **Weak Password Policy** | HIGH | Password minimum length is only **6 characters** (AuthController.cs:97, 209). There are NO requirements for complexity (uppercase, lowercase, digit, special character). Combined with no rate limiting, this enables brute-force and dictionary attacks. |
| **Legacy Password Hash** | MEDIUM | AuthController.cs:272-274 shows a legacy SHA256-based password hash (SHA256.HashData(password + userId)) as fallback. This is a fast, non-iterated hash with no salt separation. |

**Evidence:**
- AuthController.cs:97: eq.Password.Length < 6  
- AuthController.cs:323-324: SHA256.HashData(Encoding.UTF8.GetBytes(password.Trim() + userId))

### 1.4 Authentication Endpoint Protection

| Finding | Severity | Description |
|---------|----------|-------------|
| **No Rate Limiting on Login** | CRITICAL | The /api/v1/auth/login endpoint has NO rate limiting, account lockout, or progressive delay. Attackers can brute-force credentials without restriction. |
| **No Rate Limiting on ForgotPassword** | MEDIUM | /api/v1/auth/forgot-password rate-limiting absent. Enables email enumeration attacks (response message says "If the email exists..." but timing differences may still leak information). |
| **No Rate Limiting on Signup** | MEDIUM | /api/v1/auth/signup allows unlimited account creation requests, enabling account bombing. |

---

## 2. Authorization

### 2.1 Permission-Based Authorization

| Finding | Severity | Description |
|---------|----------|-------------|
| **Stale Permissions in JWT Claims** | MEDIUM | The GenerateToken method embeds permission codes as JWT claims (AuthController.cs:295). The PermissionAuthorizationHandler.cs:30-34 checks these claims FIRST. If a user's permissions change after login, the stale claims in the JWT are still accepted. Only after the 8-hour expiry will fresh permissions be loaded. |
| **Efficient but Problematic DB Fallback** | INFO | The handler does query the DB (PermissionAuthorizationHandler.cs:36-40) for permissions not found in claims, but the cached claims take priority. |
| **SystemAdmin Bypass Pattern** | LOW | Every policy in PermissionPolicyRegistry.cs includes PermissionCodes.SystemAdmin as a valid permission. While intentional, this means any policy check must verify SystemAdmin has appropriate access level. |
| **Broadcast Permission Gap** | MEDIUM | NotificationHub.SendBroadcast (line 66-75) allows ANY authenticated user to send broadcast messages to ALL connected clients. No role/permission check is performed. |

**Evidence:**
- AuthController.cs:295: claims.AddRange(permissions.Select(p => new Claim(PermissionCodes.PermissionClaimType, p)));
- PermissionAuthorizationHandler.cs:30-34: Claim-based check before DB query
- NotificationHub.cs:66-75: SendBroadcast with no authorization

### 2.2 Role Hierarchy

| Finding | Severity | Description |
|---------|----------|-------------|
| **Permission Level Escalation Risk** | MEDIUM | RolesController.cs:97-113 — when creating roles, non-SuperAdmin users are prevented from creating roles with PermissionLevel >= userMaxLevel. However, the PermissionLevel field is user-supplied in the request body (eq.PermissionLevel). If validation is bypassed or there's an off-by-one error, users could escalate privileges. |
| **Inconsistent Scope Checks** | LOW | Some endpoints check scoping via RoleScopeService while others rely solely on policy attributes. For example, DepartmentsController.GetAll uses scoped query, while DepartmentsController.Create relies on [Authorize(Policy = "Manager")] plus manual checks. This inconsistency could lead to gaps. |

---

## 3. Data Exposure

### 3.1 PII in API Responses

| Finding | Severity | Description |
|---------|----------|-------------|
| **Excessive Login Response Data** | MEDIUM | The login endpoint returns FullName, Email, ProfilePictureUrl, Roles, and Permissions alongside the token. While useful for the client, it exposes PII in the response body. |
| **User Profile PII Exposure** | HIGH | ProfilesController.cs:71-80 returns DateOfBirth, Address, EmergencyContact, and LinkedInUrl for any user that is within scope. This sensitive PII likely exceeds what most users need to see. |
| **Activity Log Metadata Leakage** | MEDIUM | Activity logs store metadata as JSON with potentially sensitive details (e.g., ["newUserEmail"], ["assigneeNames"]). These are exposed via ActivityLogsController and PagesController. |
| **Organization Tax ID Exposure** | MEDIUM | OrganizationResponse includes TaxId — this is sensitive business information that should be restricted to specific roles. |

**Evidence:**
- AuthController.cs:80-90: Login response with user data  
- ProfilesController.cs:71-80: Profile response with PII  
- OrganizationsController.cs:259-269: OrganizationResponse includes TaxId

### 3.2 Over-Fetching in DTOs

| Finding | Severity | Description |
|---------|----------|-------------|
| **PagesController Data Aggregation** | MEDIUM | PagesController.cs:73-211 loads ALL entities (organizations, departments, projects, users, roles, permissions, activity logs, etc.) in a single request. This monolithic endpoint is an over-fetching risk and a potential data exposure surface. |

---

## 4. Input Validation

### 4.1 FluentValidation Usage

| Finding | Severity | Description |
|---------|----------|-------------|
| **Inconsistent Validation** | MEDIUM | FluentValidation.AspNetCore is registered in the project but controllers (especially AuthController) use ad-hoc manual validation (if (string.IsNullOrWhiteSpace(...))) rather than FluentValidation validators. This leads to inconsistent error messages and potential gaps. |
| **Missing Validation on Request Models** | MEDIUM | Several request DTOs (e.g., UpsertWebhookRequest, CreateIntegrationRequest) have no validation attributes or FluentValidation validators. These accept untrusted input for fields like CallbackUrl, Secret, Configuration, and Headers. |

### 4.2 SQL Injection

| Finding | Severity | Description |
|---------|----------|-------------|
| **EF Core Mitigation** | OK | The codebase consistently uses Entity Framework Core with LINQ queries. No raw SQL or FromSqlRaw calls were found in the controllers or services reviewed. This provides good protection against SQL injection. |

### 4.3 XSS

| Finding | Severity | Description |
|---------|----------|-------------|
| **HTML Encoding in Email** | OK | AuthController.cs:333-335 properly uses WebUtility.HtmlEncode() for user content in HTML emails. |
| **Unvalidated Content in Responses** | MEDIUM | Several endpoints return user-supplied content (comments, descriptions, titles) directly in API responses without sanitization. If consumed by a browser-based client without proper encoding, this could lead to XSS. |

### 4.4 File Upload Validation

| Finding | Severity | Description |
|---------|----------|-------------|
| **Profile Picture Validation** | OK | UsersController.cs:385-389 validates content type (JPEG, PNG, WebP) and file size (max 1.5MB). |
| **Document Upload Missing Validation** | MEDIUM | ProjectsController.cs:303-346 and TasksController.cs:483-524 accept file uploads without validating content type or file signature. An attacker could upload malicious files (e.g., .exe renamed to .pdf). |
| **Path Traversal Risk** | LOW | LocalFileStorageService.cs:90-104 resolves file paths using relative paths stored in the database. While sanitization exists (SanitizeFolderName, SanitizeFileName), the ResolvePath method does not validate that the resolved path stays within the intended base directory. |

---

## 5. CORS Configuration

| Finding | Severity | Description |
|---------|----------|-------------|
| **Specific Origins — OK** | OK | CORS is configured with explicit allowed origins from AllowedOrigins config section (Program.cs:178-183): localhost:3000, localhost:4200, localhost:5177, localhost:5173, pmwds.yourdomain.com. This is correct. |
| **AllowCredentials with Specific Origins — OK** | OK | AllowCredentials() is used with WithOrigins() (not AllowAnyOrigin()), which is the correct pattern. |
| **Overly Permissive Methods/Headers** | LOW | AllowAnyMethod() and AllowAnyHeader() are used. While not a security vulnerability per se, restricting to necessary HTTP methods and headers is defense-in-depth best practice. |

**Evidence:**
- Program.cs:178-183:
`csharp
p.WithOrigins(...)
 .AllowAnyMethod()
 .AllowAnyHeader()
 .AllowCredentials()
`

---

## 6. Secrets Management

### 6.1 Hardcoded Secrets

| Finding | Severity | Description |
|---------|----------|-------------|
| **OpenRouter API Key in Source** | CRITICAL | A real OpenRouter API key is hardcoded in ppsettings.json:47: "ApiKey": "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". This key is also present in .env.example:34. Anyone with access to the repository can use this key at your expense. |
| **SMTP Credentials in .env.example** | HIGH | .env.example:42-43 contains real-looking Mailtrap credentials: Username=dcb164eb0bb1ac, Password=32fe7cf27e823f. These may be test credentials, but they should never be committed. |
| **SQL Server SA Password in Development Config** | HIGH | ppsettings.Development.json:3 contains "Password=YourStrong!Passw0rd" for the SQL Server SA account. If this matches production credentials, it's a critical exposure. |
| **JWT Secret in Multiple Files** | HIGH | The same JWT secret appears in ppsettings.json, .env.example, and is loaded via EnvFileLoader. |

**Evidence:**
- ppsettings.json:47: "ApiKey": "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"
- .env.example:34: AI__OpenRouter__ApiKey=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
- .env.example:42-43: Email credentials
- ppsettings.Development.json:3: SA password

### 6.2 .env File Loading

| Finding | Severity | Description |
|---------|----------|-------------|
| **.env Loaded in All Environments** | MEDIUM | Program.cs:31 calls EnvFileLoader.Load() unconditionally (not just in Development). If a .env file is present in production (e.g., from a deployment artifact), its values override production configuration. |

---

## 7. CSRF / SSRF

### 7.1 CSRF

| Finding | Severity | Description |
|---------|----------|-------------|
| **No Anti-Forgery Tokens (API)** | OK | As a JWT-based API, CSRF protection via anti-forgery tokens is not applicable. The API does not use cookie authentication for state-changing operations. |
| **SignalR Token in Query String** | MEDIUM | As noted in Section 1.2, SignalR accepts tokens via query string, which can leak via Referer headers, potentially enabling CSRF-like attacks on WebSocket upgrade requests. |

### 7.2 SSRF

| Finding | Severity | Description |
|---------|----------|-------------|
| **SSRF via AI Provider URLs** | HIGH | ChatEngine.cs:340-375 resolves AI provider configurations from user-setable database values (AIProviderCredentials) and appsettings. The BaseUrl and ModelsPath are combined to construct URLs for HTTP requests. A compromised SuperAdmin account or a database injection could redirect AI requests to internal endpoints (e.g., http://169.254.169.254/, http://localhost:1433/). |
| **No URL Validation for AI Providers** | HIGH | There is no validation that AI provider URLs point to legitimate external services. The CombineUrl method (ChatEngine.cs:536-537) simply concatenates strings. |
| **Webhook Callback URL Validation Missing** | MEDIUM | WebhooksController.cs:52 accepts a CallbackUrl parameter without validation. If the webhook delivery system makes HTTP requests to this URL, it could be used for SSRF. |

**Evidence:**
- ChatEngine.cs:311-337: SendAsync makes HTTP requests to user-configured URLs  
- ChatEngine.cs:536-537: CombineUrl concatenates base URL and path  
- AIController.cs:64-141: SaveAISettings accepts provider configuration including BaseUrl  
- WebhooksController.cs:52: Create accepts CallbackUrl

### 7.3 Open Redirect

| Finding | Severity | Description |
|---------|----------|-------------|
| **Reset Password URL** | LOW | AuthController.cs:158 constructs a password reset URL from _email.ClientBaseUrl. If this configuration value is controllable, it could be used for open redirect. Currently it's statically configured. |
| **Notification ActionUrl** | LOW | ActionUrl in notifications could potentially be used for open redirect if an attacker can control the URL. |

---

## 8. Dependency Vulnerabilities

| Finding | Severity | Description |
|---------|----------|-------------|
| **Target Framework: .NET 10.0** | MEDIUM | The project targets .NET 10.0, which is a preview/RC framework at the time of this audit. Preview frameworks may have undiscovered security vulnerabilities. Consider targeting a stable LTS release for production. |
| **Package Vulnerability Scan Recommended** | INFO | Run dotnet list package --vulnerable to identify any packages with known CVEs. Key packages to monitor: |
| | | - Microsoft.AspNetCore.Authentication.JwtBearer v10.0.7 |
| | | - Hangfire.AspNetCore v1.8.23 |
| | | - FluentValidation.AspNetCore v11.3.1 |
| | | - Swashbuckle.AspNetCore v10.1.7 |
| | | - Microsoft.IdentityModel.Tokens v8.17.0 |
| | | - System.IdentityModel.Tokens.Jwt v8.17.0 |
| | | - StackExchange.Redis v2.12.14 |

---

## 9. Rate Limiting / Brute Force Protection

| Finding | Severity | Description |
|---------|----------|-------------|
| **No Rate Limiting Anywhere** | CRITICAL | The application implements NO rate limiting or throttling on ANY endpoint. This includes: |
| | | - POST /api/v1/auth/login — brute force password attacks |
| | | - POST /api/v1/auth/signup — account creation bombing |
| | | - POST /api/v1/auth/forgot-password — email enumeration |
| | | - POST /api/v1/auth/reset-password — reset token brute force |
| | | - All CRUD endpoints — API abuse and DoS |
| **No Account Lockout** | HIGH | Failed login attempts do not trigger account lockout, progressive delays, or CAPTCHA challenges. |

---

## 10. Error Handling & Information Disclosure

### 10.1 Exception Middleware

| Finding | Severity | Description |
|---------|----------|-------------|
| **Safe Generic Exception Handling** | OK | ExceptionMiddleware.cs:57-61 returns a generic "An unexpected error occurred." message for unhandled exceptions. |
| **Custom Exception Message Leakage** | MEDIUM | ExceptionMiddleware.cs:37-55 returns the exception message for NotFoundException, ValidationException, UnauthorizedAccessException, and ConflictException. These messages may contain sensitive internal details. |
| **Stack Trace in Response Body** | CRITICAL | TasksController.cs:136-138, 659-662, 937-939 catches generic Exception and returns ex.Message and ex.StackTrace in the response body to the client. This WILL leak sensitive implementation details in production. |

**Evidence:**
- TasksController.cs:135-138:
`csharp
catch (Exception ex)
{
    return StatusCode(500, new { message = "Failed to load task", error = ex.Message, stackTrace = ex.StackTrace });
}
`
- Same pattern at lines 659-662 (subtasks) and 937-939 (dependencies)

### 10.2 Developer Exception Page

| Finding | Severity | Description |
|---------|----------|-------------|
| **No Developer Exception Page in Production** | OK | Program.cs:190-194 correctly gates Swagger/Scalar behind env.IsDevelopment() check. However, there is no pp.UseDeveloperExceptionPage() call, which is correct for production safety. |

---

## 11. Additional Findings

### 11.1 SignalR Security

| Finding | Severity | Description |
|---------|----------|-------------|
| **Unauthorized Broadcast** | HIGH | NotificationHub.SendBroadcast (line 66-75) allows ANY authenticated user to broadcast messages to ALL connected clients. This should require a specific permission/role. |
| **Thread-Safe Connection Dictionary** | MEDIUM | NotificationHub._connections is a static Dictionary<string, string> without synchronization. Concurrent access from multiple hub instances can cause race conditions and data corruption. |
| **Group-Based Access Control** | OK | Both hubs properly add users to role-based and department-based groups on connection. |

### 11.2 Hangfire Dashboard

| Finding | Severity | Description |
|---------|----------|-------------|
| **Hangfire Dashboard Authorization** | OK | HangfireAuthorizationFilter.cs restricts Hangfire dashboard access to authenticated SuperAdmin users only. |
| **Hangfire Dashboard Path** | LOW | The dashboard path /hangfire is the default and is not obscured. While authorized, it advertises the use of Hangfire to potential attackers. |

**Evidence:**
- Filters/HangfireAuthorizationFilter.cs:7-14
- Program.cs:223-227: Hangfire dashboard registration

### 11.3 Data Protection at Rest

| Finding | Severity | Description |
|---------|----------|-------------|
| **Sensitive Data Not Encrypted** | HIGH | The following sensitive fields are stored in plaintext in the database: |
| | | - AI Provider API keys (AIProviderCredential.ApiKey) |
| | | - Integration configuration JSON (Integration.ConfigurationJson) — may contain credentials |
| | | - Webhook secrets (Webhook.Secret) |
| | | - Notification template content |
| | | - Activity log metadata |
| **No Data Protection API (DPAPI) Usage** | HIGH | ASP.NET Core Data Protection is not configured. No call to uilder.Services.AddDataProtection() found in Program.cs. |

---

## Vulnerability Summary

| Severity | Count | Key Issues |
|----------|-------|------------|
| **CRITICAL** | 3 | No rate limiting on auth endpoints, Stack traces exposed in production, Hardcoded OpenRouter API key |
| **HIGH** | 9 | Weak JWT secret, No token revocation, Weak password policy (6 chars), SSRF via AI providers, PII exposure, Hardcoded SMTP/DB secrets, Unauthorized SignalR broadcast, No data encryption at rest, DPAPI not configured |
| **MEDIUM** | 12 | Long token expiry (8hrs), Stale permissions in JWT, Token in query string, ForgotPassword no rate limiting, Over-fetching via PagesController, File upload validation gaps, .env loaded in production, URL validation missing, Error message leakage, Preview framework, No refresh token rotation, Inconsistent validation |
| **LOW** | 3 | Overly permissive CORS headers, Default Hangfire dashboard path, Path traversal risk (minimal) |

---

## Recommendations

### Immediate (Critical/High)

1. **Remove hardcoded secrets** from all configuration files and .env.example. Use Azure Key Vault, environment variables, or User Secrets for development.
2. **Implement rate limiting** on all authentication endpoints using ASP.NET Core rate limiting middleware or a reverse proxy.
3. **Fix stack trace exposure** in TasksController.cs (lines 136-138, 659-662, 937-939). Remove the stackTrace and error fields from production error responses.
4. **Strengthen JWT security**: Replace the secret with a cryptographically random 256+ bit key, reduce expiry to 15-30 minutes, implement refresh token rotation, and add a token blacklist/revocation mechanism.
5. **Encrypt sensitive data at rest**: Use ASP.NET Core Data Protection (AddDataProtection()) and encrypt API keys, connection strings, and PII fields in the database.
6. **Secure SignalR broadcast**: Add permission checks to NotificationHub.SendBroadcast — restrict to users with NotificationBroadcast permission.

### Short-term (Medium)

7. **Strengthen password policy**: Require minimum 12 characters, complexity requirements, and implement account lockout after 5 failed attempts.
8. **Validate AI provider URLs**: Restrict to a whitelist of allowed domains or implement URL validation to prevent SSRF attacks.
9. **Add file upload validation**: Validate file content signatures (magic bytes) for document uploads, not just content type headers.
10. **Add anti-forgery token validation** for any cookie-based authentication scenarios, and ensure SignalR connections don't leak tokens via Referer headers.
11. **Implement permission revalidation**: Force permission re-validation from the database on sensitive operations, rather than relying on stale JWT claims.
12. **Run vulnerability scan**: Execute dotnet list package --vulnerable and update any packages with known CVEs.

### Long-term (Low)

13. **Migrate to stable .NET release**: Target a stable LTS .NET release for production.
14. **Restrict CORS headers**: Limit AllowAnyMethod() and AllowAnyHeader() to only the required values.
15. **Implement audit logging for auth events**: Log all authentication failures, password changes, and permission changes.
16. **Add security headers**: Configure X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Content-Security-Policy, etc.

---

## Files Reviewed

| File | Path |
|------|------|
| Main Configuration | PMWDS.API/appsettings.json, ppsettings.Development.json |
| Environment Example | .env.example |
| Program Entry Point | PMWDS.API/Program.cs |
| Auth Controller | PMWDS.API/Controllers/AuthController.cs |
| Authorization Handler | PMWDS.API/Auth/PermissionAuthorizationHandler.cs |
| Authorization Requirement | PMWDS.API/Auth/PermissionAuthorizationRequirement.cs |
| Policy Registry | PMWDS.API/Auth/PermissionPolicyRegistry.cs |
| Exception Middleware | PMWDS.API/Middleware/ExceptionMiddleware.cs |
| Request Logging Middleware | PMWDS.API/Middleware/RequestLoggingMiddleware.cs |
| All Controllers (21) | PMWDS.API/Controllers/*.cs |
| Base Controller | PMWDS.API/Controllers/BaseApiController.cs |
| SignalR Hubs | PMWDS.API/Hubs/NotificationHub.cs, DashboardHub.cs |
| Hangfire Auth Filter | PMWDS.API/Filters/HangfireAuthorizationFilter.cs |
| Service Layer | PMWDS.API/Services/CurrentUserService.cs, RoleScopeService.cs, EnvFileLoader.cs |
| AI Chat Engine | PMWDS.AI/Services/ChatEngine.cs |
| AI Service | PMWDS.AI/Services/AIService.cs |
| Local File Storage | PMWDS.Infrastructure/Services/LocalFileStorageService.cs |
| Settings Classes | PMWDS.Infrastructure/Settings/AppSettings.cs |
| Permission Codes | PMWDS.Application/Security/PermissionCodes.cs |
| Project Files | All .csproj files (6 projects) |

---

*This audit was performed on July 3, 2026. Findings are based on static code analysis and should be validated with dynamic testing. Recommendations should be prioritized based on your specific threat model and risk tolerance.*
