using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;

namespace PMWDS.API.Controllers;

public class DepartmentsController : BaseApiController
{
    private readonly IUnitOfWork _uow;

    public DepartmentsController(IUnitOfWork uow)
    {
        _uow = uow;
    }

    [HttpGet]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var departments = await _uow.Departments.GetAllAsync(ct);
        return Ok(departments.Select(d => new DepartmentDto(
            d.Id,
            d.Name,
            d.Code,
            d.Description,
            d.ParentDepartmentId,
            d.DepartmentHeadUserId,
            d.MaxCapacity,
            d.CalculateCapacityUtilization())));
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

        return Ok(new DepartmentDto(
            department.Id,
            department.Name,
            department.Code,
            department.Description,
            department.ParentDepartmentId,
            department.DepartmentHeadUserId,
            department.MaxCapacity,
            department.CalculateCapacityUtilization()));
    }

    [HttpGet("{id:guid}/dashboard")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Dashboard(Guid id, CancellationToken ct)
    {
        var department = await _uow.Departments.GetByIdAsync(id, ct);
        if (department == null)
        {
            return NotFound();
        }

        var projects = (await _uow.Projects.GetByDepartmentAsync(id, ct)).ToList();
        var users = (await _uow.Users.GetByDepartmentAsync(id, ct)).ToList();

        return Ok(new
        {
            department.Id,
            department.Name,
            department.Code,
            department.Description,
            TeamMembers = users.Count,
            ActiveProjects = projects.Count(p => p.Status == PMWDS.Domain.Enums.ProjectStatus.InProgress),
            CompletedProjects = projects.Count(p => p.Status == PMWDS.Domain.Enums.ProjectStatus.Completed),
            AverageWorkload = users.Any() ? users.Average(u => u.AIWorkloadScore) : 0
        });
    }

    [HttpPost]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> Create(
        [FromBody] CreateDepartmentDto dto,
        CancellationToken ct)
    {
        var department = Department.Create(dto.Name, dto.Code, dto.Description, dto.ParentDepartmentId);
        department.SetCreatedBy("system");
        if (!string.IsNullOrWhiteSpace(dto.DepartmentHeadUserId))
        {
            department.AssignHead(dto.DepartmentHeadUserId);
        }

        if (dto.MaxCapacity.HasValue)
        {
            department.SetMaxCapacity(dto.MaxCapacity.Value);
        }

        await _uow.Departments.AddAsync(department, ct);
        await _uow.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = department.Id }, new DepartmentDto(
            department.Id,
            department.Name,
            department.Code,
            department.Description,
            department.ParentDepartmentId,
            department.DepartmentHeadUserId,
            department.MaxCapacity,
            department.CalculateCapacityUtilization()));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "SuperAdmin")]
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

        department.Update(dto.Name, dto.Code, dto.Description);
        if (!string.IsNullOrWhiteSpace(dto.DepartmentHeadUserId))
        {
            department.AssignHead(dto.DepartmentHeadUserId);
        }

        if (dto.MaxCapacity.HasValue)
        {
            department.SetMaxCapacity(dto.MaxCapacity.Value);
        }

        await _uow.Departments.UpdateAsync(department, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _uow.Departments.DeleteAsync(id, ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }
}

public record DepartmentDto(
    Guid Id,
    string Name,
    string Code,
    string? Description,
    Guid? ParentDepartmentId,
    string? DepartmentHeadUserId,
    int MaxCapacity,
    double CapacityUtilization);

public record CreateDepartmentDto(
    string Name,
    string Code,
    string? Description,
    Guid? ParentDepartmentId = null,
    string? DepartmentHeadUserId = null,
    int? MaxCapacity = null);

public record UpdateDepartmentDto(
    string Name,
    string Code,
    string? Description,
    string? DepartmentHeadUserId = null,
    int? MaxCapacity = null);
