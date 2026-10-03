using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PMWDS.Persistence.Migrations;

[Migration("20261003160000_AddRoleDelegationFlag")]
public partial class AddRoleDelegationFlag : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "CanAssignLowerRoles",
            table: "Roles",
            nullable: false,
            defaultValue: false);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "CanAssignLowerRoles",
            table: "Roles");
    }
}
