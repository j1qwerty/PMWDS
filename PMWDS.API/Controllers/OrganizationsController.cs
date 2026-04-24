using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;

namespace PMWDS.API.Controllers;

public class OrganizationsController : BaseApiController
{
    private readonly IUnitOfWork _uow;

    public OrganizationsController(IUnitOfWork uow)
    {
        _uow = uow;
    }

    [HttpGet]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var organizations = await _uow.Organizations.GetAllAsync(ct);
        var departments = await _uow.Departments.GetAllAsync(ct);
        return Ok(organizations.Select(o => MapOrganization(o, departments.Where(d => d.OrganizationId == o.Id).ToList())));
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

        var departments = (await _uow.Departments.FindAsync(d => d.OrganizationId == id, ct)).ToList();
        return Ok(MapOrganization(organization, departments));
    }

    [HttpPost]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> Create([FromBody] UpsertOrganizationRequest req, CancellationToken ct)
    {
        var organization = Organization.Create(req.Name, req.TaxId, req.Address, req.ContactEmail, req.ContactPhone, req.FoundedDate);
        organization.SetCreatedBy("system");
        await _uow.Organizations.AddAsync(organization, ct);
        await _uow.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetById), new { id = organization.Id }, MapOrganization(organization, new List<Department>()));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertOrganizationRequest req, CancellationToken ct)
    {
        var organization = await _uow.Organizations.GetByIdAsync(id, ct);
        if (organization == null)
        {
            return NotFound();
        }

        organization.Update(req.Name, req.TaxId, req.Address, req.ContactEmail, req.ContactPhone, req.FoundedDate);
        await _uow.Organizations.UpdateAsync(organization, ct);
        await _uow.SaveChangesAsync(ct);

        var departments = (await _uow.Departments.FindAsync(d => d.OrganizationId == id, ct)).ToList();
        return Ok(MapOrganization(organization, departments));
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

    private static OrganizationResponse MapOrganization(Organization organization, List<Department> departments)
        => new(
            organization.Id,
            organization.Name,
            organization.TaxId,
            organization.Address,
            organization.ContactEmail,
            organization.ContactPhone,
            organization.FoundedDate,
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
    List<OrganizationDepartmentResponse> Departments,
    int DepartmentCount);

public record OrganizationDepartmentResponse(Guid Id, string Name, string Code);
public record UpsertOrganizationRequest(string Name, string TaxId, string Address, string ContactEmail, string ContactPhone, DateTime FoundedDate);
