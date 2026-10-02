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

function Write-Ok    { param([string]$m = 'done') Write-Host "       OK  $m" -ForegroundColor Green }
function Write-Warn2 { param([string]$m)        Write-Host "  WARN  $m" -ForegroundColor Yellow }
function Write-Err   { param([string]$m)        Write-Host "  FAIL  $m" -ForegroundColor Red }
function Write-Info  { param([string]$m)        Write-Host "       $m" -ForegroundColor Gray }
function Write-Detail{ param([string]$m)        Write-Host "       $m" -ForegroundColor DarkGray }

function Fail {
    param([string] $Message, [int] $Code = 1)
    Write-Err $Message
    exit $Code
}

# Runs a command, streaming nothing, and throws with its output on failure.
function Invoke-Checked {
    param(
        [Parameter(Mandatory)] [string]   $FilePath,
        [Parameter(Mandatory)] [string[]] $Arguments,
        [string] $What = 'command',
        [string[]] $OnSuccessPatterns = @(),
        [string] $WorkingDirectory
    )

    # Native tools routinely write progress and warnings to stderr (pnpm/vite do, for
    # the chunk-size notice). With $ErrorActionPreference = 'Stop' those become
    # terminating errors and kill an otherwise successful build, so relax it here and
    # rely on the real exit code instead.
    $text = $null
    $code = 0
    $previousEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        if ($WorkingDirectory) {
            Push-Location $WorkingDirectory
            try {
                $out = & $FilePath @Arguments 2>&1
                $code = $LASTEXITCODE
                $text = ($out | ForEach-Object { $_.ToString() } | Out-String).Trim()
            } finally {
                Pop-Location
            }
        } else {
            $out = & $FilePath @Arguments 2>&1
            $code = $LASTEXITCODE
            $text = ($out | ForEach-Object { $_.ToString() } | Out-String).Trim()
        }
    } finally {
        $ErrorActionPreference = $previousEap
    }

    if ($code -ne 0) {
        Write-Host $text -ForegroundColor DarkRed
        Fail "$What failed (exit $code)"
    }

    if ($OnSuccessPatterns.Count) {
        foreach ($p in $OnSuccessPatterns) {
            if ($text -notmatch $p) {
                Write-Host $text -ForegroundColor DarkRed
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
    if (Test-Path $PublishDir) { Remove-Item -Recurse -Force $PublishDir }
    Invoke-Checked dotnet @('publish','PMWDS.API','-c','Release','-o',$PublishDir) `
        -What 'dotnet publish' -OnSuccessPatterns @('PMWDS.API ->') | Out-Null
    if (-not (Test-Path (Join-Path $PublishDir 'PMWDS.API.dll'))) { Fail 'PMWDS.API.dll missing from publish output' }
    $apiAssets = @(Get-ChildItem $PublishDir -File -Recurse)
    Write-Ok ("{0} files, {1:N1} MB" -f $apiAssets.Count, (($apiAssets | Measure-Object Length -Sum).Sum / 1MB))
}

if ($doWeb) {
    Write-Step 'Build web client (pnpm build)'

    # Relative base so ONE bundle serves both the subdomain and the bare IP.
    $prevBase = $env:VITE_API_BASE_URL
    $env:VITE_API_BASE_URL = '/api/v1'
    try {
        Invoke-Checked pnpm @('build') -What 'pnpm build' `
            -WorkingDirectory (Join-Path $RepoRoot 'Client') `
            -OnSuccessPatterns @('built in') | Out-Null
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
    if (Test-Path $ApiArchive) { Remove-Item $ApiArchive -Force }
    Invoke-Checked tar @('-czf', $ApiArchive, '-C', $PublishDir, '.') -What 'tar api' | Out-Null
    $sz = (Get-Item $ApiArchive).Length / 1MB
    Write-Ok ("{0:N1} MB" -f $sz)
    $uploads += @{ Local = $ApiArchive; Remote = '/tmp/pmwds-api.tar.gz' }
}

if ($doWeb) {
    Write-Step 'Package web (tar)'
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

foreach ($u in $uploads) {
    Invoke-Checked scp @('-o','BatchMode=yes','-o','ConnectTimeout=10', $u.Local, "${Host_}:$($u.Remote)") `
        -What "scp $(Split-Path $u.Local -Leaf)" | Out-Null
    Write-Ok "$(Split-Path $u.Local -Leaf) -> $($u.Remote)"
}

# ── Remote deploy ───────────────────────────────────────────────────────
$script:Start = Get-Date
Write-Step 'Deploy on server'

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
  sleep 50
  echo "service: $(systemctl is-active pmwds.dharmaatribe.app)"
fi
'@

$tmpScript = Join-Path ([System.IO.Path]::GetTempPath()) ("pmwds-deploy-" + [guid]::NewGuid().ToString('N') + '.sh')
[System.IO.File]::WriteAllText($tmpScript, ($remoteScript -replace "`r`n", "`n"))
try {
    scp -o BatchMode=yes -o ConnectTimeout=10 $tmpScript "${Host_}:/tmp/pmwds-deploy.sh" | Out-Null

    $out = Invoke-Checked ssh @('-o','BatchMode=yes', $Host_, "bash /tmp/pmwds-deploy.sh $Target") -What 'remote deploy'
    ($out -split "`r?`n") | Where-Object { $_ } | ForEach-Object { Write-Detail "  $_" }

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
    Write-Warn2 'skipped by -SkipVerify'
    Write-Banner; Write-Host '  Deploy finished (unverified).' -ForegroundColor Green; Write-Host ''
    exit 0
}

$script:Start = Get-Date
Write-Step 'Verify'

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
        $urls = @()
        $labels = @{}
        foreach ($h in $PublicHosts) {
            foreach ($a in $webAssets) {
                $urls += ($h.Url + $a)
                $labels[($h.Url + $a)] = $h.Label
            }
        }
        $out = Invoke-Checked ssh @('-o','BatchMode=yes', $Host_, "bash /tmp/pmwds-curl.sh " + ($urls -join ' ')) -What 'asset check'
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
    $out = Invoke-Checked ssh @('-o','BatchMode=yes', $Host_, 'bash /tmp/pmwds-curl.sh https://pmwds.dharmaatribe.app/projects') -What 'deep link'
    $deep = ($out -split "`r?`n") | Where-Object { $_ -match '^\d{3} \d+' } | Select-Object -First 1
    if ($deep -match '^200 ') { Write-Ok 'SPA deep link /projects -> 200' }
    else { Write-Err "SPA deep link failed: $deep"; $allOk = $false }

    if ($doApi) {
        # grep -c exits 1 when the count is zero, which would fail the check even though
        # zero unhandled exceptions is the good outcome. Force the exit status to 0 and read
        # the printed count instead.
        $log = Invoke-Checked ssh @('-o','BatchMode=yes', $Host_,
            "journalctl -u $ServiceName --since '-3min' --no-pager | grep -c 'Unhandled exception'; exit 0") `
            -What 'log scan' -OnSuccessPatterns @('\d+')
        $logCount = ($log -split "`r?`n" | Where-Object { $_ -match '^\d+$' } | Select-Object -First 1)
        if ($logCount -eq '0') { Write-Ok 'no unhandled exceptions in the last 3 minutes' }
        else { Write-Err "$logCount unhandled exception(s) in journal"; $allOk = $false }

        $listening = Invoke-Checked ssh @('-o','BatchMode=yes', $Host_,
            "journalctl -u $ServiceName --since '-3min' --no-pager | grep -c 'Now listening'; exit 0") `
            -What 'listen check' -OnSuccessPatterns @('\d+')
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