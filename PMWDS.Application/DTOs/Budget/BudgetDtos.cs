using PMWDS.Domain.Entities;
using PMWDS.Domain.Enums;

namespace PMWDS.Application.DTOs.Budget;

public record GoalBudgetAllocationDto(
    Guid Id,
    Guid GoalId,
    Guid DepartmentId,
    decimal Amount,
    string Status,
    Guid? SupersedesAllocationId,
    string? Reason,
    DateTime CreatedDate);

public record BudgetReleaseDto(
    Guid Id,
    Guid GoalBudgetAllocationId,
    decimal AmountRequested,
    decimal AmountApproved,
    string Status,
    Dictionary<string, bool> RequiredConditions,
    Dictionary<string, bool> SatisfiedConditions,
    string? Justification,
    string RequestedByUserId,
    DateTime RequestedOn,
    string? ReviewedByUserId,
    DateTime? ReviewedOn,
    string? ReviewNotes);

public record BudgetExpenditureDto(
    Guid Id,
    Guid GoalBudgetAllocationId,
    Guid? BudgetReleaseId,
    Guid? DocumentId,
    decimal Amount,
    DateTime SpentOn,
    string Description,
    string? InvoiceNumber,
    string EnteredByUserId);

public record BudgetSummaryDto(
    Guid GoalId,
    decimal Allocated,
    decimal Released,
    decimal Spent,
    decimal Unreleased,
    decimal UnspentReleased,
    IReadOnlyList<GoalBudgetAllocationDto> Allocations,
    IReadOnlyList<BudgetReleaseDto> Releases,
    IReadOnlyList<BudgetExpenditureDto> Expenditures);

public record CreateGoalBudgetAllocationDto(
    Guid GoalId,
    decimal Amount,
    string? Reason);

public record AmendGoalBudgetAllocationDto(
    decimal Amount,
    string? Reason);

public record CreateBudgetReleaseDto(
    Guid GoalBudgetAllocationId,
    decimal AmountRequested,
    Dictionary<string, bool>? RequiredConditions,
    Dictionary<string, bool>? SatisfiedConditions,
    string? Justification);

public record ReviewBudgetReleaseDto(
    BudgetReleaseStatus Decision,
    decimal ApprovedAmount,
    string? Notes);

public record CreateBudgetExpenditureDto(
    Guid GoalBudgetAllocationId,
    Guid? BudgetReleaseId,
    Guid? DocumentId,
    decimal Amount,
    DateTime SpentOn,
    string Description,
    string? InvoiceNumber);
