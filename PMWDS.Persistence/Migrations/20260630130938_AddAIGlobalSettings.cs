using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PMWDS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAIGlobalSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Organizations_TaxId",
                table: "Organizations");

            migrationBuilder.CreateTable(
                name: "AIGlobalSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    DefaultProvider = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    DefaultModel = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    RiskThreshold = table.Column<double>(type: "REAL", nullable: false),
                    UseLocalModel = table.Column<bool>(type: "INTEGER", nullable: false),
                    MLModelPath = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: false),
                    ModifiedBy = table.Column<string>(type: "TEXT", nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    RowVersion = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AIGlobalSettings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Organizations_TaxId",
                table: "Organizations",
                column: "TaxId",
                unique: true,
                filter: "[TaxId] IS NOT NULL AND [TaxId] <> ''");

            migrationBuilder.CreateIndex(
                name: "IX_AIGlobalSettings_DefaultProvider",
                table: "AIGlobalSettings",
                column: "DefaultProvider");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AIGlobalSettings");

            migrationBuilder.DropIndex(
                name: "IX_Organizations_TaxId",
                table: "Organizations");

            migrationBuilder.CreateIndex(
                name: "IX_Organizations_TaxId",
                table: "Organizations",
                column: "TaxId",
                unique: true);
        }
    }
}
