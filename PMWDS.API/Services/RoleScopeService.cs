using Microsoft.EntityFrameworkCore;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;
using PMWDS.Persistence.Context;

namespace PMWDS.API.Services;

public class RoleScopeService
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public RoleScopeService(ApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public bool IsSuperAdmin => _currentUser.IsInRole("SuperAdmin");
    public bool IsDirector => _currentUser.IsInRole("Director");
    public bool IsDepartmentHead => _currentUser.IsInRole("DepartmentHead");
    public bool IsProjectManager => _currentUser.IsInRole("ProjectManager");
    public bool IsTeamMember => _currentUser.IsInRole("TeamMember");

    public Guid? CurrentUserId =>
        Guid.TryParse(_currentUser.UserId, out var userId) ? userId : null;

    public async Task<List<Guid>> GetOrganizationIdsAsync(CancellationToken ct)
    {
        if (CurrentUserId is not { } userId)
        {
            return new List<Guid>();
        }

        var assignedOrgIds = await _db.UserDepartments
            .Where(assignment => assignment.UserId == userId && assignment.Department.OrganizationId.HasValue)
            .Select(assignment => assignment.Department.OrganizationId!.Value)
            .Distinct()
            .ToListAsync(ct);

        var primaryOrgId = await _db.Users
            .Where(user => user.Id == userId &&
                (user.OrganizationId.HasValue || (user.Department != null && user.Department.OrganizationId.HasValue)))
            .Select(user => user.OrganizationId ?? user.Department!.OrganizationId)
            .FirstOrDefaultAsync(ct);

        if (primaryOrgId.HasValue && !assignedOrgIds.Contains(primaryOrgId.Value))
        {
            assignedOrgIds.Add(primaryOrgId.Value);
        }

        return assignedOrgIds;
    }

    public async Task<List<Guid>> GetDepartmentIdsAsync(CancellationToken ct)
    {
        if (CurrentUserId is not { } userId)
        {
            return new List<Guid>();
        }

        var departmentIds = await _db.UserDepartments
            .Where(assignment => assignment.UserId == userId)
            .Select(assignment => assignment.DepartmentId)
            .Distinct()
            .ToListAsync(ct);

        var primaryDepartmentId = await _db.Users
            .Where(user => user.Id == userId && user.DepartmentId.HasValue)
            .Select(user => user.DepartmentId)
            .FirstOrDefaultAsync(ct);

        if (primaryDepartmentId.HasValue && !departmentIds.Contains(primaryDepartmentId.Value))
        {
            departmentIds.Add(primaryDepartmentId.Value);
        }

        return departmentIds;
    }

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

        var organizationIds = await GetOrganizationIdsAsync(ct);
        return query.Where(department => department.OrganizationId.HasValue && organizationIds.Contains(department.OrganizationId.Value));
    }

    public async Task<IQueryable<Project>> ScopeProjectsAsync(IQueryable<Project> query, CancellationToken ct)
    {
        if (IsSuperAdmin)
        {
            return query;
        }

        var organizationIds = await GetOrganizationIdsAsync(ct);
        return query.Where(project =>
            project.Department != null &&
            project.Department.OrganizationId.HasValue &&
            organizationIds.Contains(project.Department.OrganizationId.Value));
    }

    public async Task<IQueryable<ApplicationUser>> ScopeUsersAsync(IQueryable<ApplicationUser> query, CancellationToken ct)
    {
        if (IsSuperAdmin)
        {
            return query;
        }

        var organizationIds = await GetOrganizationIdsAsync(ct);

        if (IsDepartmentHead && !IsDirector)
        {
            var departmentIds = await GetDepartmentIdsAsync(ct);
            return query.Where(user =>
                (user.OrganizationId.HasValue && organizationIds.Contains(user.OrganizationId.Value)) ||
                user.DepartmentAssignments.Any(assignment => departmentIds.Contains(assignment.DepartmentId)) ||
                (user.DepartmentId.HasValue && departmentIds.Contains(user.DepartmentId.Value)) ||
                user.Roles.Any(role => (role.Name == "Director" || role.Name == "DepartmentHead") &&
                    user.DepartmentAssignments.Any(assignment =>
                        assignment.Department.OrganizationId.HasValue &&
                        organizationIds.Contains(assignment.Department.OrganizationId.Value))));
        }

        return query.Where(user =>
            (user.OrganizationId.HasValue && organizationIds.Contains(user.OrganizationId.Value)) ||
            user.DepartmentAssignments.Any(assignment =>
                assignment.Department.OrganizationId.HasValue &&
                organizationIds.Contains(assignment.Department.OrganizationId.Value)) ||
            (user.Department != null &&
                user.Department.OrganizationId.HasValue &&
                organizationIds.Contains(user.Department.OrganizationId.Value)));
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
                OrganizationId = item.Department != null ? item.Department.OrganizationId : null
            })
            .FirstOrDefaultAsync(ct);

        if (project == null)
        {
            return false;
        }

        if (IsProjectManager && CurrentUserId?.ToString() == project.ProjectManagerId)
        {
            return true;
        }

        if ((IsDirector || IsDepartmentHead) && project.OrganizationId.HasValue)
        {
            return await CanAccessOrganizationAsync(project.OrganizationId.Value, ct);
        }

        return false;
    }

    public async Task<bool> CanAccessProjectAsync(Guid projectId, CancellationToken ct)
    {
        if (IsSuperAdmin)
        {
            return true;
        }

        var organizationId = await _db.Projects
            .Where(project => project.Id == projectId)
            .Select(project => project.Department != null ? project.Department.OrganizationId : null)
            .FirstOrDefaultAsync(ct);

        return organizationId.HasValue && await CanAccessOrganizationAsync(organizationId.Value, ct);
    }

    public async Task<bool> CanAccessUserAsync(Guid userId, CancellationToken ct)
    {
        if (IsSuperAdmin || CurrentUserId == userId)
        {
            return true;
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
}
