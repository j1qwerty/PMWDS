using PMWDS.Domain.Common;

namespace PMWDS.Domain.Entities;

public class MilestoneDepartment : AuditableEntity
{
    public Guid MilestoneId { get; private set; }
    public Guid DepartmentId { get; private set; }

    public Milestone? Milestone { get; private set; }
    public Department? Department { get; private set; }

    protected MilestoneDepartment() { }

    public static MilestoneDepartment Create(Guid milestoneId, Guid departmentId)
        => new()
        {
            MilestoneId = milestoneId,
            DepartmentId = departmentId
        };
}
