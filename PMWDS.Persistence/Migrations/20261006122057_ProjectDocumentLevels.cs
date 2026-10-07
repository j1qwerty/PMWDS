using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PMWDS.Persistence.Migrations
{
    /// <summary>
    /// Makes a document level-aware: project, milestone or task.
    ///
    /// Every document still belongs to a project; the level records whether it also
    /// belongs to a specific milestone or task, and therefore whose department scope
    /// it inherits when it is listed.
    ///
    /// Written by hand rather than generated, because the two supported providers
    /// disagree about column types and about whether DDL can be conditional:
    ///  - the design-time factory targets SQLite, so EF emits SQLite type names
    ///    ("TEXT") that SQL Server rejects, and SQL Server additionally rejects the
    ///    new column's implicit collation when it differs from the table's
    ///  - adding a column has to tolerate the column already being present on the
    ///    SQLite development database, which is built from the model rather than
    ///    from migrations, and SQLite has no conditional DDL
    ///
    /// Each branch is therefore idempotent, and states its own native types. The
    /// SQLite development path additionally repairs the same columns in
    /// DatabaseConnectionService.EnsureSqliteCompatibilityColumnsAsync, which is
    /// where the other EnsureCreated-era schema drift is handled.
    /// </summary>
    public partial class ProjectDocumentLevels : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (migrationBuilder.ActiveProvider == "Microsoft.EntityFrameworkCore.Sqlite")
            {
                migrationBuilder.Sql(
                    """
                    ALTER TABLE "ProjectDocuments" ADD COLUMN "Level" TEXT NOT NULL DEFAULT 'Project';
                    CREATE INDEX IF NOT EXISTS "IX_ProjectDocuments_Level" ON "ProjectDocuments" ("Level");
                    CREATE INDEX IF NOT EXISTS "IX_ProjectDocuments_ProjectId_Level" ON "ProjectDocuments" ("ProjectId", "Level");
                    """);
            }
            else if (migrationBuilder.ActiveProvider == "Microsoft.EntityFrameworkCore.SqlServer")
            {
                // SQL Server rejects a new column whose collation differs from the
                // table's, so the database default collation is named explicitly.
                migrationBuilder.Sql(
                    """
                    IF COL_LENGTH('dbo.ProjectDocuments', 'Level') IS NULL
                    BEGIN
                        ALTER TABLE [dbo].[ProjectDocuments] ADD [Level] nvarchar(20) NOT NULL
                            CONSTRAINT [DF_ProjectDocuments_Level] DEFAULT N'Project'
                            COLLATE DATABASE_DEFAULT;
                    END;
                    IF OBJECT_ID(N'[dbo].[IX_ProjectDocuments_Level]', N'I') IS NULL
                        CREATE INDEX [IX_ProjectDocuments_Level] ON [dbo].[ProjectDocuments] ([Level]);
                    IF OBJECT_ID(N'[dbo].[IX_ProjectDocuments_ProjectId_Level]', N'I') IS NULL
                        CREATE INDEX [IX_ProjectDocuments_ProjectId_Level] ON [dbo].[ProjectDocuments] ([ProjectId], [Level]);
                    """);
            }

            // The milestone and task links carry no collation and no default, so
            // they are safe to add the same way on both providers.
            migrationBuilder.AddColumn<Guid>(
                name: "MilestoneId",
                table: "ProjectDocuments",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectDocuments_MilestoneId",
                table: "ProjectDocuments",
                column: "MilestoneId");

            migrationBuilder.AddColumn<Guid>(
                name: "TaskId",
                table: "ProjectDocuments",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectDocuments_TaskId",
                table: "ProjectDocuments",
                column: "TaskId");

            // NoAction, matching the model. Projects already cascade to
            // ProjectDocuments directly, so a cascading path through Milestones or
            // Tasks would give SQL Server two cascade routes into the same table and
            // it would refuse the schema. Cleanup is done in application code.
            migrationBuilder.AddForeignKey(
                name: "FK_ProjectDocuments_Milestones_MilestoneId",
                table: "ProjectDocuments",
                column: "MilestoneId",
                principalTable: "Milestones",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ProjectDocuments_Tasks_TaskId",
                table: "ProjectDocuments",
                column: "TaskId",
                principalTable: "Tasks",
                principalColumn: "Id");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProjectDocuments_Milestones_MilestoneId",
                table: "ProjectDocuments");

            migrationBuilder.DropForeignKey(
                name: "FK_ProjectDocuments_Tasks_TaskId",
                table: "ProjectDocuments");

            migrationBuilder.DropIndex(
                name: "IX_ProjectDocuments_TaskId",
                table: "ProjectDocuments");

            migrationBuilder.DropColumn(
                name: "TaskId",
                table: "ProjectDocuments");

            migrationBuilder.DropIndex(
                name: "IX_ProjectDocuments_MilestoneId",
                table: "ProjectDocuments");

            migrationBuilder.DropColumn(
                name: "MilestoneId",
                table: "ProjectDocuments");

            if (migrationBuilder.ActiveProvider == "Microsoft.EntityFrameworkCore.SqlServer")
            {
                migrationBuilder.Sql(
                    """
                    IF OBJECT_ID(N'[dbo].[IX_ProjectDocuments_ProjectId_Level]', N'I') IS NOT NULL
                        DROP INDEX [IX_ProjectDocuments_ProjectId_Level] ON [dbo].[ProjectDocuments];
                    IF OBJECT_ID(N'[dbo].[IX_ProjectDocuments_Level]', N'I') IS NOT NULL
                        DROP INDEX [IX_ProjectDocuments_Level] ON [dbo].[ProjectDocuments];
                    IF COL_LENGTH('dbo.ProjectDocuments', 'Level') IS NOT NULL
                        ALTER TABLE [dbo].[ProjectDocuments] DROP COLUMN [Level];
                    """);
            }
            else if (migrationBuilder.ActiveProvider == "Microsoft.EntityFrameworkCore.Sqlite")
            {
                // SQLite cannot drop a column or an index that a constraint depends
                // on. The project-level documents it held keep working without the
                // level column, so the column is left in place rather than forcing a
                // table rebuild that risks the stored files' metadata.
            }
        }
    }
}
