using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Options;
using PMWDS.Infrastructure.Settings;
namespace PMWDS.Infrastructure.Services;

public interface IFileStorageService
{
    Task<string> UploadAsync(Stream stream, string fileName,
 string contentType, CancellationToken ct = default);
    Task<Stream> DownloadAsync(string filePath,
    CancellationToken ct = default);
    Task DeleteAsync(string filePath,
    CancellationToken ct = default);
    Task<string> GetPublicUrlAsync(string filePath,
    CancellationToken ct = default);
}
public class AzureBlobStorageService : IFileStorageService
{
    private readonly BlobServiceClient _client;
    private readonly string _containerName;
    public AzureBlobStorageService(
    IOptions<AzureStorageSettings> settings)
    {
        _client = new BlobServiceClient(
        settings.Value.ConnectionString);
        _containerName = settings.Value.ContainerName;
    }
    public async Task<string> UploadAsync(
    Stream stream, string fileName,
    string contentType,
    CancellationToken ct = default)
    {
        var container = _client
        .GetBlobContainerClient(_containerName);
        await container.CreateIfNotExistsAsync(
        cancellationToken: ct);
        var blobName = $"{Guid.NewGuid()}/{fileName}";
        var blobClient = container.GetBlobClient(blobName);
        await blobClient.UploadAsync(stream,
        new BlobHttpHeaders { ContentType = contentType },
        cancellationToken: ct);
        return blobClient.Uri.ToString();
    }
    public async Task<Stream> DownloadAsync(
    string filePath,
    CancellationToken ct = default)
    {
        var container = _client
        .GetBlobContainerClient(_containerName);
        var blobClient = container.GetBlobClient(filePath);
        var response = await blobClient
        .DownloadAsync(ct);
        return response.Value.Content;
    }
    public async Task DeleteAsync(
    string filePath,
    CancellationToken ct = default)
    {
        var container = _client
        .GetBlobContainerClient(_containerName);
        var blobClient = container.GetBlobClient(filePath);
        await blobClient.DeleteIfExistsAsync(
        cancellationToken: ct);
    }
    public Task<string> GetPublicUrlAsync(
    string filePath,
    CancellationToken ct = default)
    {
        var container = _client
        .GetBlobContainerClient(_containerName);
        var blobClient = container.GetBlobClient(filePath);
        return Task.FromResult(blobClient.Uri.ToString());
    }
}
