using PMWDS.Domain.Common;
using System.Text.Json;

namespace PMWDS.Domain.Entities;

public class ReportSchedule : AuditableEntity
{
    public Guid ReportId { get; private set; }
    public string Frequency { get; private set; } = string.Empty;
    public DateTime NextRun { get; private set; }
    public DateTime? LastRun { get; private set; }
    public string RecipientsJson { get; private set; } = "[]";
    public string DeliveryOptionsJson { get; private set; } = "{}";
    public Report? Report { get; private set; }

    protected ReportSchedule() { }

    public static ReportSchedule Create(
        Guid reportId,
        string frequency,
        DateTime nextRun,
        IEnumerable<string>? recipients,
        object? deliveryOptions,
        bool isActive = true)
    {
        var normalizedFrequency = NormalizeFrequency(frequency);
        var schedule = new ReportSchedule
        {
            ReportId = reportId,
            Frequency = normalizedFrequency,
            NextRun = nextRun,
            RecipientsJson = JsonSerializer.Serialize(recipients ?? Enumerable.Empty<string>()),
            DeliveryOptionsJson = JsonSerializer.Serialize(deliveryOptions ?? new Dictionary<string, object>())
        };

        if (!isActive)
        {
            schedule.Deactivate();
        }

        return schedule;
    }

    public void Update(
        string frequency,
        DateTime nextRun,
        IEnumerable<string>? recipients,
        object? deliveryOptions,
        bool isActive)
    {
        Frequency = NormalizeFrequency(frequency);
        NextRun = nextRun;
        RecipientsJson = JsonSerializer.Serialize(recipients ?? Enumerable.Empty<string>());
        DeliveryOptionsJson = JsonSerializer.Serialize(deliveryOptions ?? new Dictionary<string, object>());
        if (isActive)
        {
            Activate();
        }
        else
        {
            Deactivate();
        }
    }

    public void MarkExecuted(DateTime nextRun)
    {
        LastRun = DateTime.UtcNow;
        NextRun = nextRun;
    }

    private static string NormalizeFrequency(string frequency)
    {
        var normalized = frequency.Trim().ToLowerInvariant();
        return normalized switch
        {
            "hourly" => "hourly",
            "daily" => "daily",
            "weekly" => "weekly",
            "monthly" => "monthly",
            _ => throw new ArgumentException(
                "Frequency must be hourly, daily, weekly or monthly.",
                nameof(frequency))
        };
    }
}
