using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using PMWDS.Tests.Infrastructure;
using Xunit;

namespace PMWDS.Tests;

[Collection(ApiCollection.Name)]
public sealed class PrivateProjectDocumentTests
{
    private readonly ApiFixture _fixture;

    public PrivateProjectDocumentTests(ApiFixture fixture) => _fixture = fixture;

    [Fact]
    public async Task Project_document_is_not_publicly_served_from_files_path()
    {
        var client = _fixture.SuperAdmin.Client;
        var department = await WizardFlowTests.FirstDepartmentAsync(client);

        var project = await client.PostAsync<JsonElement>("/api/v1/projects", new
        {
            projectCode = $"PRIVATE-{Guid.NewGuid():N}"[..20],
            name = "Private Document Project",
            description = "Document static-file authorization test.",
            category = "Monitoring",
            plannedStartDate = new DateTime(2026, 10, 1),
            plannedEndDate = new DateTime(2026, 12, 31),
            plannedBudget = 1000m,
            departmentId = department,
            departmentIds = new[] { department },
            projectManagerId = string.Empty,
            priority = "Medium",
        });
        project.Status.Should().Be(HttpStatusCode.Created);
        var projectId = project.Data.GetGuid("id");

        try
        {
            using var form = new MultipartFormDataContent();
            var file = new ByteArrayContent(Encoding.UTF8.GetBytes("confidential project document"));
            file.Headers.ContentType = new MediaTypeHeaderValue("text/plain");
            form.Add(file, "file", "confidential.txt");

            var upload = await client.PostFormAsync<JsonElement>(
                $"/api/v1/projects/{projectId}/documents",
                form);

            upload.Status.Should().Be(HttpStatusCode.OK);

            var documents = await client.GetAsync<JsonElement>(
                $"/api/v1/projects/{projectId}/documents");
            documents.Status.Should().Be(HttpStatusCode.OK);

            var filePath = documents.Data
                .EnumerateArray()
                .Single()
                .GetString("filePath");

            filePath.Should().StartWith("documents/");

            // Static-file middleware runs before authentication. This request therefore
            // proves that /files cannot bypass the scoped controller download endpoint.
            var publicAttempt = await _fixture.Viewer.Client.DownloadAsync($"/files/{filePath}");
            publicAttempt.StatusCode.Should().Be(HttpStatusCode.NotFound);

            var scopedDownload = await client.DownloadAsync(
                $"/api/v1/projects/{projectId}/documents/{documents.Data.EnumerateArray().Single().GetGuid("id")}/download");
            scopedDownload.StatusCode.Should().Be(HttpStatusCode.OK);
        }
        finally
        {
            await client.DeleteAsync<JsonElement>($"/api/v1/projects/{projectId}");
        }
    }
}
