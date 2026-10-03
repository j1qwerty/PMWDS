using PMWDS.Domain.Enums;

namespace PMWDS.Application.DTOs.Projects;

public sealed record CreateProjectWizardRequest(
    CreateProjectDto Project,
    IReadOnlyCollection<ProjectWizardMilestoneDto> Milestones,
    IReadOnlyCollection<ProjectWizardDependencyDto> Dependencies,
    IReadOnlyCollection<ProjectWizardTaskDto> Tasks);

public sealed record ProjectWizardMilestoneDto(
    string ClientId,
    string Name,
    string Description,
    DateTime DueDate,
    bool IsCritical,
    Guid? DepartmentId);

public sealed record ProjectWizardDependencyDto(
    string PrerequisiteMilestoneClientId,
    string DependentMilestoneClientId,
    MilestoneDependencyType Type,
    double? ThresholdPercentage);

public sealed record ProjectWizardTaskDto(
    string Title,
    string? Description,
    DateTime StartDate,
    DateTime DueDate,
    float EstimatedHours,
    Guid? MilestoneClientId,
    TaskPriority Priority,
    IReadOnlyCollection<string>? AssignedToUserIds);

public sealed record ProjectWizardResultDto(
    ProjectDto Project,
    IReadOnlyDictionary<string, Guid> MilestoneIds,
    IReadOnlyList<Guid> TaskIds);
