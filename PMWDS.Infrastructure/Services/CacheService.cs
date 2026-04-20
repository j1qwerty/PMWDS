using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;
using PMWDS.Application.Interfaces.Services;
namespace PMWDS.Infrastructure.Services;

public interface ICacheService : PMWDS.Application.Interfaces.Services.ICacheService
{
}
public class RedisCacheService : PMWDS.Application.Interfaces.Services.ICacheService
{
    private readonly IDistributedCache _cache;
    private static readonly TimeSpan _defaultExpiry =
    TimeSpan.FromMinutes(30);
    public RedisCacheService(IDistributedCache cache)
    => _cache = cache;
    public async Task<T?> GetAsync<T>(
    string key,
    CancellationToken ct = default)
    {
        var data = await _cache.GetStringAsync(key, ct);
        return data is null
        ? default
        : JsonSerializer.Deserialize<T>(data);
    }
    public async Task SetAsync<T>(
    string key, T value,
    TimeSpan? expiration = null,
    CancellationToken ct = default)
    {
        var options = new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow =
        expiration ?? _defaultExpiry
        };
        var json = JsonSerializer.Serialize(value);
        await _cache.SetStringAsync(key, json, options, ct);
    }
    public async Task RemoveAsync(
    string key,
    CancellationToken ct = default)
    => await _cache.RemoveAsync(key, ct);
    public async Task<bool> ExistsAsync(
    string key,
    CancellationToken ct = default)
    => await _cache.GetAsync(key, ct) is not null;
}
