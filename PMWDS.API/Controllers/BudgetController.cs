using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PMWDS.API.Services;
using PMWDS.Application.DTOs.Budget;
using PMWDS.Application.Security;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;
using PMWDS.Domain.Enums;
using PMWDS.Persistence.Context;

namespace PMWDS.API.Controllers;

[ApiController]
[Route("api/v1/budgets")]
[Authorize]
public sealed class BudgetController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly RoleScopeService _scope;
    private readonly ICurrentUserService _currentUser;

    public BudgetController(
        ApplicationDbContext db,
        RoleScopeService scope,
        ICurrentUserService currentUser)
    {
        _db = db;
        _scope = scope;
        _currentUser = currentUser;
    }

    [HttpGet("goals/{goalId:guid}/summary")]
    [Authorize(Policy = AuthorizationPolicies.BudgetView)]
    public async Task<IActionResult> GetSummary(Guid goalId, CancellationToken ct)
    {
        var goal = await GetGoalAsync(goalId, ct);
        if (goal == null)
            return NotFound();
        if (!await _scope.CanAccessProjectAsync(goal.ProjectId, ct))
            return Forbid();

        var allocations = await _db.GoalBudgetAllocations
            .AsNoTracking()
            .Where(item => item.GoalId == goalId)
            .OrderByDescending(item => item.CreatedDate)
            .ToListAsync(ct);
        var allocationIds = allocations.Select(item => item.Id).ToList();

        var releases = await _db.BudgetReleases
            .AsNoTracking()
            .Where(item => allocationIds.Contains(item.GoalBudgetAllocationId))
            .OrderByDescending(item => item.RequestedOn)
            .ToListAsync(ct);
        var expenditures = await _db.BudgetExpenditures
            .AsNoTracking()
            .Where(item => allocationIds.Contains(item.GoalBudgetAllocationId))
            .OrderByDescending(item => item.SpentOn)
            .ToListAsync(ct);

        return Ok(BuildSummary(goalId, allocations, releases, expenditures));
    }

    [HttpPost("allocations")]
    [Authorize(Policy = AuthorizationPolicies.BudgetCreate)]
    public async Task<IActionResult> CreateAllocation([FromBody] CreateGoalBudgetAllocationDto dto, CancellationToken ct)
    {
        var goal = await GetGoalAsync(dto.GoalId, ct);
        if (goal == null)
            return NotFound(new { message = "Goal not found." });
        if (!await _scope.CanManageProjectAsync(goal.ProjectId, ct))
            return Forbid();
        if (dto.Amount <= 0)
            return BadRequest(new { message = "Allocation amount must be greater than zero." });
        if (dto.DepartmentIdNotUsed())
            return BadRequest();

        if (await _db.GoalBudgetAllocations.AnyAsync(
            item => item.GoalId == dto.GoalId && item.Status == BudgetAllocationStatus.Active, ct))
            return Conflict(new { message = "An active allocation already exists for this goal. Amend the allocation instead." });

        var projectBudget = await _db.Projects
            .Where(project => project.Id == goal.ProjectId)
            .Select(project => project.PlannedBudget)
            .SingleAsync(ct);
        var activeProjectAllocation = await _db.GoalBudgetAllocations
            .Where(item => item.Status == BudgetAllocationStatus.Active)
            .Where(item => _db.Goals.Any(goalItem => goalItem.Id == item.GoalId && goalItem.ProjectId == goal.ProjectId))
            .SumAsync(item => (decimal?)item.Amount, ct) ?? 0;
        if (activeProjectAllocation + dto.Amount > projectBudget)
            return Conflict(new { message = "The project's goal allocations cannot exceed the project budget reserve." });

        var allocation = GoalBudgetAllocation.Create(
            goal.Id,
            goal.AssignedDepartmentId,
            dto.Amount,
            dto.Reason);
        allocation.SetCreatedBy(_currentUser.UserId ?? "system");
        await _db.GoalBudgetAllocations.AddAsync(allocation, ct);
        await _db.SaveChangesAsync(ct);

        return Ok(MapAllocation(allocation));
    }

    [HttpPost("allocations/{id:guid}/amend")]
    [Authorize(Policy = AuthorizationPolicies.BudgetEdit)]
    public async Task<IActionResult> AmendAllocation(Guid id, [FromBody] AmendGoalBudgetAllocationDto dto, CancellationToken ct)
    {
        var current = await _db.GoalBudgetAllocations.FirstOrDefaultAsync(item => item.Id == id, ct);
        if (current == null)
            return NotFound();
        if (current.Status != BudgetAllocationStatus.Active)
            return BadRequest(new { message = "Only an active allocation can be amended." });

        var goal = await GetGoalAsync(current.GoalId, ct);
        if (goal == null)
            return NotFound();
        if (!await _scope.CanManageProjectAsync(goal.ProjectId, ct))
            return Forbid();
        if (dto.Amount <= 0)
            return BadRequest(new { message = "Allocation amount must be greater than zero." });

        var projectBudget = await _db.Projects.Where(project => project.Id == goal.ProjectId).Select(project => project.PlannedBudget).SingleAsync(ct);
        var otherActive = await _db.GoalBudgetAllocations
            .Where(item => item.Status == BudgetAllocationStatus.Active && item.Id != id)
            .Where(item => _db.Goals.Any(goalItem => goalItem.Id == item.GoalId && goalItem.ProjectId == goal.ProjectId))
            .SumAsync(item => (decimal?)item.Amount, ct) ?? 0;
        if (otherActive + dto.Amount > projectBudget)
            return Conflict(new { message = "The project's goal allocations cannot exceed the project budget reserve." });

        await using var transaction = await _db.Database.BeginTransactionAsync(ct);
        current.Supersede();
        var amended = GoalBudgetAllocation.Create(goal.Id, goal.AssignedDepartmentId, dto.Amount, dto.Reason, current.Id);
        amended.SetCreatedBy(_currentUser.UserId ?? "system");
        await _db.GoalBudgetAllocations.AddAsync(amended, ct);
        await _db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        return Ok(MapAllocation(amended));
    }

    [HttpPost("releases")]
    [Authorize(Policy = AuthorizationPolicies.BudgetCreate)]
    public async Task<IActionResult> RequestRelease([FromBody] CreateBudgetReleaseDto dto, CancellationToken ct)
    {
        var allocation = await _db.GoalBudgetAllocations.FirstOrDefaultAsync(item => item.Id == dto.GoalBudgetAllocationId, ct);
        if (allocation == null)
            return NotFound();
        if (allocation.Status != BudgetAllocationStatus.Active)
            return BadRequest(new { message = "Only an active allocation can be released." });

        var goal = await GetGoalAsync(allocation.GoalId, ct);
        if (goal == null)
            return NotFound();
        if (!await _scope.CanManageProjectAsync(goal.ProjectId, ct))
            return Forbid();
        if (dto.AmountRequested <= 0)
            return BadRequest(new { message = "Release amount must be greater than zero." });

        var allocated = allocation.Amount;
        var committed = await _db.BudgetReleases
            .Where(item => item.GoalBudgetAllocationId == allocation.Id &&
                           item.Status == BudgetReleaseStatus.Approved)
            .SumAsync(item => (decimal?)item.AmountApproved, ct) ?? 0;
        var pending = await _db.BudgetReleases
            .Where(item => item.GoalBudgetAllocationId == allocation.Id &&
                           item.Status == BudgetReleaseStatus.Pending)
            .SumAsync(item => (decimal?)item.AmountRequested, ct) ?? 0;
        if (committed + pending + dto.AmountRequested > allocated)
            return Conflict(new { message = "Requested releases exceed the active goal allocation." });

        var required = dto.RequiredConditions ?? new Dictionary<string, bool>();
        var satisfied = dto.SatisfiedConditions ?? new Dictionary<string, bool>();
        var release = BudgetRelease.Create(
            allocation.Id,
            dto.AmountRequested,
            JsonSerializer.Serialize(required),
            JsonSerializer.Serialize(satisfied),
            _currentUser.UserId ?? "system",
            dto.Justification);
        release.SetCreatedBy(_currentUser.UserId ?? "system");
        await _db.BudgetReleases.AddAsync(release, ct);
        await _db.SaveChangesAsync(ct);

        return Ok(MapRelease(release));
    }

    [HttpPost("releases/{id:guid}/review")]
    [Authorize(Policy = AuthorizationPolicies.BudgetApprove)]
    public async Task<IActionResult> ReviewRelease(Guid id, [FromBody] ReviewBudgetReleaseDto dto, CancellationToken ct)
    {
        var release = await _db.BudgetReleases.FirstOrDefaultAsync(item => item.Id == id, ct);
        if (release == null)
            return NotFound();

        var allocation = await _db.GoalBudgetAllocations.FirstOrDefaultAsync(item => item.Id == release.GoalBudgetAllocationId, ct);
        if (allocation == null)
            return NotFound();

        var goal = await GetGoalAsync(allocation.GoalId, ct);
        if (goal == null)
            return NotFound();
        if (!await _scope.CanManageProjectAsync(goal.ProjectId, ct))
            return Forbid();
        if (release.Status != BudgetReleaseStatus.Pending)
            return BadRequest(new { message = "Only pending budget releases can be reviewed." });

        if (dto.Decision == BudgetReleaseStatus.Approved)
        {
            if (!release.AreAllConditionsSatisfied())
                return Conflict(new { message = "All required release conditions must be satisfied before approval." });
            if (dto.ApprovedAmount < 0 || dto.ApprovedAmount > release.AmountRequested)
                return BadRequest(new { message = "Approved amount must be between zero and the requested amount." });

            var otherApproved = await _db.BudgetReleases
                .Where(item => item.GoalBudgetAllocationId == allocation.Id &&
                               item.Id != release.Id &&
                               item.Status == BudgetReleaseStatus.Approved)
                .SumAsync(item => (decimal?)item.AmountApproved, ct) ?? 0;
            if (otherApproved + dto.ApprovedAmount > allocation.Amount)
                return Conflict(new { message = "Approved releases exceed the goal allocation." });

            release.Approve(dto.ApprovedAmount, _currentUser.UserId ?? "system", dto.Notes);
        }
        else if (dto.Decision == BudgetReleaseStatus.Withheld)
        {
            release.Withhold(_currentUser.UserId ?? "system", dto.Notes);
        }
        else if (dto.Decision == BudgetReleaseStatus.Rejected)
        {
            release.Reject(_currentUser.UserId ?? "system", dto.Notes);
        }
        else
        {
            return BadRequest(new { message = "Budget release decision must be Approved, Withheld or Rejected." });
        }

        release.SetModified(_currentUser.UserId ?? "system");
        await _db.SaveChangesAsync(ct);
        return Ok(MapRelease(release));
    }

    [HttpPost("expenditures")]
    [Authorize(Policy = AuthorizationPolicies.BudgetCreate)]
    public async Task<IActionResult> CreateExpenditure([FromBody] CreateBudgetExpenditureDto dto, CancellationToken ct)
    {
        var allocation = await _db.GoalBudgetAllocations.FirstOrDefaultAsync(item => item.Id == dto.GoalBudgetAllocationId, ct);
        if (allocation == null)
            return NotFound();
        if (allocation.Status != BudgetAllocationStatus.Active)
            return BadRequest(new { message = "Expenditure must reference an active allocation." });

        var goal = await GetGoalAsync(allocation.GoalId, ct);
        if (goal == null)
            return NotFound();
        if (!await _scope.CanManageProjectAsync(goal.ProjectId, ct))
            return Forbid();
        if (dto.Amount <= 0)
            return BadRequest(new { message = "Expenditure amount must be greater than zero." });

        if (dto.BudgetReleaseId.HasValue)
        {
            var release = await _db.BudgetReleases.FirstOrDefaultAsync(
                item => item.Id == dto.BudgetReleaseId.Value &&
                        item.GoalBudgetAllocationId == allocation.Id, ct);
            if (release == null || release.Status != BudgetReleaseStatus.Approved)
                return BadRequest(new { message = "The selected budget release must be approved." });
        }

        var totalReleased = await _db.BudgetReleases
            .Where(item => item.GoalBudgetAllocationId == allocation.Id && item.Status == BudgetReleaseStatus.Approved)
            .SumAsync(item => (decimal?)item.AmountApproved, ct) ?? 0;
        var totalSpent = await _db.BudgetExpenditures
            .Where(item => item.GoalBudgetAllocationId == allocation.Id)
            .SumAsync(item => (decimal?)item.Amount, ct) ?? 0;
        if (totalSpent + dto.Amount > totalReleased)
            return Conflict(new { message = "Expenditure exceeds the approved released budget." });

        if (dto.DocumentId.HasValue)
        {
            var documentExists = await _db.ProjectDocuments.AnyAsync(
                document => document.Id == dto.DocumentId.Value && document.ProjectId == goal.ProjectId, ct);
            if (!documentExists)
                return BadRequest(new { message = "The expenditure document must belong to the goal project." });
        }

        var expenditure = BudgetExpenditure.Create(
            allocation.Id,
            dto.Amount,
            dto.SpentOn,
            dto.Description,
            dto.InvoiceNumber,
            _currentUser.UserId ?? "system",
            dto.BudgetReleaseId,
            dto.DocumentId);
        expenditure.SetCreatedBy(_currentUser.UserId ?? "system");
        await _db.BudgetExpenditures.AddAsync(expenditure, ct);

        var project = await _db.Projects.FirstAsync(item => item.Id == goal.ProjectId, ct);
        project.AddActualCost(dto.Amount);
        project.SetModified(_currentUser.UserId ?? "system");

        await _db.SaveChangesAsync(ct);
        return Ok(MapExpenditure(expenditure));
    }

    private async Task<Goal?> GetGoalAsync(Guid goalId, CancellationToken ct)
        => await _db.Goals.FirstOrDefaultAsync(item => item.Id == goalId, ct);

    private static BudgetSummaryDto BuildSummary(
        Guid goalId,
        IReadOnlyCollection<GoalBudgetAllocation> allocations,
        IReadOnlyCollection<BudgetRelease> releases,
        IReadOnlyCollection<BudgetExpenditure> expenditures)
    {
        var allocated = allocations.Where(item => item.Status == BudgetAllocationStatus.Active).Sum(item => item.Amount);
        var released = releases.Where(item => item.Status == BudgetReleaseStatus.Approved).Sum(item => item.AmountApproved);
        var spent = expenditures.Sum(item => item.Amount);

        return new(
            goalId,
            allocated,
            released,
            spent,
            Math.Max(0, allocated - released),
            Math.Max(0, released - spent),
            allocations.Select(MapAllocation).ToList(),
            releases.Select(MapRelease).ToList(),
            expenditures.Select(MapExpenditure).ToList());
    }

    private static GoalBudgetAllocationDto MapAllocation(GoalBudgetAllocation item)
        => new(item.Id, item.GoalId, item.DepartmentId, item.Amount, item.Status.ToString(), item.SupersedesAllocationId, item.Reason, item.CreatedDate);

    private static BudgetReleaseDto MapRelease(BudgetRelease item)
        => new(
            item.Id,
            item.GoalBudgetAllocationId,
            item.AmountRequested,
            item.AmountApproved,
            item.Status.ToString(),
            JsonSerializer.Deserialize<Dictionary<string, bool>>(item.RequiredConditionsJson) ?? new(),
            JsonSerializer.Deserialize<Dictionary<string, bool>>(item.SatisfiedConditionsJson) ?? new(),
            item.Justification,
            item.RequestedByUserId,
            item.RequestedOn,
            item.ReviewedByUserId,
            item.ReviewedOn,
            item.ReviewNotes);

    private static BudgetExpenditureDto MapExpenditure(BudgetExpenditure item)
        => new(
            item.Id,
            item.GoalBudgetAllocationId,
            item.BudgetReleaseId,
            item.DocumentId,
            item.Amount,
            item.SpentOn,
            item.Description,
            item.InvoiceNumber,
            item.EnteredByUserId);
}

file sealed static class BudgetRequestCompatibility
{
    public static bool DepartmentIdNotUsed(this CreateGoalBudgetAllocationDto dto) => false;
}
