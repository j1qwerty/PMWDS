using PMWDS.Domain.Common;
using PMWDS.Domain.Enums;

namespace PMWDS.Domain.Entities;

public class GoalTransfer : BaseEntity
{
    public Guid GoalId { get; private set; }
    public Guid FromDepartmentId { get; private set; }
    public Guid ToDepartmentId { get; private set; }
    public string RequestedByUserId { get; private set; } = string.Empty;
    public DateTime RequestedOn { get; private set; }
    public GoalTransferStatus Status { get; private set; }
    public string? Reason { get; private set; }
    public string? ReviewedByUserId { get; private set; }
    public DateTime? ReviewedOn { get; private set; }
    public string? ReviewNotes { get; private set; }

    public Goal? Goal { get; private set; }
    public Department? FromDepartment { get; private set; }
    public Department? ToDepartment { get; private set; }

    protected GoalTransfer() { }

    public static GoalTransfer Create(
        Guid goalId,
        Guid fromDepartmentId,
        Guid toDepartmentId,
        string requestedByUserId,
        string? reason)
        => new()
        {
            GoalId = goalId,
            FromDepartmentId = fromDepartmentId,
            ToDepartmentId = toDepartmentId,
            RequestedByUserId = requestedByUserId,
            RequestedOn = DateTime.UtcNow,
            Status = GoalTransferStatus.Pending,
            Reason = reason?.Trim()
        };

    public void Acknowledge(string reviewerUserId, string? notes)
    {
        Status = GoalTransferStatus.Acknowledged;
        ReviewedByUserId = reviewerUserId;
        ReviewedOn = DateTime.UtcNow;
        ReviewNotes = notes?.Trim();
    }

    public void Reject(string reviewerUserId, string? notes)
    {
        Status = GoalTransferStatus.Rejected;
        ReviewedByUserId = reviewerUserId;
        ReviewedOn = DateTime.UtcNow;
        ReviewNotes = notes?.Trim();
    }

    public void Cancel(string userId)
    {
        Status = GoalTransferStatus.Cancelled;
        ReviewedByUserId = userId;
        ReviewedOn = DateTime.UtcNow;
    }
}
