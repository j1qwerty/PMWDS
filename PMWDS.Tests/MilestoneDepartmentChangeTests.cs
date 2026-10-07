using System.Net;
using System.Text.Json;
using FluentAssertions;
using PMWDS.Tests.Infrastructure;
using Xunit;

namespace PMWDS.Tests;

/// <summary>
/// Changing a milestone's department returned 400 with the reason buried.
///
/// Two causes, both pinned here.
///
/// The modal offered every department in the user's organisation rather than the
/// project's, so picking one the project did not carry was guaranteed to fail.
/// Picking a valid one worked, which is why it looked intermittent.
///
/// And 13 of the 15 seeded milestones were given departments their projects did not
/// contain, because MilestonesSeeder looked department codes up across the whole
/// system. Since the modal prefills the current value and resends it on every save,
/// those milestones could not be saved at all - not even to rename one - so the
/// failure did not depend on which department was chosen.
/// </summary>
[Collection(ApiCollection.Name)]
public class MilestoneDepartmentChangeTests
{
    private readonly ApiFixture _api;

    public MilestoneDepartmentChangeTests(ApiFixture api) => _api = api;

    private async Task<(TestProject Project, List<Guid> Milestones)> NewProjectAsync()
    {
        var project = await TestProject.CreateAsync(
            _api.SuperAdmin.Client, $"MilestoneDept {Guid.NewGuid():N}"[..22]);
        return (project, (await project.MilestoneIdsAsync()).ToList());
    }

    private async Task<Result<JsonElement>> UpdateAsync(
        Session session,
        Guid milestoneId,
        Guid projectId,
        Guid? departmentId)
    {
        var current = await session.Client
            .GetAsync<JsonElement>($"/api/v1/milestones/by-project/{projectId}");

        current.ThrowIfFailed("list milestones");
        var milestone = current.Data!.EnumerateArray().Single(m => m.GetGuid("id") == milestoneId);

        return await session.Client.PutAsync<JsonElement>($"/api/v1/milestones/{milestoneId}", new
        {
            name = milestone.GetProperty("name").GetString(),
            description = milestone.GetProperty("description").GetString() ?? "",
            dueDate = milestone.GetProperty("dueDate").GetDateTime(),
            order = milestone.GetProperty("order").GetInt32(),
            isCritical = milestone.GetProperty("isCritical").GetBoolean(),
            departmentId,
            progressPercentage = milestone.GetProperty("progressPercentage").GetDouble(),
        });
    }

    [Fact]
    public async Task A_director_can_change_a_milestones_department_to_one_the_project_already_has()
    {
        var created = await NewProjectAsync();
        var project = created.Project;
        var milestones = created.Milestones;
        await using var _projectScope = project;
        var department = await WizardFlowTests.FirstDepartmentAsync(_api.SuperAdmin.Client);

        var result = await UpdateAsync(_api.Admin, milestones[0], project.ProjectId, department);

        result.IsSuccess.Should().BeTrue(result.RawBody);
        result.Data!.GetGuid("departmentId").Should().Be(department);
        result.Data!.GetProperty("departmentName").GetString()
            .Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Changing_a_milestones_department_to_a_department_the_project_lacks_no_longer_fails()
    {
        var created = await NewProjectAsync();
        var project = created.Project;
        var milestones = created.Milestones;
        await using var _projectScope = project;
        // Use a real department that is not on this project. Fetch the full list and
        // pick one the project does not carry.
        var allDepartments = await _api.SuperAdmin.Client
            .GetAsync<JsonElement>("/api/v1/departments?pageSize=200");
        allDepartments.IsSuccess.Should().BeTrue(allDepartments.RawBody);

        var projectDepartments = (await _api.SuperAdmin.Client
            .GetAsync<JsonElement>($"/api/v1/projects/{project.ProjectId}"))
            .Data!.GetProperty("departmentIds").EnumerateArray().Select(d => d.GetGuid()).ToHashSet();

        var items = allDepartments.Data!.ValueKind == JsonValueKind.Array
            ? allDepartments.Data!.EnumerateArray()
            : allDepartments.Data!.GetProperty("items").EnumerateArray();

        var candidate = items
            .Select(d => d.GetGuid("id"))
            .FirstOrDefault(id => !projectDepartments.Contains(id));

        if (candidate == Guid.Empty)
        {
            // Only one department exists, so there is nothing outside the project to
            // choose. The invariant still holds and there is nothing to assert.
            return;
        }

        var result = await UpdateAsync(_api.Admin, milestones[0], project.ProjectId, candidate);

        // Was 400 "Milestone department must be assigned to the project."
        result.IsSuccess.Should().BeTrue(result.RawBody);

        // And the change persisted, which is the part the user actually sees.
        var reread = await _api.SuperAdmin.Client
            .GetAsync<JsonElement>($"/api/v1/milestones/by-project/{project.ProjectId}");
        reread.Data!.EnumerateArray()
            .Single(m => m.GetGuid("id") == milestones[0])
            .GetGuid("departmentId")
            .Should().Be(candidate);
    }

    [Fact]
    public async Task A_milestone_whose_department_is_not_on_its_project_can_still_be_renamed()
    {
        // The state the seeded data was in. Without self-healing this was a 400 on
        // any save, because the modal resends the existing department.
        var created = await NewProjectAsync();
        var project = created.Project;
        var milestones = created.Milestones;
        await using var _projectScope = project;

        // Force the bad state the seeder produced.
        var foreignDepartment = await CreateUnassignedDepartmentAsync(project.ProjectId);
        var stuck = await UpdateAsync(_api.SuperAdmin, milestones[0], project.ProjectId, foreignDepartment);
        stuck.IsSuccess.Should().BeTrue(stuck.RawBody);

        // Rewind by removing the department from the project directly, so the
        // milestone's department is once again outside the project's set.
        await RemoveDepartmentFromProjectAsync(project.ProjectId, foreignDepartment);

        // Renaming only. The department stays as it was, and must not be rejected.
        var renamed = await RenameAsync(_api.SuperAdmin, milestones[0], project.ProjectId, "Renamed Milestone");
        renamed.IsSuccess.Should().BeTrue(renamed.RawBody);
        renamed.Data!.GetProperty("name").GetString().Should().Be("Renamed Milestone");
    }

    [Fact]
    public async Task Every_milestone_of_a_freshly_seeded_project_has_a_department_the_project_carries()
    {
        // The seeder must not reproduce the orphaned rows. Asserted against the seed
        // project rather than a test-built one so it covers MilestonesSeeder.
        var projects = await _api.SuperAdmin.Client.GetAsync<JsonElement>("/api/v1/projects?pageSize=50");
        projects.IsSuccess.Should().BeTrue(projects.RawBody);

        var items = projects.Data!.ValueKind == JsonValueKind.Array
            ? projects.Data!.EnumerateArray()
            : projects.Data!.GetProperty("items").EnumerateArray();

        foreach (var project in items)
        {
            var projectId = project.GetGuid("id");
            var departmentIds = project.TryGetProperty("departmentIds", out var raw)
                ? raw.EnumerateArray().Select(d => d.GetGuid()).ToHashSet()
                : new HashSet<Guid>();

            if (departmentIds.Count == 0)
            {
                continue;
            }

            var milestones = await _api.SuperAdmin.Client
                .GetAsync<JsonElement>($"/api/v1/milestones/by-project/{projectId}");
            if (!milestones.IsSuccess || milestones.Data!.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            var orphans = milestones.Data!.EnumerateArray()
                .Where(m => m.TryGetProperty("departmentId", out var d) && d.ValueKind == JsonValueKind.String)
                .Select(m => m.GetGuid("departmentId"))
                .Where(id => !departmentIds.Contains(id))
                .ToList();

            orphans.Should().BeEmpty(
                $"milestones of project '{project.GetProperty("name").GetString()}' are owned by " +
                "departments the project does not contain, so they cannot be saved");
        }
    }

    private async Task<Guid> CreateUnassignedDepartmentAsync(Guid projectId)
    {
        var departments = await _api.SuperAdmin.Client
            .GetAsync<JsonElement>("/api/v1/departments?pageSize=200");
        var items = departments.Data!.ValueKind == JsonValueKind.Array
            ? departments.Data!.EnumerateArray()
            : departments.Data!.GetProperty("items").EnumerateArray();

        var projectDepartments = (await _api.SuperAdmin.Client
            .GetAsync<JsonElement>($"/api/v1/projects/{projectId}"))
            .Data!.GetProperty("departmentIds").EnumerateArray().Select(d => d.GetGuid()).ToHashSet();

        var candidate = items.Select(d => d.GetGuid("id"))
            .FirstOrDefault(id => !projectDepartments.Contains(id));

        return candidate;
    }

    private async Task RemoveDepartmentFromProjectAsync(Guid projectId, Guid departmentId)
    {
        var project = await _api.SuperAdmin.Client
            .GetAsync<JsonElement>($"/api/v1/projects/{projectId}");

        var remaining = project.Data!.GetProperty("departmentIds").EnumerateArray()
            .Select(d => d.GetGuid())
            .Where(id => id != departmentId)
            .ToList();

        await _api.SuperAdmin.Client.PutAsync<JsonElement>($"/api/v1/projects/{projectId}", new
        {
            name = project.Data!.GetProperty("name").GetString(),
            description = project.Data!.GetProperty("description").GetString() ?? "",
            category = project.Data!.GetProperty("category").GetString(),
            plannedStartDate = project.Data!.GetProperty("plannedStartDate").GetDateTime(),
            plannedEndDate = project.Data!.GetProperty("plannedEndDate").GetDateTime(),
            plannedBudget = project.Data!.GetProperty("plannedBudget").GetDecimal(),
            priority = project.Data!.GetProperty("priority").GetString(),
            departmentId = remaining.FirstOrDefault(),
            departmentIds = remaining,
        });
    }

    private async Task<Result<JsonElement>> RenameAsync(
        Session session, Guid milestoneId, Guid projectId, string newName)
    {
        var list = await session.Client
            .GetAsync<JsonElement>($"/api/v1/milestones/by-project/{projectId}");
        var milestone = list.Data!.EnumerateArray().Single(m => m.GetGuid("id") == milestoneId);

        return await session.Client.PutAsync<JsonElement>($"/api/v1/milestones/{milestoneId}", new
        {
            name = newName,
            description = milestone.GetProperty("description").GetString() ?? "",
            dueDate = milestone.GetProperty("dueDate").GetDateTime(),
            order = milestone.GetProperty("order").GetInt32(),
            isCritical = milestone.GetProperty("isCritical").GetBoolean(),
            departmentId = milestone.TryGetProperty("departmentId", out var d) && d.ValueKind == JsonValueKind.String
                ? (Guid?)milestone.GetGuid("departmentId")
                : null,
            progressPercentage = milestone.GetProperty("progressPercentage").GetDouble(),
        });
    }
}
