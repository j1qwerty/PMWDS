param(
    [string]$SqlServer = "localhost,1433",
    [string]$SaPassword = "YourStrong!Passw0rd",
    [string]$RedisHost = "localhost",
    [int]$RedisPort = 6379
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PMWDS Connection Diagnostics" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ─── 1. Docker container status ───
Write-Host "[1] Docker container status" -ForegroundColor Yellow
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"
Write-Host ""

# ─── 2. Basic port reachability (TCP) ───
Write-Host "[2] TCP port tests" -ForegroundColor Yellow
$sqlPort = $SqlServer -replace '.*,'
$sqlHost = $SqlServer -replace ',.*'

Write-Host "  Testing $sqlHost`:$sqlPort ... " -NoNewline
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect($sqlHost, [int]$sqlPort)
    Write-Host "OK" -ForegroundColor Green
    $tcp.Close()
} catch {
    Write-Host "FAILED ($($_.Exception.Message))" -ForegroundColor Red
}

Write-Host "  Testing $RedisHost`:$RedisPort ... " -NoNewline
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect($RedisHost, $RedisPort)
    Write-Host "OK" -ForegroundColor Green
    $tcp.Close()
} catch {
    Write-Host "FAILED ($($_.Exception.Message))" -ForegroundColor Red
}
Write-Host ""

# ─── 3. DNS resolution ───
Write-Host "[3] DNS resolution" -ForegroundColor Yellow
foreach ($hostname in @($sqlHost, $RedisHost, "localhost", "host.docker.internal")) {
    try {
        $ips = [System.Net.Dns]::GetHostAddresses($hostname)
        Write-Host "  $hostname -> $($ips.IPAddressToString -join ', ')" -ForegroundColor Green
    } catch {
        Write-Host "  $hostname -> UNRESOLVABLE ($($_.Exception.Message))" -ForegroundColor Red
    }
}
Write-Host ""

# ─── 4. SQL Server login test (sqlcmd) ───
Write-Host "[4] SQL Server login test (sqlcmd)" -ForegroundColor Yellow
$sqlcmd = "C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE"
if (Test-Path $sqlcmd) {
    $result = & $sqlcmd -S $SqlServer -U sa -P $SaPassword -C -Q "SELECT @@VERSION AS [Version], GETDATE() AS [Now]" -t 10 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  SQL Server version:" -ForegroundColor Green
        $result | ForEach-Object { Write-Host "    $_" }
    } else {
        Write-Host "  FAILED:" -ForegroundColor Red
        $result | ForEach-Object { Write-Host "    $_" }
    }
} else {
    Write-Host "  sqlcmd not found at $sqlcmd" -ForegroundColor Red
}
Write-Host ""

# ─── 5. Redis ping ───
Write-Host "[5] Redis ping test" -ForegroundColor Yellow
try {
    Add-Type -AssemblyName System.Runtime.Extensions
    $config = New-Object StackExchange.Redis.ConfigurationOptions
    $config.EndPoints.Add("$RedisHost`:$RedisPort")
    $config.ConnectTimeout = 5000
    $redis = [StackExchange.Redis.ConnectionMultiplexer]::Connect($config)
    $db = $redis.GetDatabase()
    $pong = $db.Ping()
    Write-Host "  PING response: $($pong.TotalMilliseconds)ms" -ForegroundColor Green
    $redis.Close()
} catch {
    Write-Host "  FAILED ($($_.Exception.Message))" -ForegroundColor Red

    # Fallback: try .NET Built-in approach
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.Connect($RedisHost, $RedisPort)
        $stream = $client.GetStream()
        $writer = New-Object System.IO.StreamWriter($stream)
        $writer.WriteLine("*1`r`n`$4`r`nPING")
        $writer.Flush()
        $reader = New-Object System.IO.StreamReader($stream)
        $response = $reader.ReadLine()
        if ($response -match "\+PONG") {
            Write-Host "  Raw PING PONG response: $response" -ForegroundColor Green
        } else {
            Write-Host "  Raw PING response: $response" -ForegroundColor DarkYellow
        }
        $client.Close()
    } catch {
        Write-Host "  Raw TCP test also FAILED ($($_.Exception.Message))" -ForegroundColor Red
    }
}
Write-Host ""

# ─── 6. Test connection string from appsettings.Development.json ───
Write-Host "[6] .NET SqlClient test (same as app startup)" -ForegroundColor Yellow
try {
    Add-Type -Path "C:\Program Files\dotnet\shared\Microsoft.Data.SqlClient\*" -ErrorAction SilentlyContinue
    $connString = "Server=$SqlServer;Database=PMWDS_Dev;User Id=sa;Password=$SaPassword;TrustServerCertificate=True;Connection Timeout=5"
    Write-Host "  Connection string: $connString" -ForegroundColor DarkGray
    $conn = New-Object Microsoft.Data.SqlClient.SqlConnection($connString)
    $conn.Open()
    Write-Host "  Connection opened successfully!" -ForegroundColor Green
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT DB_NAME() AS [Database], USER_NAME() AS [User]"
    $reader = $cmd.ExecuteReader()
    while ($reader.Read()) {
        Write-Host "  Database: $($reader['Database']), User: $($reader['User'])" -ForegroundColor Green
    }
    $reader.Close()
    $conn.Close()
} catch {
    Write-Host "  FAILED ($($_.Exception.Message))" -ForegroundColor Red
}
Write-Host ""

# ─── Summary ───
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Diagnostics Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
