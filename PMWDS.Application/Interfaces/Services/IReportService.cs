using PMWDS.Application.DTOs.Reports;
namespace PMWDS.Application.Interfaces.Services;

public interface IReportService
{
    Task<byte[]> GenerateProjectStatusReportAsync(
        Guid projectId, string format = "pdf",
    CancellationToken ct = default);
    Task<byte[]> GenerateTaskCompletionReportAsync(
    ReportFilterDto filter, string format = "pdf",
    CancellationToken ct = default);
    Task<byte[]> GenerateDepartmentWorkloadReportAsync(
    Guid departmentId, DateRange dateRange,
    string format = "pdf",
    CancellationToken ct = default);
    Task<byte[]> GenerateBudgetVarianceReportAsync(
    Guid projectId, string format = "pdf",
    CancellationToken ct = default);
    Task<byte[]> GenerateDelayAnalysisReportAsync(
    ReportFilterDto filter, string format = "pdf",
    CancellationToken ct = default);
    Task<byte[]> GenerateCustomReportAsync(
    CustomReportDto config,
    CancellationToken ct = default);
}
