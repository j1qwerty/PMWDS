using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PMWDS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAiFeatureCoverage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AIModels",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Version = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    ModelType = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    LastTrainedDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    AccuracyScore = table.Column<double>(type: "REAL", nullable: false),
                    PrecisionScore = table.Column<double>(type: "REAL", nullable: false),
                    RecallScore = table.Column<double>(type: "REAL", nullable: false),
                    ModelPath = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    HyperparametersJson = table.Column<string>(type: "TEXT", nullable: false),
                    FeaturesJson = table.Column<string>(type: "TEXT", nullable: false),
                    ModelDiscriminator = table.Column<string>(type: "TEXT", maxLength: 21, nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: false),
                    ModifiedBy = table.Column<string>(type: "TEXT", nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    RowVersion = table.Column<int>(type: "INTEGER", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: true),
                    Tags = table.Column<string>(type: "TEXT", nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AIModels", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TrainingDataPoints",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    DataType = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    FeaturesJson = table.Column<string>(type: "TEXT", nullable: false),
                    LabelsJson = table.Column<string>(type: "TEXT", nullable: false),
                    Source = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: false),
                    ModifiedBy = table.Column<string>(type: "TEXT", nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    RowVersion = table.Column<int>(type: "INTEGER", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: true),
                    Tags = table.Column<string>(type: "TEXT", nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrainingDataPoints", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AllocationRecommendations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TaskId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ModelId = table.Column<Guid>(type: "TEXT", nullable: false),
                    RecommendedUserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    MatchScore = table.Column<double>(type: "REAL", nullable: false),
                    RationaleJson = table.Column<string>(type: "TEXT", nullable: false),
                    FeatureScoresJson = table.Column<string>(type: "TEXT", nullable: false),
                    AlternativesJson = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    DecisionReason = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: false),
                    ModifiedBy = table.Column<string>(type: "TEXT", nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    RowVersion = table.Column<int>(type: "INTEGER", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: true),
                    Tags = table.Column<string>(type: "TEXT", nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AllocationRecommendations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AllocationRecommendations_AIModels_ModelId",
                        column: x => x.ModelId,
                        principalTable: "AIModels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AllocationRecommendations_Tasks_TaskId",
                        column: x => x.TaskId,
                        principalTable: "Tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DelayPredictions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TaskId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ModelId = table.Column<Guid>(type: "TEXT", nullable: false),
                    DelayProbability = table.Column<double>(type: "REAL", nullable: false),
                    ExpectedDelayDays = table.Column<int>(type: "INTEGER", nullable: false),
                    PredictedCompletionDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ContributingFactorsJson = table.Column<string>(type: "TEXT", nullable: false),
                    FactorWeightsJson = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: false),
                    ModifiedBy = table.Column<string>(type: "TEXT", nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    RowVersion = table.Column<int>(type: "INTEGER", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: true),
                    Tags = table.Column<string>(type: "TEXT", nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DelayPredictions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DelayPredictions_AIModels_ModelId",
                        column: x => x.ModelId,
                        principalTable: "AIModels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DelayPredictions_Tasks_TaskId",
                        column: x => x.TaskId,
                        principalTable: "Tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PredictionResults",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ModelId = table.Column<Guid>(type: "TEXT", nullable: false),
                    TaskId = table.Column<Guid>(type: "TEXT", nullable: true),
                    PredictionDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    InputFeaturesJson = table.Column<string>(type: "TEXT", nullable: false),
                    OutputPredictionsJson = table.Column<string>(type: "TEXT", nullable: false),
                    ConfidenceScore = table.Column<double>(type: "REAL", nullable: false),
                    Recommendation = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: false),
                    ModifiedBy = table.Column<string>(type: "TEXT", nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    RowVersion = table.Column<int>(type: "INTEGER", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: true),
                    Tags = table.Column<string>(type: "TEXT", nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PredictionResults", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PredictionResults_AIModels_ModelId",
                        column: x => x.ModelId,
                        principalTable: "AIModels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PredictionResults_Tasks_TaskId",
                        column: x => x.TaskId,
                        principalTable: "Tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AIModels_ModelType_Name_Version",
                table: "AIModels",
                columns: new[] { "ModelType", "Name", "Version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AllocationRecommendations_ModelId",
                table: "AllocationRecommendations",
                column: "ModelId");

            migrationBuilder.CreateIndex(
                name: "IX_AllocationRecommendations_RecommendedUserId",
                table: "AllocationRecommendations",
                column: "RecommendedUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AllocationRecommendations_TaskId",
                table: "AllocationRecommendations",
                column: "TaskId");

            migrationBuilder.CreateIndex(
                name: "IX_DelayPredictions_ModelId",
                table: "DelayPredictions",
                column: "ModelId");

            migrationBuilder.CreateIndex(
                name: "IX_DelayPredictions_PredictedCompletionDate",
                table: "DelayPredictions",
                column: "PredictedCompletionDate");

            migrationBuilder.CreateIndex(
                name: "IX_DelayPredictions_TaskId",
                table: "DelayPredictions",
                column: "TaskId");

            migrationBuilder.CreateIndex(
                name: "IX_PredictionResults_ModelId",
                table: "PredictionResults",
                column: "ModelId");

            migrationBuilder.CreateIndex(
                name: "IX_PredictionResults_PredictionDate",
                table: "PredictionResults",
                column: "PredictionDate");

            migrationBuilder.CreateIndex(
                name: "IX_PredictionResults_TaskId",
                table: "PredictionResults",
                column: "TaskId");

            migrationBuilder.CreateIndex(
                name: "IX_TrainingDataPoints_DataType",
                table: "TrainingDataPoints",
                column: "DataType");

            migrationBuilder.CreateIndex(
                name: "IX_TrainingDataPoints_Source",
                table: "TrainingDataPoints",
                column: "Source");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AllocationRecommendations");

            migrationBuilder.DropTable(
                name: "DelayPredictions");

            migrationBuilder.DropTable(
                name: "PredictionResults");

            migrationBuilder.DropTable(
                name: "TrainingDataPoints");

            migrationBuilder.DropTable(
                name: "AIModels");
        }
    }
}
