using Microsoft.Data.SqlClient;
using StackExchange.Redis;

Console.WriteLine("=== PMWDS Connection Tests ===\n");

// ─── 1. SQL Server ───
Console.WriteLine("[1] SQL Server (SqlClient)");
var sqlConnString = "Server=localhost,1433;Database=PMWDS_Dev;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=True;MultipleActiveResultSets=true";

try
{
    using var conn = new SqlConnection(sqlConnString);
    await conn.OpenAsync();
    Console.WriteLine($"  OK - Connected! State: {conn.State}");

    using var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT DB_NAME() AS [DB], @@VERSION AS [Ver]";
    using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        Console.WriteLine($"  Database: {reader["DB"]}");
        var ver = reader["Ver"]!.ToString()!;
        Console.WriteLine($"  Version: {ver[..ver.IndexOf('\n')].Trim()}");
    }
}
catch (Exception ex)
{
    Console.WriteLine($"  FAILED: {ex.Message}");
    if (ex.InnerException != null)
        Console.WriteLine($"  Inner: {ex.InnerException.Message}");
}

// Test with SqlConnectionStringBuilder (exactly like the app does)
Console.WriteLine();
Console.WriteLine("[1b] SQL Server (via SqlConnectionStringBuilder with ConnectTimeout=3)");
try
{
    var builder = new SqlConnectionStringBuilder(sqlConnString) { ConnectTimeout = 3 };
    var rebuilt = builder.ConnectionString;
    Console.WriteLine($"  Rebuilt CS: {rebuilt}");

    using var conn = new SqlConnection(rebuilt);
    await conn.OpenAsync();
    Console.WriteLine("  OK - Rebuilt string works!");
}
catch (Exception ex)
{
    Console.WriteLine($"  FAILED: {ex.Message}");
    if (ex.InnerException != null)
        Console.WriteLine($"  Inner: {ex.InnerException.Message}");
}

// ─── 2. Redis ───
Console.WriteLine();
Console.WriteLine("[2] Redis (StackExchange.Redis)");
try
{
    var redis = await ConnectionMultiplexer.ConnectAsync("localhost:6379");
    Console.WriteLine($"  OK - Connected! {redis.GetStatus()}");

    var db = redis.GetDatabase();
    await db.StringSetAsync("pmwds_test", "hello from .NET", TimeSpan.FromSeconds(30));
    var val = await db.StringGetAsync("pmwds_test");
    Console.WriteLine($"  SET/GET: value = '{val}'");
    redis.Close();
}
catch (Exception ex)
{
    Console.WriteLine($"  FAILED: {ex.Message}");
    if (ex.InnerException != null)
        Console.WriteLine($"  Inner: {ex.InnerException.Message}");
}

Console.WriteLine("\n=== All tests complete ===");
