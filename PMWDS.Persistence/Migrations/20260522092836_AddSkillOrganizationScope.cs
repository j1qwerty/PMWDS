using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PMWDS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSkillOrganizationScope : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                table: "Skills",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Skills_OrganizationId",
                table: "Skills",
                column: "OrganizationId");

            migrationBuilder.AddForeignKey(
                name: "FK_Skills_Organizations_OrganizationId",
                table: "Skills",
                column: "OrganizationId",
                principalTable: "Organizations",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Skills_Organizations_OrganizationId",
                table: "Skills");

            migrationBuilder.DropIndex(
                name: "IX_Skills_OrganizationId",
                table: "Skills");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                table: "Skills");
        }
    }
}
