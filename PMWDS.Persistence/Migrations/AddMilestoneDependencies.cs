using System;
using Microsoft.EntityFrameworkCore.Migrations;

namespace PMWDS.Persistence.Migrations;

public partial class AddMilestoneDependencies : Migration
{
    protected override void Up(MigrationBuilder m)
    {
        m.CreateTable("MilestoneDependencies", t => new
        {
            Id = t.Column<Guid>(nullable: false),
            ProjectId = t.Column<Guid>(nullable: false),
            PrerequisiteMilestoneId = t.Column<Guid>(nullable: false),
            DependentMilestoneId = t.Column<Guid>(nullable: false),
            Type = t.Column<string>(maxLength: 30, nullable: false),
            ThresholdPercentage = t.Column<decimal>(type: "decimal(5,2)", nullable: true),
            CreatedDate = t.Column<DateTime>(nullable: false),
            CreatedBy = t.Column<string>(nullable: false),
            ModifiedDate = t.Column<DateTime>(nullable: true),
            ModifiedBy = t.Column<string>(nullable: true),
            IsDeleted = t.Column<bool>(nullable: false),
            RowVersion = t.Column<int>(nullable: false),
            Notes = t.Column<string>(nullable: true),
            Tags = t.Column<string>(nullable: true),
            IsActive = t.Column<bool>(nullable: false)
        }, constraints: t =>
        {
            t.PrimaryKey("PK_MilestoneDependencies", x => x.Id);
            t.ForeignKey(
                name: "FK_MilestoneDependencies_Projects_ProjectId",
                column: x => x.ProjectId,
                principalTable: "Projects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
            t.ForeignKey(
                name: "FK_MilestoneDependencies_Milestones_PrerequisiteMilestoneId",
                column: x => x.PrerequisiteMilestoneId,
                principalTable: "Milestones",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
            t.ForeignKey(
                name: "FK_MilestoneDependencies_Milestones_DependentMilestoneId",
                column: x => x.DependentMilestoneId,
                principalTable: "Milestones",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        });

        m.CreateIndex(
            name: "IX_MilestoneDependencies_ProjectId",
            table: "MilestoneDependencies",
            column: "ProjectId");

        m.CreateIndex(
            name: "IX_MilestoneDependencies_PrerequisiteMilestoneId",
            table: "MilestoneDependencies",
            column: "PrerequisiteMilestoneId");

        m.CreateIndex(
            name: "IX_MilestoneDependencies_DependentMilestoneId",
            table: "MilestoneDependencies",
            column: "DependentMilestoneId");
    }

    protected override void Down(MigrationBuilder m)
    {
        m.DropTable("MilestoneDependencies");
    }
}
