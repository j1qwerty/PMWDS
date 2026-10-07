using PMWDS.Domain.Common;
using PMWDS.Domain.Enums;

namespace PMWDS.Domain.Entities;

public class ProjectDocument : BaseEntity
{
    public Guid ProjectId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string FilePath { get; private set; } = string.Empty;
    public string ContentType { get; private set; } = string.Empty;
    public long FileSizeBytes { get; private set; }
    public string UploadedByUserId { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public string Version { get; private set; } = "1.0";

    /// <summary>
    /// Groups the document in the UI and decides whether extra metadata is required.
    /// Defaults to <see cref="DocumentCategory.General"/> so existing rows keep behaving as plain files.
    /// </summary>
    public DocumentCategory Category { get; private set; } = DocumentCategory.General;

    /// <summary>
    /// Which level of the hierarchy this document is attached at. Every document
    /// belongs to a project; the level decides whether it also belongs to a
    /// milestone or a task, and so whose department scope it inherits.
    /// </summary>
    public DocumentLevel Level { get; private set; } = DocumentLevel.Project;

    /// <summary>Set when <see cref="Level"/> is <see cref="DocumentLevel.Milestone"/>.</summary>
    public Guid? MilestoneId { get; private set; }

    /// <summary>Set when <see cref="Level"/> is <see cref="DocumentLevel.Task"/>.</summary>
    public Guid? TaskId { get; private set; }

    public Milestone? Milestone { get; private set; }
    public ProjectTask? Task { get; private set; }

    protected ProjectDocument() { }

    public static ProjectDocument Create(
    Guid projectId, string title,
    string filePath, string contentType,
    long sizeBytes, string userId,
    string? description = null,
    DocumentCategory category = DocumentCategory.General) =>
        Create(projectId, title, filePath, contentType, sizeBytes, userId,
            description, category, DocumentLevel.Project, null, null);

    /// <summary>
    /// Creates a document at a specific level of the hierarchy.
    /// </summary>
    /// <param name="level">Which level the document is attached at.</param>
    /// <param name="milestoneId">Required when <paramref name="level"/> is Milestone.</param>
    /// <param name="taskId">Required when <paramref name="level"/> is Task.</param>
    public static ProjectDocument Create(
    Guid projectId, string title,
    string filePath, string contentType,
    long sizeBytes, string userId,
    string? description,
    DocumentCategory category,
    DocumentLevel level,
    Guid? milestoneId,
    Guid? taskId)
    {
        return new ProjectDocument
        {
            ProjectId = projectId,
            Title = SanitizeTitle(title),
            FilePath = filePath,
            ContentType = contentType,
            FileSizeBytes = sizeBytes,
            UploadedByUserId = userId,
            Description = description,
            Category = category,
            Level = level,
            MilestoneId = level == DocumentLevel.Milestone ? milestoneId : null,
            TaskId = level == DocumentLevel.Task ? taskId : null
        };
    }

    /// <summary>
    /// Re-points the document at a different milestone or task. The level always
    /// follows, so the two can never disagree.
    /// </summary>
    public void AttachToMilestone(Guid milestoneId)
    {
        Level = DocumentLevel.Milestone;
        MilestoneId = milestoneId;
        TaskId = null;
    }

    /// <inheritdoc cref="AttachToMilestone"/>
    public void AttachToTask(Guid taskId)
    {
        Level = DocumentLevel.Task;
        TaskId = taskId;
        MilestoneId = null;
    }

    /// <inheritdoc cref="AttachToMilestone"/>
    public void AttachToProject()
    {
        Level = DocumentLevel.Project;
        MilestoneId = null;
        TaskId = null;
    }

    /// <summary>
    /// Drops the milestone or task this document was filed under, promoting it to a
    /// project-level document rather than deleting it.
    ///
    /// Milestones and tasks are soft-deleted and the foreign keys are NoAction, so
    /// the row would otherwise survive still pointing at something the UI no longer
    /// shows. Promoting keeps the file reachable instead of stranding it.
    /// </summary>
    public void PromoteToProjectLevel()
    {
        Level = DocumentLevel.Project;
        MilestoneId = null;
        TaskId = null;
    }

    /// <summary>True when this document sits under a milestone rather than the project itself.</summary>
    public bool IsMilestoneLevel() => Level == DocumentLevel.Milestone;

    /// <summary>True when this document sits under a task.</summary>
    public bool IsTaskLevel() => Level == DocumentLevel.Task;

    /// <summary>True when this document sits directly on the project.</summary>
    public bool IsProjectLevel() => Level == DocumentLevel.Project;

    /// <summary>
    /// The title is display-only, so strip control characters and any path structure a client may
    /// have sent. The file on disk is named separately, so the original name is not needed here and
    /// must never be able to influence where the file is written.
    /// </summary>
    private static string SanitizeTitle(string title)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            return "document";
        }

        var cleaned = new string(title
            .Where(c => !char.IsControl(c))
            .ToArray())
            .Trim();

        var lastSeparator = cleaned.LastIndexOfAny(new[] { '/', '\\' });
        if (lastSeparator >= 0 && lastSeparator < cleaned.Length - 1)
        {
            cleaned = cleaned[(lastSeparator + 1)..];
        }

        return string.IsNullOrWhiteSpace(cleaned) ? "document" : cleaned;
    }

    /// <summary>A Utilization Certificate carries a finance approval lifecycle.</summary>
    public bool IsUtilizationCertificate() => Category == DocumentCategory.UtilizationCertificate;

    public void BumpVersion(string newVersion)
    => Version = newVersion;
}