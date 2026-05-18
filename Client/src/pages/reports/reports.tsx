import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Department, Project } from "../../types";
import { 
  AnimatedBackground, 
  GlassCard, 
  LoadingPage,
  PageHeader,
} from "../shared";
import { ReportFilters } from "./ReportFilters";
import { ReportGenerator } from "./ReportGenerator";
import { RecentExports } from "./RecentExports";

export function ReportsPage() {
  const { auth } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [downloads, setDownloads] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ 
    projectId: "", 
    departmentId: "", 
    startDate: "", 
    endDate: "", 
    status: "" 
  });

  useEffect(() => {
    if (!auth) return;
    setLoading(true);
    Promise.all([
      api.getProjects(auth.token), 
      api.getDepartments(auth.token)
    ]).then(([projectData, departmentData]) => {
      setProjects(projectData);
      setDepartments(departmentData);
      if (projectData[0]) setFilters((current) => ({ ...current, projectId: projectData[0].id }));
      if (departmentData[0]) setFilters((current) => ({ ...current, departmentId: departmentData[0].id }));
    }).finally(() => setLoading(false));
  }, [auth]);

  const handleDownload = async (label: string, action: () => Promise<Blob>) => {
    try {
      const blob = await action();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${label}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      setDownloads((current) => [label, ...current].slice(0, 5));
      setMessage(`${label} report downloaded successfully.`);
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : "Download failed"}`);
    }
  };

  const downloadProjectStatus = () => {
    if (!auth || !filters.projectId) return;
    handleDownload("project-status", () => 
      api.downloadReport(auth.token, `reports/project-status/${filters.projectId}`)
    );
  };

  const downloadBudgetVariance = () => {
    if (!auth || !filters.projectId) return;
    handleDownload("budget-variance", () => 
      api.downloadReport(auth.token, `reports/budget-variance/${filters.projectId}`)
    );
  };

  const downloadTaskCompletion = () => {
    if (!auth) return;
    handleDownload("task-completion", () => 
      api.downloadReport(auth.token, "reports/task-completion", { 
        method: "POST", 
        body: filters 
      })
    );
  };

  const downloadDepartmentWorkload = () => {
    if (!auth) return;
    handleDownload("department-workload", () => 
      api.downloadReport(auth.token, "reports/department-workload", { 
        method: "POST", 
        body: { 
          departmentId: filters.departmentId, 
          startDate: filters.startDate || new Date().toISOString(), 
          endDate: filters.endDate || new Date().toISOString() 
        } 
      })
    );
  };

  const downloadDelayAnalysis = () => {
    if (!auth) return;
    handleDownload("delay-analysis", () => 
      api.downloadReport(auth.token, "reports/delay-analysis", { 
        method: "POST", 
        body: filters 
      })
    );
  };

  if (loading) return <LoadingPage label="Loading reports..." />;

  return (
    <div className="min-h-screen p-7 relative font-sans">
      <AnimatedBackground />

      {/* Page Header */}
      <div className="relative z-10">
        <PageHeader
          title="Reports"
          description="Generate portfolio, workload, delay, and budget reports"
        />
      </div>

      {/* Message */}
      {message && (
        <div className="relative z-10 mb-5 bg-emerald-50 border border-emerald-200 rounded-xl py-3.5 px-5 text-emerald-700 text-sm flex items-center gap-2.5 animate-[slideIn_0.3s_ease]">
          <span className="material-symbols-outlined">check_circle</span>
          {message}
          <button
            className="ml-auto bg-transparent border-none cursor-pointer text-emerald-500 hover:text-emerald-700"
            onClick={() => setMessage("")}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left: Filters & Report Generation */}
        <div className="flex flex-col gap-6">
          {/* Filters */}
          <ReportFilters
            filters={filters}
            projects={projects}
            departments={departments}
            onFilterChange={setFilters}
          />

          {/* Report Generator */}
          <ReportGenerator
            filters={filters}
            onDownloadProjectStatus={downloadProjectStatus}
            onDownloadBudgetVariance={downloadBudgetVariance}
            onDownloadTaskCompletion={downloadTaskCompletion}
            onDownloadDepartmentWorkload={downloadDepartmentWorkload}
            onDownloadDelayAnalysis={downloadDelayAnalysis}
          />
        </div>

        {/* Right: Recent Exports */}
        <div className="lg:sticky lg:top-7 h-fit">
          <RecentExports downloads={downloads} />
        </div>
      </div>
    </div>
  );
}
