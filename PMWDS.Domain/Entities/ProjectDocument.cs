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

    protected ProjectDocument() { }

    public static ProjectDocument Create(
    Guid projectId, string title,
    string filePath, string contentType,
    long sizeBytes, string userId,
    string? description = null,
    DocumentCategory category = DocumentCategory.General)
    {
        return new ProjectDocument
        {
            ProjectId = projectId,
            Title = title,
            FilePath = filePath,
            ContentType = contentType,
            FileSizeBytes = sizeBytes,
            UploadedByUserId = userId,
            Description = description,
            Category = category
        };
    }

    /// <summary>A Utilization Certificate carries a finance approval lifecycle.</summary>
    public bool IsUtilizationCertificate() => Category == DocumentCategory.UtilizationCertificate;

    public void BumpVersion(string newVersion)
    => Version = newVersion;
}