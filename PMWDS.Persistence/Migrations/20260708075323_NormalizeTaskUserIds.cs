using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PMWDS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class NormalizeTaskUserIds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            var guidType = ActiveProvider.Contains("SqlServer") ? "uniqueidentifier" : "TEXT";
            var stringType = ActiveProvider.Contains("SqlServer") ? "nvarchar(max)" : "TEXT";

            migrationBuilder.DropForeignKey(
                name: "FK_Milestones_Projects_ProjectId",
                table: "Milestones");

            migrationBuilder.DropForeignKey(
                name: "FK_ProjectDepartments_Departments_DepartmentId",
                table: "ProjectDepartments");

            NormalizeNullableGuid(migrationBuilder, "Projects", "ProjectManagerId");
            NormalizeNullableGuid(migrationBuilder, "Tasks", "AssignedToUserId");
            NormalizeNullableGuid(migrationBuilder, "Tasks", "AIRecommendedAssigneeId");
            NormalizeNullableGuid(migrationBuilder, "TaskComments", "UserId");
            AssertRequiredGuid(migrationBuilder, "TaskAssignments", "UserId");
            AssertRequiredGuid(migrationBuilder, "TimeEntries", "UserId");

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "TaskComments",
                type: guidType,
                nullable: true,
                oldClrType: typeof(string),
                oldType: stringType);

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "TaskAssignments",
                type: guidType,
                nullable: false,
                oldClrType: typeof(string),
                oldType: stringType,
                oldMaxLength: 64);

            migrationBuilder.AlterColumn<Guid>(
                name: "AIRecommendedAssigneeId",
                table: "Tasks",
                type: guidType,
                nullable: true,
                oldClrType: typeof(string),
                oldType: stringType);

            migrationBuilder.AlterColumn<Guid>(
                name: "AssignedToUserId",
                table: "Tasks",
                type: guidType,
                nullable: true,
                oldClrType: typeof(string),
                oldType: stringType);

            migrationBuilder.AlterColumn<Guid>(
                name: "ProjectManagerId",
                table: "Projects",
                type: guidType,
                nullable: true,
                oldClrType: typeof(string),
                oldType: stringType);

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "TimeEntries",
                type: guidType,
                nullable: false,
                oldClrType: typeof(string),
                oldType: stringType,
                oldMaxLength: 64);

            migrationBuilder.CreateIndex(
                name: "IX_TimeEntries_IsDeleted",
                table: "TimeEntries",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_TimeEntries_IsDeleted_TaskId_UserId_StartTime",
                table: "TimeEntries",
                columns: new[] { "IsDeleted", "TaskId", "UserId", "StartTime" });

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_IsDeleted",
                table: "Tasks",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_IsDeleted_AssignedToUserId",
                table: "Tasks",
                columns: new[] { "IsDeleted", "AssignedToUserId" });

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_IsDeleted_MilestoneId",
                table: "Tasks",
                columns: new[] { "IsDeleted", "MilestoneId" });

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_IsDeleted_ProjectId_Status",
                table: "Tasks",
                columns: new[] { "IsDeleted", "ProjectId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_TaskAssignments_IsDeleted",
                table: "TaskAssignments",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_TaskAssignments_IsDeleted_TaskId_UserId_IsActive",
                table: "TaskAssignments",
                columns: new[] { "IsDeleted", "TaskId", "UserId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_IsDeleted",
                table: "Notifications",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_IsDeleted_UserId_IsRead_CreatedDate",
                table: "Notifications",
                columns: new[] { "IsDeleted", "UserId", "IsRead", "CreatedDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Milestones_IsDeleted",
                table: "Milestones",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_Milestones_IsDeleted_DepartmentId",
                table: "Milestones",
                columns: new[] { "IsDeleted", "DepartmentId" });

            migrationBuilder.CreateIndex(
                name: "IX_Milestones_IsDeleted_ProjectId_Status_DueDate",
                table: "Milestones",
                columns: new[] { "IsDeleted", "ProjectId", "Status", "DueDate" });

            migrationBuilder.AddForeignKey(
                name: "FK_Milestones_Projects_ProjectId",
                table: "Milestones",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ProjectDepartments_Departments_DepartmentId",
                table: "ProjectDepartments",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Projects_Users_ProjectManagerId",
                table: "Projects",
                column: "ProjectManagerId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_TaskAssignments_Users_UserId",
                table: "TaskAssignments",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Tasks_Users_AssignedToUserId",
                table: "Tasks",
                column: "AssignedToUserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_TimeEntries_Users_UserId",
                table: "TimeEntries",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            var guidType = ActiveProvider.Contains("SqlServer") ? "uniqueidentifier" : "TEXT";
            var stringType = ActiveProvider.Contains("SqlServer") ? "nvarchar(max)" : "TEXT";

            migrationBuilder.DropForeignKey(
                name: "FK_Milestones_Projects_ProjectId",
                table: "Milestones");

            migrationBuilder.DropForeignKey(
                name: "FK_ProjectDepartments_Departments_DepartmentId",
                table: "ProjectDepartments");

            migrationBuilder.DropForeignKey(
                name: "FK_Projects_Users_ProjectManagerId",
                table: "Projects");

            migrationBuilder.DropForeignKey(
                name: "FK_TaskAssignments_Users_UserId",
                table: "TaskAssignments");

            migrationBuilder.DropForeignKey(
                name: "FK_Tasks_Users_AssignedToUserId",
                table: "Tasks");

            migrationBuilder.DropForeignKey(
                name: "FK_TimeEntries_Users_UserId",
                table: "TimeEntries");

            migrationBuilder.DropIndex(
                name: "IX_TimeEntries_IsDeleted",
                table: "TimeEntries");

            migrationBuilder.DropIndex(
                name: "IX_TimeEntries_IsDeleted_TaskId_UserId_StartTime",
                table: "TimeEntries");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_IsDeleted",
                table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_IsDeleted_AssignedToUserId",
                table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_IsDeleted_MilestoneId",
                table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_IsDeleted_ProjectId_Status",
                table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_TaskAssignments_IsDeleted",
                table: "TaskAssignments");

            migrationBuilder.DropIndex(
                name: "IX_TaskAssignments_IsDeleted_TaskId_UserId_IsActive",
                table: "TaskAssignments");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_IsDeleted",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_IsDeleted_UserId_IsRead_CreatedDate",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Milestones_IsDeleted",
                table: "Milestones");

            migrationBuilder.DropIndex(
                name: "IX_Milestones_IsDeleted_DepartmentId",
                table: "Milestones");

            migrationBuilder.DropIndex(
                name: "IX_Milestones_IsDeleted_ProjectId_Status_DueDate",
                table: "Milestones");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "TaskComments",
                type: stringType,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(Guid),
                oldType: guidType,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "TaskAssignments",
                type: stringType,
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: guidType);

            migrationBuilder.AlterColumn<string>(
                name: "AIRecommendedAssigneeId",
                table: "Tasks",
                type: stringType,
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: guidType,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AssignedToUserId",
                table: "Tasks",
                type: stringType,
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: guidType,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ProjectManagerId",
                table: "Projects",
                type: stringType,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(Guid),
                oldType: guidType,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "TimeEntries",
                type: stringType,
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: guidType);

            migrationBuilder.AddForeignKey(
                name: "FK_Milestones_Projects_ProjectId",
                table: "Milestones",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ProjectDepartments_Departments_DepartmentId",
                table: "ProjectDepartments",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        private void NormalizeNullableGuid(MigrationBuilder migrationBuilder, string tableName, string columnName)
        {
            if (ActiveProvider.Contains("SqlServer"))
            {
                migrationBuilder.Sql($"""
                    UPDATE [{tableName}]
                    SET [{columnName}] = NULL
                    WHERE [{columnName}] IS NOT NULL
                      AND TRY_CONVERT(uniqueidentifier, [{columnName}]) IS NULL
                    """);
            }
            else
            {
                migrationBuilder.Sql($"""
                    UPDATE "{tableName}"
                    SET "{columnName}" = NULL
                    WHERE "{columnName}" = ''
                       OR lower("{columnName}") = 'system'
                    """);
            }
        }

        private void AssertRequiredGuid(MigrationBuilder migrationBuilder, string tableName, string columnName)
        {
            if (ActiveProvider.Contains("SqlServer"))
            {
                migrationBuilder.Sql($"""
                    IF EXISTS (
                        SELECT 1
                        FROM [{tableName}]
                        WHERE TRY_CONVERT(uniqueidentifier, [{columnName}]) IS NULL
                    )
                    BEGIN
                        THROW 51000, '{tableName}.{columnName} contains values that cannot be converted to uniqueidentifier.', 1;
                    END
                    """);
            }
        }
    }
}
