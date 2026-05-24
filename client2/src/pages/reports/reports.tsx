import { api } from "../../shared/api";
import { ResourcePage } from "../../shared/resourcePage";
import type { StoredReport } from "../../shared/types";

const demo: StoredReport[] = [
  { id: "r-1", name: "Weekly Project Health", reportType: "ProjectHealth", generatedDate: "2026-05-24T08:00:00Z", format: "pdf", sizeBytes: 128000 },
  { id: "r-2", name: "Workload Summary", reportType: "Workload", generatedDate: "2026-05-23T08:00:00Z", format: "xlsx", sizeBytes: 94000 },
];

export function ReportsPage() {
  return (
    <ResourcePage
      config={{
        eyebrow: "Reports",
        title: "Reports",
        description: "Stored reports and report metadata from the Reports API.",
        load: api.getStoredReports,
        create: api.createStoredReport,
        demo,
        searchKeys: ["name", "reportType", "format"],
        columns: [
          { key: "name", label: "Report" },
          { key: "reportType", label: "Type" },
          { key: "format", label: "Format" },
          { key: "generatedDate", label: "Generated" },
        ],
        form: [
          { key: "name", label: "Name", required: true },
          { key: "reportType", label: "Report type", type: "select", options: ["ProjectHealth", "Workload", "Milestone", "Task", "Financial"] },
          { key: "format", label: "Format", type: "select", options: ["pdf", "xlsx", "csv"] },
          { key: "parameters", label: "Parameters JSON", type: "textarea" },
        ],
      }}
    />
  );
}
