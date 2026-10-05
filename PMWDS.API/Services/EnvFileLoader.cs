using System.Text;

namespace PMWDS.API.Services;

/// <summary>
/// Loads a .env file into the process environment before the configuration
/// system is built, so every secret in the application can come from one
/// place instead of being split between appsettings files, user secrets, and
/// ad-hoc environment variables set by the deploy script.
///
/// Rules:
///   - A real environment variable always wins. A value already present in the
///     environment is never overwritten, so `docker run -e ...` and systemd
///     Environment= lines keep priority over the file.
///   - Blank values and values that are not yet substituted placeholders are
///     skipped, so an empty key never shadows a correctly configured one.
///   - Values may be wrapped in single or double quotes, and # inside a quoted
///     value is literal rather than a comment.
///   - A UTF-8 BOM at the start of the file is ignored.
/// </summary>
public static class EnvFileLoader
{
    private static readonly string[] SearchNames = { ".env" };

    public static void Load(string contentRootPath)
    {
        foreach (var path in GetCandidatePaths(contentRootPath))
        {
            if (!File.Exists(path))
            {
                continue;
            }

            foreach (var (key, value) in Parse(File.ReadAllText(path, Encoding.UTF8)))
            {
                // File is the fallback, not the authority: never clobber a value
                // the host already provided.
                if (!string.IsNullOrWhiteSpace(key) &&
                    string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
                {
                    Environment.SetEnvironmentVariable(key, value);
                }
            }
        }
    }

    /// <summary>Keys and values from the first .env file found, for diagnostics.</summary>
    public static IReadOnlyDictionary<string, string> Read(string contentRootPath)
    {
        foreach (var path in GetCandidatePaths(contentRootPath))
        {
            if (File.Exists(path))
            {
                return Parse(File.ReadAllText(path, Encoding.UTF8))
                    .ToDictionary(kv => kv.Key, kv => kv.Value, StringComparer.OrdinalIgnoreCase);
            }
        }

        return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    }

    private static IEnumerable<(string Key, string Value)> Parse(string content)
    {
        var result = new List<(string, string)>();
        // Strip a UTF-8 BOM so the first key is not read as "\uFEFFConnectionStrings__Default".
        if (content.Length > 0 && content[0] == '\uFEFF')
        {
            content = content[1..];
        }

        foreach (var rawLine in content.Split('\n'))
        {
            var line = rawLine.TrimEnd('\r').Trim();
            if (line.Length == 0 || line.StartsWith('#'))
            {
                continue;
            }

            if (line.StartsWith("export ", StringComparison.Ordinal))
            {
                line = line["export ".Length..].TrimStart();
            }

            var separatorIndex = line.IndexOf('=');
            if (separatorIndex <= 0)
            {
                continue;
            }

            var key = line[..separatorIndex].Trim();
            var value = Unquote(line[(separatorIndex + 1)..].Trim());

            // An empty value tells us nothing, and a value that still looks
            // like an unsubstituted template would silently break the app.
            if (value.Length == 0 || IsPlaceholder(value))
            {
                continue;
            }

            result.Add((key, value));
        }

        return result;
    }

    private static string Unquote(string value)
    {
        if (value.Length < 2)
        {
            return StripComment(value);
        }

        var first = value[0];
        var last = value[^1];

        if (first == '"' && last == '"')
        {
            // Inside double quotes everything is literal, including '#'.
            return value[1..^1];
        }

        if (first == '\'' && last == '\'')
        {
            return value[1..^1];
        }

        return StripComment(value);
    }

    private static string StripComment(string value)
    {
        var hashIndex = value.IndexOf(" #", StringComparison.Ordinal);
        return hashIndex >= 0 ? value[..hashIndex].Trim() : value;
    }

    private static bool IsPlaceholder(string value) =>
        value.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase) ||
        value.Contains("replace-with", StringComparison.OrdinalIgnoreCase) ||
        value.Contains("<your", StringComparison.OrdinalIgnoreCase) ||
        value.Contains("YOUR_", StringComparison.Ordinal);

    private static IEnumerable<string> GetCandidatePaths(string contentRootPath)
    {
        foreach (var name in SearchNames)
        {
            yield return Path.Combine(contentRootPath, name);
        }

        // The API runs from PMWDS.API in development but from a publish folder
        // on the server, so check the parent for the repository-root .env too.
        var parent = Directory.GetParent(contentRootPath)?.FullName;
        if (!string.IsNullOrWhiteSpace(parent))
        {
            foreach (var name in SearchNames)
            {
                yield return Path.Combine(parent, name);
            }
        }
    }
}
