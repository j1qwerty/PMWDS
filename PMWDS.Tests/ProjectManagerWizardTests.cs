using System.Net;
using System.Text.Json;
using FluentAssertions;
using PMWDS.Tests.Infrastructure;
using Xunit;

namespace PMWDS.Tests;

/// <summary>
/// The project manager's path through the wizard.
///
/// Project managers were left out of the wizard's standard-flow condition, so they
/// were shown the six-step legacy flow - departments and users as separate steps -
/// while super admin, director and department head got four. Every one of those
/// roles reaches this page, because the wizard is gated on PROJECT_MANAGE and the
/// seeded project-manager role holds it.
///
/// The client change is step visibility, but that is only safe if a project manager
/// can actually carry out the four steps. So this walks the exact API sequence the
/// four-step wizard issues, as a project manager, and asserts the result is a usable
/// project rather than something they can see but not manage.
/// </summary>
[Collection(ApiCollection.Name)]
public class ProjectManagerWizardTests
{
    private readonly ApiFixture _fixture;

    public ProjectManagerWizardTests(ApiFixture fixture) => _fixture = fixture;

    [Fact]
    public async Task A_project_manager_can_run_the_whole_standard_wizard_flow()
    {
        var manager = _fixture.ProjectManager;
        var department = await WizardFlowTests.FirstDepartmentAsync(manager.Client);

        // Step 1-4 as handleFinish issues them: project, then milestones, then
        // dependencies. Milestones each carry a department, which is where the
        // standard flow derives the project's departments from.
        var result = await new WizardBuilder(manager.Client)
            .WithName($"PM Wizard {Guid.NewGuid().ToString("N")[..6]}")
            .WithDescription("Created through the four-step flow by a project manager.")
            .WithDepartments(department)
            .WithMilestone("Survey", new DateTime(2026, 3, 31), department)
            .WithMilestone("Execution", new DateTime(2026, 9, 30), department, isCritical: true)
            .WithMilestoneDependency("Survey", "Execution", "ProgressThreshold", threshold: 60)
            .BuildAsync();

        try
        {
            result.ProjectId.Should().NotBeEmpty();
            result.MilestoneIds.Should().HaveCount(2);
            result.DependencyIds.Should().HaveCount(1);

            var project = await manager.Client
                .GetAsync<JsonElement>($"/api/v1/projects/{result.ProjectId}");
            project.Status.Should().Be(HttpStatusCode.OK);

            // The project's departments came from the milestone assignments, so the
            // department list must not be empty - that is the whole basis of the
            // standard flow and of assignedDepartmentIds on the client.
            var departmentIds = project.Data!.GetProperty("departmentIds")
                .EnumerateArray().Select(d => d.GetGuid()).ToList();
            departmentIds.Should().Contain(department, "the standard flow derives departments from the milestones");

            // They must be able to see the milestones they just created. This is the
            // assertion that fails without the project-manager defaulting: creation
            // succeeds, but GET is scoped.
            var milestones = await manager.Client
                .GetAsync<JsonElement>($"/api/v1/milestones/by-project/{result.ProjectId}");
            milestones.IsSuccess.Should().BeTrue(milestones.RawBody);
            milestones.Data!.GetArrayLength().Should().Be(2);

            // And they must be able to read the dependency they created.
            var dependencies = await manager.Client
                .GetAsync<JsonElement>($"/api/v1/milestones/by-project/{result.ProjectId}/dependencies");
            dependencies.IsSuccess.Should().BeTrue(dependencies.RawBody);
            dependencies.Data!.GetArrayLength().Should().Be(1);

            // Finally the capability flag the rest of the app gates on, which is what
            // grants the project manager edit rights on the project they just built.
            var access = await manager.Client
                .GetAsync<JsonElement>($"/api/v1/milestones/by-project/{result.ProjectId}/access");
            access.IsSuccess.Should().BeTrue(access.RawBody);
            access.Data!.GetProperty("canManageMilestones").GetBoolean().Should().BeTrue(
                "a project manager who created the project must be able to manage its milestones");
            access.Data!.GetProperty("canManageDependencies").GetBoolean().Should().BeTrue();
        }
        finally
        {
            await manager.Client.DeleteAsync<JsonElement>($"/api/v1/projects/{result.ProjectId}");
        }
    }

    [Fact]
    public async Task A_project_manager_can_see_the_wizard_at_all()
    {
        // The gate on the New Project button is PROJECT_MANAGE. If the seeded
        // project-manager role ever loses it, the four-step wizard becomes
        // unreachable for the role this change is about and the fix is invisible.
        _fixture.ProjectManager.Client.Should().NotBeNull();
        _fixture.ProjectManager.Can("PROJECT_MANAGE").Should().BeTrue(
            "the wizard is only offered to holders of PROJECT_MANAGE");
    }

    [Fact]
    public async Task A_team_member_cannot_run_the_wizard()
    {
        // Confirms the wizard really is gated, so widening the project manager's step
        // flow did not also expose the wizard to a role that should not have it.
        _fixture.TeamMember.Can("PROJECT_MANAGE").Should().BeFalse();
        _fixture.Viewer.Can("PROJECT_MANAGE").Should().BeFalse();
        await Task.CompletedTask;
    }
}
