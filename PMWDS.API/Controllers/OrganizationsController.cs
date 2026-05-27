using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMWDS.API.Services;
using PMWDS.Application.DTOs.Common;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;

namespace PMWDS.API.Controllers;

public class OrganizationsController : BaseApiController
{
    private readonly IUnitOfWork _uow;
    private readonly RoleScopeService _scope;

    public OrganizationsController(IUnitOfWork uow, RoleScopeService scope)
    {
        _uow = uow;
        _scope = scope;
    }

    [HttpGet]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationQuery pagination, CancellationToken ct)
    {
        var organizations = (await _uow.Organizations.GetAllAsync(ct)).ToList();
        if (!_scope.IsSuperAdmin)
        {
            var organizationIds = await _scope.GetOrganizationIdsAsync(ct);
            organizations = organizations.Where(o => organizationIds.Contains(o.Id)).ToList();
        }

        var departments = await _uow.Departments.GetAllAsync(ct);
        var directors = await GetDirectorSummariesAsync(organizations.Select(o => o.Id).ToHashSet(), ct);
        var totalCount = organizations.Count;
        var items = organizations
            .OrderBy(organization => organization.Name)
            .Skip(pagination.Skip)
            .Take(pagination.NormalizedPageSize)
            .Select(o => MapOrganization(
                o,
                departments.Where(d => d.OrganizationId == o.Id).ToList(),
                directors.GetValueOrDefault(o.Id)))
            .ToList();

        return Ok(PaginatedResponse<OrganizationResponse>.Create(items, pagination, totalCount));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var organization = await _uow.Organizations.GetByIdAsync(id, ct);
        if (organization == null)
        {
            return NotFound();
        }

        if (!await _scope.CanAccessOrganizationAsync(id, ct))
        {
            return Forbid();
        }

        var departments = (await _uow.Departments.FindAsync(d => d.OrganizationId == id, ct)).ToList();
        var directors = await GetDirectorSummariesAsync(new HashSet<Guid> { id }, ct);
        return Ok(MapOrganization(organization, departments, directors.GetValueOrDefault(id)));
    }

    [HttpPost]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> Create([FromBody] UpsertOrganizationRequest req, CancellationToken ct)
    {
        var organization = Organization.Create(req.Name, req.TaxId, req.Address, req.ContactEmail, req.ContactPhone, req.FoundedDate);
        organization.SetCreatedBy("system");
        await _uow.Organizations.AddAsync(organization, ct);
        await _uow.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetById), new { id = organization.Id }, MapOrganization(organization, new List<Department>(), null));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "Director")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertOrganizationRequest req, CancellationToken ct)
    {
        var organization = await _uow.Organizations.GetByIdAsync(id, ct);
        if (organization == null)
        {
            return NotFound();
        }

        if (!await _scope.CanManageOrganizationAsync(id, ct))
        {
            return Forbid();
        }

        organization.Update(req.Name, req.TaxId, req.Address, req.ContactEmail, req.ContactPhone, req.FoundedDate);
        await _uow.Organizations.UpdateAsync(organization, ct);
        await _uow.SaveChangesAsync(ct);

        var departments = (await _uow.Departments.FindAsync(d => d.OrganizationId == id, ct)).ToList();
        var directors = await GetDirectorSummariesAsync(new HashSet<Guid> { id }, ct);
        return Ok(MapOrganization(organization, departments, directors.GetValueOrDefault(id)));
    }

    [HttpPut("{id:guid}/departments/{departmentId:guid}")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> AssignDepartment(Guid id, Guid departmentId, CancellationToken ct)
    {
        var organization = await _uow.Organizations.GetByIdAsync(id, ct);
        var department = await _uow.Departments.GetByIdAsync(departmentId, ct);
        if (organization == null || department == null)
        {
            return NotFound();
        }

        department.AssignToOrganization(id);
        await _uow.Departments.UpdateAsync(department, ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}/departments/{departmentId:guid}")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> RemoveDepartment(Guid id, Guid departmentId, CancellationToken ct)
    {
        var department = await _uow.Departments.GetByIdAsync(departmentId, ct);
        if (department == null || department.OrganizationId != id)
        {
            return NotFound();
        }

        department.AssignToOrganization(null);
        await _uow.Departments.UpdateAsync(department, ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _uow.Organizations.DeleteAsync(id, ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task<Dictionary<Guid, OrganizationDirectorResponse>> GetDirectorSummariesAsync(HashSet<Guid> organizationIds, CancellationToken ct)
    {
        if (organizationIds.Count == 0)
        {
            return new Dictionary<Guid, OrganizationDirectorResponse>();
        }

        var users = await _uow.Users.GetAllAsync(ct);
        return users
            .Where(user => UserRoleResolver.Resolve(user).Contains("Director") &&
                user.DepartmentAssignments.Any(assignment =>
                    assignment.Department?.OrganizationId is { } organizationId &&
                    organizationIds.Contains(organizationId)))
            .GroupBy(user => user.DepartmentAssignments
                .Select(assignment => assignment.Department?.OrganizationId)
                .First(organizationId => organizationId.HasValue && organizationIds.Contains(organizationId.Value))!.Value)
            .ToDictionary(
                group => group.Key,
                group =>
                {
                    var director = group.First();
                    return new OrganizationDirectorResponse(
                        director.Id,
                        director.FullName,
                        director.Email,
                        director.ProfilePictureUrl);
                });
    }

    private static OrganizationResponse MapOrganization(Organization organization, List<Department> departments, OrganizationDirectorResponse? director)
        => new(
            organization.Id,
            organization.Name,
            organization.TaxId,
            organization.Address,
            organization.ContactEmail,
            organization.ContactPhone,
            organization.FoundedDate,
            director,
            departments.Select(d => new OrganizationDepartmentResponse(d.Id, d.Name, d.Code)).ToList(),
            departments.Count);
}

public record OrganizationResponse(
    Guid Id,
    string Name,
    string TaxId,
    string Address,
    string ContactEmail,
    string ContactPhone,
    DateTime FoundedDate,
    OrganizationDirectorResponse? Director,
    List<OrganizationDepartmentResponse> Departments,
    int DepartmentCount);

public record OrganizationDirectorResponse(Guid Id, string FullName, string Email, string? ProfilePictureUrl);
public record OrganizationDepartmentResponse(Guid Id, string Name, string Code);
public record UpsertOrganizationRequest(string Name, string TaxId, string Address, string ContactEmail, string ContactPhone, DateTime FoundedDate);
