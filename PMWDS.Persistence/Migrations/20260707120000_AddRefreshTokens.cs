using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PMWDS.Persistence.Migrations;

public partial class AddRefreshTokens : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "AccessTokenVersion",
            table: "Users",
            type: "int",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<string>(
            name: "RefreshTokenHash",
            table: "Users",
            type: "nvarchar(128)",
            maxLength: 128,
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "RefreshTokenExpiresAt",
            table: "Users",
            type: "datetime2",
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "RefreshTokenRevokedAt",
            table: "Users",
            type: "datetime2",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "AccessTokenVersion",
            table: "Users");

        migrationBuilder.DropColumn(
            name: "RefreshTokenHash",
            table: "Users");

        migrationBuilder.DropColumn(
            name: "RefreshTokenExpiresAt",
            table: "Users");

        migrationBuilder.DropColumn(
            name: "RefreshTokenRevokedAt",
            table: "Users");
    }
}
