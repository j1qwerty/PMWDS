using System.Text.Json;

namespace PMWDS.API.Services;

public static class IntegrationSecretRedactor
{
    private static readonly string[] SensitiveKeyFragments =
    {
        "api-key",
        "apikey",
        "secret",
        "token",
        "password",
        "credential",
        "authorization",
        "access-key",
        "private-key",
        "client-secret"
    };

    public static Dictionary<string, object> RedactConfiguration(
        IDictionary<string, object> configuration)
    {
        return configuration.ToDictionary(
            pair => pair.Key,
            pair => RedactValue(pair.Key, pair.Value),
            StringComparer.OrdinalIgnoreCase);
    }

    public static List<string> RedactHeaders(IEnumerable<string> headers)
        => headers.Select(RedactHeader).ToList();

    private static object RedactValue(string key, object? value)
    {
        if (IsSensitiveKey(key))
            return "[REDACTED]";

        if (value is JsonElement element)
            return RedactJsonElement(element);

        if (value is IDictionary<string, object> dictionary)
            return RedactConfiguration(dictionary);

        if (value is IEnumerable<object> items)
            return items.Select(item => RedactValue(string.Empty, item)).ToList();

        return value ?? string.Empty;
    }

    private static object RedactJsonElement(JsonElement element)
        => element.ValueKind switch
        {
            JsonValueKind.Object => element.EnumerateObject()
                .ToDictionary(
                    property => property.Name,
                    property => RedactValue(property.Name, property.Value),
                    StringComparer.OrdinalIgnoreCase),
            JsonValueKind.Array => element.EnumerateArray()
                .Select(item => RedactValue(string.Empty, item))
                .ToList(),
            JsonValueKind.String => element.GetString() ?? string.Empty,
            JsonValueKind.Number => element.TryGetInt64(out var integer) ? integer : element.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            _ => string.Empty
        };

    private static string RedactHeader(string header)
    {
        if (string.IsNullOrWhiteSpace(header))
            return header;

        var separator = header.IndexOf(':');
        if (separator <= 0)
            return IsSensitiveKey(header) ? "[REDACTED]" : header;

        var name = header[..separator].Trim();
        return IsSensitiveKey(name)
            ? $"{name}: [REDACTED]"
            : header;
    }

    private static bool IsSensitiveKey(string key)
    {
        var normalized = key
            .Replace("_", "-")
            .Replace(" ", "-")
            .Trim()
            .ToLowerInvariant();

        return SensitiveKeyFragments.Any(normalized.Contains);
    }
}
