using System.Net;
using System.Text.Json;
using FluentAssertions;
using PMWDS.Tests.Infrastructure;
using Xunit;

namespace PMWDS.Tests;

/// <summary>Regression coverage for authorization and cross-aggregate integrity fixes.</summary>
[Collection(ApiCollection.Name)]
public sealed class BackendIntegrityTests
{
    private readonly ApiFixture _fixture;

    public BackendIntegrityTests(ApiFixture fixture) => _fixture = fixture;

    [Fact]
    public async Task Task_cannot_reference_a_milestone_from_another_project()
    {
        var client = _fixture.SuperAdmin.Client;
        var department = await WizardFlowTests.FirstDepartmentAsync(client);

        var first = await new WizardBuilder(client)
            .WithName("Integrity Project One")
            .WithCode($"INT-A-{Guid.NewGuid():N}"[..16])
            .WithDepartments(department)
            .BuildAsync();

        var second = await new WizardBuilder(client)
            .WithName("Integrity Project Two")
            .WithCode($"INT-B-{Guid.NewGuid():N}"[..16])
            .WithDepartments(department)
            .WithMilestone("Other Project Milestone", new DateTime(2026, 11, 30))
            .BuildAsync();

        try
        {
            var milestoneId = second.MilestoneIds.Single();
            var response = await client.PostAsync<JsonElement>("/api/v1/tasks", new
            {
                title = "Cross Project Task",
                description = "Must be rejected.",
                startDate = new DateTime(2026, 10, 1),
                dueDate = new DateTime(2026, 10, 10),
                estimatedHours = 4f,
                projectId = first.ProjectId,
                milestoneId,
                assignedToUserId = (string?)null,
                priority = "Medium",
            });

            response.Status.Should().Be(HttpStatusCode.Conflict);
        }
        finally
        {
            await client.DeleteAsync<JsonElement>($"/api/v1/projects/{first.ProjectId}");
            await client.DeleteAsync<JsonElement>($"/api/v1/projects/{second.ProjectId}");
        }
    }

    [Fact]
    public async Task Removed_task_assignee_no_longer_has_work_access()
    {
        var client = _fixture.SuperAdmin.Client;
        var department = await WizardFlowTests.FirstDepartmentAsync(client);

        var graph = await new WizardBuilder(client)
            .WithName("Assignment Integrity Project")
            .WithCode($"INT-C-{Guid.NewGuid():N}"[..16])
            .WithDepartments(department)
            .BuildAsync();

        try
        {
            var task = await client.PostAsync<JsonElement>("/api/v1/tasks", new
            {
                title = "Assignment Integrity Task",
                description = "Assignment access must follow active assignment state.",
                startDate = new DateTime(2026, 10, 1),
                dueDate = new DateTime(2026, 10, 10),
                estimatedHours = 4f,
                projectId = graph.ProjectId,
                milestoneId = (Guid?)null,
                assignedToUserId = _fixture.TeamMember.UserId,
                priority = "Medium",
            });
            task.Status.Should().Be(HttpStatusCode.Created);
            var taskId = task.Data.GetGuid("id");

            var teamMemberComment = await _fixture.TeamMember.Client.PostAsync<JsonElement>(
                $"/api/v1/tasks/{taskId}/comments",
                new { comment = "I can work on this." });
            teamMemberComment.Status.Should().Be(HttpStatusCode.OK);

            var reassigned = await client.PostAsync<JsonElement>($"/api/v1/tasks/{taskId}/assign", new
            {
                assigneeId = _fixture.Viewer.UserId,
                useAIRecommendation = false,
            });
            reassigned.Status.Should().Be(HttpStatusCode.OK);

            var oldAssigneeComment = await _fixture.TeamMember.Client.PostAsync<JsonElement>(
                $"/api/v1/tasks/{taskId}/comments",
                new { comment = "I should no longer have access." });
            oldAssigneeComment.Status.Should().Be(HttpStatusCode.Forbidden);
        }
        finally
        {
            await client.DeleteAsync<JsonElement>($"/api/v1/projects/{graph.ProjectId}");
        }
    }

    [Fact]
    public async Task Task_dependency_rejects_duplicates_cross_project_edges_and_cycles()
    {
        var client = _fixture.SuperAdmin.Client;
        var department = await WizardFlowTests.FirstDepartmentAsync(client);

        var first = await new WizardBuilder(client)
            .WithName("Dependency Integrity Project")
            .WithCode($"INT-D-{Guid.NewGuid():N}"[..16])
            .WithDepartments(department)
            .BuildAsync();

        var second = await new WizardBuilder(client)
            .WithName("Dependency Other Project")
            .WithCode($"INT-E-{Guid.NewGuid():N}"[..16])
            .WithDepartments(department)
            .BuildAsync();

        try
        {
            var a = await CreateTaskAsync(client, first.ProjectId, "A");
            var b = await CreateTaskAsync(client, first.ProjectId, "B");
            var c = await CreateTaskAsync(client, first.ProjectId, "C");
            var external = await CreateTaskAsync(client, second.ProjectId, "External");

            var ab = await client.PostAsync<JsonElement>($"/api/v1/tasks/{a}/dependencies", new
            {
                predecessorTaskId = a,
                successorTaskId = b,
                type = "FinishToStart",
                lagDays = 0,
            });
            ab.Status.Should().Be(HttpStatusCode.OK);

            var duplicate = await client.PostAsync<JsonElement>($"/api/v1/tasks/{a}/dependencies", new
            {
                predecessorTaskId = a,
                successorTaskId = b,
                type = "FinishToStart",
                lagDays = 0,
            });
            duplicate.Status.Should().Be(HttpStatusCode.Conflict);

            var crossProject = await client.PostAsync<JsonElement>($"/api/v1/tasks/{a}/dependencies", new
            {
                predecessorTaskId = a,
                successorTaskId = external,
                type = "FinishToStart",
                lagDays = 0,
            });
            crossProject.Status.Should().Be(HttpStatusCode.BadRequest);

            var bc = await client.PostAsync<JsonElement>($"/api/v1/tasks/{b}/dependencies", new
            {
                predecessorTaskId = b,
                successorTaskId = c,
                type = "FinishToStart",
                lagDays = 0,
            });
            bc.Status.Should().Be(HttpStatusCode.OK);

            var cycle = await client.PostAsync<JsonElement>($"/api/v1/tasks/{c}/dependencies", new
            {
                predecessorTaskId = c,
                successorTaskId = a,
                type = "FinishToStart",
                lagDays = 0,
            });
            cycle.Status.Should().Be(HttpStatusCode.Conflict);
        }
        finally
        {
            await client.DeleteAsync<JsonElement>($"/api/v1/projects/{first.ProjectId}");
            await client.DeleteAsync<JsonElement>($"/api/v1/projects/{second.ProjectId}");
        }
    }

    [Fact]
    public async Task Stored_reports_are_isolated_by_owner()
    {
        var admin = _fixture.SuperAdmin.Client;
        var manager = _fixture.ProjectManager.Client;

        var created = await admin.PostAsync<JsonElement>("/api/v1/reports/stored", new
        {
            name = "Private Integration Report",
            reportType = "project-status",
            parameters = new { projectId = Guid.NewGuid() },
            format = "json",
        });
        created.Status.Should().Be(HttpStatusCode.Created);

        var reportId = created.Data.GetGuid("id");
        try
        {
            var list = await manager.GetAsync<JsonElement>("/api/v1/reports/stored");
            list.Status.Should().Be(HttpStatusCode.OK);
            list.Data.EnumerateArray().Should().NotContain(item => item.GetGuid("id") == reportId);

            var detail = await manager.GetAsync<JsonElement>($"/api/v1/reports/stored/{reportId}");
            detail.Status.Should().Be(HttpStatusCode.Forbidden);

            var download = await manager.DownloadAsync($"/api/v1/reports/stored/{reportId}/download");
            download.StatusCode.Should().Be(HttpStatusCode.Forbidden);

            var update = await manager.PutAsync<JsonElement>($"/api/v1/reports/stored/{reportId}", new
            {
                name = "Should Not Update",
                reportType = "project-status",
                parameters = new { },
                format = "json",
            });
            update.Status.Should().Be(HttpStatusCode.Forbidden);

            var delete = await manager.DeleteAsync<JsonElement>($"/api/v1/reports/stored/{reportId}");
            delete.Status.Should().Be(HttpStatusCode.Forbidden);
        }
        finally
        {
            await admin.DeleteAsync<JsonElement>($"/api/v1/reports/stored/{reportId}");
        }
    }

    private static async Task<Guid> CreateTaskAsync(ApiClient client, Guid projectId, string title)
    {
        var response = await client.PostAsync<JsonElement>("/api/v1/tasks", new
        {
            title,
            description = "Created by integrity tests.",
            startDate = new DateTime(2026, 10, 1),
            dueDate = new DateTime(2026, 10, 10),
            estimatedHours = 4f,
            projectId,
            milestoneId = (Guid?)null,
            assignedToUserId = (string?)null,
            priority = "Medium",
        });

        response.Status.Should().Be(HttpStatusCode.Created);
        return response.Data.GetGuid("id");
    }
}
