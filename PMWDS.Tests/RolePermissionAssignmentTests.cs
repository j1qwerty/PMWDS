using System.Net;
using System.Text.Json;
using FluentAssertions;
using PMWDS.Tests.Infrastructure;
using Xunit;

namespace PMWDS.Tests;

[Collection(ApiCollection.Name)]
public sealed class RolePermissionAssignmentTests
{
    private readonly ApiFixture _fixture;

    public RolePermissionAssignmentTests(ApiFixture fixture) => _fixture = fixture;

    [Fact]
    public async Task Delegating_non_superadmin_cannot_assign_admin_only_permission()
    {
        var superAdminPermissions = await _fixture.SuperAdmin.Client.GetAsync<JsonElement>("/api/v1/roles/permissions");
        var authManage = superAdminPermissions.Data
            .EnumerateArray()
            .First(permission => permission.GetString("code") == "AUTH_MANAGE")
            .GetGuid("id");

        var response = await _fixture.Director.Client.PostAsync<JsonElement>(
            "/api/v1/roles",
            new
            {
                name = $"BlockedPermission-{Guid.NewGuid():N}",
                description = "Should not persist.",
                permissionLevel = 50,
                canAssignLowerRoles = false,
                paginationPageSize = 10,
                permissionIds = new[] { authManage },
            });

        response.Status.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Delegating_non_superadmin_cannot_supply_unknown_permission_id()
    {
        var response = await _fixture.Director.Client.PostAsync<JsonElement>(
            "/api/v1/roles",
            new
            {
                name = $"UnknownPermission-{Guid.NewGuid():N}",
                description = "Should not persist.",
                permissionLevel = 50,
                canAssignLowerRoles = false,
                paginationPageSize = 10,
                permissionIds = new[] { Guid.NewGuid() },
            });

        response.Status.Should().Be(HttpStatusCode.Forbidden);
    }
}
