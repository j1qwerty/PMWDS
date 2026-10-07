using PMWDS.Domain.Enums;

namespace PMWDS.Application.DTOs.Documents;

/// <summary>
/// One document in a project's document list.
///
/// The level is carried alongside the names of whatever it hangs under, so a
/// task-level document can be shown with the milestone and project it belongs to
/// without the client having to make a second request to find out.
/// </summary>
public sealed record ProjectDocumentDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    string Title,
    string FilePath,
    string ContentType,
    long FileSizeBytes,
    string UploadedByUserId,
    string? Description,
    string Version,
    DocumentCategory Category,
    DocumentLevel Level,
    Guid? MilestoneId,
    string? MilestoneName,
    Guid? TaskId,
    string? TaskName,
    DateTime CreatedDate);

/// <summary>Which levels of the hierarchy a document list should contain.</summary>
public sealed record DocumentLevelFilter(DocumentLevel? Level);

/// <summary>
/// Which levels of the hierarchy the caller is allowed to upload into, and for
/// which kind of document.
///
/// The client renders its upload-level dropdown straight from this, so the levels
/// on screen always match what the API would accept.
/// </summary>
public sealed record DocumentUploadCapabilities(
    IReadOnlyList<DocumentLevel> DocumentLevels,
    IReadOnlyList<DocumentLevel> UtilizationCertificateDocumentLevels,
    bool CanUploadProject,
    bool CanUploadMilestone,
    bool CanUploadTask)
{
    public static readonly DocumentUploadCapabilities None =
        new([], [], false, false, false);
}

/// <summary>
/// How much of a project's document list the caller may see.
///
/// A department that merely contributes milestones to a project can read only
/// its own documents; the primary department sees the whole set. This mirrors the
/// milestone scoping rules exactly, so the document list never reveals more than
/// the milestone list already does.
/// </summary>
public sealed record DocumentListCapabilities(
    bool CanViewProjectDocuments,
    bool CanViewAllLevels);
