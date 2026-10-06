using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PMWDS.API.Services;
using PMWDS.Application.Common;
using PMWDS.Application.Security;
using PMWDS.Persistence.Context;
using PMWDS.Tests.Infrastructure;
using Xunit;

namespace PMWDS.Tests;

/// <summary>
/// Integration tests for the data the AI assistant is fed.
///
/// These assert on the dossier the API actually assembles, not on what the language
/// model then says with it. That split matters: the bug being fixed was that the
/// model received nothing, so the interesting contract is "does the prompt contain
/// the organisation's real project data", which is fully testable without calling a
/// provider. Asserting on model output instead would make every test depend on a
/// live API key, and on the free OpenRouter tier that fails after 50 requests a day.
/// </summary>
[Collection(ApiCollection.Name)]
public class ChatContextBuilderTests
{
    private readonly ApiFixture _api;

    public ChatContextBuilderTests(ApiFixture api) => _api = api;

    /// <summary>
    /// Builds a dossier for a seeded identity by running inside a request context
    /// that carries that identity's claims, so RoleScopeService sees the same role
    /// it would see for a real call to POST /api/v1/ai/chat.
    /// </summary>
    private async Task<string?> BuildDossierAsync(Session session, string intent)
    {
        using var scope = _api.CreateServiceScope();

        var httpAccessor = scope.ServiceProvider
            .GetRequiredService<IHttpContextAccessor>();

        var user = await scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>()
            .Users
            .AsNoTracking()
            .FirstAsync(u => u.Email == session.Email);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Email, user.Email),
        };

        foreach (var role in session.Roles)
        {
            claims.Add(new Claim(RoleKeys.RoleClaimType, role));
        }

        httpAccessor.HttpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(
                new ClaimsIdentity(claims, "test", ClaimTypes.Name, ClaimTypes.Role))
        };

        var builder = scope.ServiceProvider.GetRequiredService<ChatContextBuilder>();
        return await builder.BuildAsync(user.Id.ToString(), intent, CancellationToken.None);
    }

    [Fact]
    public async Task Project_questions_receive_real_project_data()
    {
        var dossier = await BuildDossierAsync(_api.SuperAdmin, ChatIntents.ProjectList);

        dossier.Should().NotBeNull("the assistant must never be called without data");
        dossier!.Should().NotContain(
            "You have access to 0 projects",
            "the seeded database contains projects");
    }

    [Theory]
    [InlineData(ChatIntents.ProjectList)]
    [InlineData(ChatIntents.ProjectStatus)]
    [InlineData(ChatIntents.DelayAnalysis)]
    [InlineData(ChatIntents.TaskQuery)]
    [InlineData(ChatIntents.MilestoneQuery)]
    [InlineData(ChatIntents.DocumentQuery)]
    [InlineData(ChatIntents.BudgetQuery)]
    [InlineData(ChatIntents.ResourceManagement)]
    [InlineData(ChatIntents.Reporting)]
    [InlineData(ChatIntents.General)]
    public async Task Every_intent_produces_a_populated_dossier(string intent)
    {
        // The original defect was that most intents produced nothing at all. The old
        // switch returned null for ProjectList, TaskQuery, MilestoneQuery,
        // DocumentQuery, BudgetQuery, Reporting, TaskAssignment and General - which
        // is every intent a normal user would reach.
        var dossier = await BuildDossierAsync(_api.SuperAdmin, intent);

        dossier.Should().NotBeNull();
        dossier!.Should().NotBeEmpty();
        dossier.Should().Contain("# Who is asking");
        dossier.Should().Contain("# Portfolio at a glance");
        dossier.Should().NotContain("You have access to 0 projects");
    }

    [Fact]
    public async Task Dossier_names_the_real_seeded_projects()
    {
        var dossier = await BuildDossierAsync(_api.SuperAdmin, ChatIntents.ProjectList);

        using var scope = _api.CreateServiceScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var projectNames = await db.Projects.AsNoTracking().Select(p => p.Name).ToListAsync();

        projectNames.Should().NotBeEmpty();
        foreach (var name in projectNames)
        {
            dossier!.Should().Contain(name,
                "the model cannot invent a project it was not shown");
        }
    }

    [Fact]
    public async Task Dossier_includes_task_and_subtask_data()
    {
        // The user asked for tasks and subtasks specifically.
        var dossier = await BuildDossierAsync(_api.SuperAdmin, ChatIntents.TaskQuery);

        dossier.Should().NotBeNull();
        dossier!.Should().Contain("## Tasks");
        dossier.Should().Contain("Open tasks: ");

        using var scope = _api.CreateServiceScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var topLevel = await db.Tasks.AsNoTracking().CountAsync(t => t.ParentTaskId == null);
        var subtasks = await db.Tasks.AsNoTracking().CountAsync(t => t.ParentTaskId != null);

        topLevel.Should().BeGreaterThan(0, "the seeded database has top-level tasks");

        if (subtasks > 0)
        {
            dossier.Should().Contain("## Subtasks",
                "subtasks exist and the assistant was asked about them");
        }
    }

    [Fact]
    public async Task Dossier_includes_milestone_data()
    {
        var dossier = await BuildDossierAsync(_api.SuperAdmin, ChatIntents.MilestoneQuery);

        using var scope = _api.CreateServiceScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var milestoneCount = await db.Milestones.AsNoTracking().CountAsync();

        if (milestoneCount > 0)
        {
            dossier.Should().Contain("## Milestones");
            dossier!.Should().NotContain("No milestones in these projects.");
        }
    }

    [Fact]
    public async Task Dossier_tells_the_model_the_data_is_authoritative()
    {
        // This is the instruction that stops the model replying "I don't have access
        // to your project data". Without it the model has no way to tell an empty
        // dossier from a missing one.
        var dossier = await BuildDossierAsync(_api.SuperAdmin, ChatIntents.General);

        dossier!.Should().Contain("already filtered");
        dossier.Should().Contain("Never speculate");
    }

    [Fact]
    public async Task Dossier_is_scoped_so_a_narrower_role_is_never_shown_more_projects()
    {
        // The AI must not become a way to read another organisation's projects by
        // asking a question instead of clicking.
        //
        // The invariant is about the project set, not the length of the dossier: the
        // identity header legitimately differs per role, so comparing total
        // characters produces a false failure when two roles see the same projects.
        var superAdminDossier = await BuildDossierAsync(_api.SuperAdmin, ChatIntents.ProjectList);
        var teamMemberDossier = await BuildDossierAsync(_api.TeamMember, ChatIntents.ProjectList);

        superAdminDossier.Should().NotBeNull();
        teamMemberDossier.Should().NotBeNull();

        using var scope = _api.CreateServiceScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var allProjectNames = await db.Projects.AsNoTracking().Select(p => p.Name).ToListAsync();

        var teamMemberProjects = allProjectNames
            .Where(name => teamMemberDossier!.Contains(name, StringComparison.Ordinal))
            .ToList();

        var superAdminProjects = allProjectNames
            .Where(name => superAdminDossier!.Contains(name, StringComparison.Ordinal))
            .ToList();

        superAdminProjects.Should().NotBeEmpty("the superadmin sees the seeded projects");
        teamMemberProjects.Should().BeSubsetOf(superAdminProjects,
            "a narrower role cannot be shown a project the widest role is not shown");
    }

    [Fact]
    public async Task Dossier_is_bounded_so_the_prompt_cannot_grow_without_limit()
    {
        var dossier = await BuildDossierAsync(_api.SuperAdmin, ChatIntents.Reporting);

        dossier.Should().NotBeNull();
        dossier!.Length.Should().BeLessThanOrEqualTo(40_000,
            "an unbounded dossier eventually trips the provider's context limit, " +
            "which surfaces as an opaque provider error");
    }

    [Fact]
    public async Task An_unparsable_user_id_is_refused_rather_than_sending_unscoped_data()
    {
        using var scope = _api.CreateServiceScope();
        var builder = scope.ServiceProvider.GetRequiredService<ChatContextBuilder>();

        var dossier = await builder.BuildAsync("not-a-guid", ChatIntents.ProjectList, CancellationToken.None);

        // Null means "cannot scope", and the controller turns that into a 400. Sending
        // an unscoped dossier would hand one user another organisation's data.
        dossier.Should().BeNull();
    }

    [Fact]
    public async Task Null_user_id_is_refused()
    {
        using var scope = _api.CreateServiceScope();
        var builder = scope.ServiceProvider.GetRequiredService<ChatContextBuilder>();

        var dossier = await builder.BuildAsync(string.Empty, ChatIntents.ProjectList, CancellationToken.None);

        dossier.Should().BeNull();
    }
}
