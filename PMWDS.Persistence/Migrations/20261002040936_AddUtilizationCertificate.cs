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
            // Every pre-existing document is a plain file, so backfill the default
            // category rather than an empty string — the enum is stored as text and
            // "" cannot be converted back to DocumentCategory on read.
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "ProjectDocuments",
                type: "TEXT",
                maxLength: 40,
                nullable: false,
                defaultValue: "General");

            migrationBuilder.CreateTable(
                name: "UtilizationCertificates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ProjectId = table.Column<Guid>(type: "TEXT", nullable: false),
                    DocumentId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CertificateNumber = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    FundingSource = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    AmountClaimed = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    AmountUtilized = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    PeriodStart = table.Column<DateTime>(type: "TEXT", nullable: false),
                    PeriodEnd = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    MilestoneId = table.Column<Guid>(type: "TEXT", nullable: true),
                    TaskId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Purpose = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    SubmittedByUserId = table.Column<string>(type: "TEXT", nullable: false),
                    SubmittedOn = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ReviewedByUserId = table.Column<string>(type: "TEXT", nullable: true),
                    ReviewedOn = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ReviewNotes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: false),
                    ModifiedBy = table.Column<string>(type: "TEXT", nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    RowVersion = table.Column<int>(type: "INTEGER", nullable: false)
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
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UtilizationCertificates_Tasks_TaskId",
                        column: x => x.TaskId,
                        principalTable: "Tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
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
