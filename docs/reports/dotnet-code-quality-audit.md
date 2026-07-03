# PMWDS .NET Code Quality Audit Report

**Generated:** 2026-07-03 21:17:37 UTC  
**Auditor:** Automated Code Quality Audit  
**Solution:** PMWDS.S  
**Scope:** 6 projects, ~242 .cs files, ~26,443 SLOC  
**Target:** docs/reports/dotnet-code-quality-audit.md

---

## 1. Nullable Reference Types (NRT)

### Verdict: ⚠️ PARTIALLY ADOPTED

The solution uses **file-scoped namespaces** (C# 10+) consistently across all projects, which implies a recent language version. However, **nullable reference types are not explicitly enabled** at the project level.

#### Findings:

| Severity | File | Issue |
|----------|------|-------|
| 🔴 HIGH | PMWDS.Persistence\Migrations\*.Designer.cs, *.cs, ApplicationDbContextModelSnapshot.cs | #nullable disable — generated migration files suppress nullable warnings, which is acceptable |
| 🟡 MEDIUM | All projects | No #nullable enable at project or global level. The GlobalUsings.cs only imports PMWDS.Application.Exceptions — no global nullable directive |
| 🟡 MEDIUM | PMWDS.Domain\Entities\ProjectTask.cs:14 | public string Title { get; private set; } = string.Empty; — initializes with empty string, but domain entities inconsistently guard nulls |
| 🟡 MEDIUM | PMWDS.Domain\Entities\ApplicationUser.cs:9 | public string Email { get; private set; } = string.Empty; — no validation that email is non-null at creation |
| 🟢 INFO | Controllers | Many nullable annotations used (string?, Guid?) which is good |
| 🟢 INFO | Program.cs:60 | jwt.Secret ?? string.Empty — proper null-coalescing |
| 🟢 INFO | DatabaseConnectionService.cs | Good use of nullable checks on connection strings |

#### Recommendations:
- Add <Nullable>enable</Nullable> to all .csproj files
- Add global using System.Diagnostics.CodeAnalysis; and use [NotNull] / [MaybeNull] attributes
- Use ArgumentNullException.ThrowIfNull() (available in .NET 6+) in constructor parameters
- Consider a **Guard** helper class (currently no Guard. usage exists)

---

## 2. Exception Handling

### Verdict: ⚠️ MOSTLY GOOD WITH SOME CONCERNS

#### 2.1 Custom Exceptions

Well-structured with:
- NotFoundException — clean parameterized constructor
- ConflictException — simple message-based

Missing custom exceptions:
- ValidationException — uses System.ComponentModel.DataAnnotations.ValidationException from the framework
- ForbiddenException — not present; uses Forbid() from controller
- UnauthorizedException — uses framework UnauthorizedAccessException

#### 2.2 Bare catch (Exception ex) — 18 occurrences

| Severity | File | Line | Issue |
|----------|------|------|-------|
| 🟡 MEDIUM | Program.cs | 144 | Redis connection failure caught silently — acceptable for startup fallback |
| 🟡 MEDIUM | ChatEngine.cs | 171 | TestProviderAsync — catches all exceptions and returns failure DTO — acceptable pattern |
| 🟡 MEDIUM | FileStorageService.cs | 84,108,141 | Azure operations fall back to local storage — **acceptable** try-catch with logging and fallback |
| 🟡 MEDIUM | DeadlineCheckerJob.cs | 50,72 | Per-task exception handling — **acceptable** for background jobs |
| 🔴 HIGH | TasksController.cs | 134,659,936 | Catches Exception and returns 500 with **stack trace exposed to client** (ex.StackTrace) — **SECURITY ISSUE** |
| 🟡 MEDIUM | EscalationCheckerJob.cs | 61 | Per-task exception handling with logging — acceptable |
| 🟡 MEDIUM | ScheduledReportJob.cs | 61 | Per-manager exception handling with logging — acceptable |
| 🟡 MEDIUM | AIModelTrainingJob.cs | 34 | Single top-level try-catch — acceptable for background job |
| 🟡 MEDIUM | DatabaseConnectionService.cs | 214,241,259,277 | Silent catch with Console.WriteLine — see logging section |

#### 2.3 Empty catch { } — 0 occurrences ✅

No completely empty catch blocks were found.

#### 2.4 Exception Swallowing Risks

- **DatabaseConnectionService.cs:241** — catch { return false; } — Acceptable for connectivity probe
- **DatabaseConnectionService.cs:259** — catch { return provider.ToString(); } — Acceptable for display name fallback
- **DatabaseConnectionService.cs:277** — catch { /* recreate DB */ } — Acceptable for SQLite migration

#### 2.5 Global Exception Middleware

ExceptionMiddleware.cs — **Well-implemented:**
- Maps NotFoundException → 404
- Maps ValidationException → 400
- Maps UnauthorizedAccessException → 401
- Maps ConflictException → 409
- All others → 500 with generic message
- Logs all unhandled exceptions via ILogger
- Includes TraceId and Timestamp in response

⚠️ **Issue:** TasksController.cs has **three inline try-catch blocks** that return 500 with stack traces, effectively bypassing the global middleware.

---

## 3. Async Patterns

### Verdict: ⚠️ MOSTLY GOOD BUT SOME ISSUES

#### 3.1 Sync-over-Async — 1 occurrence 🔴

| File | Line | Pattern |
|------|------|---------|
| TasksController.cs | 581 | .Result.FirstOrDefault() — **BLOCKING CALL** in async context |

This is in StopTimer method:
`csharp
var entry = _uow.TimeEntries.FindAsync(
    e => e.TaskId == id
        && e.UserId == (_currentUser.UserId ?? "system")
        && !e.EndTime.HasValue,
    ct).Result.FirstOrDefault();
`
**Risk:** Can cause deadlock in ASP.NET context with sync context. Should use wait:
`csharp
var entries = await _uow.TimeEntries.FindAsync(...);
var entry = entries.FirstOrDefault();
`

#### 3.2 Task.FromResult — 4 occurrences

| File | Line | Notes |
|------|------|-------|
| DelayPredictionEngine.cs | 89 | Returns synchronously computed result — acceptable |
| FileStorageService.cs | 167,170 | Returns cached/known values — acceptable |
| LocalFileStorageService.cs | 87 | File.OpenRead() wrapped in Task.FromResult — ⚠️ **Stream opened on background thread, dispose risk** |

#### 3.3 Task.CompletedTask — 4 occurrences

| File | Line | Notes |
|------|------|-------|
| TaskAllocationEngine.cs | 61 | Placeholder TrainAsync — acceptable but should be ValueTask |
| DelayPredictionEngine.cs | 107 | Placeholder TrainAsync — same |
| BaseRepository.cs | 38 | UpdateAsync returns completed task after setting entity state — **questionable design**, should be async |
| Program.cs | 88 | JWT event handler — acceptable |

#### 3.4 ConfigureAwait(false) — 0 occurrences 🔴

**No usage of ConfigureAwait(false) anywhere in the solution.** For library code (PMWDS.Application, PMWDS.Infrastructure, PMWDS.Persistence, PMWDS.AI, PMWDS.Domain), this means all continuations capture the original SynchronizationContext, which can lead to:
- Deadlocks in UI/legacy environments
- Performance degradation from context switching

The PMWDS.API project (controllers/UI layer) is the only project where omitting ConfigureAwait(false) is acceptable.

#### 3.5 ValueTask — 0 occurrences

No ValueTask usage found. Methods that synchronously complete (like TrainAsync placeholders) would benefit from ValueTask.

#### 3.6 Async Method Naming Convention

**Mostly good** ✅ — Most async methods follow Async suffix convention.

**Issues:**
| File | Method | Issue |
|------|--------|-------|
| BaseApiController.cs:16 | HandleResult<T>() | Not async, but doesn't need suffix — fine |
| EnvFileLoader.cs:5 | Load() | Synchronous file I/O without async — **blocks startup thread** |
| Program.cs:31 | EnvFileLoader.Load(...) | Called synchronously during startup — acceptable mitigation |

---

## 4. Code Smells

### 4.1 Long Methods (> 50 lines)

| File | Method | Lines | Severity |
|------|--------|-------|----------|
| TasksController.cs | Assign | ~110 | 🔴 HIGH — Multi-path assignment logic, too complex |
| TasksController.cs | IsUserInProjectOrganizationAsync | ~45 | 🟡 MEDIUM — Nearing threshold, complex LINQ |
| TasksController.cs | CreateDependency | ~47 | 🟡 MEDIUM |
| TasksController.cs | DeleteSubtask | ~43 | 🟡 MEDIUM |
| TasksController.cs | Delete | ~38 | 🟡 MEDIUM |
| TasksController.cs | DeleteDependency | ~40 | 🟡 MEDIUM |
| ProjectsController.cs | GetDashboard | ~35 | 🟡 MEDIUM — Complex dashboard aggregation |
| AIController.cs | GetAISettings | ~100+ | 🔴 HIGH — Large method mixing DB queries and DTO mapping |
| AIController.cs | Chat | ~50+ | 🟡 MEDIUM |
| AIController.cs | GetProjectHealthAnalysis | ~60+ | 🟡 MEDIUM |
| ChatEngine.cs | ProcessAsync | ~50 | 🟡 MEDIUM |
| ChatEngine.cs | ResolveEnvironmentProvider | ~44 | 🟡 MEDIUM |
| ChatEngine.cs | CompleteChatAsync | ~30 | 🟢 OK |
| DatabaseConnectionService.cs | EnsureSqliteCompatibilityColumnsAsync | ~50 | 🟡 MEDIUM — Repeated SQL patterns |
| DatabaseConnectionService.cs | HasExpectedSqliteSchemaAsync | ~60 | 🟡 MEDIUM |
| DatabaseConnectionService.cs | SelectProvider | ~40 | 🟡 MEDIUM |
| DatabaseConnectionService.cs | CanConnectToSqlServer | ~30 | Has retry loop — could be extracted |
| PagesController.cs | (entire file) | 652 lines | 🔴 HIGH — Contains multiple methods, DTOs, and helper methods in one file |
| RolesController.cs | (entire file) | 404 lines | 🔴 HIGH — Too large, mixes business logic with DTOs at file bottom |

### 4.2 Large Classes

| File | Lines | Severity |
|------|-------|----------|
| TasksController.cs | 1,244 | 🔴 HIGH — Massive controller |
| PagesController.cs | 652 | 🔴 HIGH |
| AIController.cs | 459 | 🔴 HIGH |
| ProjectsController.cs | 509 | 🔴 HIGH |
| ChatEngine.cs | 621 | 🔴 HIGH — Single file contains interface, implementation, DTOs, and private records |
| DatabaseConnectionService.cs | 427 | 🟡 MEDIUM — Large static utility class |
| RolesController.cs | 404 | 🔴 HIGH |
| AuthController.cs | 345 | 🟡 MEDIUM |

### 4.3 Record DTOs Mixed with Controllers

**17 out of 21 controllers** define public record DTOs at the bottom of the controller file. This violates the Single Responsibility Principle and makes DTOs harder to find/reuse.

**Recommendation:** Move request/response DTOs to PMWDS.Application\DTOs.

### 4.4 Magic Strings / Hardcoded Values

| File | Value | Severity |
|------|-------|----------|
| ChatEngine.cs:196-198 | System prompt text hardcoded | 🟡 MEDIUM |
| ChatEngine.cs:83-89 | Provider defaults like "OpenAI", "OpenRouter" | 🟢 INFO |
| AIService.cs:9-10 | "TaskAllocation", "DelayPrediction" constants | ✅ Good |
| PermissionCodes.cs | All permission constants | ✅ Excellent |
| DatabaseConnectionService.cs:293-312 | Hardcoded table name list | 🟡 MEDIUM |
| ppsettings.json:12 | "PMWDS_SuperSecretKey_2025_ChangeInProduction!" | 🔴 HIGH — Secret in config file |
| ChatEngine.cs:47-49 | Hardcoded URL https://openrouter.ai/api/v1 | 🟡 MEDIUM |
| DelayPredictionEngine.cs:86 | Magic number 14 (expected delay days) | 🟡 MEDIUM |
| DelayPredictionEngine.cs | Risk thresholds  .8, 0.6, 0.4 repeated | 🟡 MEDIUM |
| TaskAllocationEngine.cs:68-77 | Weights  .30, 0.25, 0.25, 0.20 | 🟡 MEDIUM |

### 4.5 Duplicated Code

| Pattern | Files | Severity |
|---------|-------|----------|
| HttpContext.Items["ActivityLog"] setup | TasksController.cs (15+ locations), ProjectsController.cs (multiple), etc. | 🟡 MEDIUM — Extensive duplication of activity log creation pattern |
| SMTP connection logic | EmailService.cs:25-35 and EmailService.cs:56-66 | 🟡 MEDIUM — Duplicated between SendEmailAsync and SendEmailWithAttachmentAsync |
| Milestone recalculation | TasksController.cs:1057-1084 and scattered inline | 🟡 MEDIUM |
| Permission module lists | RolesController.cs and PagesController.cs — duplicated VisiblePermissionModules and ManagePermissionCoverage | 🔴 HIGH |
| catch (Exception ex) with logging pattern | All 4 Hangfire jobs | 🟢 INFO — Acceptable pattern |

---

## 5. Naming Conventions

### Verdict: ✅ CONSISTENT

| Convention | Status | Notes |
|------------|--------|-------|
| PascalCase for methods | ✅ Consistent | GetById, CreateAsync etc. |
| PascalCase for properties | ✅ Consistent | FirstName, ProjectId |
| camelCase for parameters | ✅ Consistent | 	askId, userId |
| _camelCase for private fields | ✅ Consistent | _uow, _logger, _db |
| _camelCase for static readonly | ✅ Consistent | _connections, _defaultExpiry |
| Async suffix Async | ⚠️ Mostly | Missing on EnvFileLoader.Load(), BaseApiController.HandleResult() (non-async) |
| Interface prefix I | ✅ Consistent | IUnitOfWork, INotificationService |
| File-scoped namespaces | ✅ Consistent | Used in all files |
| Primary constructors | ❌ Not used | No primary constructor usage anywhere |

---

## 6. Disposable Resources

### Verdict: ⚠️ MOSTLY GOOD WITH GAPS

#### 6.1 SmtpClient — ✅ Properly disposed
`csharp
using var client = new SmtpClient();  // EmailService.cs
`

#### 6.2 File Streams — ✅ Mostly disposed
- LocalFileStorageService.cs:45,70 — wait using var fileStream
- FileStorageService.cs:182 — wait using var fileStream
- LocalFileStorageService.cs:87 — File.OpenRead(localPath) returned as Stream — **caller must dispose** ⚠️
- FileStorageService.cs:123 — File.OpenRead(localPath) returned — **caller must dispose** ⚠️

#### 6.3 HttpClient — ✅ Managed via IHttpClientFactory
`csharp
builder.Services.AddHttpClient<IChatEngine, OpenAICompatibleChatEngine>();  // Program.cs:115
`

#### 6.4 SqlConnection — ✅ Explicit using in DatabaseConnectionService.cs:206
`csharp
using var conn = new SqlConnection(masterBuilder.ConnectionString);
`

#### 6.5 Redis ConnectionMultiplexer — ❌ Disposed immediately
`csharp
using var redis = StackExchange.Redis.ConnectionMultiplexer.Connect(redisConnectionString);  // Program.cs:134
`
The connection is disposed immediately after checking connectivity. This is fine for the probe purpose.

#### 6.6 ApplicationDbContext — ❌ NEVER DISPOSED EXPLICITLY
UnitOfWork.cs does implement IDisposable (line 121-125), disposing _transaction and _context. However:
- The DbContext lifetime is managed by DI — should be fine
- UnitOfWork is registered as Scoped — DI container will dispose

#### 6.7 HttpRequestMessage — ✅ Disposed via using
`csharp
using var request = new HttpRequestMessage(method, url);  // ChatEngine.cs:318
`

---

## 7. Thread Safety

### Verdict: 🔴 SEVERAL CONCERNS

#### 7.1 SignalR Hub — Static Dictionary without Synchronization 🔴

`csharp
// NotificationHub.cs
private static readonly Dictionary<string, string> _connections = new();
`
This static dictionary is accessed/mutated from OnConnectedAsync and OnDisconnectedAsync, which can be called concurrently from multiple SignalR connections. **Not thread-safe.**

**Fix:** Use ConcurrentDictionary<string, string> or add locking.

#### 7.2 ChatEngine — Static Dictionary Sessions 🔴

`csharp
// ChatEngine.cs
private static readonly Dictionary<string, List<ChatMessagePayload>> Sessions = new();
`
Accessed from ProcessAsync() which can be called concurrently. **Not thread-safe.** The comment says "production: use Redis" but the current implementation has a thread-safety bug.

**Fix:** Use ConcurrentDictionary<string, List<ChatMessagePayload>> or inject IDistributedCache.

#### 7.3 RoleScopeService — Cached Snapshot 🟡

`csharp
// RoleScopeService.cs
private ScopeSnapshot? _scopeSnapshot;
`
Cached per-request (scoped service) — acceptable thread safety.

#### 7.4 MLContext and PredictionEngine 🟡

`csharp
// DelayPredictionEngine.cs
private PredictionEngine<TaskDelayInput, TaskDelayPrediction>? _predEngine;
`
PredictionEngine is not thread-safe. The MLDelayPredictionEngine is registered as Scoped (from Program.cs:114) — acceptable.

#### 7.5 Thread.Sleep 🔴

`csharp
// DatabaseConnectionService.cs:178
Thread.Sleep(3000);
`
Blocks the thread during startup retry. While acceptable during startup, it's a code smell. Consider wait Task.Delay() if made async.

---

## 8. Logging

### Verdict: ⚠️ GOOD USE OF SERILOG, BUT Console.WriteLine PERSISTS

#### 8.1 Structured Logging with Serilog ✅
- Program.cs:34-38 — Proper Serilog setup with ReadFrom.Configuration, Enrich.FromLogContext
- Program.cs:217 — pp.UseSerilogRequestLogging() — HTTP request logging
- All Hangfire jobs use ILogger<T> with structured log templates ✅
- ExceptionMiddleware.cs:26 — Structured logging with {Message}

#### 8.2 Console.WriteLine / Console.Write — 7 occurrences ⚠️

| File | Line | Context |
|------|------|---------|
| Program.cs | 137, 141, 146 | Redis connection status — startup only, acceptable |
| DatabaseConnectionService.cs | 61, 64, 96, 177, 212, 216 | Provider selection and DB creation — startup only, but should use ILogger |
| TestConnections\Program.cs | 4, 7, 35, 44, 55, 74 | Console app — acceptable |

#### 8.3 Sensitive Data in Logs 🟡
- EmailService.cs passes Password (SMTP credentials) without sanitization — stored in _settings.Password
- Logging edisConnectionString in Program.cs:137,141,146 could leak connection strings containing credentials

#### 8.4 Log Levels
Good variety: LogInformation, LogWarning, LogError, LogDebug used appropriately.

---

## 9. Configuration

### Verdict: ✅ GOOD USE OF IOptions PATTERN

#### 9.1 Strongly-Typed Settings
All settings use IOptions<T> pattern:
- JwtSettings ✅
- EmailSettings ✅
- AzureStorageSettings ✅
- AISettings ✅
- HangfireSettings ✅
- DatabaseSettings ✅
- LocalFileStorageSettings ✅

#### 9.2 Environment Configuration
- ppsettings.json — base config ✅
- ppsettings.Development.json ✅
- ppsettings.Development.Sqlite.json — SQLite-specific ✅
- .env file loading via EnvFileLoader ✅

#### 9.3 Configuration Issues

| Severity | Issue |
|----------|-------|
| 🔴 HIGH | ppsettings.json:12 — JWT Secret "PMWDS_SuperSecretKey_2025_ChangeInProduction!" is a **placeholder** but stored in repo |
| 🔴 HIGH | ppsettings.json:47 — OpenRouter API key "sk-or-v1-bab2da..." is **committed to source control** |
| 🔴 HIGH | ppsettings.json:71 — Comments indicate production URL but no actual production settings file separation |
| 🟡 MEDIUM | AllowedOrigins contains multiple dev URLs — fine for dev but should be env-specific |
| 🟡 MEDIUM | Seq server URL http://localhost:5341 — referenced in config but not connected in Program.cs |

---

## 10. Testing & Testability

### Verdict: ⚠️ TESTABLE BUT NOT TESTED

#### 10.1 Interface Usage ✅
Excellent use of interfaces throughout:
- All services have interfaces (IEmailService, INotificationService, IAIService, etc.)
- Repository pattern with IRepository<T> — mockable
- Unit of Work pattern with IUnitOfWork — mockable
- DI throughout all layers

#### 10.2 Seams for Testing ✅
- All domain entities are POCOs with behavior — testable
- Commands/queries use MediatR — individually testable
- IOptions<T> pattern allows injecting test settings

#### 10.3 Issues

| Severity | Issue |
|----------|-------|
| 🔴 HIGH | **No unit test project exists** in the solution |
| 🔴 HIGH | **No [ExcludeFromCodeCoverage] or [GeneratedCode] attributes** anywhere |
| 🟡 MEDIUM | Static method calls (UserRoleResolver.Resolve, PasswordHelper.HashPassword) are hard to mock |
| 🟡 MEDIUM | RoleScopeService has no interface — tightly coupled to controller |
| 🟡 MEDIUM | DatabaseConnectionService is a static class — hard to unit test |
| 🟡 MEDIUM | EnvFileLoader.Load() is static and accesses file system — not testable |
| 🟡 MEDIUM | Controller DTOs defined as public record in controller files — not reusable in tests |
| 🟡 MEDIUM | Hangfire jobs have interfaces (good) but some instantiate dependencies directly |

#### 10.4 Testability Score by Project

| Project | Testability | Notes |
|---------|-------------|-------|
| PMWDS.Domain | ✅ HIGH | Pure POCOs with behavior, no infrastructure dependencies |
| PMWDS.Application | ✅ HIGH | Interfaces, DTOs, MediatR commands/queries — fully mockable |
| PMWDS.API | ⚠️ MEDIUM | Controllers depend on concrete services, static helpers |
| PMWDS.Infrastructure | ⚠️ MEDIUM | Depends on external services (SMTP, Azure, Redis) |
| PMWDS.Persistence | ⚠️ MEDIUM | EF Core — testable with InMemory provider |
| PMWDS.AI | ⚠️ MEDIUM | ML.NET models hard to unit test without data |

---

## 11. Summary of Critical Issues

### 🔴 Critical (Must Fix)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | **Sync-over-async .Result** | TasksController.cs:581 | Deadlock risk in production |
| 2 | **Stack trace exposure** | TasksController.cs:136,661,938 | Security vulnerability — leaks internal implementation |
| 3 | **Static dictionaries without synchronization** | NotificationHub.cs:9, ChatEngine.cs:65 | Thread safety bugs under concurrent load |
| 4 | **API key committed to repo** | ppsettings.json:47 | Security breach — rotate immediately |
| 5 | **No unit tests** | Entire solution | No regression safety net |
| 6 | **No ConfigureAwait(false) in library code** | All library projects | Potential deadlocks in non-ASP.NET contexts |

### 🟡 High Priority

| # | Issue | Location |
|---|-------|----------|
| 1 | Duplicated permission module lists | RolesController.cs + PagesController.cs |
| 2 | Massive controller files (1,244 lines) | TasksController.cs |
| 3 | Record DTOs mixed in controller files | All controllers |
| 4 | Magic numbers for risk thresholds / weights | DelayPredictionEngine.cs, TaskAllocationEngine.cs |
| 5 | SMTP connection logic duplicated | EmailService.cs |
| 6 | Activity log creation duplicated 15+ times | TasksController.cs and others |
| 7 | Console.WriteLine instead of ILogger | DatabaseConnectionService.cs, Program.cs |
| 8 | No Nullable enabled | All .csproj files |

### 🟢 Informational / Low

| # | Issue | Location |
|---|-------|----------|
| 1 | No primary constructor usage | All files |
| 2 | ValueTask could optimize Task.CompletedTask returns | Several library files |
| 3 | Task.FromResult wrapping synchronous I/O | LocalFileStorageService.cs:87 |
| 4 | JWT placeholder secret in config | ppsettings.json |
| 5 | Thread.Sleep at startup | DatabaseConnectionService.cs:178 |

---

## 12. Recommendations by Priority

### Immediate (Week 1)
1. Replace .Result with wait in TasksController.cs:581
2. Remove stack trace exposure from TasksController.cs (lines 136, 661, 938)
3. Replace static Dictionary with ConcurrentDictionary in NotificationHub.cs and ChatEngine.cs
4. Rotate committed API keys immediately
5. Add ConfigureAwait(false) to all wait calls in library projects

### Short-term (Month 1)
6. Split TasksController.cs into focused partial classes or separate controllers
7. Move all DTO records out of controllers into PMWDS.Application\DTOs
8. Enable <Nullable>enable</Nullable> in all .csproj files
9. Create a unit test project with at least domain entity and MediatR handler tests
10. Extract SMTP connection logic into a shared private method in EmailService
11. Create a shared Guard / validation helper class

### Medium-term (Quarter 1)
12. Extract permission module lists into a shared constants file
13. Create an IActivityLogBuilder to eliminate duplicated activity log creation code
14. Replace Console.WriteLine with ILogger<T> throughout
15. Add [ExcludeFromCodeCoverage] to generated migration files
16. Convert static helper classes (DatabaseConnectionService, EnvFileLoader) to injectable services

---

## 13. Statistics Summary

| Metric | Value |
|--------|-------|
| Total .cs files | ~242 |
| Total SLOC | ~26,443 |
| Projects | 6 |
| Controllers | 21 |
| Domain entities | 43 |
| Interfaces | ~15 |
| Custom exceptions | 2 |
| Background jobs | 4 |
| SignalR hubs | 2 |
| Middleware components | 3 |
| Maintainability | ⚠️ Moderate (large controllers drag score) |
| Test coverage | ❌ 0% (no test project) |
| Nullable enablement | ❌ Not enabled |
| ConfigureAwait(false) usage | ❌ 0% |
| Primary constructors | ❌ Not used |
| File-scoped namespaces | ✅ 100% consistent |

---

*Report generated by automated code audit. For questions, contact the development team.*
