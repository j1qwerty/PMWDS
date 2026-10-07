using System.Net;
using System.Text.Json;
using FluentAssertions;
using PMWDS.Tests.Infrastructure;
using Xunit;

namespace PMWDS.Tests;

/// <summary>
/// Integration tests for milestone dependency editing and for the per-project
/// capability flag the client now gates its controls on.
///
/// Two things are being pinned here.
///
/// First, re-wiring. The edit modal used to disable both milestone dropdowns, so a
/// dependency could never be pointed at a different pair of milestones - only its
/// condition could change. That was a client-side lock; the server had no way to
/// accept the new ids. <c>UpdateMilestoneDependencyDto</c> now carries them and
/// UpdateDependency re-runs the same duplicate and cycle checks that creation does.
///
/// Second, who may do it. CanManageProjectAsync on the server resolves to the
/// superadmin, the project's own project manager, the department head of the
/// project's primary department, and a director. Permission codes cannot express
/// that - a department head of a different department holds PROJECT_MANAGE and
/// satisfies every permission check - which is why the client had to stop deriving
/// it and read it from GET /milestones/by-project/{id}/access instead.
/// </summary>
[Collection(ApiCollection.Name)]
public class MilestoneDependencyEditTests : IDisposable
{
    private readonly ApiFixture _api;

    public MilestoneDependencyEditTests(ApiFixture api) => _api = api;

    private async Task<(TestProject Project, List<Guid> Milestones)> NewProjectAsync(Session session)
    {
        var project = await TestProject.CreateAsync(session.Client, $"DepEdit {Guid.NewGuid():N}"[..24]);
        var milestones = (await project.MilestoneIdsAsync()).ToList();
        return (project, milestones);
    }

    /// <summary>
    /// Creates a project that <paramref name="session"/> is allowed to reach.
    ///
    /// Built by the superadmin, but placed in a department the session belongs to, so
    /// it falls inside their own-department scope. The session cannot create projects
    /// itself - a team member and a viewer both lack PROJECT_CREATE - so the project
    /// has to be built for them rather than by them.
    /// </summary>
    private async Task<(TestProject Project, List<Guid> Milestones)> NewProjectInOwnDepartmentAsync(
    Session session)
    {
        var me = await session.Client.GetAsync<JsonElement>("/api/v1/users/me");
        me.ThrowIfFailed("resolve the session user");
        var departmentId = me.Data.GetGuid("departmentId");

        var project = await TestProject.CreateAsync(
            _api.SuperAdmin.Client, $"DepEdit {Guid.NewGuid():N}"[..24], departmentId);

        var milestones = (await project.MilestoneIdsAsync()).ToList();
        return (project, milestones);
    }

    /// <summary>
    /// Creates a project whose manager is <paramref name="manager"/>.
    ///
    /// Built by the superadmin so the wizard path is identical to every other test,
    /// then assigned to the manager under test.
    /// </summary>
    private async Task<(TestProject Project, List<Guid> Milestones)> NewProjectManagedByAsync(
        Session manager)
    {
        var department = await WizardFlowTests.FirstDepartmentAsync(_api.SuperAdmin.Client);

        var result = await new WizardBuilder(_api.SuperAdmin.Client)
            .WithName($"DepEditPM {Guid.NewGuid().ToString("N")[..8]}")
            .WithCode($"IT-{Guid.NewGuid().ToString("N")[..10]}")
            .WithDepartments(department)
            .WithProjectManager(manager.UserId)
            .WithMilestone("Planning", new DateTime(2026, 2, 28))
            .WithMilestone("Execution", new DateTime(2026, 8, 31))
            .WithMilestone("Handover", new DateTime(2026, 12, 15))
            .BuildAsync();

        var project = TestProject.Wrap(_api.SuperAdmin.Client, result.ProjectId);
        var milestones = result.MilestoneIds.ToList();
        return (project, milestones);
    }

    private async Task<Guid> CreateDependencyAsync(
        Session session,
        Guid projectId,
        Guid prerequisite,
        Guid dependent,
        string type = "CompletionBased",
        double? threshold = null)
    {
        var response = await session.Client.PostAsync<JsonElement>("/api/v1/milestones/dependencies", new
        {
            projectId,
            prerequisiteMilestoneId = prerequisite,
            dependentMilestoneId = dependent,
            type,
            thresholdPercentage = threshold,
        });

        response.ThrowIfFailed("create dependency");
        return response.Data.GetGuid("id");
    }

    private Task<Result<JsonElement>> UpdateAsync(
        Session session,
        Guid dependencyId,
        string type,
        double? threshold = null,
        Guid? prerequisite = null,
        Guid? dependent = null)
        => session.Client.PutAsync<JsonElement>(
            $"/api/v1/milestones/dependencies/{dependencyId}",
            new
            {
                type,
                thresholdPercentage = threshold,
                prerequisiteMilestoneId = prerequisite,
                dependentMilestoneId = dependent,
            });

    // ── Re-wiring ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Editing_can_point_a_dependency_at_a_different_pair_of_milestones()
    {
        var created = await NewProjectAsync(_api.SuperAdmin);
        var project = created.Project;
        var milestones = created.Milestones;
        await using var _projectScope = project;
        var (planning, execution, handover) = (milestones[0], milestones[1], milestones[2]);

        var dependencyId = await CreateDependencyAsync(_api.SuperAdmin, project.ProjectId, planning, handover);

        // Re-wire planning->handover into planning->execution.
        var updated = await UpdateAsync(_api.SuperAdmin, dependencyId, "CompletionBased",
            prerequisite: planning, dependent: execution);

        updated.IsSuccess.Should().BeTrue(updated.RawBody);
        updated.Data.GetGuid("dependentMilestoneId").Should().Be(execution);
        updated.Data.GetGuid("prerequisiteMilestoneId").Should().Be(planning);

        // And it must actually persist, not just echo back.
        var reread = await _api.SuperAdmin.Client
            .GetAsync<JsonElement>($"/api/v1/milestones/by-project/{project.ProjectId}/dependencies");
        reread.ThrowIfFailed("list dependencies");
        var row = reread.Data.EnumerateArray().Single(d => d.GetGuid("id") == dependencyId);
        row.GetGuid("dependentMilestoneId").Should().Be(execution);
    }

    [Fact]
    public async Task The_unchanged_payload_from_the_old_modal_still_works()
    {
        // The tasks tab and any other caller sending only type + threshold must not
        // break, so the ids are optional.
        var created = await NewProjectAsync(_api.SuperAdmin);
        var project = created.Project;
        var milestones = created.Milestones;
        await using var _projectScope = project;
        var dependencyId = await CreateDependencyAsync(
            _api.SuperAdmin, project.ProjectId, milestones[0], milestones[1]);

        var updated = await UpdateAsync(_api.SuperAdmin, dependencyId, "ProgressThreshold", threshold: 60);

        updated.IsSuccess.Should().BeTrue(updated.RawBody);
        updated.Data.GetGuid("prerequisiteMilestoneId").Should().Be(milestones[0]);
        updated.Data.GetGuid("dependentMilestoneId").Should().Be(milestones[1]);
        updated.Data.GetProperty("thresholdPercentage").GetDouble().Should().Be(60);
    }

    [Fact]
    public async Task Rewiring_to_the_same_milestone_twice_is_rejected()
    {
        var created = await NewProjectAsync(_api.SuperAdmin);
        var project = created.Project;
        var milestones = created.Milestones;
        await using var _projectScope = project;
        var dependencyId = await CreateDependencyAsync(
            _api.SuperAdmin, project.ProjectId, milestones[0], milestones[2]);

        var updated = await UpdateAsync(_api.SuperAdmin, dependencyId, "CompletionBased",
            prerequisite: milestones[1], dependent: milestones[1]);

        updated.Status.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Rewiring_onto_an_existing_dependency_is_rejected()
    {
        var created = await NewProjectAsync(_api.SuperAdmin);
        var project = created.Project;
        var milestones = created.Milestones;
        await using var _projectScope = project;
        var (planning, execution, handover) = (milestones[0], milestones[1], milestones[2]);

        await CreateDependencyAsync(_api.SuperAdmin, project.ProjectId, planning, execution);
        var second = await CreateDependencyAsync(_api.SuperAdmin, project.ProjectId, planning, handover);

        // Rewire the second onto planning->execution, which already exists.
        var updated = await UpdateAsync(_api.SuperAdmin, second, "CompletionBased",
            prerequisite: planning, dependent: execution);

        updated.Status.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Rewiring_into_a_cycle_is_rejected()
    {
        var created = await NewProjectAsync(_api.SuperAdmin);
        var project = created.Project;
        var milestones = created.Milestones;
        await using var _projectScope = project;
        var (planning, execution, handover) = (milestones[0], milestones[1], milestones[2]);

        // planning blocks execution.
        var forward = await CreateDependencyAsync(_api.SuperAdmin, project.ProjectId, planning, execution);
        // handover blocks planning.
        await CreateDependencyAsync(_api.SuperAdmin, project.ProjectId, handover, planning);

        // Rewire the forward edge into execution->planning, closing the loop.
        var updated = await UpdateAsync(_api.SuperAdmin, forward, "CompletionBased",
            prerequisite: execution, dependent: planning);

        updated.Status.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Rewiring_onto_an_existing_dependency_row_does_not_collide_with_itself()
    {
        // The duplicate check must exclude the row being edited, or saving an
        // unchanged dependency would always 400.
        var created = await NewProjectAsync(_api.SuperAdmin);
        var project = created.Project;
        var milestones = created.Milestones;
        await using var _projectScope = project;
        var dependencyId = await CreateDependencyAsync(
            _api.SuperAdmin, project.ProjectId, milestones[0], milestones[1]);

        var updated = await UpdateAsync(_api.SuperAdmin, dependencyId, "CompletionBased",
            prerequisite: milestones[0], dependent: milestones[1]);

        updated.IsSuccess.Should().BeTrue(updated.RawBody);
    }

    [Fact]
    public async Task Rewiring_to_a_milestone_in_another_project_is_rejected()
    {
        var created = await NewProjectAsync(_api.SuperAdmin);
        var project = created.Project;
        var milestones = created.Milestones;
        await using var _projectScope = project;
        await using var other = await TestProject.CreateAsync(
            _api.SuperAdmin.Client, $"DepOther {Guid.NewGuid():N}"[..22]);
        var foreignMilestone = (await other.MilestoneIdsAsync())[0];

        var dependencyId = await CreateDependencyAsync(
            _api.SuperAdmin, project.ProjectId, milestones[0], milestones[1]);

        var updated = await UpdateAsync(_api.SuperAdmin, dependencyId, "CompletionBased",
            prerequisite: milestones[0], dependent: foreignMilestone);

        updated.Status.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── Authorization ───────────────────────────────────────────────────────

    [Fact]
    public async Task The_project_manager_can_manage_dependencies_on_their_project()
    {
        // Built by the superadmin, then handed to the seeded project manager.
        // CanManageProjectAsync grants rights to the manager of *this* project, not to
        // anyone who happens to hold the project-manager role.
        var created = await NewProjectManagedByAsync(_api.ProjectManager);
        var project = created.Project;
        var milestones = created.Milestones;
        await using var _projectScope = project;

        var access = await _api.ProjectManager.Client
            .GetAsync<JsonElement>($"/api/v1/milestones/by-project/{project.ProjectId}/access");

        access.IsSuccess.Should().BeTrue(access.RawBody);
        access.Data.GetProperty("canManageDependencies").GetBoolean().Should().BeTrue();
        access.Data.GetProperty("canManageMilestones").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task The_superadmin_can_manage_dependencies()
    {
        var created = await NewProjectAsync(_api.SuperAdmin);
        var project = created.Project;
        await using var _projectScope = project;

        var access = await _api.SuperAdmin.Client
            .GetAsync<JsonElement>($"/api/v1/milestones/by-project/{project.ProjectId}/access");

        access.Data.GetProperty("canManageDependencies").GetBoolean().Should().BeTrue();
    }

    [Theory]
    [InlineData("team member")]
    [InlineData("viewer")]
    public async Task Team_members_and_viewers_are_told_they_cannot_manage(string who)
    {
        var session = who == "viewer" ? _api.Viewer : _api.TeamMember;
        var created = await NewProjectInOwnDepartmentAsync(session);
        var project = created.Project;
        await using var _projectScope = project;

        var access = await session.Client
            .GetAsync<JsonElement>($"/api/v1/milestones/by-project/{project.ProjectId}/access");

        // 200, not 403. This project is theirs to see - it sits in a department they
        // belong to - so the endpoint answers, and the answer is that they may not
        // manage it. That is what the client needs: the control is hidden because the
        // flag is false, not because the call failed.
        access.IsSuccess.Should().BeTrue(access.RawBody);
        access.Data.GetProperty("canManageDependencies").GetBoolean().Should().BeFalse();
        access.Data.GetProperty("canManageMilestones").GetBoolean().Should().BeFalse();
    }

    [Theory]
    [InlineData("team member")]
    [InlineData("viewer")]
    public async Task A_project_outside_their_departments_is_not_reachable_at_all(string who)
    {
        // The own-department scope means a project with none of their departments on it
        // is not merely unmanaged, it is invisible. Before the scope split every
        // project in the organization was readable by any role, which meant a team
        // member could open a project belonging to a department they have nothing to
        // do with.
        var session = who == "viewer" ? _api.Viewer : _api.TeamMember;
        var created = await NewProjectAsync(_api.SuperAdmin);
        var project = created.Project;
        await using var _projectScope = project;

        var access = await session.Client
            .GetAsync<JsonElement>($"/api/v1/milestones/by-project/{project.ProjectId}/access");

        access.Status.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task A_viewer_cannot_create_edit_or_delete_a_dependency()
    {
        // The capability flag is presentation only. These three prove the server
        // actually refuses, so a hand-rolled request cannot bypass the UI.
        var created = await NewProjectAsync(_api.SuperAdmin);
        var project = created.Project;
        var milestones = created.Milestones;
        await using var _projectScope = project;
        var dependencyId = await CreateDependencyAsync(
            _api.SuperAdmin, project.ProjectId, milestones[0], milestones[1]);

        var create = await _api.Viewer.Client.PostAsync<JsonElement>("/api/v1/milestones/dependencies", new
        {
            projectId = project.ProjectId,
            prerequisiteMilestoneId = milestones[0],
            dependentMilestoneId = milestones[2],
            type = "CompletionBased",
        });
        create.Status.Should().Be(HttpStatusCode.Forbidden);

        var update = await UpdateAsync(_api.Viewer, dependencyId, "CompletionBased");
        update.Status.Should().Be(HttpStatusCode.Forbidden);

        var delete = await _api.Viewer.Client
            .DeleteAsync<JsonElement>($"/api/v1/milestones/dependencies/{dependencyId}");
        delete.Status.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task A_team_member_cannot_edit_a_dependency()
    {
        var created = await NewProjectAsync(_api.SuperAdmin);
        var project = created.Project;
        var milestones = created.Milestones;
        await using var _projectScope = project;
        var dependencyId = await CreateDependencyAsync(
            _api.SuperAdmin, project.ProjectId, milestones[0], milestones[1]);

        var update = await UpdateAsync(_api.TeamMember, dependencyId, "CompletionBased");
        update.Status.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task The_capability_flag_defaults_to_false_for_an_unknown_project()
    {
        var access = await _api.SuperAdmin.Client
            .GetAsync<JsonElement>($"/api/v1/milestones/by-project/{Guid.NewGuid()}/access");

        // 404, specifically. CanAccessProjectAsync short-circuits to true for a
        // superadmin without querying, so without an explicit existence check this
        // returned 200 claiming manage rights for a project that does not exist.
        access.Status.Should().Be(HttpStatusCode.NotFound);
    }

    public void Dispose() => GC.SuppressFinalize(this);
}
