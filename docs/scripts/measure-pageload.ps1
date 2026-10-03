<#
.SYNOPSIS
  Measures PMWDS authenticated page-load latency against SQL Server.

.DESCRIPTION
  Replicates a client page load: authenticates, then issues the list/workspace
  reads a page fires on mount. Reports sequential per-call timings and the
  parallel burst wall time, so a SQL Server RESOURCE_SEMAPHORE stall shows up as
  a multi-second burst rather than being hidden by averages.

.PARAMETER BaseUrl        API root.
.PARAMETER Email          Login email.
.PARAMETER Password       Login password.
.PARAMETER Rounds         Number of measured bursts.
.PARAMETER ColdCache      Issue DBCC DROPCLEANBUFFERS + FREEPROCCACHE before each burst.
#>
[CmdletBinding()]
param(
    [string]$BaseUrl = 'http://localhost:5177',
    [string]$Email = 'superadmin@org1.com',
    [string]$Password = 'Pmwds@123',
    [int]$Rounds = 3,
    [switch]$ColdCache
)

$ErrorActionPreference = 'Stop'

# The reads a single page load fires in parallel on mount.
$PageLoadCalls = @(
    '/api/v1/projects?page=1&pageSize=20'
    '/api/v1/workspace/bootstrap'
    '/api/v1/users?page=1&pageSize=500'
    '/api/v1/departments?page=1&pageSize=100'
    '/api/v1/organizations?page=1&pageSize=100'
    '/api/v1/tasks?page=1&pageSize=50'
)

function Get-Token {
    $body = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $res = Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/login" -Method Post `
        -Body $body -ContentType 'application/json' -TimeoutSec 120
    $sw.Stop()
    # The login contract is flat on main and enveloped under data on some builds.
    $token = $res.token
    if (-not $token -and $res.data) { $token = $res.data.token }
    if (-not $token) { throw "Login response carried no token. Keys: $($res.PSObject.Properties.Name -join ', ')" }
    [pscustomobject]@{ Seconds = [math]::Round($sw.Elapsed.TotalSeconds, 2); Token = $token }
}

function Invoke-Timed {
    param([string]$Path, [string]$Token)
    $sw = [Diagnostics.Stopwatch]::StartNew()
    try {
        $null = Invoke-RestMethod -Uri "$BaseUrl$Path" -Headers @{ Authorization = "Bearer $Token" } -TimeoutSec 120
        $code = 200
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if (-not $code) { $code = 'ERR' }
    }
    $sw.Stop()
    [pscustomobject]@{ Path = $Path; Seconds = [math]::Round($sw.Elapsed.TotalSeconds, 2); Status = $code }
}

function Invoke-Burst {
    param([string[]]$Paths, [string]$Token)
    # Runspace pool keeps wall time honest; Start-Job process spawn fakes seconds.
    $pool = [runspacefactory]::CreateRunspacePool(1, $Paths.Count)
    $pool.Open()
    $jobs = foreach ($p in $Paths) {
        $ps = [powershell]::Create()
        $ps.RunspacePool = $pool
        $null = $ps.AddScript({
            param($u, $t)
            $sw = [Diagnostics.Stopwatch]::StartNew()
            try {
                $null = Invoke-RestMethod -Uri $u -Headers @{ Authorization = "Bearer $t" } -TimeoutSec 120
                $c = 200
            } catch {
                $c = $_.Exception.Response.StatusCode.value__
                if (-not $c) { $c = 'ERR' }
            }
            $sw.Stop()
            [pscustomobject]@{ Path = $u; Seconds = [math]::Round($sw.Elapsed.TotalSeconds, 2); Status = $c }
        }).AddArgument("$BaseUrl$p").AddArgument($Token)
        [pscustomobject]@{ Handle = $ps.BeginInvoke(); Path = $p; PS = $ps }
    }
    $sw = [Diagnostics.Stopwatch]::StartNew()
    foreach ($j in $jobs) { $null = $j.PS.EndInvoke($j.Handle) }
    $sw.Stop()
    $results = $jobs | ForEach-Object { $_.PS.EndInvoke($_.Handle) }
    $jobs | ForEach-Object { $_.PS.Dispose() }
    $pool.Close()
    [pscustomobject]@{ Wall = [math]::Round($sw.Elapsed.TotalSeconds, 2); Results = $results }
}

Write-Host "=== PMWDS page-load measurement ===" -ForegroundColor Cyan
Write-Host "target : $BaseUrl"
Write-Host "user   : $Email"
Write-Host "cold   : $ColdCache"
Write-Host ''

$auth = Get-Token
Write-Host ("login: {0}s" -f $auth.Seconds) -ForegroundColor Yellow
$token = $auth.Token

# Warm the token-validation and scope caches so login is not counted per call.
$null = Invoke-Timed -Path '/api/v1/departments?page=1&pageSize=100' -Token $token | Out-Null

for ($r = 1; $r -le $Rounds; $r++) {
    if ($ColdCache) {
        Write-Host "  [round $r] dropping buffer pool + plan cache" -ForegroundColor DarkGray
        $sqlcmd = "$env:ProgramFiles\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\sqlcmd.exe"
        if (-not (Test-Path $sqlcmd)) { $sqlcmd = 'sqlcmd' }
        & $sqlcmd -S tcp:127.0.0.1,1433 -U sa -P 'PMWDS_Str0ng!Pass' -C `
            -Q 'DBCC DROPCLEANBUFFERS; DBCC FREEPROCCACHE;' -b 2>&1 | Out-Null
    }

    Write-Host "--- round $r : sequential ---" -ForegroundColor Cyan
    $seq = foreach ($p in $PageLoadCalls) { Invoke-Timed -Path $p -Token $token }
    $seq | Format-Table -AutoSize | Out-String -Width 200 | Write-Host
    $seqMax = ($seq | Measure-Object -Property Seconds -Maximum).Maximum
    Write-Host ("  slowest sequential: {0}s" -f $seqMax) -ForegroundColor Yellow

    Write-Host "--- round $r : parallel burst (wall clock) ---" -ForegroundColor Cyan
    $burst = Invoke-Burst -Paths $PageLoadCalls -Token $token
    $burst.Results | Format-Table -AutoSize | Out-String -Width 200 | Write-Host
    Write-Host ("  BURST WALL: {0}s" -f $burst.Wall) -ForegroundColor $(if ($burst.Wall -gt 10) { 'Red' } elseif ($burst.Wall -gt 2) { 'Yellow' } else { 'Green' })
    Write-Host ''
}