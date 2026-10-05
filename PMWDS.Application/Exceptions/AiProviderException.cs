namespace PMWDS.Application.Exceptions;

/// <summary>
/// Thrown when an AI-backed operation cannot be completed because the upstream
/// provider is missing, misconfigured, or rejected the request.
///
/// This is deliberately distinct from a generic server error: it maps to 502
/// Bad Gateway and carries an actionable, user-facing message, so the client
/// can tell the user what to fix instead of reporting a success that contains
/// an error report.
/// </summary>
public class AiProviderException : Exception
{
    public string Reason { get; }

    public AiProviderException(string message, string reason, Exception? inner = null)
        : base(message, inner)
    {
        Reason = reason;
    }
}
