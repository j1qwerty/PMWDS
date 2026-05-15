using PMWDS.Domain.Entities;
namespace PMWDS.Application.DTOs.Tasks;

public record TaskDto(
    Guid Id,
    string Title,
    string? Description,
    string Status,
    string Priority,
    DateTime StartDate,
    DateTime DueDate,
    DateTime? CompletedDate,
    float EstimatedHours,
    float ActualHours,
    double ProgressPercentage,
    Guid ProjectId,
    string? ProjectName,
    Guid? MilestoneId,
    string? MilestoneName,
    Guid? ParentTaskId,
    string? AssignedToUserId,
    string? AssignedToUserName,
    List<TaskAssigneeDto> Assignees,
    bool IsEscalated,
    int EscalationLevel,
    DateTime? EscalatedDate,
    double AIDelayProbability,
    string? AIRiskFactors,
    bool IsOverdue,
    DateTime CreatedDate)
    {
        public static TaskDto FromEntity(ProjectTask t)
        => new(
        Id: t.Id,
        Title: t.Title,
        Description: t.Description,
        Status: t.Status.ToString(),
        Priority: t.Priority.ToString(),
        StartDate: t.StartDate,
        DueDate: t.DueDate,
        CompletedDate: t.CompletedDate,
        EstimatedHours: t.EstimatedHours,
        ActualHours: t.ActualHours,
        ProgressPercentage: t.ProgressPercentage,
        ProjectId: t.ProjectId,
        ProjectName: t.Project?.Name,
        MilestoneId: t.MilestoneId,
        MilestoneName: t.Milestone?.Name,
        ParentTaskId: t.ParentTaskId,
        AssignedToUserId: t.AssignedToUserId,
        AssignedToUserName: t.Assignments
        .Where(a => a.IsActive)
        .Select(a => a.User != null ? a.User.FullName : null)
        .FirstOrDefault(n => !string.IsNullOrEmpty(n)),
        Assignees: t.Assignments
        .Where(a => a.IsActive)
        .Select(a => new TaskAssigneeDto(a.UserId, a.User?.FullName))
        .ToList(),
        IsEscalated: t.IsEscalated,
        EscalationLevel: t.EscalationLevel,
        EscalatedDate: t.EscalatedDate,
        AIDelayProbability: t.AIDelayProbability,
        AIRiskFactors: t.AIRiskFactors,
        IsOverdue: t.IsOverdue(),
        CreatedDate: t.CreatedDate
        );
    }
    public record TaskAssigneeDto(string UserId, string? FullName);
    public record TaskSummaryDto(
    Guid Id,
    string Title,
    string Status,
    string Priority,
    DateTime DueDate,
    double AIDelayProbability,
    bool IsEscalated)
    {
        public static TaskSummaryDto FromEntity(ProjectTask t)
        => new(t.Id, t.Title,
        t.Status.ToString(),


        t.Priority.ToString(),
        t.DueDate,
        t.AIDelayProbability,
        t.IsEscalated);
    }
    public record CreateTaskDto(
    string Title,
    string? Description,
    DateTime StartDate,
    DateTime DueDate,
    float EstimatedHours,
    Guid ProjectId,
    Guid? MilestoneId,
    Guid? ParentTaskId,
    string? AssignedToUserId,
    Domain.Enums.TaskPriority Priority =
    Domain.Enums.TaskPriority.Medium,
    List<string>? AssignedToUserIds = null);
    public record UpdateTaskDto(
    string Title,
    string? Description,
    DateTime StartDate,
    DateTime DueDate,
    float EstimatedHours,
    Domain.Enums.TaskPriority Priority,
    Guid? MilestoneId);
    public record UpdateTaskProgressDto(
    double ProgressPercentage,
    string? Notes = null);
