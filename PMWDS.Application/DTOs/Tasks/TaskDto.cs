using PMWDS.Domain.Entities;
using PMWDS.Domain.Enums;
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
    DateTime CreatedDate,
    List<TaskDependencyDto> Dependencies,
    List<TaskCommentDto> Comments,
    List<TaskAttachmentDto> Attachments,
    List<TaskTimeEntryDto> TimeEntries,
    double AIOptimalAssigneeScore,
    DateTime? AIPredictedCompletionDate,
    string? AIRecommendedAssigneeId)
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
        CreatedDate: t.CreatedDate,
        Dependencies: t.Dependencies
        .Select(d => TaskDependencyDto.FromEntity(d))
        .ToList(),
        Comments: t.Comments
        .Select(c => TaskCommentDto.FromEntity(c))
        .ToList(),
        Attachments: t.Attachments
        .Select(a => TaskAttachmentDto.FromEntity(a))
        .ToList(),
        TimeEntries: t.TimeEntries
        .Select(e => TaskTimeEntryDto.FromEntity(e))
        .ToList(),
        AIOptimalAssigneeScore: t.AIOptimalAssigneeScore,
        AIPredictedCompletionDate: t.AIPredictedCompletionDate,
        AIRecommendedAssigneeId: t.AIRecommendedAssigneeId
        );
    }
    public record TaskAssigneeDto(string UserId, string? FullName);
    public record TaskDependencyDto(
        Guid Id,
        Guid PredecessorTaskId,
        string? PredecessorTaskTitle,
        Guid SuccessorTaskId,
        string? SuccessorTaskTitle,
        string Type,
        int LagDays)
    {
        public static TaskDependencyDto FromEntity(TaskDependency d)
        => new(
            Id: d.Id,
            PredecessorTaskId: d.PredecessorTaskId,
            PredecessorTaskTitle: d.PredecessorTask?.Title,
            SuccessorTaskId: d.SuccessorTaskId,
            SuccessorTaskTitle: d.SuccessorTask?.Title,
            Type: d.Type.ToString(),
            LagDays: d.LagDays
        );
    }
    public record TaskCommentDto(
        Guid Id,
        Guid TaskId,
        string UserId,
        string Content,
        bool IsSystemGenerated,
        Guid? ParentCommentId,
        DateTime CreatedDate)
    {
        public static TaskCommentDto FromEntity(TaskComment c)
        => new(
            Id: c.Id,
            TaskId: c.TaskId,
            UserId: c.UserId,
            Content: c.Content,
            IsSystemGenerated: c.IsSystemGenerated,
            ParentCommentId: c.ParentCommentId,
            CreatedDate: c.CreatedDate
        );
    }
    public record TaskAttachmentDto(
        Guid Id,
        Guid TaskId,
        string FileName,
        string FilePath,
        string ContentType,
        long FileSizeBytes,
        string UploadedByUserId,
        DateTime CreatedDate)
    {
        public static TaskAttachmentDto FromEntity(TaskAttachment a)
        => new(
            Id: a.Id,
            TaskId: a.TaskId,
            FileName: a.FileName,
            FilePath: a.FilePath,
            ContentType: a.ContentType,
            FileSizeBytes: a.FileSizeBytes,
            UploadedByUserId: a.UploadedByUserId,
            CreatedDate: a.CreatedDate
        );
    }
    public record TaskTimeEntryDto(
        Guid Id,
        Guid TaskId,
        string UserId,
        string? UserName,
        string? Description,
        DateTime StartTime,
        DateTime? EndTime,
        double DurationMinutes,
        bool IsBillable)
    {
        public static TaskTimeEntryDto FromEntity(TimeEntry e)
        => new(
            Id: e.Id,
            TaskId: e.TaskId,
            UserId: e.UserId,
            UserName: e.User?.FullName,
            Description: e.Description,
            StartTime: e.StartTime,
            EndTime: e.EndTime,
            DurationMinutes: e.Duration.TotalMinutes,
            IsBillable: e.IsBillable
        );
    }
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
    public record CreateDependencyDto(
        Guid PredecessorTaskId,
        Guid SuccessorTaskId,
        DependencyType Type = DependencyType.FinishToStart,
        int LagDays = 0);
    public record UpdateDependencyDto(
        DependencyType Type,
        int LagDays);
