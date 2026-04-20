using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMWDS.Application.Features.Users.Commands;
using PMWDS.Application.Features.Users.Queries;
namespace PMWDS.API.Controllers;

public class UsersController : BaseApiController
{
    /// <summary>Get all users</summary>
    [HttpGet]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetAll(
    [FromQuery] Guid? departmentId,
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetAllUsersQuery(departmentId), ct));
    /// <summary>Get user by ID</summary>
    [HttpGet("{id}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetById(
    string id, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetUserByIdQuery(id), ct));
    /// <summary>Get current user profile</summary>
    [HttpGet("me")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetMe(
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetCurrentUserQuery(), ct));
    /// <summary>Update user profile</summary>
    [HttpPut("{id}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> Update(
    string id,
    [FromBody] UpdateUserDto dto,
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new UpdateUserCommand(id, dto), ct));
    /// <summary>Register a new user (Admin only)</summary>
    [HttpPost("register")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> Register(
    [FromBody] RegisterUserDto dto,
    CancellationToken ct)
    {
        var result = await Mediator.Send(
        new RegisterUserCommand(dto), ct);
        return CreatedAtAction(
        nameof(GetById),
        new { id = result.Id },
        result);
    }
    /// <summary>Update user availability</summary>
    [HttpPatch("{id}/availability")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> UpdateAvailability(
    string id,
    [FromBody] UpdateAvailabilityRequest req,
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new UpdateUserAvailabilityCommand(
    id,
    req.Status,
    req.AvailabilityPercentage), ct));
    /// <summary>Add skill to user</summary>
    [HttpPost("{id}/skills")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> AddSkill(
    string id,
    [FromBody] AddUserSkillRequest req,
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new AddUserSkillCommand(
    id, req.SkillId,
    req.ProficiencyLevel,
    req.ExperienceMonths), ct));
    /// <summary>Get available users for task assignment</summary>
    [HttpGet("available")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetAvailable(
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetAvailableUsersQuery(), ct));
    /// <summary>Get workload distribution</summary>
    [HttpGet("workload")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetWorkload(
    [FromQuery] Guid? departmentId,
    CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new GetWorkloadDistributionQuery(
    departmentId), ct));
    /// <summary>Deactivate a user</summary>
    [HttpPatch("{id}/deactivate")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> Deactivate(
    string id, CancellationToken ct)
    => HandleResult(await Mediator.Send(
    new DeactivateUserCommand(id), ct));
}
public record UpdateAvailabilityRequest(
 Domain.Enums.AvailabilityStatus Status,
 double AvailabilityPercentage);
public record AddUserSkillRequest(
 Guid SkillId, int ProficiencyLevel,
 int ExperienceMonths);