using System.Data;
using System.Data.Common;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using PMWDS.Infrastructure.Settings;
using PMWDS.Persistence.Context;

namespace PMWDS.API.Services;

public enum ActiveDatabaseProvider
{
    SqlServer,
    Sqlite
}

public sealed record DatabaseConnectionStatus(
    ActiveDatabaseProvider Provider,
    string ProviderName,
    string ConnectionName,
    string DisplayDataSource,
    bool IsFallback,
    IReadOnlyList<string> AttemptLog);

public static class DatabaseConnectionService
{
    public static DatabaseConnectionStatus AddApplicationDatabase(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        var settings = configuration.GetSection("Database").Get<DatabaseSettings>() ?? new DatabaseSettings();
        var sqlServerConnection = configuration.GetConnectionString("Default");
        var sqliteConnection = settings.SqliteConnectionString;
        var attempts = new List<string>();

        var selected = SelectProvider(environment, settings, sqlServerConnection, sqliteConnection, attempts);

        services.AddSingleton(selected);
        services.AddDbContext<ApplicationDbContext>(opt =>
        {
            switch (selected.Provider)
            {
                case ActiveDatabaseProvider.SqlServer:
                    opt.UseSqlServer(sqlServerConnection, sql =>
                    {
                        sql.MigrationsAssembly("PMWDS.Persistence");
                        sql.EnableRetryOnFailure();
                    });
                    break;
                case ActiveDatabaseProvider.Sqlite:
                    opt.UseSqlite(sqliteConnection, sql => sql.MigrationsAssembly("PMWDS.Persistence"));
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported database provider {selected.Provider}.");
            }
            opt.ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
        });

        Console.WriteLine($"[PMWDS] Using {selected.ProviderName} database ({selected.DisplayDataSource}).");
        foreach (var attempt in attempts)
        {
            Console.WriteLine($"[PMWDS] Database selection: {attempt}");
        }

        if (selected.Provider == ActiveDatabaseProvider.SqlServer)
        {
            EnsureDatabasesExist(configuration, sqlServerConnection);
        }

        return selected;
    }

    public static async Task PrepareDatabaseAsync(
        ApplicationDbContext db,
        DatabaseConnectionStatus status,
        IWebHostEnvironment environment,
        CancellationToken ct = default)
    {
        if (status.Provider == ActiveDatabaseProvider.Sqlite)
        {
            var sqlitePath = status.DisplayDataSource;
            var sqliteDirectory = Path.GetDirectoryName(sqlitePath);
            if (!string.IsNullOrWhiteSpace(sqliteDirectory))
            {
                Directory.CreateDirectory(Path.IsPathRooted(sqliteDirectory)
                    ? sqliteDirectory
                    : Path.Combine(environment.ContentRootPath, sqliteDirectory));
            }

            await EnsureSqliteDevelopmentDatabaseAsync(db, ct);
            return;
        }

        if (environment.IsDevelopment())
        {
            Console.WriteLine("[PMWDS] Dropping and recreating database for development...");
            await db.Database.EnsureDeletedAsync(ct);
        }

        Console.WriteLine("[PMWDS] Ensuring database schema...");
        await db.Database.EnsureCreatedAsync(ct);
    }

    private static DatabaseConnectionStatus SelectProvider(
        IWebHostEnvironment environment,
        DatabaseSettings settings,
        string? sqlServerConnection,
        string sqliteConnection,
        List<string> attempts)
    {
        if (settings.ForceSqlite)
        {
            if (!environment.IsDevelopment())
            {
                throw new InvalidOperationException("Database:ForceSqlite is only allowed in Development. Production must use SQL Server.");
            }

            attempts.Add("SQLite forced by Database:ForceSqlite.");
            return CreateStatus(ActiveDatabaseProvider.Sqlite, "SQLite", "Database:SqliteConnectionString", sqliteConnection, true, attempts);
        }

        if (CanConnectToSqlServer(sqlServerConnection))
        {
            attempts.Add("SQL Server connection succeeded.");
            return CreateStatus(ActiveDatabaseProvider.SqlServer, "SQL Server", "ConnectionStrings:Default", sqlServerConnection!, false, attempts);
        }

        attempts.Add("SQL Server unavailable or not configured.");

        if (!environment.IsDevelopment())
        {
            throw new InvalidOperationException("SQL Server is required outside Development, but ConnectionStrings:Default is not reachable.");
        }

        attempts.Add("Development SQLite fallback selected after a single SQL Server connectivity check.");
        return CreateStatus(ActiveDatabaseProvider.Sqlite, "SQLite", "Database:SqliteConnectionString", sqliteConnection, true, attempts);
    }

    private static DatabaseConnectionStatus CreateStatus(
        ActiveDatabaseProvider provider,
        string providerName,
        string connectionName,
        string connectionString,
        bool isFallback,
        IReadOnlyList<string> attempts)
        => new(
            provider,
            providerName,
            connectionName,
            GetDisplayDataSource(provider, connectionString),
            isFallback,
            attempts.ToArray());

    private static bool CanConnectToSqlServer(string? connectionString)
    {
        // Use 'master' for the connectivity probe — the target database may not exist yet
        var probeCs = connectionString;
        if (!string.IsNullOrWhiteSpace(probeCs))
        {
            var builder = new SqlConnectionStringBuilder(probeCs) { InitialCatalog = "master", ConnectTimeout = 3 };
            probeCs = builder.ConnectionString;
        }

        return CanConnect(probeCs, cs =>
        {
            var b = new SqlConnectionStringBuilder(cs) { ConnectTimeout = 3 };
            return new SqlConnection(b.ConnectionString);
        });
    }

    private static void EnsureDatabasesExist(IConfiguration configuration, string? sqlServerConnection)
    {
        if (string.IsNullOrWhiteSpace(sqlServerConnection))
            return;

        var databases = new[]
        {
            new SqlConnectionStringBuilder(sqlServerConnection).InitialCatalog,
            configuration.GetConnectionString("Hangfire") is { } hg
                ? new SqlConnectionStringBuilder(hg).InitialCatalog
                : null
        }.Where(db => !string.IsNullOrWhiteSpace(db)).Distinct();

        foreach (var dbName in databases)
        {
            try
            {
                var masterBuilder = new SqlConnectionStringBuilder(sqlServerConnection)
                {
                    InitialCatalog = "master",
                    ConnectTimeout = 5
                };
                using var conn = new SqlConnection(masterBuilder.ConnectionString);
                conn.Open();
                using var cmd = conn.CreateCommand();
                cmd.CommandText = $"IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = @db) CREATE DATABASE [{dbName}]";
                cmd.Parameters.AddWithValue("@db", dbName);
                cmd.ExecuteNonQuery();
                Console.WriteLine($"[PMWDS] Database '{dbName}' ensured.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PMWDS] WARNING: Could not ensure database '{dbName}' exists: {ex.Message}");
            }
        }
    }

    private static bool CanConnect(string? connectionString, Func<string, DbConnection> connectionFactory)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return false;
        }

        try
        {
            using var connection = connectionFactory(connectionString);
            connection.Open();
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static string GetDisplayDataSource(ActiveDatabaseProvider provider, string connectionString)
    {
        try
        {
            return provider switch
            {
                ActiveDatabaseProvider.SqlServer => new SqlConnectionStringBuilder(connectionString).DataSource,
                ActiveDatabaseProvider.Sqlite => connectionString.Replace("Data Source=", string.Empty, StringComparison.OrdinalIgnoreCase).Trim(),
                _ => provider.ToString()
            };
        }
        catch
        {
            return provider.ToString();
        }
    }

    private static async Task EnsureSqliteDevelopmentDatabaseAsync(ApplicationDbContext db, CancellationToken ct)
    {
        try
        {
            if (!await HasExpectedSqliteSchemaAsync(db, ct))
            {
                await db.Database.EnsureDeletedAsync(ct);
                await db.Database.EnsureCreatedAsync(ct);
            }

            await EnsureSqliteCompatibilityColumnsAsync(db, ct);
        }
        catch
        {
            await db.Database.EnsureDeletedAsync(ct);
            await db.Database.EnsureCreatedAsync(ct);
            await EnsureSqliteCompatibilityColumnsAsync(db, ct);
        }
    }

    private static async Task<bool> HasExpectedSqliteSchemaAsync(ApplicationDbContext db, CancellationToken ct)
    {
        if (!await db.Database.CanConnectAsync(ct))
        {
            return false;
        }

        var expectedTables = new[]
        {
            "Organizations",
            "Departments",
            "Roles",
            "AIModels",
            "PredictionResults",
            "TrainingDataPoints",
            "AllocationRecommendations",
            "DelayPredictions",
            "NotificationTemplates",
            "Dashboards",
            "Reports",
            "Integrations",
            "KnowledgeArticles",
            "ActivityLogs",
            "AIProviderCredentials",
            "UserDepartments",
            "ProjectDepartments",
            "MilestoneDependencies"
        };

        var connection = db.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose)
        {
            await connection.OpenAsync(ct);
        }

        try
        {
            foreach (var table in expectedTables)
            {
                await using var command = connection.CreateCommand();
                command.CommandText = $"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'";
                var result = await command.ExecuteScalarAsync(ct);
                if (result == null || result == DBNull.Value)
                {
                    return false;
                }
            }

            return !await HasSqliteIndexAsync(connection, "IX_Departments_Code", ct);
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync();
            }
        }
    }

    private static async Task<bool> HasSqliteIndexAsync(DbConnection connection, string indexName, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = $"SELECT name FROM sqlite_master WHERE type='index' AND name='{indexName}'";
        var result = await command.ExecuteScalarAsync(ct);
        return result != null && result != DBNull.Value;
    }

    private static async Task EnsureSqliteCompatibilityColumnsAsync(ApplicationDbContext db, CancellationToken ct)
    {
        var connection = db.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose)
        {
            await connection.OpenAsync(ct);
        }

        try
        {
            if (!await HasSqliteColumnAsync(connection, "Users", "PasswordResetTokenExpiresAt", ct))
            {
                await ExecuteSqliteAsync(connection, "ALTER TABLE \"Users\" ADD COLUMN \"PasswordResetTokenExpiresAt\" TEXT NULL", ct);
            }

            if (!await HasSqliteColumnAsync(connection, "Users", "PasswordResetTokenHash", ct))
            {
                await ExecuteSqliteAsync(connection, "ALTER TABLE \"Users\" ADD COLUMN \"PasswordResetTokenHash\" TEXT NULL", ct);
            }

            if (!await HasSqliteColumnAsync(connection, "Users", "RefreshTokenHash", ct))
            {
                await ExecuteSqliteAsync(connection, "ALTER TABLE \"Users\" ADD COLUMN \"RefreshTokenHash\" TEXT NULL", ct);
            }

            if (!await HasSqliteColumnAsync(connection, "Users", "RefreshTokenExpiresAt", ct))
            {
                await ExecuteSqliteAsync(connection, "ALTER TABLE \"Users\" ADD COLUMN \"RefreshTokenExpiresAt\" TEXT NULL", ct);
            }

            if (!await HasSqliteColumnAsync(connection, "Users", "RefreshTokenRevokedAt", ct))
            {
                await ExecuteSqliteAsync(connection, "ALTER TABLE \"Users\" ADD COLUMN \"RefreshTokenRevokedAt\" TEXT NULL", ct);
            }

            if (!await HasSqliteColumnAsync(connection, "Users", "AccessTokenVersion", ct))
            {
                await ExecuteSqliteAsync(connection, "ALTER TABLE \"Users\" ADD COLUMN \"AccessTokenVersion\" INTEGER NOT NULL DEFAULT 0", ct);
            }

            if (!await HasSqliteColumnAsync(connection, "Users", "OrganizationId", ct))
            {
                await ExecuteSqliteAsync(connection, "ALTER TABLE \"Users\" ADD COLUMN \"OrganizationId\" TEXT NULL", ct);
            }

            if (!await HasSqliteColumnAsync(connection, "Skills", "OrganizationId", ct))
            {
                await ExecuteSqliteAsync(connection, "ALTER TABLE \"Skills\" ADD COLUMN \"OrganizationId\" TEXT NULL", ct);
            }

            if (!await HasSqliteColumnAsync(connection, "Roles", "Key", ct))
            {
                await ExecuteSqliteAsync(connection, "ALTER TABLE \"Roles\" ADD COLUMN \"Key\" TEXT NOT NULL DEFAULT ''", ct);
                await ExecuteSqliteAsync(connection, "UPDATE \"Roles\" SET \"Key\" = LOWER(REPLACE(\"Name\", ' ', '-')) WHERE \"Key\" = ''", ct);
                await ExecuteSqliteAsync(connection, "CREATE UNIQUE INDEX IF NOT EXISTS \"IX_Roles_Key\" ON \"Roles\" (\"Key\")", ct);
            }

            if (!await HasSqliteColumnAsync(connection, "Roles", "PaginationPageSize", ct))
            {
                await ExecuteSqliteAsync(connection, "ALTER TABLE \"Roles\" ADD COLUMN \"PaginationPageSize\" INTEGER NOT NULL DEFAULT 10", ct);
            }

            if (!await HasSqliteColumnAsync(connection, "Milestones", "DepartmentId", ct))
            {
                await ExecuteSqliteAsync(connection, "ALTER TABLE \"Milestones\" ADD COLUMN \"DepartmentId\" TEXT NULL", ct);
                await ExecuteSqliteAsync(connection, "UPDATE \"Milestones\" SET \"DepartmentId\" = (SELECT \"DepartmentId\" FROM \"Projects\" WHERE \"Projects\".\"Id\" = \"Milestones\".\"ProjectId\") WHERE \"DepartmentId\" IS NULL", ct);
                await ExecuteSqliteAsync(connection, "CREATE INDEX IF NOT EXISTS \"IX_Milestones_DepartmentId\" ON \"Milestones\" (\"DepartmentId\")", ct);
            }
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync();
            }
        }
    }

    private static async Task<bool> HasSqliteColumnAsync(DbConnection connection, string tableName, string columnName, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = $"PRAGMA table_info(\"{tableName}\")";
        await using var reader = await command.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            if (string.Equals(reader["name"]?.ToString(), columnName, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static async Task ExecuteSqliteAsync(DbConnection connection, string sql, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        await command.ExecuteNonQueryAsync(ct);
    }
}
