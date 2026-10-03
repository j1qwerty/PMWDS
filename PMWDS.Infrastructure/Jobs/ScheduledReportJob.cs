using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PMWDS.Application.DTOs.Reports;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;

namespace PMWDS.Infrastructure.Jobs;

public interface IScheduledReportJob
{
    Task ExecuteAsync(CancellationToken ct);
}

public sealed class ScheduledReportJob : IScheduledReportJob
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
            "ScheduledReportJob found {Count} due schedules at {Time}.",
            schedules.Count,
            now);

        foreach (var schedule in schedules)
        {
            try
            {
                var report = await _uow.Reports.GetByIdAsync(schedule.ReportId, ct);
                if (report is null)
                {
                    _logger.LogWarning(
                        "Skipping schedule {ScheduleId}: report {ReportId} no longer exists.",
                        schedule.Id,
                        schedule.ReportId);
                    schedule.MarkExecuted(CalculateNextRun(schedule.NextRun, schedule.Frequency));
                    await _uow.SaveChangesAsync(ct);
                    continue;
                }

                var data = await GenerateAsync(report, schedule, ct);
                report.ReplaceData(data);

                var recipients = ParseStringArray(schedule.RecipientsJson);
                if (recipients.Count == 0)
                {
                    var owner = await _uow.Users.GetByIdAsync(report.GeneratedByUserId, ct);
                    if (!string.IsNullOrWhiteSpace(owner?.Email))
                        recipients.Add(owner.Email!);
                }

                if (recipients.Count == 0)
                {
                    _logger.LogWarning(
                        "Schedule {ScheduleId} generated report {ReportId} but has no recipients.",
                        schedule.Id,
                        report.Id);
                }
                else
                {
                    foreach (var recipient in recipients.Distinct(StringComparer.OrdinalIgnoreCase))
                    {
                        try
                        {
                            await _email.SendEmailWithAttachmentAsync(
                                recipient,
                                report.Name,
                                BuildEmailBody(report),
                                data,
                                $"{SanitizeFileName(report.Name)}.{report.Format.ToLowerInvariant()}",
                                ct);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(
                                ex,
                                "Scheduled report {ReportId} failed for recipient {Recipient}.",
                                report.Id,
                                recipient);
                        }
                    }
                }

                schedule.MarkExecuted(CalculateNextRun(schedule.NextRun, schedule.Frequency));
                await _uow.SaveChangesAsync(ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Scheduled report execution failed for schedule {ScheduleId}.",
                    schedule.Id);
            }
        }

        _logger.LogInformation("ScheduledReportJob completed.");
    }

    private async Task<byte[]> GenerateAsync(
        Report report,
        ReportSchedule schedule,
        CancellationToken ct)
    {
        var format = string.IsNullOrWhiteSpace(schedule.DeliveryOptionsJson)
            ? report.Format
            : ReadStringOption(schedule.DeliveryOptionsJson, "format") ?? report.Format;

        var parameters = ParseParameters(report.ParametersJson);

        return report.ReportType.Trim().ToLowerInvariant() switch
        {
            "project-status" => await RequireProjectIdAndDownloadAsync(
                parameters,
                (projectId, token) => _reports.DownloadProjectStatusReportAsync(projectId, format, token),
                ct),

            "budget-variance" => await RequireProjectIdAndDownloadAsync(
                parameters,
                (projectId, token) => _reports.DownloadBudgetVarianceReportAsync(projectId, format, token),
                ct),

            "task-completion" => await _reports.DownloadTaskCompletionReportAsync(
                BuildFilter(parameters),
                format,
                ct),

            "department-workload" => await _reports.DownloadDepartmentWorkloadReportAsync(
                RequireGuid(parameters, "departmentId"),
                new DateRange(
                    RequireDate(parameters, "startDate"),
                    RequireDate(parameters, "endDate")),
                format,
                ct),

            "delay-analysis" => await _reports.DownloadDelayAnalysisReportAsync(
                BuildFilter(parameters),
                format,
                ct),

            _ => throw new InvalidOperationException(
                $"Unsupported scheduled report type '{report.ReportType}'.")
        };
    }

    private static Task<byte[]> RequireProjectIdAndDownloadAsync(
        IReadOnlyDictionary<string, JsonElement> parameters,
        Func<Guid, CancellationToken, Task<byte[]>> generator,
        CancellationToken ct)
        => generator(RequireGuid(parameters, "projectId"), ct);

    private static ReportFilterDto BuildFilter(
        IReadOnlyDictionary<string, JsonElement> parameters)
        => new(
            TryGuid(parameters, "projectId"),
            TryGuid(parameters, "departmentId"),
            TryDate(parameters, "startDate"),
            TryDate(parameters, "endDate"),
            TryString(parameters, "status"));

    private static DateTime CalculateNextRun(DateTime scheduledRun, string frequency)
    {
        var normalized = frequency.Trim().ToLowerInvariant();
        var next = normalized switch
        {
            "hourly" => scheduledRun.AddHours(1),
            "daily" => scheduledRun.AddDays(1),
            "weekly" => scheduledRun.AddDays(7),
            "monthly" => scheduledRun.AddMonths(1),
            _ => throw new InvalidOperationException(
                $"Unsupported report frequency '{frequency}'. Use hourly, daily, weekly or monthly.")
        };

        var now = DateTime.UtcNow;
        while (next <= now)
            next = normalized switch
            {
                "hourly" => next.AddHours(1),
                "daily" => next.AddDays(1),
                "weekly" => next.AddDays(7),
                "monthly" => next.AddMonths(1),
                _ => next
            };

        return next;
    }

    private static Dictionary<string, JsonElement> ParseParameters(string json)
        => JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json)
           ?? new Dictionary<string, JsonElement>(StringComparer.OrdinalIgnoreCase);

    private static List<string> ParseStringArray(string json)
        => JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();

    private static Guid RequireGuid(IReadOnlyDictionary<string, JsonElement> parameters, string name)
        => TryGuid(parameters, name)
           ?? throw new InvalidOperationException($"Scheduled report is missing '{name}'.");

    private static Guid? TryGuid(IReadOnlyDictionary<string, JsonElement> parameters, string name)
    {
        if (!parameters.TryGetValue(name, out var value) || value.ValueKind != JsonValueKind.String)
            return null;
        return Guid.TryParse(value.GetString(), out var parsed) ? parsed : null;
    }

    private static DateTime RequireDate(IReadOnlyDictionary<string, JsonElement> parameters, string name)
        => TryDate(parameters, name)
           ?? throw new InvalidOperationException($"Scheduled report is missing '{name}'.");

    private static DateTime? TryDate(IReadOnlyDictionary<string, JsonElement> parameters, string name)
    {
        if (!parameters.TryGetValue(name, out var value) || value.ValueKind != JsonValueKind.String)
            return null;
        return value.TryGetDateTime(out var parsed) ? parsed : null;
    }

    private static string? TryString(
        IReadOnlyDictionary<string, JsonElement> parameters,
        string name)
        => parameters.TryGetValue(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    private static string? ReadStringOption(string json, string name)
    {
        var options = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json);
        if (options is null || !options.TryGetValue(name, out var value) || value.ValueKind != JsonValueKind.String)
            return null;
        return value.GetString();
    }

    private static string BuildEmailBody(Report report)
        => $"<p>Your scheduled <strong>{System.Net.WebUtility.HtmlEncode(report.Name)}</strong> is attached.</p>" +
           $"<p>Report type: {System.Net.WebUtility.HtmlEncode(report.ReportType)}</p>";

    private static string SanitizeFileName(string name)
    {
        foreach (var character in Path.GetInvalidFileNameChars())
            name = name.Replace(character, '_');
        return name;
    }
}
