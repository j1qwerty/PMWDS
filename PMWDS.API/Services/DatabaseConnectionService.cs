using System.Data;
using System.Data.Common;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using MySql.Data.MySqlClient;
using PMWDS.Infrastructure.Settings;
using PMWDS.Persistence.Context;

namespace PMWDS.API.Services;

public enum ActiveDatabaseProvider
{
    SqlServer,
    MySql,
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
        var mysqlConnection = configuration.GetConnectionString("MySql") ?? settings.MySqlConnectionString;
        var sqliteConnection = settings.SqliteConnectionString;
        var attempts = new List<string>();

        var selected = SelectProvider(environment, settings, sqlServerConnection, mysqlConnection, sqliteConnection, attempts);

        services.AddSingleton(selected);
        services.AddDbContext<ApplicationDbContext>(opt =>
        {
            switch (selected.Provider)
            {
                case ActiveDatabaseProvider.SqlServer:
                    opt.UseSqlServer(sqlServerConnection, sql => sql.MigrationsAssembly("PMWDS.Persistence"));
                    break;
                case ActiveDatabaseProvider.MySql:
                    opt.UseMySQL(mysqlConnection!, sql => sql.MigrationsAssembly("PMWDS.Persistence"));
                    break;
                case ActiveDatabaseProvider.Sqlite:
                    opt.UseSqlite(sqliteConnection, sql => sql.MigrationsAssembly("PMWDS.Persistence"));
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported database provider {selected.Provider}.");
            }
        });

        Console.WriteLine($"[PMWDS] Using {selected.ProviderName} database ({selected.DisplayDataSource}).");
        foreach (var attempt in attempts)
        {
            Console.WriteLine($"[PMWDS] Database selection: {attempt}");
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

        await db.Database.MigrateAsync(ct);
    }

    private static DatabaseConnectionStatus SelectProvider(
        IWebHostEnvironment environment,
        DatabaseSettings settings,
        string? sqlServerConnection,
        string? mysqlConnection,
        string sqliteConnection,
        List<string> attempts)
    {
        if (settings.ForceSqlite)
        {
            attempts.Add("SQLite forced by Database:ForceSqlite.");
            return CreateStatus(ActiveDatabaseProvider.Sqlite, "SQLite", "Database:SqliteConnectionString", sqliteConnection, true, attempts);
        }

        if (CanConnectToSqlServer(sqlServerConnection))
        {
            attempts.Add("SQL Server connection succeeded.");
            return CreateStatus(ActiveDatabaseProvider.SqlServer, "SQL Server", "ConnectionStrings:Default", sqlServerConnection!, false, attempts);
        }

        attempts.Add("SQL Server unavailable or not configured.");

        if (settings.EnableMySqlFallback && CanConnectToMySql(mysqlConnection))
        {
            attempts.Add("MySQL fallback connection succeeded.");
            return CreateStatus(ActiveDatabaseProvider.MySql, "MySQL", "ConnectionStrings:MySql", mysqlConnection!, true, attempts);
        }

        attempts.Add("MySQL unavailable or not configured.");

        if (!environment.IsDevelopment() && !settings.EnableSqliteFallback)
        {
            throw new InvalidOperationException("No configured database provider is reachable and SQLite fallback is disabled.");
        }

        attempts.Add("SQLite fallback selected.");
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
        => CanConnect(connectionString, cs =>
        {
            var builder = new SqlConnectionStringBuilder(cs) { ConnectTimeout = 2 };
            return new SqlConnection(builder.ConnectionString);
        });

    private static bool CanConnectToMySql(string? connectionString)
        => CanConnect(connectionString, cs =>
        {
            var builder = new MySqlConnectionStringBuilder(cs) { ConnectionTimeout = 2 };
            return new MySqlConnection(builder.ConnectionString);
        });

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
                ActiveDatabaseProvider.MySql => new MySqlConnectionStringBuilder(connectionString).Server,
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
            "ProjectDepartments"
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

            if (!await HasSqliteColumnAsync(connection, "Users", "OrganizationId", ct))
            {
                await ExecuteSqliteAsync(connection, "ALTER TABLE \"Users\" ADD COLUMN \"OrganizationId\" TEXT NULL", ct);
            }

            if (!await HasSqliteColumnAsync(connection, "Skills", "OrganizationId", ct))
            {
                await ExecuteSqliteAsync(connection, "ALTER TABLE \"Skills\" ADD COLUMN \"OrganizationId\" TEXT NULL", ct);
            }

            if (!await HasSqliteColumnAsync(connection, "Roles", "PaginationPageSize", ct))
            {
                await ExecuteSqliteAsync(connection, "ALTER TABLE \"Roles\" ADD COLUMN \"PaginationPageSize\" INTEGER NOT NULL DEFAULT 10", ct);
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
