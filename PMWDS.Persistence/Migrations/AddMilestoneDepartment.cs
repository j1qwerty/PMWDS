using System;
using Microsoft.EntityFrameworkCore.Migrations;

namespace PMWDS.Persistence.Migrations;

public partial class AddMilestoneDepartment : Migration
{
    protected override void Up(MigrationBuilder m)
    {
        m.AddColumn<Guid>(
            name: "DepartmentId",
            table: "Milestones",
            nullable: true);

        m.CreateIndex(
            name: "IX_Milestones_DepartmentId",
            table: "Milestones",
            column: "DepartmentId");

        m.AddForeignKey(
            name: "FK_Milestones_Departments_DepartmentId",
            table: "Milestones",
            column: "DepartmentId",
            principalTable: "Departments",
            principalColumn: "Id",
            onDelete: ReferentialAction.SetNull);
    }

    protected override void Down(MigrationBuilder m)
    {
        m.DropForeignKey(
            name: "FK_Milestones_Departments_DepartmentId",
            table: "Milestones");

        m.DropIndex(
            name: "IX_Milestones_DepartmentId",
            table: "Milestones");

        m.DropColumn(
            name: "DepartmentId",
            table: "Milestones");
    }
}
