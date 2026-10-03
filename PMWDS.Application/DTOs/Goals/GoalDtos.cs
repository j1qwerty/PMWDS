using PMWDS.Domain.Entities;

namespace PMWDS.Application.DTOs.Goals;

public record GoalDto(
    Guid Id,
    Guid ProjectId,
    Guid AssignedDepartmentId,
    string? AssignedDepartmentName,
    string Title,
    string Description,
    string Priority,
    string Status,
    DateTime DueDate,
    double ProgressPercentage,
    int MilestoneCount,
    Guid? PendingTransferId,
    Guid? PendingTransferToDepartmentId)
{
    public static GoalDto FromEntity(
        Goal goal,
        string? departmentName,
        int milestoneCount,
        Guid? pendingTransferId = null,
        Guid? pendingTransferToDepartmentId = null)
        => new(
            goal.Id,
            goal.ProjectId,
            goal.AssignedDepartmentId,
            departmentName,
            goal.Title,
            goal.Description,
            goal.Priority.ToString(),
            goal.Status.ToString(),
            goal.DueDate,
            goal.ProgressPercentage,
            milestoneCount,
            pendingTransferId,
            pendingTransferToDepartmentId);
}

public record CreateGoalDto(
    Guid ProjectId,
    Guid AssignedDepartmentId,
    string Title,
    string? Description,
    Domain.Enums.GoalPriority Priority,
    DateTime DueDate);

public record UpdateGoalDto(
    Guid AssignedDepartmentId,
    string Title,
    string? Description,
    Domain.Enums.GoalPriority Priority,
    DateTime DueDate);

public record TransferGoalDto(Guid ToDepartmentId, string? Reason);

public record ReviewGoalTransferDto(string? Notes);
