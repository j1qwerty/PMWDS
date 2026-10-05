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

        // Resolve relative SQLite data sources against the content root so the path does not
        // depend on the process working directory (differs under systemd).
        var sqliteConnection = ResolveSqliteConnectionString(settings.SqliteConnectionString, environment.ContentRootPath);
        var attempts = new List<string>();

        if (!environment.IsDevelopment())
        {
            GuardSqliteOutsideAppDirectory(sqliteConnection, environment, attempts);
        }

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

            if (environment.IsDevelopment())
            {
                await EnsureSqliteDevelopmentDatabaseAsync(db, ct);
                return;
            }

            // Production SQLite: never drop the database. Apply EF migrations forward only.
            Console.WriteLine("[PMWDS] Applying SQLite migrations (production, no destructive reset)...");
            await ReconcileMigrationHistoryAsync(db, ct);
            await db.Database.MigrateAsync(ct);
            await EnsureSqliteCompatibilityColumnsAsync(db, ct);
            return;
        }

        Console.WriteLine("[PMWDS] Applying database migrations...");
        await ReconcileMigrationHistoryAsync(db, ct);
        try
        {
            await db.Database.MigrateAsync(ct);
        }
        catch when (environment.IsDevelopment())
        {
            Console.WriteLine("[PMWDS] SQL Server development migration failed; recreating database from InitialCreate.");
            await db.Database.EnsureDeletedAsync(ct);
            await db.Database.MigrateAsync(ct);
        }

        if (!await HasExpectedSqlServerSchemaAsync(db, ct))
        {
            if (!environment.IsDevelopment())
            {
                throw new InvalidOperationException("SQL Server schema is incomplete after migrations. Refusing to reset outside Development.");
            }

            Console.WriteLine("[PMWDS] SQL Server development schema is incomplete; recreating database from InitialCreate.");
            await db.Database.EnsureDeletedAsync(ct);
            await db.Database.MigrateAsync(ct);
        }

        await RemoveLegacyAiSettingsIsActiveColumnSqlServerAsync(db, ct);
    }

    /// <summary>
    /// SQL Server counterpart of the SQLite legacy-column repair. See
    /// <see cref="RemoveLegacyAiSettingsIsActiveColumnAsync(DbConnection, CancellationToken)"/>
    /// for why the column exists and why this is safe to run on every boot.
    /// </summary>
    private static async Task RemoveLegacyAiSettingsIsActiveColumnSqlServerAsync(
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var connection = db.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose)
        {
            await connection.OpenAsync(ct);
        }

        try
        {
            if (!await HasSqlServerColumnAsync(connection, "AIGlobalSettings", "IsActive", ct))
            {
                return;
            }

            Console.WriteLine("[PMWDS] Dropping legacy AIGlobalSettings.IsActive column.");
            await using var command = connection.CreateCommand();
            command.CommandText = "ALTER TABLE [dbo].[AIGlobalSettings] DROP COLUMN [IsActive]";
            await command.ExecuteNonQueryAsync(ct);
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync();
            }
        }
    }

    /// <summary>
    /// Drops __EFMigrationsHistory rows for migrations that are no longer in the
    /// assembly, before MigrateAsync runs.
    ///
    /// The migration chain was squashed into InitialSchema. On a database built
    /// from the old chain, EF would otherwise see the old ids, conclude the new
    /// InitialSchema was still pending, and try to create every table on a
    /// database that already has them. Pruning first lets the consolidated
    /// migrations apply cleanly to both fresh and existing databases.
    ///
    /// Only rows for ids the assembly does not contain are removed, so this is a
    /// no-op on a database whose history is already current, and it can never
    /// mark a genuinely pending migration as applied.
    /// </summary>
    private static async Task ReconcileMigrationHistoryAsync(
        ApplicationDbContext db,
        CancellationToken ct)
    {
        var known = new HashSet<string>(
            db.Database.GetMigrations(),
            StringComparer.OrdinalIgnoreCase);

        // dbo is the default schema on SQL Server; SQLite has no schemas.
        var historyTable = db.Database.ProviderName?.Contains("SqlServer", StringComparison.Ordinal) == true
            ? "[dbo].[__EFMigrationsHistory]"
            : "\"__EFMigrationsHistory\"";

        var connection = db.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose)
        {
            try
            {
                await connection.OpenAsync(ct);
            }
            catch
            {
                // Cannot reach the database here; MigrateAsync will surface the
                // real problem with a better message.
                return;
            }
        }

        try
        {
            List<string> applied;
            await using (var read = connection.CreateCommand())
            {
                read.CommandText = $"SELECT \"MigrationId\" FROM {historyTable}";
                applied = new List<string>();
                await using var reader = await read.ExecuteReaderAsync(ct);
                while (await reader.ReadAsync(ct))
                {
                    applied.Add(reader.GetString(0));
                }
            }

            var stale = applied.Where(id => !known.Contains(id)).ToList();
            if (stale.Count == 0)
            {
                return;
            }

            // Console.WriteLine, not the Serilog logger: this file runs before the
            // host is built, and Console.WriteLine does not accept {Named} templates.
            Console.WriteLine(
                $"[PMWDS] Pruning {stale.Count} superseded migration history row(s): {string.Join(", ", stale)}");

            foreach (var id in stale)
            {
                await using var delete = connection.CreateCommand();
                delete.CommandText =
                    $"DELETE FROM {historyTable} WHERE \"MigrationId\" = {QuoteLiteral(id)}";
                await delete.ExecuteNonQueryAsync(ct);
            }
        }
        catch (DbException)
        {
            // The history table does not exist yet on a brand new database, which
            // is the normal case and needs no reconciliation.
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync();
            }
        }
    }

    private static string QuoteLiteral(string value)
        => $"'{value.Replace("'", "''")}'";

    /// <summary>
    /// Outside Development the SQLite file must live outside the application directory. The usual
    /// deploy replaces the publish folder in place, so a database inside it is destroyed on every
    /// redeploy — the "data disappears" symptom. Fail fast instead of silently losing data.
    /// </summary>
    private static void GuardSqliteOutsideAppDirectory(
        string sqliteConnectionString,
        IWebHostEnvironment environment,
        List<string> attempts)
    {
        if (string.IsNullOrWhiteSpace(sqliteConnectionString))
        {
            return;
        }

        var marker = "data source=";
        var index = sqliteConnectionString.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (index < 0)
        {
            return;
        }

        var valueStart = index + marker.Length;
        var valueEnd = sqliteConnectionString.IndexOf(';', valueStart);
        if (valueEnd < 0)
        {
            valueEnd = sqliteConnectionString.Length;
        }

        var dataSource = sqliteConnectionString[valueStart..valueEnd].Trim();
        if (dataSource.Length == 0 ||
            dataSource.Equals(":memory:", StringComparison.OrdinalIgnoreCase) ||
            dataSource.StartsWith("file:", StringComparison.OrdinalIgnoreCase) ||
            !Path.IsPathRooted(dataSource))
        {
            return;
        }

        var appDirectory = Path.GetFullPath(AppContext.BaseDirectory)
            .TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;

        if (dataSource.StartsWith(appDirectory, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"Database:SqliteConnectionString points inside the application directory ({dataSource}). " +
                "A deploy replaces that directory, which would delete the database. " +
                "Use a durable absolute path outside the app folder, e.g. /var/lib/pmwds/database/pmwds.sqlite.");
        }

        attempts.Add($"SQLite data source '{dataSource}' verified outside the application directory.");
    }

    private static string ResolveSqliteConnectionString(string connectionString, string contentRootPath)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return connectionString;
        }

        var marker = "data source=";
        var index = connectionString.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (index < 0)
        {
            return connectionString;
        }

        var valueStart = index + marker.Length;
        var valueEnd = connectionString.IndexOf(';', valueStart);
        if (valueEnd < 0)
        {
            valueEnd = connectionString.Length;
        }

        var dataSource = connectionString[valueStart..valueEnd].Trim();
        if (dataSource.Length == 0
            || dataSource.Equals(":memory:", StringComparison.OrdinalIgnoreCase)
            || dataSource.StartsWith("file:", StringComparison.OrdinalIgnoreCase)
            || Path.IsPathRooted(dataSource))
        {
            return connectionString;
        }

        var resolved = Path.GetFullPath(Path.Combine(contentRootPath, dataSource));
        return connectionString[..valueStart] + resolved + connectionString[valueEnd..];
    }

    private static DatabaseConnectionStatus SelectProvider(
        IWebHostEnvironment environment,
        DatabaseSettings settings,
        string? sqlServerConnection,
        string sqliteConnection,
        List<string> attempts)
    {
        var sqlitePermitted = environment.IsDevelopment() || settings.AllowSqliteInProduction;

        if (settings.ForceSqlite)
        {
            if (!sqlitePermitted)
            {
                throw new InvalidOperationException(
                    "Database:ForceSqlite requires Development or Database:AllowSqliteInProduction=true. Production must use SQL Server by default.");
            }

            attempts.Add("SQLite forced by Database:ForceSqlite.");
            return CreateStatus(ActiveDatabaseProvider.Sqlite, "SQLite", "Database:SqliteConnectionString", sqliteConnection, true, attempts);
        }

        if (settings.EnableSqlServer)
        {
            if (CanConnectToSqlServer(sqlServerConnection))
            {
                attempts.Add("SQL Server connection succeeded.");
                return CreateStatus(ActiveDatabaseProvider.SqlServer, "SQL Server", "ConnectionStrings:Default", sqlServerConnection!, false, attempts);
            }

            attempts.Add("SQL Server unavailable or not configured.");
        }
        else
        {
            // Not a fallback: this deployment was configured for SQLite only. Deliberately
            // placed before the probe so the probe never runs.
            attempts.Add("SQL Server disabled by Database:EnableSqlServer=false - not probed.");

            if (!sqlitePermitted)
            {
                throw new InvalidOperationException(
                    "Database:EnableSqlServer=false selects SQLite, so set Database:AllowSqliteInProduction=true to run it outside Development.");
            }

            return CreateStatus(ActiveDatabaseProvider.Sqlite, "SQLite", "Database:SqliteConnectionString", sqliteConnection, false, attempts);
        }

        attempts.Add("SQL Server unavailable or not configured.");

        if (!sqlitePermitted)
        {
            throw new InvalidOperationException(
                "SQL Server is required outside Development, but ConnectionStrings:Default is not reachable. " +
                "Set Database:AllowSqliteInProduction=true to run SQLite in Production.");
        }

        attempts.Add("SQLite selected after a single SQL Server connectivity check.");
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
            "MilestoneDependencies",
            "UtilizationCertificates"
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

    private static async Task<bool> HasExpectedSqlServerSchemaAsync(ApplicationDbContext db, CancellationToken ct)
    {
        if (!await db.Database.CanConnectAsync(ct))
        {
            return false;
        }

        var connection = db.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose)
        {
            await connection.OpenAsync(ct);
        }

        try
        {
            var expectedTables = new[]
            {
                "Organizations",
                "Users",
                "Roles",
                "Projects",
                "Milestones",
                "MilestoneDependencies",
                "Tasks",
                "TaskAssignments",
                "AIGlobalSettings"
            };

            foreach (var table in expectedTables)
            {
                if (!await HasSqlServerTableAsync(connection, table, ct))
                {
                    return false;
                }
            }

            return await HasSqlServerColumnAsync(connection, "Roles", "Key", ct) &&
                await HasSqlServerColumnAsync(connection, "Users", "RefreshTokenHash", ct) &&
                await HasSqlServerColumnAsync(connection, "Users", "AccessTokenVersion", ct) &&
                await HasSqlServerColumnAsync(connection, "Milestones", "DepartmentId", ct) &&
                await HasSqlServerColumnTypeAsync(connection, "Projects", "ProjectManagerId", "uniqueidentifier", ct) &&
                await HasSqlServerColumnTypeAsync(connection, "Tasks", "AssignedToUserId", "uniqueidentifier", ct) &&
                await HasSqlServerColumnTypeAsync(connection, "Tasks", "AssignedByUserId", "uniqueidentifier", ct) &&
                await HasSqlServerColumnTypeAsync(connection, "Tasks", "AIRecommendedAssigneeId", "uniqueidentifier", ct) &&
                await HasSqlServerColumnTypeAsync(connection, "TaskAssignments", "UserId", "uniqueidentifier", ct) &&
                await HasSqlServerColumnTypeAsync(connection, "TaskComments", "UserId", "uniqueidentifier", ct);
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync();
            }
        }
    }

    private static async Task<bool> HasSqlServerTableAsync(DbConnection connection, string tableName, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT OBJECT_ID(@tableName, 'U')";
        var parameter = command.CreateParameter();
        parameter.ParameterName = "@tableName";
        parameter.Value = $"dbo.{tableName}";
        command.Parameters.Add(parameter);
        var result = await command.ExecuteScalarAsync(ct);
        return result != null && result != DBNull.Value;
    }

    private static async Task<bool> HasSqlServerColumnAsync(DbConnection connection, string tableName, string columnName, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = @"
SELECT 1
FROM sys.columns c
INNER JOIN sys.tables t ON c.object_id = t.object_id
WHERE t.name = @tableName AND c.name = @columnName";
        var tableParameter = command.CreateParameter();
        tableParameter.ParameterName = "@tableName";
        tableParameter.Value = tableName;
        command.Parameters.Add(tableParameter);
        var columnParameter = command.CreateParameter();
        columnParameter.ParameterName = "@columnName";
        columnParameter.Value = columnName;
        command.Parameters.Add(columnParameter);
        var result = await command.ExecuteScalarAsync(ct);
        return result != null && result != DBNull.Value;
    }

    private static async Task<bool> HasSqlServerColumnTypeAsync(DbConnection connection, string tableName, string columnName, string dataType, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = @"
SELECT DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @tableName AND COLUMN_NAME = @columnName";
        var tableParameter = command.CreateParameter();
        tableParameter.ParameterName = "@tableName";
        tableParameter.Value = tableName;
        command.Parameters.Add(tableParameter);
        var columnParameter = command.CreateParameter();
        columnParameter.ParameterName = "@columnName";
        columnParameter.Value = columnName;
        command.Parameters.Add(columnParameter);
        var result = await command.ExecuteScalarAsync(ct);
        return string.Equals(result?.ToString(), dataType, StringComparison.OrdinalIgnoreCase);
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

            await NormalizeSqliteNullableGuidColumnsAsync(connection, ct);
            await RemoveLegacyAiSettingsIsActiveColumnAsync(connection, ct);
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync();
            }
        }
    }

    /// <summary>
    /// Drops AIGlobalSettings.IsActive on databases left over from before the
    /// migration chain was consolidated.
    ///
    /// The old InitialCreate emitted that column, but AIGlobalSetting inherits
    /// from BaseEntity and has never had an IsActive property, so it was created
    /// NOT NULL with no default. EF inserts omit the column, and every write to
    /// the table then failed with "NOT NULL constraint failed:
    /// AIGlobalSettings.IsActive" - which meant the seeder could never store the
    /// AI provider credentials. Only migration-built databases were affected; the
    /// SQLite development path used EnsureCreated, which never created it.
    ///
    /// The consolidated InitialSchema no longer creates the column, so this only
    /// has anything to do on a legacy database. It lives here rather than in the
    /// migration because dropping a column needs an existence check and SQLite
    /// has no conditional DDL. AIGlobalSettings holds a handful of rows, so the
    /// SQLite table rebuild is cheap.
    /// </summary>
    private static async Task RemoveLegacyAiSettingsIsActiveColumnAsync(
        DbConnection connection,
        CancellationToken ct)
    {
        if (!await HasSqliteColumnAsync(connection, "AIGlobalSettings", "IsActive", ct))
        {
            return;
        }

        Console.WriteLine("[PMWDS] Dropping legacy AIGlobalSettings.IsActive column.");

        // SQLite cannot drop a column that an index or constraint references.
        // AIGlobalSettings has only its primary key, which is on Id, so the
        // documented rebuild is safe here.
        await ExecuteSqliteAsync(
            connection,
            """
            CREATE TABLE "AIGlobalSettings_Rebuilt" (
                "Id" TEXT NOT NULL CONSTRAINT "PK_AIGlobalSettings" PRIMARY KEY,
                "DefaultProvider" TEXT NOT NULL,
                "DefaultModel" TEXT NOT NULL,
                "RiskThreshold" REAL NOT NULL,
                "UseLocalModel" INTEGER NOT NULL,
                "MLModelPath" TEXT NOT NULL,
                "CreatedDate" TEXT NOT NULL,
                "ModifiedDate" TEXT NULL,
                "CreatedBy" TEXT NOT NULL,
                "ModifiedBy" TEXT NULL,
                "IsDeleted" INTEGER NOT NULL,
                "RowVersion" INTEGER NOT NULL
            )
            """,
            ct);

        await ExecuteSqliteAsync(
            connection,
            """
            INSERT INTO "AIGlobalSettings_Rebuilt"
                ("Id","DefaultProvider","DefaultModel","RiskThreshold","UseLocalModel","MLModelPath",
                 "CreatedDate","ModifiedDate","CreatedBy","ModifiedBy","IsDeleted","RowVersion")
            SELECT "Id","DefaultProvider","DefaultModel","RiskThreshold","UseLocalModel","MLModelPath",
                   "CreatedDate","ModifiedDate","CreatedBy","ModifiedBy","IsDeleted","RowVersion"
            FROM "AIGlobalSettings"
            """,
            ct);

        await ExecuteSqliteAsync(connection, "DROP TABLE \"AIGlobalSettings\"", ct);
        await ExecuteSqliteAsync(
            connection,
            "ALTER TABLE \"AIGlobalSettings_Rebuilt\" RENAME TO \"AIGlobalSettings\"",
            ct);
    }

    private static async Task NormalizeSqliteNullableGuidColumnsAsync(DbConnection connection, CancellationToken ct)
    {
        var nullableGuidColumns = new (string Table, string Column)[]
        {
            ("ActivityLogs", "ProjectId"),
            ("Departments", "OrganizationId"),
            ("Departments", "ParentDepartmentId"),
            ("KnowledgeArticles", "ProjectId"),
            ("Milestones", "DepartmentId"),
            ("PredictionResults", "TaskId"),
            ("Projects", "ProjectManagerId"),
            ("Skills", "OrganizationId"),
            ("TaskComments", "UserId"),
            ("TaskComments", "ParentCommentId"),
            ("Tasks", "MilestoneId"),
            ("Tasks", "ParentTaskId"),
            ("Tasks", "AssignedToUserId"),
            ("Tasks", "AssignedByUserId"),
            ("Tasks", "AIRecommendedAssigneeId"),
            ("Users", "OrganizationId"),
            ("Users", "DepartmentId"),
            ("Webhooks", "IntegrationId")
        };

        foreach (var (table, column) in nullableGuidColumns)
        {
            if (await HasSqliteColumnAsync(connection, table, column, ct))
            {
                await ExecuteSqliteAsync(
                    connection,
                    $"UPDATE \"{table}\" SET \"{column}\" = NULL WHERE \"{column}\" = ''",
                    ct);
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
