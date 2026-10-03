<#
.SYNOPSIS
    Builds and deploys PMWDS to the Contabo VPS.

.DESCRIPTION
    Interactive deploy. Choose to ship the API, the web client, or both.
    Packages with tar (never Compress-Archive - see PRODUCTION.md 2.1), uploads
    over scp, extracts on the server, fixes ownership, restarts the service and
    verifies the result against both public hosts.

.PARAMETER Target
    api | web | both. Prompted for when omitted.

.PARAMETER SkipConfirm
    Deploy without the interactive y/N confirmation.

.PARAMETER SkipVerify
    Deploy without the post-deploy verification pass.

.PARAMETER Host_
    SSH host alias. Defaults to "contabo".

.EXAMPLE
    .\deploy.ps1
    .\deploy.ps1 -Target both
    .\deploy.ps1 -Target web -SkipConfirm
#>
[CmdletBinding()]
param(
    [ValidateSet('api', 'web', 'both')]
    [string] $Target,

    [switch] $SkipConfirm,
    [switch] $SkipVerify,
    [string] $Host_ = 'contabo'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# ── Paths ───────────────────────────────────────────────────────────────
$RepoRoot    = $PSScriptRoot
$PublishDir  = Join-Path $RepoRoot 'pmwds-pub'
$DistDir     = Join-Path $RepoRoot 'Client\dist'
$ApiArchive  = Join-Path $RepoRoot 'pmwds-api.tar.gz'
$WebArchive  = Join-Path $RepoRoot 'pmwds-web.tar.gz'

$RemoteApp   = '/var/www/pmwds.dharmaatribe.app/app'
$RemoteWeb   = '/var/www/pmwds.dharmaatribe.app/html'
$ServiceName = 'pmwds.dharmaatribe.app'
$WebUser     = 'www-data'

$PublicHosts = @(
    @{ Label = 'IP       '; Url = 'http://147.93.155.185'  ; Insecure = $false },
    @{ Label = 'subdomain'; Url = 'https://pmwds.dharmaatribe.app'; Insecure = $false }
)

# ── Output helpers ──────────────────────────────────────────────────────
$script:StepNo = 0
$script:Start  = Get-Date

function Write-Banner {
    Write-Host ''
    Write-Host '  PMWDS deploy' -ForegroundColor Cyan
    Write-Host '  ------------' -ForegroundColor DarkCyan
}

function Write-Step {
    param([string] $Text)
    $script:StepNo++
    $elapsed = ((Get-Date) - $script:Start).TotalSeconds
    $stamp = '{0,6:N1}s' -f $elapsed
    Write-Host ''
    Write-Host ("  [{0,2}] " -f $script:StepNo) -ForegroundColor DarkGray -NoNewline
    Write-Host $Text -ForegroundColor Cyan -NoNewline
    Write-Host "  ($stamp)" -ForegroundColor DarkGray
}

function Write-Running {
    param([string]$m)
    $elapsed = ((Get-Date) - $script:Start).TotalSeconds
    $stamp = '{0,6:N1}s' -f $elapsed
    Write-Host "       RUN  $m  ($stamp)" -ForegroundColor Yellow
}
function Write-Ok    { param([string]$m = 'done') Write-Host "       OK   $m" -ForegroundColor Green }
function Write-Warn2 { param([string]$m)        Write-Host "  WARN  $m" -ForegroundColor Yellow }
function Write-Err   { param([string]$m)        Write-Host "  FAIL  $m" -ForegroundColor Red }
function Write-Info  { param([string]$m)        Write-Host "       INFO $m" -ForegroundColor Gray }
function Write-Detail{ param([string]$m)        Write-Host "       $m" -ForegroundColor DarkGray }

function Fail {
    param([string] $Message, [int] $Code = 1)
    Write-Err $Message
    exit $Code
}

# Runs a command, streams output while it is running, and throws with its output on failure.
function Invoke-Checked {
    param(
        [Parameter(Mandatory)] [string]   $FilePath,
        [Parameter(Mandatory)] [string[]] $Arguments,
        [string] $What = 'command',
        [string[]] $OnSuccessPatterns = @(),
        [string] $WorkingDirectory,
        [switch] $StreamOutput,
        [string] $OutputLabel = 'output'
    )

    # Native tools routinely write progress and warnings to stderr (pnpm/vite do, for
    # the chunk-size notice). With $ErrorActionPreference = 'Stop' those become
    # terminating errors and kill an otherwise successful build, so relax it here and
    # rely on the real exit code instead.
    $lines = [System.Collections.Generic.List[string]]::new()
    $code = 0
    $previousEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'

    try {
        $run = {
            & $FilePath @Arguments 2>&1 | ForEach-Object {
                $line = $_.ToString()
                [void]$lines.Add($line)

                if ($StreamOutput -and $line.Trim()) {
                    Write-Host "       $OutputLabel $line" -ForegroundColor DarkGray
                }
            }
            $script:__InvokeCheckedExitCode = $LASTEXITCODE
        }

        if ($WorkingDirectory) {
            Push-Location $WorkingDirectory
            try {
                & $run
            } finally {
                Pop-Location
            }
        } else {
            & $run
        }

        $code = $script:__InvokeCheckedExitCode
    } finally {
        $ErrorActionPreference = $previousEap
    }

    $text = ($lines | Out-String).Trim()

    if ($code -ne 0) {
        if ($text) {
            Write-Host $text -ForegroundColor DarkRed
        }
        Fail "$What failed (exit $code)"
    }

    if ($OnSuccessPatterns.Count) {
        foreach ($p in $OnSuccessPatterns) {
            if ($text -notmatch $p) {
                if ($text) {
                    Write-Host $text -ForegroundColor DarkRed
                }
                Fail "$What did not produce expected output: $p"
            }
        }
    }

    return $text
}

function Test-CommandExists { param([string]$Name) return [bool](Get-Command $Name -ErrorAction SilentlyContinue) }

# ── Preflight ───────────────────────────────────────────────────────────
Write-Banner
Write-Step 'Preflight'
Write-Running 'checking local tools, repository state, and SSH connectivity'

foreach ($cmd in @('git', 'dotnet', 'node', 'pnpm', 'tar', 'ssh', 'scp')) {
    if (-not (Test-CommandExists $cmd)) { Fail "Required tool not on PATH: $cmd" }
}
Write-Ok 'git, dotnet, node, pnpm, tar, ssh, scp all present'

if (-not (Test-Path (Join-Path $RepoRoot 'PMWDS.slnx'))) { Fail "Run this from the repo root (PMWDS.slnx not found in $RepoRoot)" }

$branch = (Invoke-Checked git @('rev-parse','--abbrev-ref','HEAD') -What 'git branch').Trim()
$head   = (Invoke-Checked git @('rev-parse','--short','HEAD')            -What 'git rev-parse').Trim()
$dirty  = (Invoke-Checked git @('status','--porcelain')                  -What 'git status').Trim()
Write-Info "branch $branch @ $head"
if ($dirty) {
    Write-Warn2 'working tree has uncommitted changes (they WILL be deployed)'
    ($dirty -split "`n" | Select-Object -First 8) | ForEach-Object { Write-Detail "  $($_)" }
} else {
    Write-Info 'working tree clean'
}

Invoke-Checked ssh @('-o','BatchMode=yes','-o','ConnectTimeout=10',$Host_,'echo ok') `
             -What "ssh $Host_" -OnSuccessPatterns @('ok') | Out-Null
Write-Ok "ssh $Host_ reachable"

# ── Choose what to deploy ───────────────────────────────────────────────
Write-Step 'Select target'
Write-Running 'selecting API, web, or both'

if (-not $Target) {
    Write-Host ''
    Write-Host '       What should be deployed?' -ForegroundColor White
    Write-Host '         [1] both  - API + web client' -ForegroundColor Gray
    Write-Host '         [2] api   - API only (leaves the current client build in place)' -ForegroundColor Gray
    Write-Host '         [3] web   - web client only (no service restart)' -ForegroundColor Gray
    Write-Host ''
    $choice = Read-Host '       Choice [1]'
    switch ($choice.Trim()) {
        '2'     { $Target = 'api'  }
        '3'     { $Target = 'web'  }
        default { $Target = 'both' }
    }
}

$doApi = $Target -in @('api', 'both')
$doWeb = $Target -in @('web', 'both')
Write-Info "target: $Target"

# ── Build ───────────────────────────────────────────────────────────────
$apiAssets = @()
$webAssets = @()

if ($doApi) {
    Write-Step 'Build API (dotnet publish -c Release)'
    Write-Running 'dotnet publish is running. Build output will appear live below.'
    if (Test-Path $PublishDir) { Remove-Item -Recurse -Force $PublishDir }
    Invoke-Checked dotnet @('publish','PMWDS.API','-c','Release','-o',$PublishDir) `
        -What 'dotnet publish' -OnSuccessPatterns @('PMWDS.API ->') `
        -StreamOutput -OutputLabel 'build' | Out-Null
    if (-not (Test-Path (Join-Path $PublishDir 'PMWDS.API.dll'))) { Fail 'PMWDS.API.dll missing from publish output' }
    $apiAssets = @(Get-ChildItem $PublishDir -File -Recurse)
    Write-Ok ("{0} files, {1:N1} MB" -f $apiAssets.Count, (($apiAssets | Measure-Object Length -Sum).Sum / 1MB))
}

if ($doWeb) {
    Write-Step 'Build web client (pnpm build)'
    Write-Running 'pnpm build is running. Vite output will appear live below.'

    # Relative base so ONE bundle serves both the subdomain and the bare IP.
    $prevBase = $env:VITE_API_BASE_URL
    $env:VITE_API_BASE_URL = '/api/v1'
    try {
        Invoke-Checked pnpm @('build') -What 'pnpm build' `
            -WorkingDirectory (Join-Path $RepoRoot 'Client') `
            -OnSuccessPatterns @('built in') `
            -StreamOutput -OutputLabel 'build' | Out-Null
    } finally {
        $env:VITE_API_BASE_URL = $prevBase
    }

    $indexPath = Join-Path $DistDir 'index.html'
    if (-not (Test-Path $indexPath)) { Fail 'dist/index.html missing - build did not produce output' }

    # Read the real hashed filenames out of index.html. Never assume them.
    $html = Get-Content $indexPath -Raw
    $webAssets = @([regex]::Matches($html, '/assets/[^"'']+') | ForEach-Object { $_.Value } | Sort-Object -Unique)
    if (-not $webAssets.Count) { Fail 'could not find any /assets/ references in dist/index.html' }

    Write-Ok ("{0} asset(s) referenced:" -f $webAssets.Count)
    $webAssets | ForEach-Object { Write-Detail "  $_" }
}

# ── Package ─────────────────────────────────────────────────────────────
# tar, NOT Compress-Archive. Compress-Archive writes backslash path separators;
# Linux treats those as literal filename characters, producing files named
# "assets\index-HASH.js" instead of an assets directory. nginx then 404s every
# asset while `find` still appears to list them, and the site serves a blank page.
$uploads = @()

if ($doApi) {
    Write-Step 'Package API (tar)'
    Write-Running "creating $([IO.Path]::GetFileName($ApiArchive))"
    if (Test-Path $ApiArchive) { Remove-Item $ApiArchive -Force }
    Invoke-Checked tar @('-czf', $ApiArchive, '-C', $PublishDir, '.') -What 'tar api' | Out-Null
    $sz = (Get-Item $ApiArchive).Length / 1MB
    Write-Ok ("{0:N1} MB" -f $sz)
    $uploads += @{ Local = $ApiArchive; Remote = '/tmp/pmwds-api.tar.gz' }
}

if ($doWeb) {
    Write-Step 'Package web (tar)'
    Write-Running "creating $([IO.Path]::GetFileName($WebArchive))"
    if (Test-Path $WebArchive) { Remove-Item $WebArchive -Force }
    Invoke-Checked tar @('-czf', $WebArchive, '-C', $DistDir, '.') -What 'tar web' | Out-Null

    $entries = (Invoke-Checked tar @('-tzf', $WebArchive) -What 'tar list web') -split "`r?`n" | Where-Object { $_ }
    $bad = @($entries | Where-Object { $_ -match '\\' })
    if ($bad.Count) {
        $bad | ForEach-Object { Write-Host "       $_" -ForegroundColor DarkRed }
        Fail 'archive contains backslash path separators - this is the Compress-Archive bug, refusing to deploy'
    }
    Write-Ok ("{0:N2} MB, {1} entries, no backslashes" -f ((Get-Item $WebArchive).Length / 1MB), $entries.Count)
    $uploads += @{ Local = $WebArchive; Remote = '/tmp/pmwds-web.tar.gz' }
}

# ── Confirm ─────────────────────────────────────────────────────────────
Write-Step 'Confirm'
Write-Running 'waiting for deployment confirmation'

Write-Host ''
Write-Host '       About to deploy to:' -ForegroundColor White
Write-Host "         target     $Target" -ForegroundColor Gray
Write-Host "         host       $Host_" -ForegroundColor Gray
if ($doApi) { Write-Host '         service    will be restarted' -ForegroundColor Gray }
Write-Host '         database   /var/lib/pmwds (untouched)' -ForegroundColor Gray
Write-Host ''

if (-not $SkipConfirm) {
    $answer = Read-Host '       Proceed? [y/N]'
    if ($answer.Trim() -notmatch '^(y|yes)$') {
        Write-Warn2 'aborted by user'
        exit 0
    }
}
Write-Ok 'confirmed'

# ── Upload ──────────────────────────────────────────────────────────────
$script:Start = Get-Date
Write-Step 'Upload (scp)'

$totalUploadBytes = ($uploads | ForEach-Object {
    (Get-Item $_.Local).Length
} | Measure-Object -Sum).Sum
$totalUploadMb = $totalUploadBytes / 1MB
Write-Running ("{0} archive(s), {1:N1} MB total. Native scp transfer progress will stay visible below." -f `
    $uploads.Count, $totalUploadMb)

$uploadIndex = 0
foreach ($u in $uploads) {
    $uploadIndex++
    $fileName = Split-Path $u.Local -Leaf
    $fileSize = (Get-Item $u.Local).Length
    $fileMb = $fileSize / 1MB

    Write-Info ("upload {0}/{1}: {2} ({3:N1} MB) -> {4}:{5}" -f `
        $uploadIndex, $uploads.Count, $fileName, $fileMb, $Host_, $u.Remote)
    Write-Running "scp is transferring $fileName. The native scp percentage, speed, and ETA are shown live."

    $scpArgs = @(`
        '-o','BatchMode=yes',
        '-o','ConnectTimeout=10',
        $u.Local,
        "${Host_}:$($u.Remote)"
    )

    & scp @scpArgs
    $scpCode = $LASTEXITCODE
    if ($scpCode -ne 0) {
        Fail "scp $fileName failed (exit $scpCode)"
    }

    Write-Ok "$fileName -> $($u.Remote)"
}

# ── Remote deploy ───────────────────────────────────────────────────────
$script:Start = Get-Date
Write-Step 'Deploy on server'
Write-Running 'remote extraction, permissions, and service restart are running. Server output will appear live below.'

# Written to a script file rather than inlined: $ and quoting behave differently
# when a command crosses the Windows -> ssh boundary.
$remoteScript = @'
set -e
APP=/var/www/pmwds.dharmaatribe.app/app
WEB=/var/www/pmwds.dharmaatribe.app/html
TARGET="$1"

if [ -f /tmp/pmwds-api.tar.gz ]; then
  echo "extracting api"
  rm -rf /tmp/dep-api && mkdir -p /tmp/dep-api
  tar -xzf /tmp/pmwds-api.tar.gz -C /tmp/dep-api
  rm -rf "$APP"/*
  cp -a /tmp/dep-api/. "$APP"/
  chown -R www-data:www-data "$APP"
  chmod -R 755 "$APP"
  rm -rf /tmp/dep-api
  echo "api: $(ls "$APP" | wc -l) entries"
fi

if [ -f /tmp/pmwds-web.tar.gz ]; then
  echo "extracting web"
  rm -rf /tmp/dep-web && mkdir -p /tmp/dep-web
  tar -xzf /tmp/pmwds-web.tar.gz -C /tmp/dep-web
  rm -rf "$WEB"
  mkdir -p "$WEB"
  cp -a /tmp/dep-web/. "$WEB"/
  chown -R www-data:www-data "$WEB"
  chmod -R 755 "$WEB"
  rm -rf /tmp/dep-web
  echo "web: $(ls "$WEB" | wc -l) entries"
fi

rm -f /tmp/pmwds-api.tar.gz /tmp/pmwds-web.tar.gz

if [ "$TARGET" = "api" ] || [ "$TARGET" = "both" ]; then
  echo "restarting service"
  systemctl restart pmwds.dharmaatribe.app
  echo "service startup: waiting up to 50s for active state"
  for i in 1 2 3 4 5 6 7 8 9 10; do
    status=$(systemctl is-active pmwds.dharmaatribe.app 2>/dev/null || true)
    echo "service startup check $i/10: $status"
    if [ "$status" = "active" ]; then
      break
    fi
    sleep 5
  done
  echo "service: $(systemctl is-active pmwds.dharmaatribe.app 2>/dev/null || true)"
fi
'@

$tmpScript = Join-Path ([System.IO.Path]::GetTempPath()) ("pmwds-deploy-" + [guid]::NewGuid().ToString('N') + '.sh')
[System.IO.File]::WriteAllText($tmpScript, ($remoteScript -replace "`r`n", "`n"))
try {
    scp -o BatchMode=yes -o ConnectTimeout=10 $tmpScript "${Host_}:/tmp/pmwds-deploy.sh" | Out-Null

    $out = Invoke-Checked ssh @('-o','BatchMode=yes', $Host_, "bash /tmp/pmwds-deploy.sh $Target") `
        -What 'remote deploy' -StreamOutput -OutputLabel 'server'

    $out | Select-String -Pattern 'service: active' | Out-Null
    if (-not $?) { Fail 'service did not report active after restart' }
    Write-Ok 'remote deploy complete'
} finally {
    Remove-Item $tmpScript -Force -ErrorAction SilentlyContinue
    ssh -o BatchMode=yes $Host_ 'rm -f /tmp/pmwds-deploy.sh' 2>&1 | Out-Null
}

# ── Verify ──────────────────────────────────────────────────────────────
if ($SkipVerify) {
    Write-Step 'Verify'
    Write-Running 'verification was skipped by -SkipVerify'
    Write-Warn2 'skipped by -SkipVerify'
    Write-Banner; Write-Host '  Deploy finished (unverified).' -ForegroundColor Green; Write-Host ''
    exit 0
}

$script:Start = Get-Date
Write-Step 'Verify'
Write-Running 'post-deploy checks are running. Each result will appear as it completes.'

# Every referenced asset must return 200 with a real body size. GET / returning
# 200 proves nothing: index.html is static and served by try_files, so it succeeds
# even when every asset it references is missing. That is the blank-page failure.
$script:remoteCurl = @'
set -e
for url in "$@"; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$url")
  size=$(curl -s -o /dev/null -w '%{size_download}' "$url")
  echo "$code $size $url"
done
'@
$tmpCurl = Join-Path ([System.IO.Path]::GetTempPath()) ("pmwds-curl-" + [guid]::NewGuid().ToString('N') + '.sh')
[System.IO.File]::WriteAllText($tmpCurl, ($script:remoteCurl -replace "`r`n", "`n"))

$allOk = $true
try {
    scp -o BatchMode=yes $tmpCurl "${Host_}:/tmp/pmwds-curl.sh" | Out-Null

    if ($doWeb) {
        Write-Running 'checking every referenced web asset on both public hosts. Results will appear live below.'
        $urls = @()
        $labels = @{}
        foreach ($h in $PublicHosts) {
            foreach ($a in $webAssets) {
                $urls += ($h.Url + $a)
                $labels[($h.Url + $a)] = $h.Label
            }
        }
        $out = Invoke-Checked ssh @('-o','BatchMode=yes', $Host_, "bash /tmp/pmwds-curl.sh " + ($urls -join ' ')) `
            -What 'asset check' -StreamOutput -OutputLabel 'check'
        $lines = ($out -split "`r?`n") | Where-Object { $_ -match '^\d{3} \d+' }

        Write-Info 'assets referenced by dist/index.html, on every public host:'
        foreach ($line in $lines) {
            $p = $line -split ' ', 3
            $code = [int]$p[0]; $size = [long]$p[1]; $url = $p[2]
            $name = ($url -split '/')[-1]
            $label = if ($labels.ContainsKey($url)) { $labels[$url] } else { '' }
            if ($code -eq 200 -and $size -gt 1000) {
                Write-Ok ("{0} {1,-26} {2,10:N0} B" -f $label, $name, $size)
            } else {
                Write-Err ("{0} {1,-26} HTTP {2} ({3} B) - BLANK PAGE RISK" -f $label, $name, $code, $size)
                $allOk = $false
            }
        }
    }

    # Deep link proves the SPA fallback works.
    Write-Running 'checking SPA deep link /projects'
    $out = Invoke-Checked ssh @('-o','BatchMode=yes', $Host_, 'bash /tmp/pmwds-curl.sh https://pmwds.dharmaatribe.app/projects') `
        -What 'deep link' -StreamOutput -OutputLabel 'check'
    $deep = ($out -split "`r?`n") | Where-Object { $_ -match '^\d{3} \d+' } | Select-Object -First 1
    if ($deep -match '^200 ') { Write-Ok 'SPA deep link /projects -> 200' }
    else { Write-Err "SPA deep link failed: $deep"; $allOk = $false }

    # The SignalR handshake must be checked explicitly. Every other check here can pass
    # while live updates are completely broken: GET / and the SPA deep link are served
    # from static files by try_files, so they return 200 regardless of whether /hubs/ is
    # proxied. The failure mode is silent - the client just quietly falls back to the
    # 60s poll - so it has to be asserted, not assumed.
    #
    # Checked for both web and api targets, because this is a web/nginx concern and a
    # web-only deploy is exactly when it would regress unnoticed.
    foreach ($h in $PublicHosts) {
        Write-Running "checking SignalR negotiate on $($h.Url)"
        $negotiateUrl = $h.Url + '/hubs/dashboard/negotiate?negotiateVersion=1'
        $out = Invoke-Checked ssh @('-o','BatchMode=yes', $Host_,
            "curl -s -X POST -o /tmp/pmwds-neg.json -w '%{http_code}' '$negotiateUrl'; echo; head -c 300 /tmp/pmwds-neg.json; rm -f /tmp/pmwds-neg.json") `
            -What 'negotiate check' -StreamOutput -OutputLabel 'check'

        $lines = ($out -split "`r?`n") | Where-Object { $_ -match '\S' }
        $code = ($lines | Select-Object -First 1).Trim()
        $body = ($lines | Select-Object -Skip 1) -join ' '

        # A working negotiate returns 200 and a JSON body advertising the transports. An
        # nginx `try_files` fallback instead returns 200 with the SPA index.html, which is
        # why the body has to be asserted and not just the status code.
        if ($code -eq '200' -and $body -match '"connectionToken"' -and $body -match 'WebSockets') {
            Write-Ok "$($h.Label) negotiate -> 200, WebSockets advertised"
        } else {
            Write-Err "$($h.Label) negotiate -> HTTP $code"
            Write-Detail ("  body: " + $body.Trim())
            if ($code -eq '200') {
                Write-Detail '  200 with a non-negotiate body means nginx is serving the SPA'
                Write-Detail '  fallback for /hubs/. Add the location block from PRODUCTION.md 2b.'
            }
            $allOk = $false
        }
    }

    if ($doApi) {
        # grep -c exits 1 when the count is zero, which would fail the check even though
        # zero unhandled exceptions is the good outcome. Force the exit status to 0 and read
        # the printed count instead.
        Write-Running 'checking recent API journal for unhandled exceptions'
        $log = Invoke-Checked ssh @('-o','BatchMode=yes', $Host_,
            "journalctl -u $ServiceName --since '-3min' --no-pager | grep -c 'Unhandled exception'; exit 0") `
            -What 'log scan' -OnSuccessPatterns @('\d+') -StreamOutput -OutputLabel 'check'
        $logCount = ($log -split "`r?`n" | Where-Object { $_ -match '^\d+$' } | Select-Object -First 1)
        if ($logCount -eq '0') { Write-Ok 'no unhandled exceptions in the last 3 minutes' }
        else { Write-Err "$logCount unhandled exception(s) in journal"; $allOk = $false }

        Write-Running 'checking API startup log for "Now listening"'
        $listening = Invoke-Checked ssh @('-o','BatchMode=yes', $Host_,
            "journalctl -u $ServiceName --since '-3min' --no-pager | grep -c 'Now listening'; exit 0") `
            -What 'listen check' -OnSuccessPatterns @('\d+') -StreamOutput -OutputLabel 'check'
        $listenCount = ($listening -split "`r?`n" | Where-Object { $_ -match '^\d+$' } | Select-Object -First 1)
        if ([int]$listenCount -ge 1) { Write-Ok 'API reports "Now listening on: http://127.0.0.1:5001"' }
        else { Write-Err 'API did not report listening'; $allOk = $false }
    }
} finally {
    Remove-Item $tmpCurl -Force -ErrorAction SilentlyContinue
    ssh -o BatchMode=yes $Host_ 'rm -f /tmp/pmwds-curl.sh' 2>&1 | Out-Null
}

Write-Banner
if ($allOk) {
    Write-Host '  Deploy succeeded.' -ForegroundColor Green
    Write-Host ''
    Write-Host "   API      $RemoteApp" -ForegroundColor Gray
    Write-Host "   Web      $RemoteWeb" -ForegroundColor Gray
    Write-Host "   IP       http://147.93.155.185" -ForegroundColor Gray
    Write-Host "   Sub      https://pmwds.dharmaatribe.app" -ForegroundColor Gray
    Write-Host ''
    exit 0
} else {
    Write-Host '  Deploy finished WITH PROBLEMS - see FAIL lines above.' -ForegroundColor Red
    Write-Host ''
    exit 1
}