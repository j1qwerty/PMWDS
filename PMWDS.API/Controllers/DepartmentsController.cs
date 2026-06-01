using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PMWDS.API.Services;
using PMWDS.Application.DTOs.Common;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;
using PMWDS.Persistence.Context;

namespace PMWDS.API.Controllers;

public class DepartmentsController : BaseApiController
{
    private readonly IUnitOfWork _uow;
    private readonly RoleScopeService _scope;
    private readonly ApplicationDbContext _db;

    public DepartmentsController(IUnitOfWork uow, RoleScopeService scope, ApplicationDbContext db)
    {
        _uow = uow;
        _scope = scope;
        _db = db;
    }

    [HttpGet]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationQuery pagination, CancellationToken ct)
    {
        var query = await _scope.ScopeDepartmentsAsync(_db.Departments.AsNoTracking(), ct);

        var totalCount = await query.CountAsync(ct);
        var items = await query
            .OrderBy(department => department.Name)
            .Skip(pagination.Skip)
            .Take(pagination.NormalizedPageSize)
            .ToListAsync(ct);
        var mapped = items
            .Select(MapDepartment)
            .ToList();

        return Ok(PaginatedResponse<DepartmentDto>.Create(mapped, pagination, totalCount));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var department = await _uow.Departments.GetByIdAsync(id, ct);
        if (department == null)
        {
            return NotFound();
        }

        if (!await _scope.CanAccessDepartmentAsync(id, ct))
        {
            return Forbid();
        }

        return Ok(MapDepartment(department));
    }

    [HttpGet("{id:guid}/dashboard")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Dashboard(Guid id, CancellationToken ct)
    {
        if (!await _scope.CanAccessDepartmentAsync(id, ct))
        {
            return Forbid();
        }

        var department = await _uow.Departments.GetByIdAsync(id, ct);
        if (department == null)
        {
            return NotFound();
        }

        var projects = (await _uow.Projects.GetByDepartmentAsync(id, ct)).ToList();
        var users = await _scope.ScopeUsersAsync((await _uow.Users.GetByDepartmentAsync(id, ct)).AsQueryable(), ct);
        var visibleUsers = users.ToList();

        return Ok(new
        {
            department.Id,
            department.Name,
            department.Code,
            department.Description,
            department.OrganizationId,
            TeamMembers = visibleUsers.Count,
            ActiveProjects = projects.Count(p => p.Status == PMWDS.Domain.Enums.ProjectStatus.InProgress),
            CompletedProjects = projects.Count(p => p.Status == PMWDS.Domain.Enums.ProjectStatus.Completed),
            AverageWorkload = visibleUsers.Any() ? visibleUsers.Average(u => u.AIWorkloadScore) : 0d
        });
    }

    [HttpPost]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Create(
        [FromBody] CreateDepartmentDto dto,
        CancellationToken ct)
    {
        var organizationId = dto.OrganizationId;
        if (!_scope.IsSuperAdmin)
        {
            if (!_scope.IsDirector)
            {
                return Forbid();
            }

            var organizationIds = await _scope.GetOrganizationIdsAsync(ct);
            organizationId = organizationId.HasValue ? organizationId : organizationIds.FirstOrDefault();
            if (!organizationId.HasValue || !organizationIds.Contains(organizationId.Value))
            {
                return Forbid();
            }
        }

        var normalizedCode = dto.Code.ToUpper();
        var normalizedName = dto.Name.ToLower().Trim();
        var existingByCode = await _uow.Departments.FindAsync(
            d => d.OrganizationId == organizationId && d.Code == normalizedCode,
            ct);
        if (existingByCode.Any())
        {
            return Conflict(new { message = $"Department with code '{dto.Code}' already exists in this organization." });
        }

        var existingByName = await _uow.Departments.FindAsync(
            d => d.OrganizationId == organizationId && d.Name.ToLower() == normalizedName,
            ct);
        if (existingByName.Any())
        {
            return Conflict(new { message = $"Department with name '{dto.Name}' already exists in this organization." });
        }

        var department = Department.Create(dto.Name, dto.Code, dto.Description, dto.ParentDepartmentId);
        department.SetCreatedBy("system");
        if (!string.IsNullOrWhiteSpace(dto.DepartmentHeadUserId))
        {
            department.AssignHead(dto.DepartmentHeadUserId);
        }

        if (organizationId.HasValue)
        {
            department.AssignToOrganization(organizationId.Value);
        }

        if (dto.MaxCapacity.HasValue)
        {
            department.SetMaxCapacity(dto.MaxCapacity.Value);
        }

        await _uow.Departments.AddAsync(department, ct);
        await _uow.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = department.Id }, MapDepartment(department));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateDepartmentDto dto,
        CancellationToken ct)
    {
        var department = await _uow.Departments.GetByIdAsync(id, ct);
        if (department == null)
        {
            return NotFound();
        }

        if (!await _scope.CanManageDepartmentAsync(id, ct))
        {
            return Forbid();
        }

        var organizationId = dto.OrganizationId;
        if (!_scope.IsSuperAdmin)
        {
            if (_scope.IsDirector)
            {
                var organizationIds = await _scope.GetOrganizationIdsAsync(ct);
                organizationId = organizationId.HasValue ? organizationId : department.OrganizationId;
                if (!organizationId.HasValue || !organizationIds.Contains(organizationId.Value))
                {
                    return Forbid();
                }
            }
            else
            {
                organizationId = department.OrganizationId;
            }
        }

        var newCode = dto.Code.ToUpper();
        if (newCode != department.Code || organizationId != department.OrganizationId)
        {
            var existingByCode = await _uow.Departments.FindAsync(
                d => d.Id != id && d.OrganizationId == organizationId && d.Code == newCode,
                ct);
            if (existingByCode.Any())
            {
                return Conflict(new { message = $"Department with code '{dto.Code}' already exists in this organization." });
            }
        }

        var newName = dto.Name.ToLower().Trim();
        if (newName != department.Name.ToLower() || organizationId != department.OrganizationId)
        {
            var existingByName = await _uow.Departments.FindAsync(
                d => d.Id != id && d.OrganizationId == organizationId && d.Name.ToLower() == newName,
                ct);
            if (existingByName.Any())
            {
                return Conflict(new { message = $"Department with name '{dto.Name}' already exists in this organization." });
            }
        }

        department.Update(dto.Name, dto.Code, dto.Description);
        if (!string.IsNullOrWhiteSpace(dto.DepartmentHeadUserId))
        {
            department.AssignHead(dto.DepartmentHeadUserId);
        }

        department.AssignToOrganization(organizationId);

        if (dto.MaxCapacity.HasValue)
        {
            department.SetMaxCapacity(dto.MaxCapacity.Value);
        }

        await _uow.Departments.UpdateAsync(department, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(MapDepartment(department));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _uow.Departments.DeleteAsync(id, ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }

    private static DepartmentDto MapDepartment(Department department)
        => new(
            department.Id,
            department.Name,
            department.Code,
            department.Description,
            department.OrganizationId,
            department.ParentDepartmentId,
            department.DepartmentHeadUserId,
            department.MaxCapacity,
            department.CalculateCapacityUtilization());
}

public record DepartmentDto(
    Guid Id,
    string Name,
    string Code,
    string? Description,
    Guid? OrganizationId,
    Guid? ParentDepartmentId,
    string? DepartmentHeadUserId,
    int MaxCapacity,
    double CapacityUtilization);

public record CreateDepartmentDto(
    string Name,
    string Code,
    string? Description,
    Guid? ParentDepartmentId = null,
    Guid? OrganizationId = null,
    string? DepartmentHeadUserId = null,
    int? MaxCapacity = null);

public record UpdateDepartmentDto(
    string Name,
    string Code,
    string? Description,
    Guid? OrganizationId = null,
    string? DepartmentHeadUserId = null,
    int? MaxCapacity = null);
