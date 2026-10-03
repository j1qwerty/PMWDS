using System.Net;
using System.Text.Json;
using FluentAssertions;
using PMWDS.Tests.Infrastructure;
using Xunit;

namespace PMWDS.Tests;

[Collection(ApiCollection.Name)]
public sealed class RoleHierarchyAuthorizationTests
{
    private readonly ApiFixture _fixture;

    public RoleHierarchyAuthorizationTests(ApiFixture fixture) => _fixture = fixture;

    [Fact]
    public async Task Department_head_cannot_raise_a_lower_role_above_its_own_level()
    {
        var client = _fixture.DepartmentHead.Client;
        var roles = await client.GetAsync<JsonElement>("/api/v1/roles");
        roles.Status.Should().Be(HttpStatusCode.OK);

        var role = roles.Data.EnumerateArray()
            .FirstOrDefault(item =>
                item.GetString("key") == "team-member" ||
                item.GetString("name") == "TeamMember");

        role.ValueKind.Should().NotBe(JsonValueKind.Undefined);

        var response = await client.PutAsync<JsonElement>(
            $"/api/v1/roles/{role.GetGuid("id")}",
            new
            {
                name = role.GetString("name"),
                description = role.GetString("description"),
                permissionLevel = 90,
                paginationPageSize = role.GetProperty("paginationPageSize").GetInt32(),
                permissionIds = role.GetProperty("permissions")
                    .EnumerateArray()
                    .Select(permission => permission.GetGuid("id"))
                    .ToArray(),
            });

        response.Status.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Delegating_role_can_create_a_lower_role()
    {
        var client = _fixture.Director.Client;
        var permissions = await client.GetAsync<JsonElement>("/api/v1/roles/permissions");
        var projectView = permissions.Data.EnumerateArray()
            .First(p => p.GetString("code") == "PROJECT_VIEW")
            .GetGuid("id");

        var response = await client.PostAsync<JsonElement>("/api/v1/roles", new
        {
            name = $"Delegated-{Guid.NewGuid():N}",
            description = "Temporary lower role.",
            permissionLevel = 20,
            canAssignLowerRoles = false,
            paginationPageSize = 10,
            permissionIds = new[] { projectView },
        });

        response.Status.Should().Be(HttpStatusCode.Created);
        var roleId = response.Data.GetGuid("id");

        await client.DeleteAsync<JsonElement>($"/api/v1/roles/{roleId}");
    }

    [Fact]
    public async Task Delegating_role_cannot_assign_a_permission_it_does_not_have()
    {
        var client = _fixture.ProjectManager.Client;
        var permissions = await client.GetAsync<JsonElement>("/api/v1/roles/permissions");
        var systemAdmin = permissions.Data.EnumerateArray()
            .First(p => p.GetString("code") == "SYSTEM_ADMIN")
            .GetGuid("id");

        var response = await client.PostAsync<JsonElement>("/api/v1/roles", new
        {
            name = $"DeniedPerm-{Guid.NewGuid():N}",
            description = "Must not receive a permission outside the caller's permission set.",
            permissionLevel = 20,
            canAssignLowerRoles = false,
            paginationPageSize = 10,
            permissionIds = new[] { systemAdmin },
        });

        response.Status.Should().Be(HttpStatusCode.Forbidden);
    }
}
