using PMWDS.Domain.Common;
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
    protected ProjectDocument() { }
    public static ProjectDocument Create(
    Guid projectId, string title,
    string filePath, string contentType,
    long sizeBytes, string userId,
    string? description = null)
    {
        return new ProjectDocument
        {
            ProjectId = projectId,
            Title = title,
            FilePath = filePath,
            ContentType = contentType,
            FileSizeBytes = sizeBytes,
            UploadedByUserId = userId,
            Description = description
        };
    }
    public void BumpVersion(string newVersion)
    => Version = newVersion;
}
