using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PMWDS.Persistence.Migrations;

public partial class AddGoalsAndBudgetWorkflow : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Goals",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "TEXT", nullable: false),
                ProjectId = table.Column<Guid>(type: "TEXT", nullable: false),
                AssignedDepartmentId = table.Column<Guid>(type: "TEXT", nullable: false),
                Title = table.Column<string>(maxLength: 300, nullable: false),
                Description = table.Column<string>(maxLength: 4000, nullable: false),
                Priority = table.Column<string>(maxLength: 20, nullable: false),
                Status = table.Column<string>(maxLength: 20, nullable: false),
                DueDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                ProgressPercentage = table.Column<double>(type: "REAL", nullable: false),
                CreatedDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                CreatedBy = table.Column<string>(nullable: false),
                ModifiedDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                ModifiedBy = table.Column<string>(nullable: true),
                IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false),
                RowVersion = table.Column<int>(type: "INTEGER", nullable: false),
                Notes = table.Column<string>(nullable: true),
                Tags = table.Column<string>(nullable: true),
                IsActive = table.Column<bool>(type: "INTEGER", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Goals", x => x.Id);
                table.ForeignKey("FK_Goals_Projects_ProjectId", x => x.ProjectId, "Projects", "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_Goals_Departments_AssignedDepartmentId", x => x.AssignedDepartmentId, "Departments", "Id", onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex("IX_Goals_ProjectId", "Goals", "ProjectId");
        migrationBuilder.CreateIndex("IX_Goals_ProjectId_AssignedDepartmentId", "Goals", new[] { "ProjectId", "AssignedDepartmentId" });
        migrationBuilder.CreateIndex("IX_Goals_Status", "Goals", "Status");
        migrationBuilder.CreateIndex("IX_Goals_DueDate", "Goals", "DueDate");

        migrationBuilder.CreateTable(
            name: "GoalTransfers",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "TEXT", nullable: false),
                GoalId = table.Column<Guid>(type: "TEXT", nullable: false),
                FromDepartmentId = table.Column<Guid>(type: "TEXT", nullable: false),
                ToDepartmentId = table.Column<Guid>(type: "TEXT", nullable: false),
                RequestedByUserId = table.Column<string>(maxLength: 100, nullable: false),
                RequestedOn = table.Column<DateTime>(type: "TEXT", nullable: false),
                Status = table.Column<string>(maxLength: 20, nullable: false),
                Reason = table.Column<string>(maxLength: 2000, nullable: true),
                ReviewedByUserId = table.Column<string>(maxLength: 100, nullable: true),
                ReviewedOn = table.Column<DateTime>(type: "TEXT", nullable: true),
                ReviewNotes = table.Column<string>(maxLength: 2000, nullable: true),
                CreatedDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                CreatedBy = table.Column<string>(nullable: false),
                ModifiedDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                ModifiedBy = table.Column<string>(nullable: true),
                IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false),
                RowVersion = table.Column<int>(type: "INTEGER", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_GoalTransfers", x => x.Id);
                table.ForeignKey("FK_GoalTransfers_Goals_GoalId", x => x.GoalId, "Goals", "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_GoalTransfers_Departments_FromDepartmentId", x => x.FromDepartmentId, "Departments", "Id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_GoalTransfers_Departments_ToDepartmentId", x => x.ToDepartmentId, "Departments", "Id", onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex("IX_GoalTransfers_GoalId", "GoalTransfers", "GoalId");
        migrationBuilder.CreateIndex("IX_GoalTransfers_GoalId_Status", "GoalTransfers", new[] { "GoalId", "Status" });

        migrationBuilder.CreateTable(
            name: "GoalBudgetAllocations",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "TEXT", nullable: false),
                GoalId = table.Column<Guid>(type: "TEXT", nullable: false),
                DepartmentId = table.Column<Guid>(type: "TEXT", nullable: false),
                Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                Status = table.Column<string>(maxLength: 20, nullable: false),
                SupersedesAllocationId = table.Column<Guid>(type: "TEXT", nullable: true),
                Reason = table.Column<string>(maxLength: 2000, nullable: true),
                CreatedDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                CreatedBy = table.Column<string>(nullable: false),
                ModifiedDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                ModifiedBy = table.Column<string>(nullable: true),
                IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false),
                RowVersion = table.Column<int>(type: "INTEGER", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_GoalBudgetAllocations", x => x.Id);
                table.ForeignKey("FK_GoalBudgetAllocations_Goals_GoalId", x => x.GoalId, "Goals", "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_GoalBudgetAllocations_Departments_DepartmentId", x => x.DepartmentId, "Departments", "Id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_GoalBudgetAllocations_GoalBudgetAllocations_SupersedesAllocationId", x => x.SupersedesAllocationId, "GoalBudgetAllocations", "Id", onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex("IX_GoalBudgetAllocations_GoalId", "GoalBudgetAllocations", "GoalId");
        migrationBuilder.CreateIndex("IX_GoalBudgetAllocations_GoalId_Status", "GoalBudgetAllocations", new[] { "GoalId", "Status" });
        migrationBuilder.CreateIndex("IX_GoalBudgetAllocations_DepartmentId", "GoalBudgetAllocations", "DepartmentId");
        migrationBuilder.CreateIndex("IX_GoalBudgetAllocations_SupersedesAllocationId", "GoalBudgetAllocations", "SupersedesAllocationId");

        migrationBuilder.CreateTable(
            name: "BudgetReleases",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "TEXT", nullable: false),
                GoalBudgetAllocationId = table.Column<Guid>(type: "TEXT", nullable: false),
                AmountRequested = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                AmountApproved = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                Status = table.Column<string>(maxLength: 20, nullable: false),
                RequiredConditionsJson = table.Column<string>(type: "TEXT", nullable: false),
                SatisfiedConditionsJson = table.Column<string>(type: "TEXT", nullable: false),
                Justification = table.Column<string>(maxLength: 2000, nullable: true),
                RequestedByUserId = table.Column<string>(maxLength: 100, nullable: false),
                RequestedOn = table.Column<DateTime>(type: "TEXT", nullable: false),
                ReviewedByUserId = table.Column<string>(maxLength: 100, nullable: true),
                ReviewedOn = table.Column<DateTime>(type: "TEXT", nullable: true),
                ReviewNotes = table.Column<string>(maxLength: 2000, nullable: true),
                CreatedDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                CreatedBy = table.Column<string>(nullable: false),
                ModifiedDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                ModifiedBy = table.Column<string>(nullable: true),
                IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false),
                RowVersion = table.Column<int>(type: "INTEGER", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_BudgetReleases", x => x.Id);
                table.ForeignKey("FK_BudgetReleases_GoalBudgetAllocations_GoalBudgetAllocationId", x => x.GoalBudgetAllocationId, "GoalBudgetAllocations", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex("IX_BudgetReleases_GoalBudgetAllocationId", "BudgetReleases", "GoalBudgetAllocationId");
        migrationBuilder.CreateIndex("IX_BudgetReleases_GoalBudgetAllocationId_Status", "BudgetReleases", new[] { "GoalBudgetAllocationId", "Status" });
        migrationBuilder.CreateIndex("IX_BudgetReleases_RequestedOn", "BudgetReleases", "RequestedOn");

        migrationBuilder.CreateTable(
            name: "BudgetExpenditures",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "TEXT", nullable: false),
                GoalBudgetAllocationId = table.Column<Guid>(type: "TEXT", nullable: false),
                BudgetReleaseId = table.Column<Guid>(type: "TEXT", nullable: true),
                DocumentId = table.Column<Guid>(type: "TEXT", nullable: true),
                Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                SpentOn = table.Column<DateTime>(type: "TEXT", nullable: false),
                Description = table.Column<string>(maxLength: 4000, nullable: false),
                InvoiceNumber = table.Column<string>(maxLength: 200, nullable: true),
                EnteredByUserId = table.Column<string>(maxLength: 100, nullable: false),
                CreatedDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                CreatedBy = table.Column<string>(nullable: false),
                ModifiedDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                ModifiedBy = table.Column<string>(nullable: true),
                IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false),
                RowVersion = table.Column<int>(type: "INTEGER", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_BudgetExpenditures", x => x.Id);
                table.ForeignKey("FK_BudgetExpenditures_GoalBudgetAllocations_GoalBudgetAllocationId", x => x.GoalBudgetAllocationId, "GoalBudgetAllocations", "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_BudgetExpenditures_BudgetReleases_BudgetReleaseId", x => x.BudgetReleaseId, "BudgetReleases", "Id", onDelete: ReferentialAction.SetNull);
                table.ForeignKey("FK_BudgetExpenditures_ProjectDocuments_DocumentId", x => x.DocumentId, "ProjectDocuments", "Id", onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateIndex("IX_BudgetExpenditures_GoalBudgetAllocationId", "BudgetExpenditures", "GoalBudgetAllocationId");
        migrationBuilder.CreateIndex("IX_BudgetExpenditures_BudgetReleaseId", "BudgetExpenditures", "BudgetReleaseId");
        migrationBuilder.CreateIndex("IX_BudgetExpenditures_DocumentId", "BudgetExpenditures", "DocumentId");
        migrationBuilder.CreateIndex("IX_BudgetExpenditures_SpentOn", "BudgetExpenditures", "SpentOn");

        migrationBuilder.AddColumn<Guid?>(
            name: "GoalId",
            table: "Milestones",
            type: "TEXT",
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_Milestones_GoalId",
            table: "Milestones",
            column: "GoalId");

        migrationBuilder.AddForeignKey(
            name: "FK_Milestones_Goals_GoalId",
            table: "Milestones",
            column: "GoalId",
            principalTable: "Goals",
            principalColumn: "Id",
            onDelete: ReferentialAction.SetNull);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey("FK_Milestones_Goals_GoalId", "Milestones");
        migrationBuilder.DropIndex("IX_Milestones_GoalId", "Milestones");
        migrationBuilder.DropColumn("GoalId", "Milestones");

        migrationBuilder.DropTable("BudgetExpenditures");
        migrationBuilder.DropTable("BudgetReleases");
        migrationBuilder.DropTable("GoalBudgetAllocations");
        migrationBuilder.DropTable("GoalTransfers");
        migrationBuilder.DropTable("Goals");
    }
}
