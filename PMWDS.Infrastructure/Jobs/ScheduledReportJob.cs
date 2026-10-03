using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using PMWDS.Application.DTOs.Controllers;
using PMWDS.Application.DTOs.Reports;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;

namespace PMWDS.Infrastructure.Jobs;

public interface IScheduledReportJob
{
    Task ExecuteAsync(CancellationToken ct);
}

public class ScheduledReportJob : IScheduledReportJob
{
    private readonly IUnitOfWork _uow;
    private readonly IReportService _reports;
    private readonly IEmailService _email;
    private readonly ILogger<ScheduledReportJob> _logger;

    public ScheduledReportJob(
        IUnitOfWork uow,
        IReportService reports,
        IEmailService email,
        ILogger<ScheduledReportJob> logger)
    {
        _uow = uow;
        _reports = reports;
        _email = email;
        _logger = logger;
    }

    public async Task ExecuteAsync(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var schedules = (await _uow.ReportSchedules.GetAllAsync(ct))
            .Where(schedule => schedule.IsActive && schedule.NextRun <= now)
            .OrderBy(schedule => schedule.NextRun)
            .ToList();

        _logger.LogInformation(
            "ScheduledReportJob started at {Time}; due schedules: {Count}",
            now,
            schedules.Count);

        foreach (var schedule in schedules)
        {
            try
            {
                var report = await _uow.Reports.GetByIdAsync(schedule.ReportId, ct);
                if (report == null)
                {
                    _logger.LogWarning(
                        "Disabling schedule {ScheduleId}: report {ReportId} no longer exists.",
                        schedule.Id,
                        schedule.ReportId);
                    schedule.Deactivate();
                    await _uow.ReportSchedules.UpdateAsync(schedule, ct);
                    await _uow.SaveChangesAsync(ct);
                    continue;
                }

                var deliveryOptions = ParseObject(schedule.DeliveryOptionsJson);
                var reportParameters = ResolveParameters(report, deliveryOptions);
                var format = ReadString(deliveryOptions, "format") ?? report.Format;
                if (string.IsNullOrWhiteSpace(format) || format.Equals("json", StringComparison.OrdinalIgnoreCase))
                    format = "pdf";

                var reportBytes = await GenerateScheduledReportAsync(
                    report.ReportType,
                    reportParameters,
                    format,
                    ct);

                var recipients = ParseRecipients(schedule.RecipientsJson);
                if (recipients.Count == 0)
                {
                    var owner = await _uow.Users.GetByIdAsync(report.GeneratedByUserId, ct);
                    if (!string.IsNullOrWhiteSpace(owner?.Email))
                        recipients.Add(owner.Email!);
                }

                if (recipients.Count == 0)
                    throw new InvalidOperationException("The schedule has no recipients and the report owner has no email address.");

                var subject = ReadString(deliveryOptions, "subject")
                    ?? $"{report.Name} — scheduled report";
                var body = ReadString(deliveryOptions, "body")
                    ?? $"<p>Please find attached the scheduled report <strong>{report.Name}</strong>.</p>";
                var extension = NormalizeExtension(format);
                var fileName = $"{SanitizeFileName(report.Name)}_{now:yyyyMMdd_HHmm}.{extension}";

                foreach (var recipient in recipients.Distinct(StringComparer.OrdinalIgnoreCase))
                {
                    await _email.SendEmailWithAttachmentAsync(
                        recipient,
                        subject,
                        body,
                        reportBytes,
                        fileName,
                        ct);
                }

                var nextRun = CalculateNextRun(schedule.NextRun, schedule.Frequency, now);
                schedule.MarkExecuted(nextRun);
                await _uow.ReportSchedules.UpdateAsync(schedule, ct);
                await _uow.SaveChangesAsync(ct);

                _logger.LogInformation(
                    "Executed report schedule {ScheduleId} for report {ReportId}; next run {NextRun}.",
                    schedule.Id,
                    report.Id,
                    nextRun);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Failed to execute report schedule {ScheduleId} for report {ReportId}. The schedule remains due for retry.",
                    schedule.Id,
                    schedule.ReportId);
            }
        }

        _logger.LogInformation("ScheduledReportJob completed.");
    }

    private async Task<byte[]> GenerateScheduledReportAsync(
        string reportType,
        JsonElement parameters,
        string format,
        CancellationToken ct)
    {
        switch (reportType.Trim().ToLowerInvariant())
        {
            case "project-status":
            {
                var projectId = ReadRequiredGuid(parameters, "projectId");
                return await _reports.DownloadProjectStatusReportAsync(projectId, format, ct);
            }

            case "budget-variance":
            {
                var projectId = ReadRequiredGuid(parameters, "projectId");
                return await _reports.DownloadBudgetVarianceReportAsync(projectId, format, ct);
            }

            case "task-completion":
            {
                var filter = ReadReportFilter(parameters);
                return await _reports.DownloadTaskCompletionReportAsync(filter, format, ct);
            }

            case "department-workload":
            {
                var departmentId = ReadRequiredGuid(parameters, "departmentId");
                var start = ReadRequiredDate(parameters, "startDate");
                var end = ReadRequiredDate(parameters, "endDate");
                return await _reports.DownloadDepartmentWorkloadReportAsync(
                    departmentId,
                    new DateRange(start, end),
                    format,
                    ct);
            }

            case "delay-analysis":
            {
                var filter = ReadReportFilter(parameters);
                return await _reports.DownloadDelayAnalysisReportAsync(filter, format, ct);
            }

            default:
                throw new InvalidOperationException($"Unsupported scheduled report type '{reportType}'.");
        }
    }

    private static JsonElement ResolveParameters(
        Report report,
        JsonElement deliveryOptions)
    {
        var reportParameters = ParseObject(report.ParametersJson);
        if (HasUsefulParameters(report.ReportType, reportParameters))
            return reportParameters;

        if (deliveryOptions.ValueKind == JsonValueKind.Object &&
            deliveryOptions.TryGetProperty("parameters", out var scheduledParameters) &&
            scheduledParameters.ValueKind == JsonValueKind.Object)
        {
            return scheduledParameters;
        }

        return reportParameters;
    }

    private static bool HasUsefulParameters(string reportType, JsonElement parameters)
    {
        if (parameters.ValueKind != JsonValueKind.Object)
            return false;

        return reportType.Trim().ToLowerInvariant() switch
        {
            "project-status" or "budget-variance" => HasValue(parameters, "projectId"),
            "department-workload" => HasValue(parameters, "departmentId") &&
                                     HasValue(parameters, "startDate") &&
                                     HasValue(parameters, "endDate"),
            "task-completion" or "delay-analysis" => true,
            _ => false
        };
    }

    private static ReportFilterDto ReadReportFilter(JsonElement parameters)
        => new(
            ReadNullableDate(parameters, "startDate"),
            ReadNullableDate(parameters, "endDate"),
            ReadNullableGuid(parameters, "departmentId"),
            ReadString(parameters, "employeeId"),
            ReadNullableGuid(parameters, "projectId"),
            ReadString(parameters, "status"));

    private static JsonElement ParseObject(string json)
    {
        using var document = JsonDocument.Parse(
            string.IsNullOrWhiteSpace(json) ? "{}" : json);
        return document.RootElement.Clone();
    }

    private static List<string> ParseRecipients(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return new();

        try
        {
            var values = JsonSerializer.Deserialize<List<string>>(json);
            return values?
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => value.Trim())
                .ToList() ?? new();
        }
        catch (JsonException)
        {
            return new();
        }
    }

    private static bool HasValue(JsonElement element, string name)
        => element.TryGetProperty(name, out var value) &&
           value.ValueKind != JsonValueKind.Null &&
           value.ValueKind != JsonValueKind.Undefined &&
           (!value.ValueKind.Equals(JsonValueKind.String) || !string.IsNullOrWhiteSpace(value.GetString()));

    private static Guid ReadRequiredGuid(JsonElement element, string name)
        => ReadNullableGuid(element, name)
           ?? throw new InvalidOperationException($"Report parameter '{name}' is required.");

    private static Guid? ReadNullableGuid(JsonElement element, string name)
    {
        if (!element.TryGetProperty(name, out var value))
            return null;

        if (value.ValueKind == JsonValueKind.String &&
            Guid.TryParse(value.GetString(), out var id))
            return id;

        if (value.ValueKind == JsonValueKind.Undefined || value.ValueKind == JsonValueKind.Null)
            return null;

        throw new InvalidOperationException($"Report parameter '{name}' is not a valid GUID.");
    }

    private static DateTime ReadRequiredDate(JsonElement element, string name)
        => ReadNullableDate(element, name)
           ?? throw new InvalidOperationException($"Report parameter '{name}' is required.");

    private static DateTime? ReadNullableDate(JsonElement element, string name)
    {
        if (!element.TryGetProperty(name, out var value))
            return null;

        if (value.ValueKind == JsonValueKind.String &&
            DateTime.TryParse(
                value.GetString(),
                CultureInfo.InvariantCulture,
                DateTimeStyles.RoundtripKind,
                out var date))
            return date;

        if (value.ValueKind == JsonValueKind.Undefined || value.ValueKind == JsonValueKind.Null)
            return null;

        throw new InvalidOperationException($"Report parameter '{name}' is not a valid date.");
    }

    private static string? ReadString(JsonElement element, string name)
    {
        if (!element.TryGetProperty(name, out var value) || value.ValueKind != JsonValueKind.String)
            return null;

        var result = value.GetString()?.Trim();
        return string.IsNullOrWhiteSpace(result) ? null : result;
    }

    private static DateTime CalculateNextRun(
        DateTime scheduledRun,
        string frequency,
        DateTime now)
    {
        var next = scheduledRun;
        var normalized = frequency.Trim().ToLowerInvariant();

        if (normalized.Contains("hour"))
        {
            while (next <= now) next = next.AddHours(1);
        }
        else if (normalized.Contains("day"))
        {
            while (next <= now) next = next.AddDays(1);
        }
        else if (normalized.Contains("week"))
        {
            while (next <= now) next = next.AddDays(7);
        }
        else if (normalized.Contains("month"))
        {
            while (next <= now) next = next.AddMonths(1);
        }
        else
        {
            throw new InvalidOperationException(
                $"Unsupported report frequency '{frequency}'. Supported frequencies are hourly, daily, weekly and monthly.");
        }

        return next;
    }

    private static string NormalizeExtension(string format)
        => format.Trim().ToLowerInvariant() switch
        {
            "excel" or "xlsx" => "xlsx",
            "json" => "json",
            "txt" => "txt",
            "csv" => "csv",
            _ => "pdf"
        };

    private static string SanitizeFileName(string value)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var sanitized = new string(value
            .Where(character => !invalid.Contains(character))
            .ToArray())
            .Trim();

        return string.IsNullOrWhiteSpace(sanitized) ? "report" : sanitized;
    }
}
