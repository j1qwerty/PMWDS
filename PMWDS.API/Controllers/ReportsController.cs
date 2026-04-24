using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMWDS.Application.DTOs.Reports;
using PMWDS.Application.Interfaces.Services;
using PMWDS.Domain.Entities;
using System.Text;
using System.Text.Json;

namespace PMWDS.API.Controllers;

public class ReportsController : BaseApiController
{
    private readonly IReportService _reports;
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public ReportsController(
        IReportService reports,
        IUnitOfWork uow,
        ICurrentUserService currentUser)
    {
        _reports = reports;
        _uow = uow;
        _currentUser = currentUser;
    }

    [HttpGet("project-status/{projectId:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> ProjectStatus(
        Guid projectId,
        [FromQuery] string format = "pdf",
        CancellationToken ct = default)
    {
        var bytes = await _reports.GenerateProjectStatusReportAsync(projectId, format, ct);
        return File(bytes, GetContentType(format), $"project-status.{format}");
    }

    [HttpPost("task-completion")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> TaskCompletion(
        [FromBody] ReportFilterDto filter,
        [FromQuery] string format = "pdf",
        CancellationToken ct = default)
    {
        var bytes = await _reports.GenerateTaskCompletionReportAsync(filter, format, ct);
        return File(bytes, GetContentType(format), $"task-completion.{format}");
    }

    [HttpPost("department-workload")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> DepartmentWorkload(
        [FromBody] DepartmentWorkloadRequest req,
        [FromQuery] string format = "pdf",
        CancellationToken ct = default)
    {
        var bytes = await _reports.GenerateDepartmentWorkloadReportAsync(req.DepartmentId, new DateRange(req.StartDate, req.EndDate), format, ct);
        return File(bytes, GetContentType(format), $"department-workload.{format}");
    }

    [HttpGet("budget-variance/{projectId:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> BudgetVariance(
        Guid projectId,
        [FromQuery] string format = "pdf",
        CancellationToken ct = default)
    {
        var bytes = await _reports.GenerateBudgetVarianceReportAsync(projectId, format, ct);
        return File(bytes, GetContentType(format), $"budget-variance.{format}");
    }

    [HttpPost("delay-analysis")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> DelayAnalysis(
        [FromBody] ReportFilterDto filter,
        [FromQuery] string format = "pdf",
        CancellationToken ct = default)
    {
        var bytes = await _reports.GenerateDelayAnalysisReportAsync(filter, format, ct);
        return File(bytes, GetContentType(format), $"delay-analysis.{format}");
    }

    [HttpPost("resource-utilization")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> ResourceUtilization(
        [FromBody] DepartmentWorkloadRequest req,
        [FromQuery] string format = "pdf",
        CancellationToken ct = default)
        => StatusCode(StatusCodes.Status501NotImplemented);

    [HttpGet("ai-insights/{projectId:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> AIInsights(
        Guid projectId,
        [FromQuery] string format = "pdf",
        CancellationToken ct = default)
        => StatusCode(StatusCodes.Status501NotImplemented);

    [HttpGet("stored")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetStoredReports(CancellationToken ct)
        => Ok((await _uow.Reports.GetAllAsync(ct)).OrderByDescending(r => r.GeneratedDate).Select(MapReport));

    [HttpGet("stored/{id:guid}")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> GetStoredReport(Guid id, CancellationToken ct)
    {
        var report = await _uow.Reports.GetByIdAsync(id, ct);
        if (report == null)
        {
            return NotFound();
        }

        var schedules = (await _uow.ReportSchedules.FindAsync(s => s.ReportId == id, ct)).Select(MapSchedule).ToList();
        return Ok(new StoredReportDetailResponse(MapReport(report), schedules));
    }

    [HttpGet("stored/{id:guid}/download")]
    [Authorize(Policy = "Authenticated")]
    public async Task<IActionResult> DownloadStoredReport(Guid id, CancellationToken ct)
    {
        var report = await _uow.Reports.GetByIdAsync(id, ct);
        return report == null
            ? NotFound()
            : File(report.Data, GetContentType(report.Format), $"{report.Name}.{report.Format}");
    }

    [HttpPost("stored")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> CreateStoredReport([FromBody] UpsertStoredReportRequest req, CancellationToken ct)
    {
        if (!Guid.TryParse(_currentUser.UserId, out var userId))
        {
            return Unauthorized();
        }

        var data = string.IsNullOrWhiteSpace(req.ContentBase64)
            ? Encoding.UTF8.GetBytes(JsonSerializer.Serialize(req.Parameters))
            : Convert.FromBase64String(req.ContentBase64);

        var report = Report.Create(req.Name, req.ReportType, req.Parameters, req.Format, data, userId);
        report.SetCreatedBy(_currentUser.UserId ?? "system");
        await _uow.Reports.AddAsync(report, ct);
        await _uow.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetStoredReport), new { id = report.Id }, MapReport(report));
    }

    [HttpPut("stored/{id:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> UpdateStoredReport(Guid id, [FromBody] UpsertStoredReportRequest req, CancellationToken ct)
    {
        var report = await _uow.Reports.GetByIdAsync(id, ct);
        if (report == null)
        {
            return NotFound();
        }

        report.UpdateMetadata(req.Name, req.ReportType, req.Parameters, req.Format);
        if (!string.IsNullOrWhiteSpace(req.ContentBase64))
        {
            report.ReplaceData(Convert.FromBase64String(req.ContentBase64));
        }

        await _uow.Reports.UpdateAsync(report, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(MapReport(report));
    }

    [HttpDelete("stored/{id:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> DeleteStoredReport(Guid id, CancellationToken ct)
    {
        await _uow.Reports.DeleteAsync(id, ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpGet("schedules")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> GetSchedules(CancellationToken ct)
        => Ok((await _uow.ReportSchedules.GetAllAsync(ct)).OrderBy(s => s.NextRun).Select(MapSchedule));

    [HttpPost("schedules")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> CreateSchedule([FromBody] UpsertReportScheduleRequest req, CancellationToken ct)
    {
        var report = await _uow.Reports.GetByIdAsync(req.ReportId, ct);
        if (report == null)
        {
            return NotFound(new { message = "Report not found." });
        }

        var schedule = ReportSchedule.Create(req.ReportId, req.Frequency, req.NextRun, req.Recipients, req.DeliveryOptions, req.IsActive);
        schedule.SetCreatedBy(_currentUser.UserId ?? "system");
        await _uow.ReportSchedules.AddAsync(schedule, ct);
        await _uow.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetSchedules), new { id = schedule.Id }, MapSchedule(schedule));
    }

    [HttpPut("schedules/{id:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> UpdateSchedule(Guid id, [FromBody] UpsertReportScheduleRequest req, CancellationToken ct)
    {
        var schedule = await _uow.ReportSchedules.GetByIdAsync(id, ct);
        if (schedule == null)
        {
            return NotFound();
        }

        schedule.Update(req.Frequency, req.NextRun, req.Recipients, req.DeliveryOptions, req.IsActive);
        await _uow.ReportSchedules.UpdateAsync(schedule, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(MapSchedule(schedule));
    }

    [HttpDelete("schedules/{id:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> DeleteSchedule(Guid id, CancellationToken ct)
    {
        await _uow.ReportSchedules.DeleteAsync(id, ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }

    private static StoredReportResponse MapReport(Report report)
        => new(
            report.Id,
            report.Name,
            report.ReportType,
            JsonSerializer.Deserialize<Dictionary<string, object>>(report.ParametersJson) ?? new(),
            report.GeneratedDate,
            report.Format,
            report.GeneratedByUserId,
            report.Data.Length);

    private static ReportScheduleResponse MapSchedule(ReportSchedule schedule)
        => new(
            schedule.Id,
            schedule.ReportId,
            schedule.Frequency,
            schedule.NextRun,
            schedule.LastRun,
            JsonSerializer.Deserialize<List<string>>(schedule.RecipientsJson) ?? new(),
            JsonSerializer.Deserialize<Dictionary<string, object>>(schedule.DeliveryOptionsJson) ?? new(),
            schedule.IsActive);

    private static string GetContentType(string format)
        => format.ToLower() switch
        {
            "pdf" => "application/pdf",
            "excel" or "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "csv" => "text/csv",
            "json" => "application/json",
            "txt" => "text/plain",
            _ => "application/octet-stream"
        };
}

public record DepartmentWorkloadRequest(Guid DepartmentId, DateTime StartDate, DateTime EndDate);
public record StoredReportResponse(Guid Id, string Name, string ReportType, Dictionary<string, object> Parameters, DateTime GeneratedDate, string Format, Guid GeneratedByUserId, int SizeBytes);
public record StoredReportDetailResponse(StoredReportResponse Report, List<ReportScheduleResponse> Schedules);
public record ReportScheduleResponse(Guid Id, Guid ReportId, string Frequency, DateTime NextRun, DateTime? LastRun, List<string> Recipients, Dictionary<string, object> DeliveryOptions, bool IsActive);
public record UpsertStoredReportRequest(string Name, string ReportType, Dictionary<string, object> Parameters, string Format, string? ContentBase64);
public record UpsertReportScheduleRequest(Guid ReportId, string Frequency, DateTime NextRun, List<string> Recipients, Dictionary<string, object> DeliveryOptions, bool IsActive);
