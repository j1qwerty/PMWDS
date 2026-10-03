<#
.SYNOPSIS
  Fires the authenticated page-load reads in parallel and reports wall time.

.DESCRIPTION
  The SQL Server stall appears only when several heavy reads compete for memory
  grants at once, so this measures wall time for a concurrent burst rather than
  per-call averages. Optionally drops the buffer and plan cache first to
  reproduce the cold-start case.
#>
[CmdletBinding()]
param(
    [string]$BaseUrl = 'http://localhost:5177',
    [string]$TokenFile = 'D:\temp\opencode\token.txt',
    [int]$Rounds = 3,
    [switch]$ColdCache,
    [string[]]$Paths
)

$ErrorActionPreference = 'Stop'
$token = (Get-Content $TokenFile -Raw).Trim()

if (-not $Paths -or $Paths.Count -eq 0) {
    $Paths = @(
        '/api/v1/pages?page=1&pageSize=50'
        '/api/v1/projects?page=1&pageSize=50'
        '/api/v1/users?page=1&pageSize=500'
        '/api/v1/departments?page=1&pageSize=100'
        '/api/v1/organizations?page=1&pageSize=100'
    )
}

function Drop-Cache {
    sqlcmd -S tcp:127.0.0.1,1433 -U sa -P 'PMWDS_Str0ng!Pass' -C `
        -Q 'DBCC DROPCLEANBUFFERS; DBCC FREEPROCCACHE;' -b 2>&1 | Out-Null
}

function Invoke-Burst {
    param([string[]]$Paths, [string]$Token, [string]$Base)
    $pool = [runspacefactory]::CreateRunspacePool(1, $Paths.Count)
    $pool.Open()
    $jobs = foreach ($p in $Paths) {
        $ps = [powershell]::Create()
        $ps.RunspacePool = $pool
        $null = $ps.AddScript({
            param($u, $t)
            $sw = [Diagnostics.Stopwatch]::StartNew()
            try {
                $resp = Invoke-WebRequest -Uri $u -Headers @{ Authorization = "Bearer $t" } `
                    -UseBasicParsing -TimeoutSec 300
                $c = $resp.StatusCode; $len = $resp.Content.Length
            } catch {
                $c = $_.Exception.Response.StatusCode.value__; if (-not $c) { $c = 'ERR' }; $len = 0
            }
            $sw.Stop()
            [pscustomobject]@{ Path = $u; Seconds = [math]::Round($sw.Elapsed.TotalSeconds, 2); Status = $c; Bytes = $len }
        }).AddArgument("$Base$p").AddArgument($Token)
        [pscustomobject]@{ Handle = $ps.BeginInvoke(); Path = $p; PS = $ps }
    }
    $sw = [Diagnostics.Stopwatch]::StartNew()
    foreach ($j in $jobs) { $null = $j.PS.EndInvoke($j.Handle) }
    $sw.Stop()
    $out = $jobs | ForEach-Object { $_.PS.EndInvoke($_.Handle) }
    $jobs | ForEach-Object { $_.PS.Dispose() }
    $pool.Close()
    [pscustomobject]@{ Wall = [math]::Round($sw.Elapsed.TotalSeconds, 2); Results = $out }
}

Write-Host "=== parallel page-load burst ===" -ForegroundColor Cyan
Write-Host "cold cache : $ColdCache"
Write-Host ''

for ($r = 1; $r -le $Rounds; $r++) {
    if ($ColdCache) {
        Write-Host "[round $r] dropping buffer pool + plan cache" -ForegroundColor DarkGray
        Drop-Cache
    }
    $burst = Invoke-Burst -Paths $Paths -Token $token -Base $BaseUrl
    Write-Host "--- round $r ---" -ForegroundColor Cyan
    $burst.Results | Format-Table -AutoSize | Out-String -Width 200 | Write-Host
    $c = if ($burst.Wall -gt 10) { 'Red' } elseif ($burst.Wall -gt 2) { 'Yellow' } else { 'Green' }
    Write-Host ("  BURST WALL: {0}s over {1} calls" -f $burst.Wall, $burst.Results.Count) -ForegroundColor $c
    Write-Host ''
}