

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PMWDS.Application.DTOs.Reports;
using PMWDS.Application.Interfaces.Services;
namespace PMWDS.API.Controllers;

public class ReportsController : BaseApiController
{
    private readonly IReportService _reports;
    public ReportsController(IReportService reports)
    => _reports = reports;
    /// <summary>Generate project status report</summary>
    [HttpGet("project-status/{projectId:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> ProjectStatus(
    Guid projectId,
    [FromQuery] string format = "pdf",
    CancellationToken ct = default)
    {
        var bytes = await _reports
        .GenerateProjectStatusReportAsync(
        projectId, format, ct);
        return File(bytes, GetContentType(format),
        $"project-status.{format}");
    }
    /// <summary>Generate task completion report</summary>
    [HttpPost("task-completion")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> TaskCompletion(
    [FromBody] ReportFilterDto filter,
    [FromQuery] string format = "pdf",
    CancellationToken ct = default)
    {
        var bytes = await _reports
        .GenerateTaskCompletionReportAsync(
        filter, format, ct);
        return File(bytes, GetContentType(format),
        $"task-completion.{format}");
    }
    /// <summary>Generate department workload report</summary>
    [HttpPost("department-workload")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> DepartmentWorkload(
    [FromBody] DepartmentWorkloadRequest req,
    [FromQuery] string format = "pdf",
    CancellationToken ct = default)
    {
        var bytes = await _reports
        .GenerateDepartmentWorkloadReportAsync(
        req.DepartmentId,
        new DateRange(req.StartDate, req.EndDate),
        format, ct);
        return File(bytes, GetContentType(format),
        $"department-workload.{format}");
    }
    /// <summary>Generate budget variance report</summary>
    [HttpGet("budget-variance/{projectId:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> BudgetVariance(
    Guid projectId,
    [FromQuery] string format = "pdf",
    CancellationToken ct = default)
    {
        var bytes = await _reports
        .GenerateBudgetVarianceReportAsync(
        projectId, format, ct);
        return File(bytes, GetContentType(format),
        $"budget-variance.{format}");
    }
    /// <summary>Generate delay analysis report</summary>
    [HttpPost("delay-analysis")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> DelayAnalysis(
    [FromBody] ReportFilterDto filter,
    [FromQuery] string format = "pdf",
    CancellationToken ct = default)
    {
        var bytes = await _reports
        .GenerateDelayAnalysisReportAsync(
        filter, format, ct);
        return File(bytes, GetContentType(format),
        $"delay-analysis.{format}");
    }


  <summary>Generate resource utilization report</summary>
 [HttpPost("resource-utilization")]
 [Authorize(Policy = "Manager")]
 public async Task<IActionResult> ResourceUtilization(
 [FromBody] DepartmentWorkloadRequest req,
 [FromQuery] string format = "pdf",
 CancellationToken ct = default)
    {
        var bytes = await _reports
        .GenerateResourceUtilizationReportAsync(
        req.DepartmentId,
        new DateRange(req.StartDate, req.EndDate),
        format, ct);
        return File(bytes, GetContentType(format),
        $"resource-utilization.{format}");
    }
    /// <summary>Generate AI insights report</summary>
    [HttpGet("ai-insights/{projectId:guid}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> AIInsights(
    Guid projectId,
    [FromQuery] string format = "pdf",
    CancellationToken ct = default)
    {
        var bytes = await _reports
        .GenerateAIInsightsReportAsync(
        projectId, format, ct);
        return File(bytes, GetContentType(format),
        $"ai-insights.{format}");
    }
    private static string GetContentType(string format)
    => format.ToLower() switch
    {
        "pdf" => "application/pdf",
        "excel" or "xlsx" =>
     "application/vnd.openxmlformats-" +
     "officedocument.spreadsheetml.sheet",
        "csv" => "text/csv",
        _ => "application/octet-stream"
    };
}
public record DepartmentWorkloadRequest(
 Guid DepartmentId,
 DateTime StartDate,
 DateTime EndDate);