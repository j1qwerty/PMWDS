Write-Host "=== .NET-Style Connection Test ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Exact connection string from appsettings.Development.json
Write-Host "[A] SqlClient with appsettings.Development.json connection string" -ForegroundColor Yellow
$connString = "Server=localhost,1433;Database=PMWDS_Dev;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=True;MultipleActiveResultSets=true;Connection Timeout=5"
Write-Host "  String: $connString" -ForegroundColor DarkGray

try {
    # Load Microsoft.Data.SqlClient from the project's build output
    $sqlClientDll = Resolve-Path "PMWDS.API/bin/Debug/net10.0/Microsoft.Data.SqlClient.dll" -ErrorAction Stop
    Add-Type -Path $sqlClientDll

    $conn = New-Object Microsoft.Data.SqlClient.SqlConnection($connString)
    $conn.Open()
    Write-Host "  OK - Connected!" -ForegroundColor Green
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT DB_NAME() AS [DB]"
    $r = $cmd.ExecuteReader()
    while ($r.Read()) { Write-Host "  Database: $($r['DB'])" -ForegroundColor Green }
    $r.Close()
    $conn.Close()
}
catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.InnerException) {
        Write-Host "  Inner: $($_.Exception.InnerException.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 2: Simulate SqlConnectionStringBuilder behavior
Write-Host "[B] SqlConnectionStringBuilder parsing test" -ForegroundColor Yellow
try {
    $builder = New-Object Microsoft.Data.SqlClient.SqlConnectionStringBuilder($connString)
    $builder.ConnectTimeout = 3
    $rebuilt = $builder.ConnectionString
    Write-Host "  Original:  Server=localhost,1433;..." -ForegroundColor DarkGray
    Write-Host "  Rebuilt:   $rebuilt" -ForegroundColor DarkGray
    
    $conn2 = New-Object Microsoft.Data.SqlClient.SqlConnection($rebuilt)
    $conn2.Open()
    Write-Host "  OK - Rebuilt string also works!" -ForegroundColor Green
    $conn2.Close()
}
catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.InnerException) {
        Write-Host "  Inner: $($_.Exception.InnerException.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 3: Redis via StackExchange.Redis
Write-Host "[C] Redis test via StackExchange.Redis" -ForegroundColor Yellow
try {
    $redisDlls = @(
        "PMWDS.API/bin/Debug/net10.0/StackExchange.Redis.dll"
    )
    foreach ($dll in $redisDlls) {
        $p = Resolve-Path $dll -ErrorAction Stop
        Add-Type -Path $p
    }
    $redis = [StackExchange.Redis.ConnectionMultiplexer]::Connect("localhost:6379")
    $db = $redis.GetDatabase()
    $db.StringSet("pmwds_test", "hello", [TimeSpan]::FromSeconds(30))
    $val = $db.StringGet("pmwds_test")
    Write-Host "  OK - SET/GET test passed (value: $val)" -ForegroundColor Green
    $redis.Close()
}
catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.InnerException) {
        Write-Host "  Inner: $($_.Exception.InnerException.Message)" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "=== Test Complete ===" -ForegroundColor Cyan
