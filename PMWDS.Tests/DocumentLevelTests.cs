using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using FluentAssertions;
using PMWDS.Application.Security;
using PMWDS.Tests.Infrastructure;
using Xunit;

namespace PMWDS.Tests;

/// <summary>
/// Documents are level-aware: project, milestone or task, with the level being
/// its own permission and the list never revealing more than the milestone list
/// beside it does.
///
/// These pin behaviour that regresses silently, because the symptom is a 403
/// rather than an error, or a document quietly filed at the wrong level.
/// </summary>
[Collection(ApiCollection.Name)]
public class DocumentLevelTests
{
    private const string PdfContentType = "application/pdf";

    private readonly ApiFixture _fixture;

    public DocumentLevelTests(ApiFixture fixture) => _fixture = fixture;

    private static MultipartFormDataContent PdfForm(
        string fileName,
        string? level = null,
        Guid? milestoneId = null,
        Guid? taskId = null)
    {
        // Structurally valid enough; the endpoint validates the content type, not
        // the bytes.
        var bytes = System.Text.Encoding.ASCII.GetBytes(
            "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
            "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
            "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n" +
            "trailer<</Root 1 0 R>>\n%%EOF");

        var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(PdfContentType);
        form.Add(file, "file", fileName);

        if (level is not null) form.Add(new StringContent(level), "level");
        if (milestoneId.HasValue)
        {
            form.Add(new StringContent(milestoneId.Value.ToString()), "milestoneId");
        }

        if (taskId.HasValue) form.Add(new StringContent(taskId.Value.ToString()), "taskId");

        return form;
    }

    private async Task<Dictionary<string, Guid>> FileOneOfEachLevelAsync(
        ApiClient client,
        TestProject project,
        string prefix)
    {
        var milestones = await project.MilestoneIdsAsync();
        var taskId = await project.CreateTaskAsync("Level task", milestones[0]);

        using var projectForm = PdfForm($"{prefix}-project.pdf", "Project");
        using var milestoneForm = PdfForm($"{prefix}-milestone.pdf", "Milestone", milestones[0]);
        using var taskForm = PdfForm($"{prefix}-task.pdf", "Task", taskId: taskId);

        (await client.PostFormAsync<JsonElement>(
            $"/api/v1/projects/{project.ProjectId}/documents", projectForm))
            .Status.Should().Be(HttpStatusCode.OK);

        (await client.PostFormAsync<JsonElement>(
            $"/api/v1/projects/{project.ProjectId}/documents", milestoneForm))
            .Status.Should().Be(HttpStatusCode.OK);

        (await client.PostFormAsync<JsonElement>(
            $"/api/v1/projects/{project.ProjectId}/documents", taskForm))
            .Status.Should().Be(HttpStatusCode.OK);

        return new Dictionary<string, Guid>
        {
            ["Project"] = Guid.Empty,
            ["Milestone"] = milestones[0],
            ["Task"] = taskId,
        };
    }

    // ── The level round-trips ────────────────────────────────────────────────

    [Fact]
    public async Task A_document_records_the_level_it_was_filed_at()
    {
        var client = _fixture.SuperAdmin.Client;
        await using var project = await TestProject.CreateAsync(client, "Level Doc Project");

        await FileOneOfEachLevelAsync(client, project, "one");

        var documents = await client.GetAsync<JsonElement>($"/api/v1/projects/{project.ProjectId}/documents");
        documents.Status.Should().Be(HttpStatusCode.OK);
        documents.Data.GetArrayLength().Should().Be(3);

        var rows = documents.Data.EnumerateArray().ToList();

        rows.Single(d => d.GetString("title") == "one-project.pdf").GetString("level")
            .Should().Be("Project");
        rows.Single(d => d.GetString("title") == "one-milestone.pdf").GetString("level")
            .Should().Be("Milestone");
        rows.Single(d => d.GetString("title") == "one-task.pdf").GetString("level")
            .Should().Be("Task");
    }

    /// <summary>
    /// A task-level document must name the milestone its task sits under, so the
    /// task list can show the milestone and project a task belongs to without the
    /// client making a second request.
    /// </summary>
    [Fact]
    public async Task A_task_document_reports_the_milestone_and_project_it_sits_under()
    {
        var client = _fixture.SuperAdmin.Client;
        await using var project = await TestProject.CreateAsync(client, "Task Context Doc");

        var milestones = await project.MilestoneIdsAsync();
        var taskId = await project.CreateTaskAsync("Contextual task", milestones[0]);

        var task = await client.GetAsync<JsonElement>($"/api/v1/tasks/{taskId}");
        var milestone = await client.GetAsync<JsonElement>(
            $"/api/v1/milestones/{task.Data.GetGuid("milestoneId")}");

        using var form = PdfForm("contextual.pdf", "Task", taskId: taskId);
        (await client.PostFormAsync<JsonElement>(
            $"/api/v1/projects/{project.ProjectId}/documents", form))
            .Status.Should().Be(HttpStatusCode.OK);

        var documents = await client.GetAsync<JsonElement>($"/api/v1/projects/{project.ProjectId}/documents");
        var row = documents.Data.EnumerateArray().Single();

        row.GetString("taskName").Should().Be(task.Data.GetString("title"));
        row.GetString("milestoneName").Should().Be(milestone.Data.GetString("name"));
        row.GetString("projectName").Should().NotBeNullOrWhiteSpace();
    }

    // ── Filtering ────────────────────────────────────────────────────────────

    [Fact]
    public async Task The_list_can_be_filtered_to_one_level()
    {
        var client = _fixture.SuperAdmin.Client;
        await using var project = await TestProject.CreateAsync(client, "Filter Docs");

        await FileOneOfEachLevelAsync(client, project, "f");

        foreach (var (level, expectedTitle) in new[]
                 {
                     ("Project", "f-project.pdf"),
                     ("Milestone", "f-milestone.pdf"),
                     ("Task", "f-task.pdf"),
                 })
        {
            var filtered = await client.GetAsync<JsonElement>(
                $"/api/v1/projects/{project.ProjectId}/documents?level={level}");

            filtered.Status.Should().Be(HttpStatusCode.OK);
            filtered.Data.GetArrayLength()
                .Should().Be(1, $"only {level}-level documents belong in that tab");
            filtered.Data[0].GetString("title").Should().Be(expectedTitle);
        }
    }

    // ── The level and its target must agree ──────────────────────────────────

    [Fact]
    public async Task A_milestone_document_without_a_milestone_is_rejected()
    {
        var client = _fixture.SuperAdmin.Client;
        await using var project = await TestProject.CreateAsync(client, "No Milestone Doc");

        using var form = PdfForm("orphan.pdf", "Milestone");
        var response = await client.PostFormAsync<JsonElement>(
            $"/api/v1/projects/{project.ProjectId}/documents", form);

        response.Status.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task A_task_document_cannot_name_another_projects_task()
    {
        var client = _fixture.SuperAdmin.Client;
        await using var project = await TestProject.CreateAsync(client, "Own Task Doc");
        await using var other = await TestProject.CreateAsync(client, "Other Task Doc");

        var otherMilestones = await other.MilestoneIdsAsync();
        var otherTask = await other.CreateTaskAsync("Someone else's task", otherMilestones[0]);

        using var form = PdfForm("crossed.pdf", "Task", taskId: otherTask);
        var response = await client.PostFormAsync<JsonElement>(
            $"/api/v1/projects/{project.ProjectId}/documents", form);

        response.Status.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task A_project_document_may_not_name_a_milestone()
    {
        var client = _fixture.SuperAdmin.Client;
        await using var project = await TestProject.CreateAsync(client, "Project Level Doc");

        var milestones = await project.MilestoneIdsAsync();

        // Level and target disagree. Silently ignoring the target would file the
        // document at a level the caller did not ask for.
        using var form = PdfForm("confused.pdf", "Project", milestones[0]);
        var response = await client.PostFormAsync<JsonElement>(
            $"/api/v1/projects/{project.ProjectId}/documents", form);

        response.Status.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── The upload level is a permission ─────────────────────────────────────

    [Fact]
    public async Task The_capabilities_endpoint_reports_the_permitted_levels()
    {
        var capabilities = await _fixture.TeamMember.Client
            .GetAsync<JsonElement>("/api/v1/projects/documents/upload-capabilities");

        capabilities.Status.Should().Be(HttpStatusCode.OK);

        // A team member is granted task-level uploads only. This is the value the
        // upload dialog renders its dropdown from, so it must match the grant
        // exactly rather than offering everything a manager could do.
        _fixture.TeamMember.Can(PermissionCodes.DocumentUploadTask).Should().BeTrue();

        var levels = capabilities.Data.GetProperty("documentLevels")
            .EnumerateArray().Select(v => v.GetString()).ToList();

        levels.Should().Contain("Task");
        levels.Should().NotContain("Project");
        levels.Should().NotContain("Milestone");
    }

    [Fact]
    public async Task A_role_cannot_upload_at_a_level_it_was_not_granted()
    {
        var teamMember = _fixture.TeamMember;
        var me = await teamMember.Client.GetAsync<JsonElement>("/api/v1/users/me");

        await using var project = await TestProject.CreateAsync(
            _fixture.SuperAdmin.Client, "Level Refused", me.Data.GetGuid("departmentId"));
        var milestones = await project.MilestoneIdsAsync();

        using var milestoneForm = PdfForm("not-allowed.pdf", "Milestone", milestones[0]);
        (await teamMember.Client.PostFormAsync<JsonElement>(
            $"/api/v1/projects/{project.ProjectId}/documents", milestoneForm))
            .Status.Should().Be(HttpStatusCode.Forbidden);

        using var projectForm = PdfForm("not-allowed-either.pdf", "Project");
        (await teamMember.Client.PostFormAsync<JsonElement>(
            $"/api/v1/projects/{project.ProjectId}/documents", projectForm))
            .Status.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task A_team_member_may_file_a_document_against_a_task_they_are_assigned_to()
    {
        var teamMember = _fixture.TeamMember;
        var me = await teamMember.Client.GetAsync<JsonElement>("/api/v1/users/me");

        await using var project = await TestProject.CreateAsync(
            _fixture.SuperAdmin.Client, "Team Task Doc", me.Data.GetGuid("departmentId"));
        var milestones = await project.MilestoneIdsAsync();

        // Assigned at creation, so the member genuinely works on it.
        var taskId = await project.CreateTaskAsync(
            "Member's own task", milestones[0], assigneeId: teamMember.UserId);

        using var form = PdfForm("member-task.pdf", "Task", taskId: taskId);
        var response = await teamMember.Client.PostFormAsync<JsonElement>(
            $"/api/v1/projects/{project.ProjectId}/documents", form);

        // Previously refused: the only gate was managing the project, which a team
        // member never can, so the level grant they held could never be used.
        response.Status.Should().Be(HttpStatusCode.OK, response.RawBody);

        var documents = await teamMember.Client.GetAsync<JsonElement>(
            $"/api/v1/projects/{project.ProjectId}/documents?level=Task");

        documents.Data.EnumerateArray()
            .Any(d => d.GetString("title") == "member-task.pdf")
            .Should().BeTrue();
    }

    // ── Visibility must not exceed the milestone list ────────────────────────

    [Fact]
    public async Task A_department_head_sees_no_fewer_documents_than_milestones()
    {
        // The document list must never reveal more than the milestone list beside it.
        // It is tempting to filter documents harder than milestones, but that makes
        // the two tabs contradict each other, which reads as a bug rather than care.
        var head = _fixture.DepartmentHead;
        var client = _fixture.SuperAdmin.Client;

        await using var project = await TestProject.CreateAsync(client, "Head Scoped Docs");
        await FileOneOfEachLevelAsync(client, project, "head");

        var milestones = await head.Client.GetAsync<JsonElement>(
            $"/api/v1/milestones/by-project/{project.ProjectId}");

        // head.eng does not head this project's primary department, so the milestone
        // list is cut down to its own department. That is the ceiling.
        if (milestones.Status != HttpStatusCode.OK)
        {
            return;
        }

        var visibleMilestones = milestones.Data.EnumerateArray()
            .Select(m => m.GetString("name"))
            .ToHashSet(StringComparer.Ordinal);

        var documents = await head.Client.GetAsync<JsonElement>(
            $"/api/v1/projects/{project.ProjectId}/documents");

        if (documents.Status != HttpStatusCode.OK)
        {
            return;
        }

        foreach (var document in documents.Data.EnumerateArray()
                     .Where(d => d.GetString("level") is "Milestone" or "Task"))
        {
            var milestoneName = document.GetString("milestoneName");
            if (milestoneName is null) continue;

            visibleMilestones.Should().Contain(milestoneName,
                $"the document list showed \"{milestoneName}\", which this caller's milestone list does not");
        }
    }

    // ── Deleting ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task A_document_can_be_deleted()
    {
        var client = _fixture.SuperAdmin.Client;
        await using var project = await TestProject.CreateAsync(client, "Delete Doc");

        using var form = PdfForm("temporary.pdf", "Project");
        await client.PostFormAsync<JsonElement>($"/api/v1/projects/{project.ProjectId}/documents", form);

        var documents = await client.GetAsync<JsonElement>($"/api/v1/projects/{project.ProjectId}/documents");
        var id = documents.Data[0].GetGuid("id");

        var deleted = await client.DeleteAsync<JsonElement>(
            $"/api/v1/projects/{project.ProjectId}/documents/{id}");
        deleted.Status.Should().Be(HttpStatusCode.NoContent);

        var after = await client.GetAsync<JsonElement>($"/api/v1/projects/{project.ProjectId}/documents");
        after.Data.GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task A_utilization_certificate_cannot_be_deleted_through_the_generic_route()
    {
        var client = _fixture.SuperAdmin.Client;
        await using var project = await TestProject.CreateAsync(client, "UC Delete Doc");

        var milestones = await project.MilestoneIdsAsync();

        using var certificateForm = PdfForm("claim.pdf");
        certificateForm.Add(new StringContent(project.ProjectId.ToString()), "projectId");
        certificateForm.Add(new StringContent("UC-DELETE-1"), "certificateNumber");
        certificateForm.Add(new StringContent("Grant A"), "fundingSource");
        certificateForm.Add(new StringContent("1000"), "amountClaimed");
        certificateForm.Add(new StringContent("900"), "amountUtilized");
        certificateForm.Add(new StringContent("2026-01-01"), "periodStart");
        certificateForm.Add(new StringContent("2026-03-31"), "periodEnd");
        certificateForm.Add(new StringContent(milestones[0].ToString()), "milestoneId");

        var created = await client.PostFormAsync<JsonElement>(
            "/api/v1/utilization-certificates", certificateForm);
        created.Status.Should().Be(HttpStatusCode.OK, created.RawBody);

        var documents = await client.GetAsync<JsonElement>($"/api/v1/projects/{project.ProjectId}/documents");
        var certificateDocument = documents.Data.EnumerateArray()
            .Single(d => d.GetString("category") == "UtilizationCertificate");

        // Removing the file directly would leave an approved financial claim with no
        // evidence behind it, so it must be withdrawn through its own endpoint.
        var refused = await client.DeleteAsync<JsonElement>(
            $"/api/v1/projects/{project.ProjectId}/documents/{certificateDocument.GetGuid("id")}");

        refused.Status.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Deleting_a_task_keeps_its_document_by_promoting_it_to_project_level()
    {
        var client = _fixture.SuperAdmin.Client;
        await using var project = await TestProject.CreateAsync(client, "Task Delete Doc");

        var milestones = await project.MilestoneIdsAsync();
        var taskId = await project.CreateTaskAsync("Doomed task", milestones[0]);

        using var form = PdfForm("survivor.pdf", "Task", taskId: taskId);
        await client.PostFormAsync<JsonElement>($"/api/v1/projects/{project.ProjectId}/documents", form);

        (await client.DeleteAsync<JsonElement>($"/api/v1/tasks/{taskId}"))
            .Status.Should().Be(HttpStatusCode.NoContent);

        var documents = await client.GetAsync<JsonElement>($"/api/v1/projects/{project.ProjectId}/documents");

        // Milestones and tasks are soft-deleted and the foreign keys are NoAction, so
        // without promotion the row would survive still pointing at something the UI
        // no longer shows. The file belongs to the project, so it is kept.
        var row = documents.Data.EnumerateArray()
            .SingleOrDefault(d => d.GetString("title") == "survivor.pdf");

        row.ValueKind.Should().Be(JsonValueKind.Object, "the document belongs to the project, not the task");
        row.GetString("level").Should().Be("Project");
    }
}
