using System.Net;
using System.Text.Json;
using FluentAssertions;
using PMWDS.Tests.Infrastructure;
using Xunit;

namespace PMWDS.Tests;

[Collection(ApiCollection.Name)]
public sealed class GoalBudgetIntegrationTests
{
    private readonly ApiFixture _fixture;

    public GoalBudgetIntegrationTests(ApiFixture fixture) => _fixture = fixture;

    [Fact]
    public async Task Goal_can_be_created_and_milestone_can_be_bound_to_it()
    {
        var client = _fixture.SuperAdmin.Client;
        var department = await WizardFlowTests.FirstDepartmentAsync(client);
        await using var project = await TestProject.CreateAsync(client, "Goal Integration Project");

        var created = await client.PostAsync<JsonElement>("/api/v1/goals", new
        {
            projectId = project.ProjectId,
            assignedDepartmentId = department,
            title = "Deliver site readiness",
            description = "Goal created by the integration suite.",
            priority = "High",
            dueDate = new DateTime(2026, 11, 30),
        });

        created.Status.Should().Be(HttpStatusCode.Created);
        var goalId = created.Data.GetGuid("id");

        var milestone = await client.PostAsync<JsonElement>("/api/v1/milestones", new
        {
            projectId = project.ProjectId,
            goalId,
            name = "Readiness milestone",
            description = "Bound to the goal.",
            dueDate = new DateTime(2026, 11, 20),
            order = 1,
            departmentId = department,
            isCritical = false,
        });

        milestone.Status.Should().Be(HttpStatusCode.Created);
        milestone.Data.GetGuid("goalId").Should().Be(goalId);

        var read = await client.GetAsync<JsonElement>($"/api/v1/goals/{goalId}");
        read.Status.Should().Be(HttpStatusCode.OK);
        read.Data.GetGuid("id").Should().Be(goalId);
        read.Data.GetProperty("milestoneCount").GetInt32().Should().Be(1);
    }

    [Fact]
    public async Task Goal_budget_supports_allocation_release_partial_approval_and_expenditure()
    {
        var client = _fixture.SuperAdmin.Client;
        var department = await WizardFlowTests.FirstDepartmentAsync(client);
        await using var project = await TestProject.CreateAsync(client, "Budget Workflow Project");

        var goal = await client.PostAsync<JsonElement>("/api/v1/goals", new
        {
            projectId = project.ProjectId,
            assignedDepartmentId = department,
            title = "Fund delivery",
            description = "Budget lifecycle integration test.",
            priority = "Critical",
            dueDate = new DateTime(2026, 12, 15),
        });
        goal.Status.Should().Be(HttpStatusCode.Created);
        var goalId = goal.Data.GetGuid("id");

        var allocation = await client.PostAsync<JsonElement>("/api/v1/budgets/allocations", new
        {
            goalId,
            amount = 100000m,
            reason = "Initial goal allocation",
        });
        allocation.Status.Should().Be(HttpStatusCode.OK);
        var allocationId = allocation.Data.GetGuid("id");

        var release = await client.PostAsync<JsonElement>("/api/v1/budgets/releases", new
        {
            goalBudgetAllocationId = allocationId,
            amountRequested = 80000m,
            requiredConditions = new Dictionary<string, bool>
            {
                ["goalProgress"] = true,
                ["documentApproval"] = true,
            },
            satisfiedConditions = new Dictionary<string, bool>
            {
                ["goalProgress"] = true,
                ["documentApproval"] = true,
            },
            justification = "Release tranche one.",
        });
        release.Status.Should().Be(HttpStatusCode.OK);
        var releaseId = release.Data.GetGuid("id");

        var approved = await client.PostAsync<JsonElement>($"/api/v1/budgets/releases/{releaseId}/review", new
        {
            decision = "Approved",
            approvedAmount = 60000m,
            notes = "Partial approval.",
        });
        approved.Status.Should().Be(HttpStatusCode.OK);
        approved.Data.GetProperty("amountApproved").GetDecimal().Should().Be(60000m);

        var expenditure = await client.PostAsync<JsonElement>("/api/v1/budgets/expenditures", new
        {
            goalBudgetAllocationId = allocationId,
            budgetReleaseId = releaseId,
            amount = 25000m,
            spentOn = new DateTime(2026, 10, 3),
            description = "Verified project expenditure.",
            invoiceNumber = "INV-INT-001",
        });
        expenditure.Status.Should().Be(HttpStatusCode.OK);

        var summary = await client.GetAsync<JsonElement>($"/api/v1/budgets/goals/{goalId}/summary");
        summary.Status.Should().Be(HttpStatusCode.OK);
        summary.Data.GetProperty("allocated").GetDecimal().Should().Be(100000m);
        summary.Data.GetProperty("released").GetDecimal().Should().Be(60000m);
        summary.Data.GetProperty("spent").GetDecimal().Should().Be(25000m);
    }

    [Fact]
    public async Task Budget_release_cannot_be_approved_until_conditions_are_satisfied()
    {
        var client = _fixture.SuperAdmin.Client;
        var department = await WizardFlowTests.FirstDepartmentAsync(client);
        await using var project = await TestProject.CreateAsync(client, "Budget Conditions Project");

        var goal = await client.PostAsync<JsonElement>("/api/v1/goals", new
        {
            projectId = project.ProjectId,
            assignedDepartmentId = department,
            title = "Conditional release",
            description = "Conditions must gate approval.",
            priority = "Medium",
            dueDate = new DateTime(2026, 12, 15),
        });
        goal.Status.Should().Be(HttpStatusCode.Created);
        var goalId = goal.Data.GetGuid("id");

        var allocation = await client.PostAsync<JsonElement>("/api/v1/budgets/allocations", new
        {
            goalId,
            amount = 50000m,
            reason = "Conditional allocation",
        });
        allocation.Status.Should().Be(HttpStatusCode.OK);

        var release = await client.PostAsync<JsonElement>("/api/v1/budgets/releases", new
        {
            goalBudgetAllocationId = allocation.Data.GetGuid("id"),
            amountRequested = 25000m,
            requiredConditions = new Dictionary<string, bool>
            {
                ["goalProgress"] = true,
            },
            satisfiedConditions = new Dictionary<string, bool>
            {
                ["goalProgress"] = false,
            },
            justification = "Waiting for progress evidence.",
        });
        release.Status.Should().Be(HttpStatusCode.OK);

        var review = await client.PostAsync<JsonElement>(
            $"/api/v1/budgets/releases/{release.Data.GetGuid("id")}/review",
            new
            {
                decision = "Approved",
                approvedAmount = 25000m,
                notes = "Should be blocked.",
            });

        review.Status.Should().Be(HttpStatusCode.Conflict);
    }
}
