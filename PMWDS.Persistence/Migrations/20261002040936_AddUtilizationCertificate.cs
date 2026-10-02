using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PMWDS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUtilizationCertificate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // This migration was written against SQLite's type names. SQLite maps Guid,
            // string and DateTime all to TEXT and bool/int to INTEGER. SQL Server accepts
            // those names syntactically, so the failure is deferred to the PRIMARY KEY:
            //
            //   Column 'Id' in table 'UtilizationCertificates' is of a type that is invalid
            //   for use as a key column in an index.
            //
            // TEXT is the legacy LOB type, which SQL Server forbids in an index. The
            // migration therefore aborted startup on SQL Server with no useful message,
            // and DatabaseConnectionService then silently dropped and retried the whole
            // database before failing again.
            //
            // Branch on the active provider so one migration serves both engines. The
            // SQLite branch is byte-identical to what already shipped, so existing SQLite
            // databases are unaffected - EF Core tracks applied migrations by id, not by
            // file contents.
            var sqlServer = migrationBuilder.ActiveProvider?.Contains(
                "SqlServer", StringComparison.OrdinalIgnoreCase) == true;

            var guidType = sqlServer ? "uniqueidentifier" : "TEXT";
            var stringType = sqlServer ? "nvarchar" : "TEXT";
            var dateTimeType = sqlServer ? "datetime2" : "TEXT";
            var boolType = sqlServer ? "bit" : "INTEGER";
            var intType = sqlServer ? "int" : "INTEGER";

            // Every pre-existing document is a plain file, so backfill the default
            // category rather than an empty string — the enum is stored as text and
            // "" cannot be converted back to DocumentCategory on read.
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "ProjectDocuments",
                type: stringType,
                maxLength: 40,
                nullable: false,
                defaultValue: "General");

            migrationBuilder.CreateTable(
                name: "UtilizationCertificates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: guidType, nullable: false),
                    ProjectId = table.Column<Guid>(type: guidType, nullable: false),
                    DocumentId = table.Column<Guid>(type: guidType, nullable: false),
                    CertificateNumber = table.Column<string>(type: stringType, maxLength: 100, nullable: false),
                    FundingSource = table.Column<string>(type: stringType, maxLength: 200, nullable: false),
                    AmountClaimed = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    AmountUtilized = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    PeriodStart = table.Column<DateTime>(type: dateTimeType, nullable: false),
                    PeriodEnd = table.Column<DateTime>(type: dateTimeType, nullable: false),
                    Status = table.Column<string>(type: stringType, maxLength: 20, nullable: false),
                    MilestoneId = table.Column<Guid>(type: guidType, nullable: true),
                    TaskId = table.Column<Guid>(type: guidType, nullable: true),
                    Purpose = table.Column<string>(type: stringType, maxLength: 2000, nullable: true),
                    SubmittedByUserId = table.Column<string>(type: stringType, nullable: false),
                    SubmittedOn = table.Column<DateTime>(type: dateTimeType, nullable: true),
                    ReviewedByUserId = table.Column<string>(type: stringType, nullable: true),
                    ReviewedOn = table.Column<DateTime>(type: dateTimeType, nullable: true),
                    ReviewNotes = table.Column<string>(type: stringType, maxLength: 2000, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: dateTimeType, nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: dateTimeType, nullable: true),
                    CreatedBy = table.Column<string>(type: stringType, nullable: false),
                    ModifiedBy = table.Column<string>(type: stringType, nullable: true),
                    IsDeleted = table.Column<bool>(type: boolType, nullable: false),
                    RowVersion = table.Column<int>(type: intType, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UtilizationCertificates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UtilizationCertificates_Milestones_MilestoneId",
                        column: x => x.MilestoneId,
                        principalTable: "Milestones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_UtilizationCertificates_ProjectDocuments_DocumentId",
                        column: x => x.DocumentId,
                        principalTable: "ProjectDocuments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UtilizationCertificates_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        // SQLite permits several cascade paths into one table, SQL Server
                        // does not. Projects already cascades to ProjectDocuments, which
                        // cascades here too, so keeping CASCADE on this FK as well gives
                        // SQL Server two routes to the same row and it refuses the table:
                        //
                        //   Introducing FOREIGN KEY constraint
                        //   'FK_UtilizationCertificates_Projects_ProjectId' ... may cause
                        //   cycles or multiple cascade paths.
                        //
                        // On SQL Server this FK becomes NO ACTION and the single remaining
                        // path Projects -> ProjectDocuments -> UtilizationCertificates does
                        // the work. SQLite keeps CASCADE because it needs the constraint
                        // to actually delete rows: with NO ACTION, SQLite would not
                        // cascade and orphan certificates would survive a project delete.
                        onDelete: sqlServer
                            ? ReferentialAction.NoAction
                            : ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UtilizationCertificates_Tasks_TaskId",
                        column: x => x.TaskId,
                        principalTable: "Tasks",
                        principalColumn: "Id",
                        // Same single-cascade-path rule as ProjectId above. Tasks already
                        // cascade from Projects, so SET NULL here is a second cascade path
                        // into UtilizationCertificates and SQL Server rejects the table.
                        // The one permitted path is
                        // Projects -> ProjectDocuments -> UtilizationCertificates.
                        //
                        // Consequence on SQL Server only: deleting a task that a
                        // certificate references now raises a foreign-key error instead of
                        // nulling the reference, because SQL Server cannot express "set null
                        // on delete" here. SQLite keeps SET NULL. See
                        // docs/realtime-sync-and-data-durability.md for the follow-up.
                        onDelete: sqlServer
                            ? ReferentialAction.NoAction
                            : ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectDocuments_Category",
                table: "ProjectDocuments",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_UtilizationCertificates_CertificateNumber",
                table: "UtilizationCertificates",
                column: "CertificateNumber");

            migrationBuilder.CreateIndex(
                name: "IX_UtilizationCertificates_DocumentId",
                table: "UtilizationCertificates",
                column: "DocumentId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UtilizationCertificates_MilestoneId",
                table: "UtilizationCertificates",
                column: "MilestoneId");

            migrationBuilder.CreateIndex(
                name: "IX_UtilizationCertificates_ProjectId",
                table: "UtilizationCertificates",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_UtilizationCertificates_Status",
                table: "UtilizationCertificates",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_UtilizationCertificates_TaskId",
                table: "UtilizationCertificates",
                column: "TaskId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UtilizationCertificates");

            migrationBuilder.DropIndex(
                name: "IX_ProjectDocuments_Category",
                table: "ProjectDocuments");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "ProjectDocuments");
        }
    }
}
