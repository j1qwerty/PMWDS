using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PMWDS.Persistence.Migrations
{
    /// <summary>
    /// Reconciles databases that were built by the previous, pre-consolidation
    /// migration chain.
    ///
    /// The migration history was squashed into <see cref="InitialSchema"/>: the
    /// seven incremental migrations it replaces were all no-ops apart from two
    /// that patched problems the generated schema no longer has, and a chain that
    /// long is unreviewable. A fresh database needs nothing from this migration -
    /// InitialSchema already produces the correct shape - so every statement here
    /// is a no-op when the object is absent.
    ///
    /// For a database created before the squash it drops TimeEntries. Time
    /// tracking was removed from the product, and leaving the table behind means
    /// a future migration that reintroduces the name collides with an empty
    /// leftover.
    ///
    /// The other legacy artefact, AIGlobalSettings.IsActive, is repaired in code
    /// rather than here: dropping a column needs a "does it exist?" test, and
    /// SQLite has no conditional DDL, so the statement would have to be built
    /// from an inspection result. That repair lives alongside the other schema
    /// drift fixes in DatabaseConnectionService.RemoveLegacyAiSettingsColumnAsync
    /// rather than as a fragile multi-statement batch here.
    ///
    /// The stale __EFMigrationsHistory rows are not cleared from this migration
    /// either. EF records each id as it applies it, so deleting them from inside
    /// a migration would also delete the rows for InitialSchema and for this
    /// migration. That has to run before MigrateAsync and lives in
    /// DatabaseConnectionService.ReconcileMigrationHistoryAsync.
    /// </summary>
    public partial class ConsolidateExistingDatabases : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (migrationBuilder.ActiveProvider == "Microsoft.EntityFrameworkCore.Sqlite")
            {
                migrationBuilder.Sql("DROP TABLE IF EXISTS \"TimeEntries\";");
            }
            else if (migrationBuilder.ActiveProvider == "Microsoft.EntityFrameworkCore.SqlServer")
            {
                migrationBuilder.Sql(
                    "IF OBJECT_ID(N'[dbo].[TimeEntries]', N'U') IS NOT NULL DROP TABLE [dbo].[TimeEntries];");
            }
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // TimeEntries is not recreated. Time tracking was removed from the
            // product entirely, so restoring the table would reintroduce a
            // feature the model no longer maps.
        }
    }
}
