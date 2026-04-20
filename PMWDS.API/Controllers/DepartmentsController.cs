using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMWDS.Application.Features.Departments.Commands;
using PMWDS.Application.Features.Departments.Queries;
namespace PMWDS.API.Controllers;

public class DepartmentsController : BaseApiController
{
    /// <summary>Get all departments</summary>
    [HttpGet]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetAll(
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetAllDepartmentsQuery(), ct));
    /// <summary>Get department by ID with details</summary>
    [HttpGet("{id:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetById(
    Guid id, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetDepartmentDetailsQuery(id), ct));
    /// <summary>Get department dashboard</summary>
    [HttpGet("{id:guid}/dashboard")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Dashboard(
    Guid id, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetDepartmentDashboardQuery(id), ct));
    /// <summary>Create a new department</summary>


    [HttpPost]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> Create(
    [FromBody] CreateDepartmentDto dto,
    CancellationToken ct)
    {
        var result = await Mediator.Send(
        new CreateDepartmentCommand(dto), ct);
        return CreatedAtAction(
        nameof(GetById),
        new { id = result.Id },
        result);
    }
    /// <summary>Update department</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> Update(
    Guid id,
    [FromBody] UpdateDepartmentDto dto,
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new UpdateDepartmentCommand(id, dto), ct));
    /// <summary>Delete department</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> Delete(
    Guid id, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new DeleteDepartmentCommand(id), ct));
}