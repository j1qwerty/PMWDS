using Microsoft.EntityFrameworkCore;
using PMWDS.API.Auth;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Application.Security;
using PMWDS.Domain.Entities;
using PMWDS.Persistence.Context;

namespace PMWDS.API.Services;

public class RoleScopeService
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private ScopeSnapshot? _scopeSnapshot;
    private HashSet<string>? _permissionSnapshot;

    public RoleScopeService(ApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public bool IsSuperAdmin => _currentUser.IsInRole(RoleKeys.SuperAdmin);
    public bool IsDirector => _currentUser.IsInRole(RoleKeys.Director);
    public bool IsDepartmentHead => _currentUser.IsInRole(RoleKeys.DepartmentHead);
    public bool IsProjectManager => _currentUser.IsInRole(RoleKeys.ProjectManager);
    public bool IsTeamMember => _currentUser.IsInRole(RoleKeys.TeamMember);

    public Guid? CurrentUserId =>
        Guid.TryParse(_currentUser.UserId, out var userId) ? userId : null;

    public async Task<List<Guid>> GetOrganizationIdsAsync(CancellationToken ct)
        => (await GetScopeSnapshotAsync(ct)).OrganizationIds.ToList();

    public async Task<List<Guid>> GetDepartmentIdsAsync(CancellationToken ct)
        => (await GetScopeSnapshotAsync(ct)).DepartmentIds.ToList();

    public async Task<IQueryable<Organization>> ScopeOrganizationsAsync(IQueryable<Organization> query, CancellationToken ct)
    {
        if (IsSuperAdmin)
        {
            return query;
        }

        var organizationIds = await GetOrganizationIdsAsync(ct);
        return query.Where(organization => organizationIds.Contains(organization.Id));
    }

    public async Task<IQueryable<Department>> ScopeDepartmentsAsync(IQueryable<Department> query, CancellationToken ct)
    {
        if (IsSuperAdmin)
        {
            return query;
        }

        // The own-department flavour of DEPARTMENT_VIEW limits the department list
        // to the caller's own departments. The "all departments" flavour keeps the
        // whole organization visible, which is what a Director needs in order to
        // assign milestones to any participating department.
        if (!await HasAllScopeAsync(PermissionCodes.DepartmentView, ct))
        {
            var departmentIds = await GetDepartmentIdsAsync(ct);
            if (departmentIds.Count > 0)
            {
                return query.Where(department => departmentIds.Contains(department.Id));
            }
        }

        var organizationIds = await GetOrganizationIdsAsync(ct);
        return query.Where(department => department.OrganizationId.HasValue && organizationIds.Contains(department.OrganizationId.Value));
    }

    public async Task<IQueryable<Project>> ScopeProjectsAsync(IQueryable<Project> query, CancellationToken ct)
    {
        if (IsSuperAdmin)
        {
            return query;
        }

        // "All departments" reaches every project in the organization; the
        // own-department flavour narrows to the departments the user belongs to.
        if (await HasAllScopeAsync(PermissionCodes.ProjectView, ct))
        {
            return await ScopeProjectsByOrganizationAsync(query, ct);
        }

        if (IsDepartmentHead && !IsDirector)
        {
            var departmentIds = await GetDepartmentIdsAsync(ct);
            var canAccessPrimaryDepartmentProjects = await HasPermissionAsync(PermissionCodes.ProjectPrimaryDepartmentManage, ct);
            return query.Where(project =>
                (canAccessPrimaryDepartmentProjects && departmentIds.Contains(project.DepartmentId)) ||
                project.ProjectDepartments.Any(pd =>
                    departmentIds.Contains(pd.DepartmentId)) ||
                project.Milestones.Any(m =>
                    m.DepartmentId.HasValue &&
                    departmentIds.Contains(m.DepartmentId.Value)));
        }

        var departmentIdsForProject = await GetDepartmentIdsAsync(ct);
        if (departmentIdsForProject.Count > 0)
        {
            // Projects the caller is the named manager of stay visible even when they
            // sit in another department, so the list and the single-project page agree.
            if (IsProjectManager && CurrentUserId is not null)
            {
                var managedBy = CurrentUserId.Value;
                return query.Where(project =>
                    project.ProjectManagerId == managedBy ||
                    departmentIdsForProject.Contains(project.DepartmentId) ||
                    project.ProjectDepartments.Any(pd => departmentIdsForProject.Contains(pd.DepartmentId)));
            }

            return query.Where(project =>
                departmentIdsForProject.Contains(project.DepartmentId) ||
                project.ProjectDepartments.Any(pd => departmentIdsForProject.Contains(pd.DepartmentId)));
        }

        // A user with no department assignment at all (an organization-wide
        // administrator) has nothing narrower to fall back to.
        return await ScopeProjectsByOrganizationAsync(query, ct);
    }

    private async Task<IQueryable<Project>> ScopeProjectsByOrganizationAsync(
        IQueryable<Project> query,
        CancellationToken ct)
    {
        var organizationIds = await GetOrganizationIdsAsync(ct);
        return query.Where(project =>
            (project.Department != null &&
                project.Department.OrganizationId.HasValue &&
                organizationIds.Contains(project.Department.OrganizationId.Value)) ||
            project.ProjectDepartments.Any(assignment =>
                assignment.Department != null &&
                assignment.Department.OrganizationId.HasValue &&
                organizationIds.Contains(assignment.Department.OrganizationId.Value)));
    }

    public async Task<IQueryable<ApplicationUser>> ScopeUsersAsync(IQueryable<ApplicationUser> query, CancellationToken ct)
    {
        if (IsSuperAdmin)
        {
            return query;
        }

        var organizationIds = await GetOrganizationIdsAsync(ct);

        if (IsDepartmentHead && !IsDirector && !await HasAllScopeAsync(PermissionCodes.UserView, ct))
        {
            var departmentIds = await GetDepartmentIdsAsync(ct);
            return query.Where(user =>
                !user.Roles.Any(role => role.Key == RoleKeys.SuperAdmin) &&
                (
                    (user.OrganizationId.HasValue && organizationIds.Contains(user.OrganizationId.Value)) ||
                    user.DepartmentAssignments.Any(assignment => departmentIds.Contains(assignment.DepartmentId)) ||
                    (user.DepartmentId.HasValue && departmentIds.Contains(user.DepartmentId.Value)) ||
                    user.Roles.Any(role => (role.Key == RoleKeys.Director || role.Key == RoleKeys.DepartmentHead) &&
                        user.DepartmentAssignments.Any(assignment =>
                            assignment.Department != null &&
                            assignment.Department.OrganizationId.HasValue &&
                            organizationIds.Contains(assignment.Department.OrganizationId.Value)))
                ));
        }

        return query.Where(user =>
            !user.Roles.Any(role => role.Key == RoleKeys.SuperAdmin) &&
            (
                (user.OrganizationId.HasValue && organizationIds.Contains(user.OrganizationId.Value)) ||
                user.DepartmentAssignments.Any(assignment =>
                    assignment.Department != null &&
                    assignment.Department.OrganizationId.HasValue &&
                    organizationIds.Contains(assignment.Department.OrganizationId.Value)) ||
                (user.Department != null &&
                    user.Department.OrganizationId.HasValue &&
                    organizationIds.Contains(user.Department.OrganizationId.Value))
            ));
    }

    public async Task<bool> CanAccessOrganizationAsync(Guid organizationId, CancellationToken ct)
    {
        if (IsSuperAdmin)
        {
            return true;
        }

        var organizationIds = await GetOrganizationIdsAsync(ct);
        return organizationIds.Contains(organizationId);
    }

    public async Task<bool> CanAccessDepartmentAsync(Guid departmentId, CancellationToken ct)
    {
        if (IsSuperAdmin)
        {
            return true;
        }

        // Own-department scope: a department the user is not a member of is not
        // theirs to reach, even inside their own organization.
        if (!await HasAllScopeAsync(PermissionCodes.DepartmentView, ct))
        {
            var departmentIds = await GetDepartmentIdsAsync(ct);
            return departmentIds.Contains(departmentId);
        }

        if (IsDepartmentHead && CurrentUserId is not null)
        {
            var deptHeadUserId = await _db.Departments
                .Where(d => d.Id == departmentId)
                .Select(d => d.DepartmentHeadUserId)
                .FirstOrDefaultAsync(ct);
            if (deptHeadUserId == CurrentUserId.ToString()) return true;
        }

        var department = await _db.Departments
            .Where(item => item.Id == departmentId)
            .Select(item => new { item.OrganizationId })
            .FirstOrDefaultAsync(ct);

        return department?.OrganizationId is { } organizationId &&
            await CanAccessOrganizationAsync(organizationId, ct);
    }

    public async Task<bool> CanManageOrganizationAsync(Guid organizationId, CancellationToken ct)
        => IsSuperAdmin || (IsDirector && await CanAccessOrganizationAsync(organizationId, ct));

    public async Task<bool> CanManageDepartmentAsync(Guid departmentId, CancellationToken ct)
    {
        if (IsSuperAdmin)
        {
            return true;
        }

        var department = await _db.Departments
            .Where(item => item.Id == departmentId)
            .Select(item => new { item.OrganizationId, item.DepartmentHeadUserId })
            .FirstOrDefaultAsync(ct);

        if (department == null)
        {
            return false;
        }

        if (IsDirector && department.OrganizationId.HasValue &&
            await CanAccessOrganizationAsync(department.OrganizationId.Value, ct))
        {
            return true;
        }

        return IsDepartmentHead &&
            CurrentUserId?.ToString() == department.DepartmentHeadUserId;
    }

    public async Task<bool> CanManageProjectAsync(Guid projectId, CancellationToken ct)
    {
        if (IsSuperAdmin)
        {
            return true;
        }

        var project = await _db.Projects
            .Where(item => item.Id == projectId)
            .Select(item => new
            {
                item.ProjectManagerId,
                item.DepartmentId,
                OrganizationId = item.Department != null ? item.Department.OrganizationId : null,
                AssignedDepartmentIds = item.ProjectDepartments
                    .Select(assignment => assignment.DepartmentId)
                    .ToList(),
                AssignedOrganizationIds = item.ProjectDepartments
                    .Where(assignment => assignment.Department != null && assignment.Department.OrganizationId.HasValue)
                    .Select(assignment => assignment.Department!.OrganizationId!.Value)
                    .ToList()
            })
            .FirstOrDefaultAsync(ct);

        if (project == null)
        {
            return false;
        }

        if (IsProjectManager && CurrentUserId == project.ProjectManagerId)
        {
            return true;
        }

        if (IsDepartmentHead && !IsDirector)
        {
            var departmentIds = await GetDepartmentIdsAsync(ct);
            return departmentIds.Contains(project.DepartmentId) &&
                await HasPermissionAsync(PermissionCodes.ProjectPrimaryDepartmentManage, ct);
        }

        if (IsDirector && project.OrganizationId.HasValue &&
            await CanAccessOrganizationAsync(project.OrganizationId.Value, ct))
        {
            return true;
        }

        if (IsDirector)
        {
            foreach (var organizationId in project.AssignedOrganizationIds)
            {
                if (await CanAccessOrganizationAsync(organizationId, ct))
                {
                    return true;
                }
            }
        }

        return false;
    }

    public async Task<bool> CanAccessProjectAsync(Guid projectId, CancellationToken ct)
    {
        if (IsSuperAdmin)
        {
            return true;
        }

        var projectOrganizations = await _db.Projects
            .Where(project => project.Id == projectId)
            .Select(project => new
            {
                PrimaryOrganizationId = project.Department != null ? project.Department.OrganizationId : null,
                project.DepartmentId,
                project.ProjectManagerId,
                AssignedDepartmentIds = project.ProjectDepartments
                    .Select(assignment => assignment.DepartmentId)
                    .ToList(),
                MilestoneDepartmentIds = project.Milestones
                    .Where(milestone => milestone.DepartmentId.HasValue)
                    .Select(milestone => milestone.DepartmentId!.Value)
                    .ToList(),
                AssignedOrganizationIds = project.ProjectDepartments
                    .Where(assignment => assignment.Department != null && assignment.Department.OrganizationId.HasValue)
                    .Select(assignment => assignment.Department!.OrganizationId!.Value)
                    .ToList()
            })
            .FirstOrDefaultAsync(ct);

        if (projectOrganizations == null)
        {
            return false;
        }

        // Someone the project is explicitly assigned to always reaches it, whichever
        // department it sits in. Without this, a project manager who was handed a
        // project in another department could manage it (CanManageProjectAsync allows
        // it) yet be refused the very page that shows it.
        if (IsProjectManager && CurrentUserId == projectOrganizations.ProjectManagerId)
        {
            return true;
        }

        if (IsDepartmentHead && !IsDirector)
        {
            var departmentIds = await GetDepartmentIdsAsync(ct);
            if (departmentIds.Contains(projectOrganizations.DepartmentId) &&
                await HasPermissionAsync(PermissionCodes.ProjectPrimaryDepartmentManage, ct))
            {
                return true;
            }

            return projectOrganizations.AssignedDepartmentIds.Any(departmentIds.Contains) ||
                projectOrganizations.MilestoneDepartmentIds.Any(departmentIds.Contains);
        }

        // Own-department view is limited to the departments the user belongs to.
        // Only the "all departments" flavour opens up the whole organization.
        if (!await HasAllScopeAsync(PermissionCodes.ProjectView, ct))
        {
            var departmentIds = await GetDepartmentIdsAsync(ct);
            if (departmentIds.Count == 0)
            {
                return false;
            }

            return departmentIds.Contains(projectOrganizations.DepartmentId)
                || projectOrganizations.AssignedDepartmentIds.Any(departmentIds.Contains)
                || projectOrganizations.MilestoneDepartmentIds.Any(departmentIds.Contains);
        }

        if (projectOrganizations.PrimaryOrganizationId.HasValue &&
            await CanAccessOrganizationAsync(projectOrganizations.PrimaryOrganizationId.Value, ct))
        {
            return true;
        }

        foreach (var organizationId in projectOrganizations.AssignedOrganizationIds)
        {
            if (await CanAccessOrganizationAsync(organizationId, ct))
            {
                return true;
            }
        }

        return false;
    }

    /// <summary>
    /// True when the caller may see the whole of a project rather than only the
    /// milestones owned by their own department.
    ///
    /// This is the gate behind the "primary department" permission. A department
    /// head whose department is the project's primary department sees everything,
    /// including milestones assigned to other departments — because it is their
    /// project. Everyone else who is merely a participating department is limited
    /// to their own milestones and tasks, so they cannot read the rest of a project
    /// they only contribute to.
    /// </summary>
    public async Task<bool> CanAccessProjectAsPrimaryDepartmentAsync(Guid projectId, CancellationToken ct)
    {
        if (IsSuperAdmin || IsDirector)
        {
            return true;
        }

        // The "all departments" flavour of the primary-department permission is
        // the same authority reached from another direction, so it opens the same
        // door.
        if (await HasAllScopeAsync(PermissionCodes.ProjectPrimaryDepartmentManage, ct))
        {
            return await CanAccessProjectAsync(projectId, ct);
        }

        if (!IsDepartmentHead || !await HasPermissionAsync(PermissionCodes.ProjectPrimaryDepartmentManage, ct))
        {
            return false;
        }

        var departmentIds = await GetDepartmentIdsAsync(ct);
        return await _db.Projects
            .AnyAsync(project => project.Id == projectId && departmentIds.Contains(project.DepartmentId), ct);
    }

    public async Task<bool> CanAccessUserAsync(Guid userId, CancellationToken ct)
    {
        if (IsSuperAdmin || CurrentUserId == userId)
        {
            return true;
        }

        var isSuperAdminUser = await _db.Users
            .Where(user => user.Id == userId)
            .Select(user => user.Roles.Any(role => role.Key == RoleKeys.SuperAdmin))
            .FirstOrDefaultAsync(ct);
        if (isSuperAdminUser)
        {
            return false;
        }

        var scopedUserIds = await (await ScopeUsersAsync(_db.Users.AsQueryable(), ct))
            .Where(user => user.Id == userId)
            .Select(user => user.Id)
            .ToListAsync(ct);
        return scopedUserIds.Count > 0;
    }

    public async Task<bool> CanManageUserAsync(Guid userId, CancellationToken ct)
    {
        if (IsSuperAdmin)
        {
            return true;
        }

        return IsDirector && await CanAccessUserAsync(userId, ct);
    }

    private async Task<ScopeSnapshot> GetScopeSnapshotAsync(CancellationToken ct)
    {
        if (_scopeSnapshot != null)
        {
            return _scopeSnapshot;
        }

        if (CurrentUserId is not { } userId)
        {
            _scopeSnapshot = ScopeSnapshot.Empty;
            return _scopeSnapshot;
        }

        var userScope = await _db.Users
            .Where(user => user.Id == userId)
            .Select(user => new
            {
                user.OrganizationId,
                user.DepartmentId,
                PrimaryDepartmentOrganizationId = user.Department != null
                    ? user.Department.OrganizationId
                    : null,
                Assignments = user.DepartmentAssignments
                    .Select(assignment => new
                    {
                        assignment.DepartmentId,
                        OrganizationId = assignment.Department != null
                            ? assignment.Department.OrganizationId
                            : null
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync(ct);

        if (userScope == null)
        {
            _scopeSnapshot = ScopeSnapshot.Empty;
            return _scopeSnapshot;
        }

        var organizationIds = new HashSet<Guid>();
        var departmentIds = new HashSet<Guid>();

        if (userScope.OrganizationId.HasValue)
        {
            organizationIds.Add(userScope.OrganizationId.Value);
        }

        if (userScope.PrimaryDepartmentOrganizationId.HasValue)
        {
            organizationIds.Add(userScope.PrimaryDepartmentOrganizationId.Value);
        }

        if (userScope.DepartmentId.HasValue)
        {
            departmentIds.Add(userScope.DepartmentId.Value);
        }

        foreach (var assignment in userScope.Assignments)
        {
            departmentIds.Add(assignment.DepartmentId);
            if (assignment.OrganizationId.HasValue)
            {
                organizationIds.Add(assignment.OrganizationId.Value);
            }
        }

        _scopeSnapshot = new ScopeSnapshot(organizationIds, departmentIds);
        return _scopeSnapshot;
    }

    private async Task<bool> HasPermissionAsync(string permissionCode, CancellationToken ct)
    {
        var permissions = await GetPermissionSnapshotAsync(ct);
        return EffectivePermissionSet(permissions).Contains(permissionCode);
    }

    /// <summary>
    /// Expands raw role permissions the same way the authorization handler does —
    /// umbrella "manage" grants cover their feature, and "all departments" grants
    /// cover the own-department equivalent — so a capability flag computed here can
    /// never disagree with what the API will actually allow.
    /// </summary>
    public static HashSet<string> EffectivePermissionSet(IEnumerable<string> permissions) =>
        PermissionAuthorizationHandler.Expand(permissions);

    /// <summary>
    /// Checks any of <paramref name="permissionCodes"/>, applying the same umbrella
    /// and cross-scope expansion as the authorization handler.
    /// </summary>
    public async Task<bool> HasAnyPermissionAsync(CancellationToken ct, params string[] permissionCodes)
    {
        var permissions = await GetPermissionSnapshotAsync(ct);
        var effective = EffectivePermissionSet(permissions);

        return permissionCodes.Any(code => !string.IsNullOrWhiteSpace(code) && effective.Contains(code));
    }

    /// <summary>
    /// True when the user holds the "all departments" flavour of a permission.
    /// Scope checks use this to decide whether department filtering applies at all.
    /// </summary>
    public async Task<bool> HasAllScopeAsync(string ownDepartmentCode, CancellationToken ct)
    {
        var permissions = await GetPermissionSnapshotAsync(ct);
        if (permissions.Contains(PermissionCodes.SystemAdmin))
        {
            return true;
        }

        // Only the ALL flavour itself counts, directly or through an ALL-scope
        // umbrella that covers it.
        //
        // The implied-coverage map deliberately runs the other way round — an ALL
        // grant implies its own-department equivalent — so consulting it here would
        // ask "does the caller hold the own-department code?", which every caller
        // with any scope at all does. That silently promoted every department head
        // to all-departments reach and defeated the whole split.
        var allCode = PermissionCodes.ToAllScope(ownDepartmentCode);
        return EffectivePermissionSet(permissions).Contains(allCode);
    }

    private async Task<HashSet<string>> GetPermissionSnapshotAsync(CancellationToken ct)
    {
        if (_permissionSnapshot != null)
        {
            return _permissionSnapshot;
        }

        if (CurrentUserId is not { } userId)
        {
            _permissionSnapshot = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            return _permissionSnapshot;
        }

        var permissions = await _db.Users
            .Where(user => user.Id == userId && user.IsActive)
            .SelectMany(user => user.Roles)
            .SelectMany(role => role.Permissions)
            .Select(permission => permission.Code)
            .Distinct()
            .ToListAsync(ct);

        _permissionSnapshot = permissions.ToHashSet(StringComparer.OrdinalIgnoreCase);
        return _permissionSnapshot;
    }

    private sealed record ScopeSnapshot(HashSet<Guid> OrganizationIds, HashSet<Guid> DepartmentIds)
    {
        public static ScopeSnapshot Empty { get; } = new(new HashSet<Guid>(), new HashSet<Guid>());
    }
}
