using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PMWDS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRoleKeys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (ActiveProvider.Contains("SqlServer"))
            {
                migrationBuilder.AddColumn<string>(
                    name: "Key",
                    table: "Roles",
                    type: "nvarchar(100)",
                    maxLength: 100,
                    nullable: true);
            }
            else
            {
                migrationBuilder.AddColumn<string>(
                    name: "Key",
                    table: "Roles",
                    type: "TEXT",
                    maxLength: 100,
                    nullable: true);
            }

            migrationBuilder.Sql("UPDATE Roles SET Key = 'superadmin' WHERE Name = 'SuperAdmin' AND (Key IS NULL OR Key = '')");
            migrationBuilder.Sql("UPDATE Roles SET Key = 'director' WHERE Name = 'Director' AND (Key IS NULL OR Key = '')");
            migrationBuilder.Sql("UPDATE Roles SET Key = 'project-manager' WHERE Name = 'ProjectManager' AND (Key IS NULL OR Key = '')");
            migrationBuilder.Sql("UPDATE Roles SET Key = 'department-head' WHERE Name = 'DepartmentHead' AND (Key IS NULL OR Key = '')");
            migrationBuilder.Sql("UPDATE Roles SET Key = 'team-member' WHERE Name = 'TeamMember' AND (Key IS NULL OR Key = '')");
            migrationBuilder.Sql("UPDATE Roles SET Key = 'viewer' WHERE Name = 'Viewer' AND (Key IS NULL OR Key = '')");

            if (ActiveProvider.Contains("SqlServer"))
            {
                migrationBuilder.Sql("UPDATE Roles SET Key = CONCAT('custom-', LEFT(LOWER(REPLACE(Name, ' ', '-')), 56), '-', LOWER(CONVERT(varchar(36), Id))) WHERE Key IS NULL OR Key = ''");
                migrationBuilder.AlterColumn<string>(
                    name: "Key",
                    table: "Roles",
                    type: "nvarchar(100)",
                    maxLength: 100,
                    nullable: false,
                    oldClrType: typeof(string),
                    oldType: "nvarchar(100)",
                    oldMaxLength: 100,
                    oldNullable: true);
            }
            else
            {
                migrationBuilder.Sql("UPDATE Roles SET Key = 'custom-' || substr(lower(replace(Name, ' ', '-')), 1, 56) || '-' || lower(Id) WHERE Key IS NULL OR Key = ''");
                migrationBuilder.AlterColumn<string>(
                    name: "Key",
                    table: "Roles",
                    type: "TEXT",
                    maxLength: 100,
                    nullable: false,
                    oldClrType: typeof(string),
                    oldType: "TEXT",
                    oldMaxLength: 100,
                    oldNullable: true);
            }

            migrationBuilder.CreateIndex(
                name: "IX_Roles_Key",
                table: "Roles",
                column: "Key",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Roles_Key",
                table: "Roles");

            migrationBuilder.DropColumn(
                name: "Key",
                table: "Roles");
        }
    }
}
