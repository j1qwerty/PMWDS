using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PMWDS.API.Services;
using PMWDS.Application.DTOs.Goals;
using PMWDS.Application.Security;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;
using PMWDS.Domain.Enums;
using PMWDS.Persistence.Context;

namespace PMWDS.API.Controllers;

[ApiController]
[Route("api/v1/goals")]
[Authorize]
public sealed class GoalsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly RoleScopeService _scope;
    private readonly ICurrentUserService _currentUser;

    public GoalsController(
        ApplicationDbContext db,
        RoleScopeService scope,
        ICurrentUserService currentUser)
    {
        _db = db;
        _scope = scope;
        _currentUser = currentUser;
    }

    [HttpGet("project/{projectId:guid}")]
    [Authorize(Policy = AuthorizationPolicies.GoalView)]
    public async Task<IActionResult> GetForProject(Guid projectId, CancellationToken ct)
    {
        if (!await _scope.CanAccessProjectAsync(projectId, ct))
            return Forbid();

        var goals = await _db.Goals
            .AsNoTracking()
            .Include(goal => goal.AssignedDepartment)
            .Where(goal => goal.ProjectId == projectId)
            .OrderBy(goal => goal.DueDate)
            .ToListAsync(ct);

        var goalIds = goals.Select(goal => goal.Id).ToList();
        var pendingTransfers = await _db.GoalTransfers
            .AsNoTracking()
            .Where(transfer => goalIds.Contains(transfer.GoalId) && transfer.Status == GoalTransferStatus.Pending)
            .ToDictionaryAsync(transfer => transfer.GoalId, ct);

        var milestoneCounts = await _db.Milestones
            .Where(milestone => milestone.GoalId.HasValue && goalIds.Contains(milestone.GoalId.Value))
            .GroupBy(milestone => milestone.GoalId!.Value)
            .Select(group => new { GoalId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.GoalId, ct);

        return Ok(goals.Select(goal => GoalDto.FromEntity(
            goal,
            goal.AssignedDepartment?.Name,
            milestoneCounts.TryGetValue(goal.Id, out var count) ? count : 0,
            pendingTransfers.TryGetValue(goal.Id, out var transfer) ? transfer.Id : null,
            pendingTransfers.TryGetValue(goal.Id, out transfer) ? transfer.ToDepartmentId : null)));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.GoalView)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var goal = await _db.Goals.Include(item => item.AssignedDepartment).FirstOrDefaultAsync(item => item.Id == id, ct);
        if (goal == null)
            return NotFound();
        if (!await _scope.CanAccessProjectAsync(goal.ProjectId, ct))
            return Forbid();

        var transfer = await _db.GoalTransfers
            .AsNoTracking()
            .Where(item => item.GoalId == id && item.Status == GoalTransferStatus.Pending)
            .OrderByDescending(item => item.CreatedDate)
            .FirstOrDefaultAsync(ct);
        var milestoneCount = await _db.Milestones.CountAsync(item => item.GoalId == id, ct);

        return Ok(GoalDto.FromEntity(
            goal,
            goal.AssignedDepartment?.Name,
            milestoneCount,
            transfer?.Id,
            transfer?.ToDepartmentId));
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.GoalCreate)]
    public async Task<IActionResult> Create([FromBody] CreateGoalDto dto, CancellationToken ct)
    {
        var project = await _db.Projects
            .Include(item => item.ProjectDepartments)
            .FirstOrDefaultAsync(item => item.Id == dto.ProjectId, ct);
        if (project == null)
            return NotFound(new { message = "Project not found." });

        if (!await _scope.CanManageProjectAsync(dto.ProjectId, ct))
            return Forbid();

        if (!IsProjectDepartment(project, dto.AssignedDepartmentId))
            return BadRequest(new { message = "A goal must be assigned to a department assigned to the project." });

        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Goal title is required." });

        if (dto.DueDate < project.PlannedStartDate || dto.DueDate > project.PlannedEndDate)
            return BadRequest(new { message = "Goal due date must fall within the project planned timeline." });

        var goal = Goal.Create(
            dto.ProjectId,
            dto.AssignedDepartmentId,
            dto.Title,
            dto.Description ?? string.Empty,
            dto.Priority,
            dto.DueDate);
        goal.SetCreatedBy(_currentUser.UserId ?? "system");
        await _db.Goals.AddAsync(goal, ct);
        await _db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(Get), new { id = goal.Id }, GoalDto.FromEntity(goal, null, 0));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.GoalEdit)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateGoalDto dto, CancellationToken ct)
    {
        var goal = await _db.Goals.FirstOrDefaultAsync(item => item.Id == id, ct);
        if (goal == null)
            return NotFound();
        if (!await _scope.CanManageProjectAsync(goal.ProjectId, ct))
            return Forbid();

        var project = await _db.Projects
            .Include(item => item.ProjectDepartments)
            .FirstOrDefaultAsync(item => item.Id == goal.ProjectId, ct);
        if (project == null)
            return NotFound(new { message = "Project not found." });
        if (!IsProjectDepartment(project, dto.AssignedDepartmentId))
            return BadRequest(new { message = "A goal must be assigned to a department assigned to the project." });

        goal.Update(dto.AssignedDepartmentId, dto.Title, dto.Description ?? string.Empty, dto.Priority, dto.DueDate);
        goal.SetModified(_currentUser.UserId ?? "system");
        await _db.SaveChangesAsync(ct);

        return await Get(id, ct);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.GoalDelete)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var goal = await _db.Goals.FirstOrDefaultAsync(item => item.Id == id, ct);
        if (goal == null)
            return NotFound();
        if (!await _scope.CanManageProjectAsync(goal.ProjectId, ct))
            return Forbid();

        goal.SoftDelete(_currentUser.UserId ?? "system");
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/transfer")]
    [Authorize(Policy = AuthorizationPolicies.GoalManage)]
    public async Task<IActionResult> RequestTransfer(Guid id, [FromBody] TransferGoalDto dto, CancellationToken ct)
    {
        var goal = await _db.Goals.FirstOrDefaultAsync(item => item.Id == id, ct);
        if (goal == null)
            return NotFound();
        if (!await _scope.CanManageProjectAsync(goal.ProjectId, ct))
            return Forbid();

        var project = await _db.Projects
            .Include(item => item.ProjectDepartments)
            .FirstOrDefaultAsync(item => item.Id == goal.ProjectId, ct);
        if (project == null)
            return NotFound();
        if (!IsProjectDepartment(project, dto.ToDepartmentId))
            return BadRequest(new { message = "The receiving department must be assigned to this project." });
        if (dto.ToDepartmentId == goal.AssignedDepartmentId)
            return BadRequest(new { message = "The goal is already assigned to this department." });

        var pending = await _db.GoalTransfers.AnyAsync(
            item => item.GoalId == id && item.Status == GoalTransferStatus.Pending, ct);
        if (pending)
            return Conflict(new { message = "This goal already has a pending transfer." });

        if (!Guid.TryParse(_currentUser.UserId, out _))
            return Unauthorized();

        var transfer = GoalTransfer.Create(
            goal.Id,
            goal.AssignedDepartmentId,
            dto.ToDepartmentId,
            _currentUser.UserId!,
            dto.Reason);
        transfer.SetCreatedBy(_currentUser.UserId!);
        await _db.GoalTransfers.AddAsync(transfer, ct);
        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            id = transfer.Id,
            goalId = transfer.GoalId,
            fromDepartmentId = transfer.FromDepartmentId,
            toDepartmentId = transfer.ToDepartmentId,
            status = transfer.Status.ToString(),
            reason = transfer.Reason
        });
    }

    [HttpPost("transfers/{transferId:guid}/acknowledge")]
    [Authorize(Policy = AuthorizationPolicies.GoalManage)]
    public async Task<IActionResult> AcknowledgeTransfer(Guid transferId, [FromBody] ReviewGoalTransferDto dto, CancellationToken ct)
        => await ReviewTransfer(transferId, true, dto.Notes, ct);

    [HttpPost("transfers/{transferId:guid}/reject")]
    [Authorize(Policy = AuthorizationPolicies.GoalManage)]
    public async Task<IActionResult> RejectTransfer(Guid transferId, [FromBody] ReviewGoalTransferDto dto, CancellationToken ct)
        => await ReviewTransfer(transferId, false, dto.Notes, ct);

    private async Task<IActionResult> ReviewTransfer(Guid transferId, bool acknowledge, string? notes, CancellationToken ct)
    {
        var transfer = await _db.GoalTransfers.FirstOrDefaultAsync(item => item.Id == transferId, ct);
        if (transfer == null)
            return NotFound();
        if (transfer.Status != GoalTransferStatus.Pending)
            return BadRequest(new { message = "Only pending goal transfers can be reviewed." });

        var goal = await _db.Goals.FirstOrDefaultAsync(item => item.Id == transfer.GoalId, ct);
        if (goal == null)
            return NotFound();
        if (!await CanReviewTransferAsync(transfer.ToDepartmentId, ct))
            return Forbid();

        await using var transaction = await _db.Database.BeginTransactionAsync(ct);
        if (acknowledge)
        {
            goal.AssignDepartment(transfer.ToDepartmentId);
            goal.SetModified(_currentUser.UserId ?? "system");
            transfer.Acknowledge(_currentUser.UserId ?? "system", notes);
        }
        else
        {
            transfer.Reject(_currentUser.UserId ?? "system", notes);
        }

        await _db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        return Ok(new
        {
            transferId = transfer.Id,
            goalId = goal.Id,
            status = transfer.Status.ToString(),
            assignedDepartmentId = goal.AssignedDepartmentId,
            reviewNotes = transfer.ReviewNotes
        });
    }

    private async Task<bool> CanReviewTransferAsync(Guid toDepartmentId, CancellationToken ct)
    {
        if (_scope.IsSuperAdmin || _scope.IsDirector)
            return true;

        if (!Guid.TryParse(_currentUser.UserId, out var userId))
            return false;

        return await _db.Departments.AnyAsync(
            department => department.Id == toDepartmentId &&
                          department.DepartmentHeadUserId == _currentUser.UserId, ct);
    }

    private static bool IsProjectDepartment(Project project, Guid departmentId)
        => project.DepartmentId == departmentId ||
           project.ProjectDepartments.Any(item => item.DepartmentId == departmentId);
}
