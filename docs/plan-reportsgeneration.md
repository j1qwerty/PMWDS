Now I have a complete understanding of the entire codebase. Here is the comprehensive plan.

---

## Complete Plan: AI-Powered Report Generation with Inline UI Viewing

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ReportsPage (UI)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ ReportFilters │  │ ReportViewer │  │ GeneratedReports │  │
│  │   (stays)     │  │   (NEW)      │  │   (NEW)          │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ POST /api/v1/reports/{type}/generate
                       ▼
┌─────────────────────────────────────────────────────────────┐
│        ReportsController (new JSON endpoints)                │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│   ReportService (rewrite — no more empty byte arrays)        │
│                                                              │
│   1. Collect DB data (via IUnitOfWork)                        │
│   2. Build structured prompt per report type                  │
│   3. Call IAIService.GenerateStructuredReportAsync()          │
│   4. Parse JSON → AiReportResponse                            │
│   5. Store as Report entity + PDF (QuestPDF)                  │
│   6. Return AiReportResponse to caller                        │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│   IAIService → AIService → IChatEngine (OpenAI/OpenRouter)  │
│   NEW method: GenerateStructuredReportAsync(systemPrompt,   │
│                userContext) → returns JSON string             │
└─────────────────────────────────────────────────────────────┘
```

### Step 1 — New DTOs in `PMWDS.Application/DTOs/Reports/`

Create `AiReportResponse.cs` with the structured report schema that LLM JSON output maps to:

```csharp
public record AiReportResponse(
    Guid Id,
    string ReportType,
    string Title,
    string Summary,
    List<ReportMetric> Metrics,
    List<ReportTable> Tables,
    List<ReportSection> Sections,
    List<string> Insights,
    List<string> Recommendations,
    DateTime GeneratedAt
);

public record ReportMetric(string Label, string Value, string Trend, string Icon, string Color);
public record ReportTable(string Title, List<string> Columns, List<List<string>> Rows);
public record ReportSection(string Title, string Content, string Type);
```

Also create `ReportGenerateRequest.cs` for request body:

```csharp
public record ReportGenerateRequest(
    Guid? ProjectId,
    Guid? DepartmentId,
    DateTime? StartDate,
    DateTime? EndDate,
    string? Status
);
```

### Step 2 — Add Method to `IAIService` / `AIService`

Add one clean method to the existing `IAIService` interface at `PMWDS.Application/Interfaces/Services/IAIService.cs`:

```csharp
Task<string> GenerateStructuredReportAsync(
    string systemPrompt,
    string userContext,
    CancellationToken ct = default);
```

Implement in `AIService` at `PMWDS.AI/Services/AIService.Analysis.cs`:

```csharp
public async Task<string> GenerateStructuredReportAsync(
    string systemPrompt,
    string userContext,
    CancellationToken ct = default)
{
    // Calls IChatEngine.CompleteChatAsync directly (or reuses ProcessAsync)
    // Sends system + user messages, returns raw response
    // No session management — one-shot call
}
```

### Step 3 — Rewrite `IReportService` and `ReportService`

**New interface** at `PMWDS.Application/Interfaces/Services/IReportService.cs`:

```csharp
public interface IReportService
{
    // NEW: JSON generation endpoints returning structured data
    Task<AiReportResponse> GenerateProjectStatusReportAsync(Guid projectId, CancellationToken ct = default);
    Task<AiReportResponse> GenerateBudgetVarianceReportAsync(Guid projectId, CancellationToken ct = default);
    Task<AiReportResponse> GenerateTaskCompletionReportAsync(ReportGenerateRequest filters, CancellationToken ct = default);
    Task<AiReportResponse> GenerateDepartmentWorkloadReportAsync(Guid departmentId, DateRange dateRange, CancellationToken ct = default);
    Task<AiReportResponse> GenerateDelayAnalysisReportAsync(ReportGenerateRequest filters, CancellationToken ct = default);

    // KEPT: Binary download endpoints (now powered by QuestPDF)
    Task<byte[]> DownloadProjectStatusReportAsync(Guid projectId, string format, CancellationToken ct = default);
    Task<byte[]> DownloadTaskCompletionReportAsync(ReportFilterDto filter, string format, CancellationToken ct = default);
    // ... etc for all 5 types
}
```

**Implementation** at `PMWDS.Infrastructure/Services/ReportService.cs` — inject `IAIService`, `IUnitOfWork`, and new PDF renderer.

Each `Generate*` method:
1. Fetches relevant DB data via `IUnitOfWork`
2. Builds a type-specific prompt with JSON schema instructions
3. Calls `IAIService.GenerateStructuredReportAsync(prompt, contextData)`
4. Parses response string into `AiReportResponse`
5. Stores a `Report` entity (Data = JSON bytes)
6. Returns the `AiReportResponse`

Each `Download*` method:
1. Calls the corresponding `Generate*` method
2. Uses **QuestPDF** to render the `AiReportResponse` into a professional PDF
3. Returns the byte array

### Step 4 — New Controller Endpoints

Add to `PMWDS.API/Controllers/ReportsController.cs`:

| HTTP | Route | Returns | Description |
|------|-------|---------|-------------|
| POST | `project-status/{projectId}/generate` | `AiReportResponse` JSON | Generate & view |
| POST | `budget-variance/{projectId}/generate` | `AiReportResponse` JSON | Generate & view |
| POST | `task-completion/generate` | `AiReportResponse` JSON | Generate & view |
| POST | `department-workload/generate` | `AiReportResponse` JSON | Generate & view |
| POST | `delay-analysis/generate` | `AiReportResponse` JSON | Generate & view |

Existing download endpoints stay as-is (now backed by real PDF generation).

### Step 5 — NuGet Packages to Add

**QuestPDF** (MIT, 14k+ stars, pure .NET):
```
dotnet add PMWDS.Infrastructure package QuestPDF --version 2025.7.0
```
- Fluent API, no external dependencies, no Chrome/wkhtmltopdf
- Supports tables, headers, images, sections — perfect for report PDFs
- **Preferred over** PuppeteerSharp (needs Chrome binary) and DinkToPDF (needs wkhtmltopdf)

**ClosedXML** (MIT, 5k+ stars):
```
dotnet add PMWDS.Infrastructure package ClosedXML
```
- Clean Excel export from the same `AiReportResponse` data
- No Office interop needed

### Step 6 — npm Packages to Add

**Recharts** (MIT, 63k+ stars, React-native):
```bash
npm install recharts
```
- Composable declarative API: `<BarChart><Bar><XAxis>`
- Built-in responsive container
- Great TypeScript support
- **Preferred over** Chart.js (needs react-chartjs-2 wrapper, imperative API) and Nivo (larger bundle, less popular)

### Step 7 — Frontend: New Types in `types.ts`

```typescript
export interface AiReportResponse {
  id: string;
  reportType: string;
  title: string;
  summary: string;
  metrics: ReportMetric[];
  tables: ReportTable[];
  sections: ReportSection[];
  insights: string[];
  recommendations: string[];
  generatedAt: string;
}

export interface ReportMetric {
  label: string;
  value: string;
  trend: string;
  icon: string;
  color: string;
}

export interface ReportTable {
  title: string;
  columns: string[];
  rows: string[][];
}

export interface ReportSection {
  title: string;
  content: string;
  type: string;
}
```

### Step 8 — Frontend: New API Methods in `api.ts`

```typescript
generateReport(token: string, reportType: string, body: Record<string, unknown>) {
  return request<AiReportResponse>(`reports/${reportType}/generate`, {
    token,
    method: "POST",
    body,
  });
},
```

### Step 9 — Frontend: `ReportViewer.tsx` (NEW Component)

Create `Client/src/pages/reports/ReportViewer.tsx`:

- **Summary banner** — key metrics as colored cards (4 per row, using existing `GlassCard` pattern)
- **Charts section** — Recharts bar charts for metrics, trend data
- **Data tables** — styled with Tailwind, alternating row colors, sortable
- **Insights panel** — AI-generated bullet points with icons
- **Recommendations panel** — numbered list with severity badges
- **Download buttons** — "Download PDF" / "Download Excel" in header
- **Full-screen modal** or **inline panel** below the report generators

### Step 10 — Frontend: `GeneratedReports.tsx` (NEW, replaces `RecentExports.tsx`)

Create `Client/src/pages/reports/GeneratedReports.tsx`:

- Lists previously generated reports from `getStoredReports()` API
- Each item shows: name, type, generation date, size
- Actions: "View" (opens ReportViewer), "Download PDF", "Delete"
- Empty state with guidance

### Step 11 — Frontend: Rewire `reports.tsx`

- Replace "Download PDF" button text with **"Generate & View"** in `ReportGenerator.tsx`
- On click: calls `generateReport()` API, shows loading spinner
- On success: opens `ReportViewer` with the `AiReportResponse` data
- Replace `RecentExports` with `GeneratedReports` component in right sidebar
- Keep `ReportFilters` and `OrganizationDepartmentFilter` unchanged

### Step 12 — Prompt Engineering for Each Report Type

| Report Type | System Prompt | Data to Collect |
|---|---|---|
| **Project Status** | "You are a project status analyst. Analyze the following project data and return a structured JSON report with metrics, sections, insights, and recommendations." | Project fields, task stats (completed/overdue/in-progress), milestone progress, budget, AI health score, delay risk |
| **Budget Variance** | "You are a budget analyst. Analyze spending data and return a variance report as structured JSON." | Planned budget, actual cost, task-level costs, budget variance, cost breakdown |
| **Task Completion** | "You are a task productivity analyst. Analyze completion data and return a structured JSON report." | Task counts by status, completion rate, avg completion time, assignee stats |
| **Department Workload** | "You are a workforce analyst. Analyze workload data and return a structured JSON report." | Department users, task assignments per user, workload scores, capacity, burnout risk |
| **Delay Analysis** | "You are a delay/risk analyst. Analyze delay data and return a structured JSON report." | Overdue tasks, delay predictions, risk scores, dependency chains |

### Data Collection Per Type

```
Project Status:
  - _uow.Projects.GetWithDetailsAsync(projectId) → project + tasks + milestones
  - project.ProgressPercentage, project.AIHealthScore, project.AIDelayRiskScore
  - task counts: completed, overdue, in-progress, not-started
  - milestone stats

Budget Variance:
  - _uow.Projects.GetWithDetailsAsync(projectId) → project
  - project.PlannedBudget, project.ActualCost, project.BudgetVariance
  - task-level actual hours vs estimated hours

Task Completion:
  - _uow.Tasks.FindAsync(t => filter conditions)
  - group by status, calculate rates
  - group by assignee if available

Department Workload:
  - _uow.Users.GetByDepartmentWithSkillsAsync(departmentId)
  - for each user: workload score, burnout risk, active task count
  - department capacity stats

Delay Analysis:
  - _uow.Tasks.GetOverdueTasksAsync() (filtered by projectId if given)
  - _uow.Tasks.GetHighRiskTasksAsync()
  - _uow.Tasks.FindAsync(t => t.IsOverdue) with project filter
```

### Implementation Order

| Phase | Tasks | Files |
|---|---|---|
| **Phase 1** | DTOs + IAIService method + backend prompt builders | `AiReportResponse.cs`, `ReportGenerateRequest.cs`, `IAIService.cs`, `AIService.Analysis.cs` |
| **Phase 2** | Rewrite ReportService — data collection + AI calls | `IReportService.cs`, `ReportService.cs` |
| **Phase 3** | NuGet packages + PDF/Excel renderers | `PMWDS.Infrastructure.csproj`, `ReportPdfRenderer.cs`, `ReportExcelRenderer.cs` |
| **Phase 4** | New controller JSON endpoints | `ReportsController.cs` |
| **Phase 5** | Frontend types + API methods + ReportViewer | `types.ts`, `api.ts`, `ReportViewer.tsx`, `GeneratedReports.tsx` |
| **Phase 6** | Wire up reports page, replace RecentExports | `reports.tsx`, `ReportGenerator.tsx` |

### Risks & Mitigations

| Risk | Mitigation |
|---|---|
| LLM returns malformed JSON | Include exact JSON schema in system prompt with `response_format: { type: "json_object" }`; validate with `try/catch`; fall back to partial data + user-visible error |
| LLM is slow (3-10s) | Show skeleton loading state; add timeout of 60s; consider caching per project+type |
| AI not configured | Check `IAIService.IsConfigured()` first; return actionable error "Configure AI in Settings" |
| Too many tasks to send | Send aggregates (counts, averages, top 5 risky) not raw data |
| AI cost | Only generate on explicit "Generate & View" click (no auto-generation); cache results; store in DB |

### What Stays the Same

- `Report` and `ReportSchedule` entities — no migration needed
- `ReportFilters.tsx` — unchanged
- `OrganizationDepartmentFilter` — unchanged
- Authorization/policy — unchanged
- Route `/reports` — unchanged
- Existing download endpoints — still work (now backed by real PDF generation)
- DI registration pattern — no new registrations needed (IAIService already registered)

---

This plan covers all aspects: backend DTOs, AI integration, service layer, controller, frontend components, library choices, and implementation phases. 