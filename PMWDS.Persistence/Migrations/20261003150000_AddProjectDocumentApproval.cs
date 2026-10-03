using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PMWDS.Persistence.Migrations;

[Migration("20261003150000_AddProjectDocumentApproval")]
public partial class AddProjectDocumentApproval : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "ApprovalStatus",
            table: "ProjectDocuments",
            maxLength: 20,
            nullable: false,
            defaultValue: "NotRequired");

        migrationBuilder.AddColumn<string>(
            name: "ApprovedByUserId",
            table: "ProjectDocuments",
            maxLength: 100,
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "ApprovedOn",
            table: "ProjectDocuments",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "ApprovalNotes",
            table: "ProjectDocuments",
            maxLength: 2000,
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_ProjectDocuments_ApprovalStatus",
            table: "ProjectDocuments",
            column: "ApprovalStatus");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_ProjectDocuments_ApprovalStatus",
            table: "ProjectDocuments");

        migrationBuilder.DropColumn(name: "ApprovalStatus", table: "ProjectDocuments");
        migrationBuilder.DropColumn(name: "ApprovedByUserId", table: "ProjectDocuments");
        migrationBuilder.DropColumn(name: "ApprovedOn", table: "ProjectDocuments");
        migrationBuilder.DropColumn(name: "ApprovalNotes", table: "ProjectDocuments");
    }
}
