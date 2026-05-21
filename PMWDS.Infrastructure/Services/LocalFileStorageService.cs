using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PMWDS.Infrastructure.Settings;

namespace PMWDS.Infrastructure.Services;

public interface ILocalFileStorageService
{
    Task<string> UploadAvatarAsync(Stream stream, string userCode, string extension, CancellationToken ct = default);
    Task<string> UploadDocumentAsync(Stream stream, string projectCode, string projectName, string extension, string contentType, CancellationToken ct = default);
    Task<Stream> DownloadFileAsync(string filePath, CancellationToken ct = default);
}

public class LocalFileStorageService : ILocalFileStorageService
{
    private readonly LocalFileStorageSettings _settings;
    private readonly ILogger<LocalFileStorageService> _logger;

    public LocalFileStorageService(
        IOptions<LocalFileStorageSettings> settings,
        ILogger<LocalFileStorageService> logger)
    {
        _settings = settings.Value;
        _logger = logger;

        Directory.CreateDirectory(_settings.FullAvatarsPath);
        Directory.CreateDirectory(_settings.FullDocumentsPath);

        _logger.LogInformation(
            "[LocalFileStorage] Avatars: {AvatarsPath}, Documents: {DocumentsPath}",
            _settings.FullAvatarsPath,
            _settings.FullDocumentsPath);
    }

    public async Task<string> UploadAvatarAsync(
        Stream stream,
        string userCode,
        string extension,
        CancellationToken ct = default)
    {
        var guid = Guid.NewGuid().ToString("N");
        var fileName = $"{userCode}-{guid}{extension}";
        var filePath = Path.Combine(_settings.FullAvatarsPath, fileName);

        await using var fileStream = File.Create(filePath);
        await stream.CopyToAsync(fileStream, ct);

        var relativePath = $"avatars/{fileName}";
        _logger.LogDebug("[LocalFileStorage] Avatar saved: {Path}", relativePath);
        return relativePath;
    }

    public async Task<string> UploadDocumentAsync(
        Stream stream,
        string projectCode,
        string projectName,
        string extension,
        string contentType,
        CancellationToken ct = default)
    {
        var projectFolder = SanitizeFolderName(projectCode);
        var projectFolderPath = Path.Combine(_settings.FullDocumentsPath, projectFolder);
        Directory.CreateDirectory(projectFolderPath);

        var sanitizedName = SanitizeFileName(projectName);
        var guid = Guid.NewGuid().ToString("N");
        var fileName = $"{sanitizedName}-{guid}{extension}";
        var filePath = Path.Combine(projectFolderPath, fileName);

        await using var fileStream = File.Create(filePath);
        await stream.CopyToAsync(fileStream, ct);

        var relativePath = $"documents/{projectFolder}/{fileName}";
        _logger.LogDebug("[LocalFileStorage] Document saved: {Path}", relativePath);
        return relativePath;
    }

    public Task<Stream> DownloadFileAsync(string filePath, CancellationToken ct = default)
    {
        var fullPath = ResolvePath(filePath);
        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException($"File not found: {filePath}");
        }

        _logger.LogDebug("[LocalFileStorage] Downloading: {Path}", fullPath);
        return Task.FromResult<Stream>(File.OpenRead(fullPath));
    }

    private string ResolvePath(string relativePath)
    {
        if (relativePath.StartsWith("avatars/") || relativePath.StartsWith("avatars\\"))
        {
            return Path.Combine(_settings.FullAvatarsPath, relativePath.Substring("avatars/".Length));
        }

        if (relativePath.StartsWith("documents/") || relativePath.StartsWith("documents\\"))
        {
            var relative = relativePath.Substring("documents/".Length);
            return Path.Combine(_settings.FullDocumentsPath, relative.Replace('/', Path.DirectorySeparatorChar));
        }

        return Path.Combine(_settings.FullDocumentsPath, relativePath);
    }

    private static string SanitizeFolderName(string name)
    {
        var invalid = Path.GetInvalidPathChars();
        return string.Join("", name.Where(c => !invalid.Contains(c))).Trim();
    }

    private static string SanitizeFileName(string name)
    {
        var invalid = Path.GetInvalidFileNameChars();
        return string.Join("", name.Where(c => !invalid.Contains(c))).Trim();
    }
}
