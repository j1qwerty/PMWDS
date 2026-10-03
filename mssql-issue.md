# MSSQL performance issue — 25+ second request latency

**Status:** open, root cause identified, primary fix blocked
**Severity:** high — makes the SQL Server path unusable for development and would make it unusable in production
**Affects:** any deployment using `ActiveDatabaseProvider.SqlServer`
**Does not affect:** the SQLite path, which is fast

---

## 1. The symptom

Every authenticated page load takes roughly **25–27 seconds** on SQL Server. On SQLite the
same pages are instant.

Measured through a real browser against a local API on `http://localhost:5177`:

**Login**

```
POST /api/v1/auth/login  ->  200  in 25,551 ms
```

**Page load of `/projects`** — the client fires seven requests in parallel on mount; every
one of them takes about the same:

| Call | Duration |
|---|---|
| `/projects` | 27,122 ms |
| `/workspace/bootstrap` | 27,080 ms |
| `/users?pageSize=500` | 27,032 ms |
| `/departments?page=1&pageSize=500` | 27,014 ms |
| `/projects` (second call) | 26,661 ms |
| `/organizations` | 26,449 ms |

The page shell paints in ~4.4 s (`load` event). The data arrives ~23 s later.

**Direct API calls, sequential** (not from a browser):

| Endpoint | MSSQL | SQLite |
|---|---|---|
| `/projects` | 0.35–0.77 s | 0.10–0.14 s |
| `/tasks?pageSize=50` | 0.32–0.43 s | 0.19–0.20 s |
| `/pages?page=1` | 0.57–0.71 s | 0.35–0.42 s |
| `/workspace/bootstrap` | 0.04–0.05 s | 0.02 s |
| **`/users?pageSize=500`** | **25.1–25.7 s** | 0.19 s |
| **`/workspace/bootstrap`** | **25.1–25.7 s** | 0.22 s |
| **`/organizations`** | **25.2–25.6 s** | — |

**Direct API calls, seven in parallel** (reproducing what the browser does):

```
wall clock for all 7: 33.01 s   (first measurement)
wall clock for all 7: 36.48 s   (after the Hangfire fix below)
individual calls    : 17.5 s – 35.1 s
```

---

## 2. Root cause: SQL Server memory-grant starvation

Sampling `sys.dm_exec_requests` while the app was slow showed every request suspended,
none of them having read a single page:

```
session_id | status    | wait_type           | wait_time | reads | blocking_session_id
53         | suspended | RESOURCE_SEMAPHORE  | 18515     | 0     | 0
63         | suspended | RESOURCE_SEMAPHORE  | 18647     | 0     | 0
67         | suspended | RESOURCE_SEMAPHORE  | 11664     | 0     | 0
68         | suspended | RESOURCE_SEMAPHORE  | 18485     | 0     | 0
69         | suspended | RESOURCE_SEMAPHORE  | 19470     | 0     | 0
70         | suspended | RESOURCE_SEMAPHORE  | 19988     | 0     | 0
71         | suspended | RESOURCE_SEMAPHORE  | 18580     | 0     | 0
72         | suspended | RESOURCE_SEMAPHORE  | 18432     | 0     | 0
```

`reads = 0` is the important part: the queries are not slow because they are expensive.
They never start. They queue, waiting for a memory grant that cannot be satisfied.

Wait statistics:

```
SOS_SCHEDULER_YIELD : 70 waits, total 1,204,754 ms, max_wait_time_ms = 25,015
RESOURCE_SEMAPHORE : 2,043 waits, total 4,469 ms
THREADPOOL         : 7,378 waits
```

`SOS_SCHEDULER_YIELD` with a **25-second** maximum is the scheduler admitting it cannot
give these queries the CPU time they asked for.

### Instance configuration at the time

```
edition                    = SQL Server 2022 (RTM) 16.0.1000.6, Express Edition (64-bit)
logical processors         = 8  (4 physical cores)
physical RAM               = 7.8 GB   (~1.9 GB free while measuring)
max degree of parallelism  = 0        (AUTO = up to 8 threads per query)
max server memory (MB)     = 2147483647   (uncapped — effectively 2 PB)
target server memory       = 261 MB
buffer cache hit ratio     = 11 %
memory grants pending      = 6
```

### The arithmetic that produces the stall

1. The client fires **7 requests concurrently** on every page load.
2. Each runs a heavy aggregate over `Projects` / `Users` — measured at roughly
   **2,200 logical reads per request**, each taking a large `@allowedProjectIds`
   parameter list, with the full AI-analytics projection selected.
3. `max degree of parallelism = 0` means each query may take up to **8 worker threads**.
   7 concurrent queries × 8 threads = up to **56 worker threads for 4 physical cores**.
4. All of them request memory grants from a buffer pool holding **261 MB**, which is far
   below what the estimates require.
5. The grants are never satisfied. Everything queues on `RESOURCE_SEMAPHORE` for
   ~18–20 s and then completes in bursts.

The instance then enters a **thrashing loop**. After a burst, even *sequential* requests
took 25 s for a while afterwards, then recovered, then degraded again — which is why the
same endpoint was measured at 0.10 s and 25.55 s seconds apart.

### Why SQLite is unaffected

This is not simply "SQLite is faster". SQLite has **no memory-grant system and no parallel
query execution**. Queries run single-threaded, in-process, against OS-cached pages.
Seven concurrent requests queue politely inside one process and cannot starve each other.

SQLite also **loses Hangfire entirely** — `Program.cs` registers the background server only
when the provider is `SqlServer` — so switching providers deletes a concurrent workload
rather than merely swapping the database.

---

## 3. Secondary contributors identified

### 3.1 Query cost is genuinely high (provider-independent)

Worst single query in the plan cache:

```
663 logical reads, 299 ms
SELECT [p0].[Id], [p0].[AIBudgetRiskScore], [p0].[AIDelayRiskScore], ... FROM [Projects] ...
```

Several similar `Projects` scans run per request, each with a different
`@allowedProjectIds…` list, summing to ~2,200 logical reads. The list endpoints select
the AI risk columns that only the AI screens need.

### 3.2 Every authenticated request runs an extra query

`OnTokenValidated` in the JWT configuration does a `Users` lookup on **every** call to
check `IsActive` and `AccessTokenVersion`:

```csharp
var db = ctx.HttpContext.RequestServices.GetRequiredService<ApplicationDbContext>();
var user = await db.Users.AsNoTracking()
    .Where(u => u.Id == userId)
    .Select(u => new { u.IsActive, u.AccessTokenVersion })
    .FirstOrDefaultAsync(...);
```

One extra round trip per request. Negligible over loopback, meaningful over a network,
and it competes for the same grants that are already starving.

### 3.3 Cold start is far worse than steady state

`/pages?page=1` first call measured 3.37 s after a restart. With a genuinely cold plan
cache the same call previously measured **138 seconds**. SQL Server caches plans
server-side and they survive app restarts, which is why this appears and disappears.

### 3.4 `EnableRetryOnFailure()` uses default parameters

```csharp
sql.EnableRetryOnFailure();   // DatabaseConnectionService.cs:55
```

Defaults are 6 retries with exponential backoff `0, 1, 2, 4, 8, 16` seconds — a single
transient failure can park one request for **31 seconds** inside backoff. No evidence it
was firing during these measurements, but it is an unbounded-latency landmine sitting next
to a saturated instance.

---

## 4. Fixes

### 4.1 Attempted — Hangfire worker count (applied, no effect)

`AddHangfireServer()` was called with no options, defaulting to **20 worker threads** for
four low-frequency jobs (two hourly, two daily).

**Change applied** (`Program.cs`): worker count now scales with the machine.

```csharp
var hangfireWorkerCount = builder.Configuration.GetValue("Hangfire:WorkerCount", 0);
if (hangfireWorkerCount <= 0)
{
    hangfireWorkerCount = Math.Clamp(Environment.ProcessorCount / 2, 2, 8);
}
builder.Services.AddHangfireServer(options => options.WorkerCount = hangfireWorkerCount);
```

Verified live in `HangFire.Server.Data`: `{"WorkerCount":4,...}` (was `20`).

**Result: no improvement.** Parallel burst went from 33.01 s to 36.48 s — within noise,
arguably worse. Hangfire was not the bottleneck. The change is still correct on its own
merits (20 workers for four daily jobs is waste), but it does not address this issue.

### 4.2 Attempted — `MAXDOP = 1` (BLOCKED)

Expected to be the single biggest win: stops each query claiming 8 threads.

**Failed on this instance.** Every route was tried:

| Attempt | Result |
|---|---|
| `EXEC sp_configure 'show advanced options', 1;` | reports success, value **silently stays 0** |
| `EXEC sp_configure 'max degree of parallelism', 1;` | `The configuration option 'max degree of parallelism' does not exist, or it may be an advanced option.` |
| `EXEC sp_configure 'max degree of parallelism', 1, RECURSIVE;` | `Procedure or function sp_configure has too many arguments specified.` |
| `ALTER DATABASE [PMWDS] SET MAXDOP 1;` | `Incorrect syntax near '1'.` |
| `ALTER DATABASE [PMWDS] SET MAXDOP = 1;` | `Incorrect syntax near 'MAXDOP'.` |
| `ALTER DATABASE [PMWDS] SET (MAXDOP = 1);` | `Incorrect syntax near '('.` |

Diagnosis of the blocker:

- `sys.databases` has **no `max_dop` column** at all
- `sys.configurations` lists `max degree of parallelism` but it is unreadable as an
  advanced option
- Compatibility level is **160**, so `MAXDOP` *should* be supported
- `HKLM:\SOFTWARE\Policies\Microsoft\Microsoft SQL Server` has **no group policy** entries
- The connection is `O4\os`, confirmed `IS_SRVROLEMEMBER('sysadmin') = 1`

Advanced options on this Express instance appear to be locked. The only remaining route is
the **`-m` startup parameter**, which requires registry write access this session does not
have:

```
HKLM:\SYSTEM\CurrentControlSet\Services\MSSQLSERVER\Parameters\SQLServiceStart
```

Add `-m1024` there and restart the service. **Not yet attempted — needs elevation.**

### 4.3 Attempted — cap `max server memory` (BLOCKED)

Same `sp_configure` failure as 4.2. Currently `max server memory (MB) = 2147483647`
while `target server memory` is only 261 MB — the grant logic is aiming at memory it can
never have, which is part of why grants fail. Capping to ~1024 MB would give it a realistic
target. Requires the same `-m` startup parameter and a service restart.

### 4.4 Recommended, not yet done — reduce query cost (provider-independent)

Highest-value remaining work, and it helps SQLite too:

- `/users?pageSize=500` selects the full AI projection and is the worst offender
- List endpoints should not select `AIBudgetRiskScore`, `AIDelayRiskScore` and the other
  AI columns that only the AI screens need
- Several queries build very large `IN` lists of allowed project ids, which prevents plan
  reuse and inflates grant estimates

### 4.5 Recommended, not yet done — reduce client concurrency (provider-independent)

The client fires 7 requests in parallel on every page load. Sequencing or de-duplicating
them would cut peak grant demand by ~7× and is the change that attacks the stall most
directly without needing server configuration.

### 4.6 Recommended, not yet done — remove the per-request token lookup

Cache `IsActive` / `AccessTokenVersion` for the token lifetime, or move the check to a
short-lived cache, removing one query per request.

---

## 5. What is still outstanding

- [ ] **MAXDOP = 1** — blocked, needs `-m`-style admin access
- [ ] **cap `max server memory`** — blocked, same
- [ ] **understand why advanced options are locked** on this instance
- [ ] **slim the list queries** (§4.4)
- [ ] **stop the 7 parallel requests** (§4.5)
- [ ] **remove the per-request token query** (§4.6)
- [ ] **bound `EnableRetryOnFailure`** so a transient failure fails fast instead of
      parking a request for 31 s
- [ ] **fix the failing Hangfire job** — see §6

---

## 6. Unrelated bug found while measuring: a failing Hangfire job

Four failed job states in `PMWDS_Hangfire`, each retrying 10 times:

```
Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException
"The database operation was expected to affect 1 row(s), but actually affected 0 row(s)"
Reason: "Retry attempt 1 of 10"
```

Observed at 21:17 and 22:10 on 2026-10-02 — historical, not looping during these
measurements, but it means 10× wasted work per occurrence whenever it does fire. The job
has not been identified yet; `HangFire.Job.InvocationData` was empty for the failed rows.

---

## 7. Instructions for the next person

### 7.1 Reproduce

```powershell
# MSSQL must be running and reachable. Confirm the provider in the startup banner:
#   [PMWDS] Using SQL Server database (127.0.0.1,1433).

dotnet run --project .\PMWDS.API\
```

```powershell
# Seven parallel calls, the same shape the browser produces
$base = "http://localhost:5177/api/v1"
$t = (Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" `
      -Body '{"email":"superadmin@org1.com","password":"Pmwds@123"}').data.token
$h = @{ Authorization = "Bearer $t" }
$paths = @("/projects","/workspace/bootstrap","/users?pageSize=500",
           "/departments?page=1&pageSize=500","/projects","/organizations","/users?pageSize=500")
$jobs = $paths | ForEach-Object {
  Start-Job -ScriptBlock { param($u,$hh)
    $s=[Diagnostics.Stopwatch]::StartNew()
    try { Invoke-WebRequest -Uri $u -Headers $hh -UseBasicParsing -TimeoutSec 300 | Out-Null } catch {}
    $s.Stop(); [pscustomobject]@{ ms=[math]::Round($s.Elapsed.TotalMilliseconds); url=$u }
  } -ArgumentList "$base$_", $h
}
Wait-Job $jobs -Timeout 300
Receive-Job $jobs | Sort-Object ms -Descending
$jobs | Remove-Job -Force
```

Expect 17–36 s per call. `/projects` alone may be fast (0.4 s) — it is the
`@allowedProjectIds` queries that stall.

### 7.2 Confirm the mechanism

While the requests are in flight:

```sql
SELECT session_id, status, command, wait_type, wait_time, blocking_session_id,
       cpu_time, total_elapsed_time/1000 AS elapsed_s, reads, writes
FROM sys.dm_exec_requests
WHERE session_id > 50 AND database_id = DB_ID('PMWDS');
```

Expect every row `suspended` on `RESOURCE_SEMAPHORE` with `reads = 0`.

```sql
SELECT wait_type, waiting_tasks_count, wait_time_ms, max_wait_time_ms
FROM sys.dm_os_wait_stats
WHERE wait_type IN ('RESOURCE_SEMAPHORE','SOS_SCHEDULER_YIELD','THREADPOOL','PAGEIOLATCH_SH');
```

### 7.3 Attack order

1. **Do §4.5 first** — stop the client firing 7 parallel requests. No admin rights needed,
   provider-independent, and it directly reduces peak grant demand. Re-measure.
2. **Then §4.4** — slim the list queries. Re-measure.
3. **Then the server config.** Get an elevated shell and try:
   ```
   reg add "HKLM\SYSTEM\CurrentControlSet\Services\MSSQLSERVER\Parameters\SQLServiceStart" /v SQLServiceStart /t REG_EXPAND_SZ /d "-m1024" /f
   ```
   then `Restart-Service MSSQLSERVER`, confirm `max server memory (MB)` is now 1024, and
   consider `sp_configure 'max degree of parallelism', 1` — which may become settable once
   `show advanced options` can be turned on.
4. **Measure on a real server, not a laptop.** This box is 4 cores / 7.8 GB with Vite,
   multiple dotnet processes, Defender and an IDE competing for it. Much of the severity
   is a small-machine problem, and the production VPS needs its own measurements.

### 7.4 If advanced options remain locked

The combination of `show advanced options` reverting to 0, `sys.databases` having no
`max_dop` column, and `ALTER DATABASE SET MAXDOP` being a syntax error on a
compatibility-level-160 instance is not normal. Worth checking:

- whether this instance was installed from an unusual source or a repackaged installer
- `HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQLServer`
  (note: **not** the `MSSQLServer` subkey the docs reference) for a configuration lock
- `SELECT * FROM sys.dm_server_services` for a service in a stopped state
- reinstalling SQL Server Express cleanly as a last resort

The application-level fixes in §4.4 and §4.5 do not depend on any of this and should be
done regardless.

---

## 8. Environment

| | |
|---|---|
| SQL Server | 2022 (RTM) 16.0.1000.6, **Express Edition (64-bit)** |
| Host OS | Windows 11 Home Single Language 10.0, build 26200 |
| Instance path | `D:\programs\mssql\MSSQL16.MSSQLSERVER` |
| Instance name | `MSSQLSERVER`, port 1433 |
| CPU / RAM | 4 physical cores (8 logical) / 7.8 GB |
| `sa` | disabled by default; enabled with `ALTER LOGIN sa ENABLE` |
| `LoginMode` | set to 2 (mixed), restart applied |
| Windows auth | `O4\os` is sysadmin |
| Note | `Server=localhost,1433` **times out** on this instance (`::1` unanswered). Use `127.0.0.1,1433`. |

Server-side instance configuration is not stored in this repository. It must be applied by
hand on whichever machine runs the SQL Server deployment.
