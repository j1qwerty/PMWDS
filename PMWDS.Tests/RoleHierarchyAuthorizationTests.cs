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
}
