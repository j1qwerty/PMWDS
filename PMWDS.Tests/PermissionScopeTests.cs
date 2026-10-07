using System.Net;
using System.Text.Json;
using FluentAssertions;
using PMWDS.Application.Security;
using PMWDS.Tests.Infrastructure;
using Xunit;

namespace PMWDS.Tests;

/// <summary>
/// The own-department / all-departments split.
///
/// These pin the two rules the whole split rests on: an all-departments grant
/// satisfies an own-department policy, and an own-department grant does not
/// satisfy an all-departments scope check. The second is the one that silently
/// fails open, because a wrong answer there widens somebody's reach.
/// </summary>
public class PermissionScopeTests
{
    private static HashSet<string> Expand(IEnumerable<string> raw) =>
        PermissionAuthorizationHandlerProbe.Expand(raw);

    /// <summary>
    /// Mirrors PermissionAuthorizationHandler.Expand exactly. The handler itself is
    /// reachable over HTTP but the map it walks is what is under test here, so the
    /// walk is reproduced rather than driven through the API.
    /// </summary>
    private static class PermissionAuthorizationHandlerProbe
    {
        public static HashSet<string> Expand(IEnumerable<string> permissions)
        {
            var result = permissions.ToHashSet(StringComparer.OrdinalIgnoreCase);
            var frontier = new List<string>(result);
            var visited = new HashSet<string>(result, StringComparer.OrdinalIgnoreCase);

            while (frontier.Count > 0)
            {
                var current = frontier[^1];
                frontier.RemoveAt(frontier.Count - 1);

                if (!PermissionCatalog.EffectiveCoverage.TryGetValue(current, out var covered))
                {
                    continue;
                }

                foreach (var code in covered)
                {
                    if (visited.Add(code))
                    {
                        result.Add(code);
                        frontier.Add(code);
                    }
                }
            }

            return result;
        }
    }

    // ── Umbrella expansion, within a scope ──────────────────────────────────

    [Fact]
    public void A_manage_grant_covers_its_own_feature()
    {
        var effective = Expand(new[] { PermissionCodes.ProjectManage });

        effective.Should().Contain(new[]
        {
            PermissionCodes.ProjectView,
            PermissionCodes.ProjectCreate,
            PermissionCodes.ProjectEdit,
            PermissionCodes.ProjectDelete,
        });
    }

    [Fact]
    public void An_own_umbrella_does_not_reach_the_all_departments_actions()
    {
        // Reading across scopes would let a role that manages only its own
        // department quietly acquire organization-wide reach.
        var effective = Expand(new[] { PermissionCodes.ProjectManage });

        effective.Should().NotContain(PermissionCodes.ProjectViewAll);
        effective.Should().NotContain(PermissionCodes.ProjectManageAll);
    }

    [Fact]
    public void An_all_departments_umbrella_covers_the_all_departments_actions()
    {
        var effective = Expand(new[] { PermissionCodes.ProjectManageAll });

        // The merge step replaced rather than added, so this was previously true for
        // the feature table and false for the map the walk actually uses — a Director
        // holding PROJECT_MANAGE_ALL expanded to nothing all-departments and was
        // therefore narrowed to their own department.
        effective.Should().Contain(new[]
        {
            PermissionCodes.ProjectManageAll,
            PermissionCodes.ProjectViewAll,
            PermissionCodes.ProjectCreateAll,
            PermissionCodes.ProjectEditAll,
            PermissionCodes.ProjectDeleteAll,
        });
    }

    [Fact]
    public void An_all_departments_grant_also_satisfies_the_own_department_policy()
    {
        // Otherwise an API policy asking for PROJECT_VIEW would reject a Director
        // who was deliberately granted PROJECT_VIEW_ALL.
        var effective = Expand(new[] { PermissionCodes.ProjectViewAll });

        effective.Should().Contain(PermissionCodes.ProjectView);
    }

    [Fact]
    public void An_own_department_grant_does_not_satisfy_an_all_departments_policy()
    {
        // The converse of the rule above, and the one that fails open. A scope check
        // that consulted the implied-coverage map asked "does the caller hold the
        // own-department code?", which every caller with any scope at all does — so
        // every department head was promoted to all-departments reach.
        var effective = Expand(new[] { PermissionCodes.ProjectView });

        effective.Should().NotContain(PermissionCodes.ProjectViewAll);
    }

    [Fact]
    public void Expansion_is_transitive()
    {
        // An all-departments umbrella implies an own-department umbrella, which in
        // turn covers the own-department actions. A single pass over the map missed
        // the second hop.
        var effective = Expand(new[] { PermissionCodes.ProjectManageAll });

        effective.Should().Contain(new[]
        {
            PermissionCodes.ProjectManage,
            PermissionCodes.ProjectView,
            PermissionCodes.ProjectCreate,
            PermissionCodes.ProjectEdit,
            PermissionCodes.ProjectDelete,
        });
    }

    // ── Special actions are never umbrellas ──────────────────────────────────

    [Theory]
    [InlineData(PermissionCodes.TaskAssign)]
    [InlineData(PermissionCodes.TaskCommentCreate)]
    [InlineData(PermissionCodes.TaskAttachmentCreate)]
    [InlineData(PermissionCodes.TaskTimeTrack)]
    public void A_special_action_does_not_cover_the_rest_of_its_feature(string code)
    {
        // These codes do not end in a CRUD suffix, so an action inferred from the code
        // reads as Manage and silently covers the whole feature. TASK_ASSIGN alone
        // must not imply the right to edit or delete a task.
        var effective = Expand(new[] { code });

        effective.Should().NotContain(PermissionCodes.TaskEdit);
        effective.Should().NotContain(PermissionCodes.TaskDelete);
        effective.Should().NotContain(PermissionCodes.TaskManage);
    }

    [Fact]
    public void The_primary_department_permission_is_a_distinct_authority()
    {
        var effective = Expand(new[] { PermissionCodes.ProjectPrimaryDepartmentManage });

        // It grants full visibility of the projects whose primary department the
        // person heads. It is not the same thing as managing projects.
        effective.Should().NotContain(PermissionCodes.ProjectManage);
        effective.Should().NotContain(PermissionCodes.ProjectEdit);
    }

    [Fact]
    public void Managing_projects_confers_the_primary_department_permission()
    {
        // Bundled deliberately: a role that manages projects outright does not also
        // need a separate grant just to see the projects it manages.
        Expand(new[] { PermissionCodes.ProjectManage })
            .Should().Contain(PermissionCodes.ProjectPrimaryDepartmentManage);

        Expand(new[] { PermissionCodes.ProjectManageAll })
            .Should().Contain(PermissionCodes.ProjectPrimaryDepartmentManageAll);
    }

    // ── Document upload levels ───────────────────────────────────────────────

    [Fact]
    public void Managing_documents_confers_every_upload_level()
    {
        var effective = Expand(new[] { PermissionCodes.DocumentManage });

        effective.Should().Contain(new[]
        {
            PermissionCodes.DocumentUploadProject,
            PermissionCodes.DocumentUploadMilestone,
            PermissionCodes.DocumentUploadTask,
        });
    }

    [Fact]
    public void A_single_upload_level_does_not_confer_the_others()
    {
        // The symptom this prevents: a team member granted task-level uploads was
        // offered all three levels in the upload dialog, because that code had been
        // misread as an umbrella.
        var effective = Expand(new[] { PermissionCodes.DocumentUploadTask });

        effective.Should().NotContain(PermissionCodes.DocumentUploadProject);
        effective.Should().NotContain(PermissionCodes.DocumentUploadMilestone);
    }

    [Fact]
    public void Submitting_a_certificate_confers_the_certificate_document_levels()
    {
        var effective = Expand(new[] { PermissionCodes.UtilizationCertificateCreate });

        effective.Should().Contain(new[]
        {
            PermissionCodes.UtilizationCertificateDocumentUploadProject,
            PermissionCodes.UtilizationCertificateDocumentUploadMilestone,
            PermissionCodes.UtilizationCertificateDocumentUploadTask,
        });
    }

    [Fact]
    public void Certificate_document_levels_are_separate_from_ordinary_document_levels()
    {
        // Being allowed to attach a finance claim at task level must not imply being
        // allowed to attach an ordinary document there, or the reverse.
        var effective = Expand(new[] { PermissionCodes.UtilizationCertificateDocumentUploadTask });

        effective.Should().NotContain(PermissionCodes.DocumentUploadTask);
    }

    // ── The catalogue is internally consistent ───────────────────────────────

    [Fact]
    public void Every_coverage_entry_names_a_permission_that_exists()
    {
        var known = PermissionCatalog.Definitions
            .Select(d => d.Code)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var dangling = PermissionCatalog.EffectiveCoverage
            .Where(pair => pair.Value.Any(code => !known.Contains(code)))
            .ToList();

        dangling.Should().BeEmpty("a coverage entry pointing at a code that does not exist silently confers nothing");
    }

    [Fact]
    public void No_permission_implies_itself()
    {
        var selfImplying = PermissionCatalog.EffectiveCoverage
            .Where(pair => pair.Value.Contains(pair.Key, StringComparer.OrdinalIgnoreCase))
            .Select(pair => pair.Key)
            .ToList();

        selfImplying.Should().BeEmpty("a grant covering itself would make the expansion walk spin");
    }

    [Fact]
    public void Every_permission_in_the_catalogue_is_described()
    {
        var undescribed = PermissionCatalog.Definitions
            .Where(d => string.IsNullOrWhiteSpace(d.Description))
            .Select(d => d.Code)
            .ToList();

        undescribed.Should().BeEmpty("the roles matrix shows these to whoever is deciding what to grant");
    }
}

/// <summary>
/// The seeded roles, as the scope split intends them.
/// </summary>
[Collection(ApiCollection.Name)]
public class SeededRoleScopeTests
{
    private readonly ApiFixture _fixture;

    public SeededRoleScopeTests(ApiFixture fixture) => _fixture = fixture;

    /// <summary>The expansion the client applies to a token's permission list.</summary>
    private static HashSet<string> EffectiveSet(IEnumerable<string> granted)
    {
        var result = granted.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var frontier = new List<string>(result);
        var visited = new HashSet<string>(result, StringComparer.OrdinalIgnoreCase);

        while (frontier.Count > 0)
        {
            var current = frontier[^1];
            frontier.RemoveAt(frontier.Count - 1);

            if (!PermissionCatalog.EffectiveCoverage.TryGetValue(current, out var covered)) continue;

            foreach (var code in covered)
            {
                if (visited.Add(code))
                {
                    result.Add(code);
                    frontier.Add(code);
                }
            }
        }

        return result;
    }

    [Theory]
    [InlineData("director", PermissionCodes.ProjectManageAll)]
    [InlineData("project manager", PermissionCodes.ProjectManage)]
    [InlineData("department head", PermissionCodes.ProjectManage)]
    [InlineData("team member", PermissionCodes.ProjectView)]
    [InlineData("viewer", PermissionCodes.ProjectView)]
    public async Task Each_seeded_role_holds_the_project_scope_it_is_meant_to(
        string who,
        string expected)
    {
        var session = who switch
        {
            "director" => _fixture.Admin,
            "project manager" => _fixture.ProjectManager,
            "department head" => _fixture.DepartmentHead,
            "team member" => _fixture.TeamMember,
            _ => _fixture.Viewer,
        };

        var me = await session.Client.GetAsync<JsonElement>("/api/v1/users/me");
        me.Status.Should().Be(HttpStatusCode.OK);

        session.Can(expected).Should().BeTrue(
            $"{who} should hold {expected} either directly or through the permission they were granted");
    }

    [Fact]
    public void A_department_head_is_department_scoped_and_a_director_is_not()
    {
        _fixture.DepartmentHead.Can(PermissionCodes.ProjectManage).Should().BeTrue();
        _fixture.DepartmentHead.Can(PermissionCodes.ProjectManageAll).Should().BeFalse();

        _fixture.Admin.Can(PermissionCodes.ProjectManageAll).Should().BeTrue();
    }

    [Fact]
    public void A_team_member_can_upload_documents_at_task_level_only()
    {
        _fixture.TeamMember.Can(PermissionCodes.DocumentUploadTask).Should().BeTrue();
        _fixture.TeamMember.Can(PermissionCodes.DocumentUploadMilestone).Should().BeFalse();
        _fixture.TeamMember.Can(PermissionCodes.DocumentUploadProject).Should().BeFalse();
    }

    [Fact]
    public async Task The_token_carries_the_granted_codes_and_the_client_expands_them()
    {
        // The login response deliberately carries the codes a role was actually
        // granted, not the implied ones: the set would otherwise change shape every
        // time the catalogue does, and a token would stop being a statement about
        // what the role holds. The client expands locally, and the API expands from
        // the database, through the same map.
        //
        // What matters is therefore that the two agree — which is what the API
        // contract tests elsewhere in this suite exercise.
        var me = await _fixture.ProjectManager.Client.GetAsync<JsonElement>("/api/v1/users/me");
        me.Status.Should().Be(HttpStatusCode.OK);

        _fixture.ProjectManager.Permissions.Should().Contain(PermissionCodes.ProjectManage);
        _fixture.ProjectManager.Permissions.Should().NotContain(PermissionCodes.ProjectView);

        var expanded = EffectiveSet(_fixture.ProjectManager.Permissions);
        expanded.Should().Contain(PermissionCodes.ProjectView);
        expanded.Should().Contain(PermissionCodes.TaskEdit);
    }
}
