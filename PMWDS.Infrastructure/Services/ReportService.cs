using PMWDS.Application.DTOs.Reports;
using PMWDS.Application.Interfaces.Services;
namespace PMWDS.Infrastructure.Services;
public class ReportService : IReportService
{
 public Task<byte[]> GenerateProjectStatusReportAsync(
 Guid projectId, string format = "pdf",
 CancellationToken ct = default)
 => Task.FromResult(Array.Empty<byte>());
 public Task<byte[]> GenerateTaskCompletionReportAsync(
 ReportFilterDto filter, string format = "pdf",
 CancellationToken ct = default)
 => Task.FromResult(Array.Empty<byte>());
 public Task<byte[]> GenerateDepartmentWorkloadReportAsync(
 Guid departmentId, DateRange dateRange,
 string format = "pdf",
 CancellationToken ct = default)
 => Task.FromResult(Array.Empty<byte>());
 public Task<byte[]> GenerateBudgetVarianceReportAsync(
 Guid projectId, string format = "pdf",
 CancellationToken ct = default)
 => Task.FromResult(Array.Empty<byte>());
 public Task<byte[]> GenerateDelayAnalysisReportAsync(
 ReportFilterDto filter, string format = "pdf",
 CancellationToken ct = default)
 => Task.FromResult(Array.Empty<byte>());
 public Task<byte[]> GenerateCustomReportAsync(
 CustomReportDto config,
 CancellationToken ct = default)
 => Task.FromResult(Array.Empty<byte>());
}
