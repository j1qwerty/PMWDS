namespace PMWDS.API.Services;

public static class FileUploadValidation
{
    public const long ProjectDocumentMaxBytes = 25 * 1024 * 1024;
    public const long TaskAttachmentMaxBytes = 25 * 1024 * 1024;
    public const long ProfilePictureMaxBytes = 1_500_000;

    private static readonly IReadOnlyDictionary<string, string[]> AllowedTypes =
        new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            [".pdf"] = new[] { "application/pdf" },
            [".doc"] = new[] { "application/msword" },
            [".docx"] = new[] { "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
            [".xls"] = new[] { "application/vnd.ms-excel" },
            [".xlsx"] = new[] { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
            [".ppt"] = new[] { "application/vnd.ms-powerpoint" },
            [".pptx"] = new[] { "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
            [".txt"] = new[] { "text/plain" },
            [".csv"] = new[] { "text/csv", "application/csv" },
            [".png"] = new[] { "image/png" },
            [".jpg"] = new[] { "image/jpeg" },
            [".jpeg"] = new[] { "image/jpeg" },
            [".webp"] = new[] { "image/webp" },
            [".zip"] = new[] { "application/zip", "application/x-zip-compressed" },
        };

    public static bool Validate(
        string fileName,
        string contentType,
        long length,
        long maxBytes,
        out string error)
    {
        error = string.Empty;

        if (string.IsNullOrWhiteSpace(fileName))
        {
            error = "A file is required.";
            return false;
        }

        if (length <= 0)
        {
            error = "The uploaded file is empty.";
            return false;
        }

        if (length > maxBytes)
        {
            error = $"The uploaded file exceeds the {maxBytes / (1024 * 1024)} MB limit.";
            return false;
        }

        var extension = Path.GetExtension(fileName).Trim().ToLowerInvariant();
        if (!AllowedTypes.TryGetValue(extension, out var allowedContentTypes))
        {
            error = "This file type is not supported.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(contentType) ||
            !allowedContentTypes.Contains(contentType.Trim(), StringComparer.OrdinalIgnoreCase))
        {
            error = "The file extension and content type do not match a supported document format.";
            return false;
        }

        return true;
    }
}
