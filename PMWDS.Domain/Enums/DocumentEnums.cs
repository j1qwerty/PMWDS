namespace PMWDS.Domain.Enums;

/// <summary>
/// Which level of the project hierarchy a document is attached to.
/// A document always belongs to a project; the level decides whether it also
/// belongs to a specific milestone or task, and therefore who can see it.
/// </summary>
public enum DocumentLevel
{
    /// <summary>Attached to the project itself, so everyone who can see the project sees it.</summary>
    Project = 0,

    /// <summary>Attached to a milestone, so it follows that milestone's department scope.</summary>
    Milestone = 1,

    /// <summary>Attached to a task, so it follows that task's scope.</summary>
    Task = 2
}

/// <summary>
/// Classifies a project document so the UI can group, filter and badge documents.
/// A Utilization Certificate carries extra finance metadata and an approval lifecycle,
/// while every other category behaves like a plain uploaded file.
/// </summary>
public enum DocumentCategory
{
    General = 0,
    Plan = 1,
    Report = 2,
    Contract = 3,
    Compliance = 4,
    Financial = 5,
    UtilizationCertificate = 6
}

/// <summary>
/// Review lifecycle for a Utilization Certificate.
/// A UC is a formal proof that grant, government or corporate funds were spent
/// for their intended purpose, so it must be verified before it is accepted.
/// </summary>
public enum UtilizationCertificateStatus
{
    Draft = 0,
    Submitted = 1,
    UnderReview = 2,
    Approved = 3,
    Rejected = 4
}