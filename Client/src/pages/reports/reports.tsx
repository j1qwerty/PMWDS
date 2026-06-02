import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Department, OrganizationRecord, Project } from "../../types";
import {
  AnimatedBackground,
  LoadingPage,
  useNavHeader,
  OrganizationDepartmentFilter,
  PERMISSION_GROUPS,
  getProjectDepartmentIds,
  projectBelongsToDepartment,
  usePermission,
} from "../shared";
import { ReportFilters } from "./ReportFilters";
import { ReportGenerator } from "./ReportGenerator";
import { RecentExports } from "./RecentExports";

export function ReportsPage() {
  const { auth } = useAuth();
  const perm = usePermission();
  const canViewOrganizations = perm.hasAny(PERMISSION_GROUPS.system.manage, PERMISSION_GROUPS.organization.view);
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [downloads, setDownloads] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ 
    organizationId: "",
    projectId: "", 
    departmentId: "", 
    startDate: "", 
    endDate: "", 
    status: "" 
  });

  const { setNavHeader } = useNavHeader();

  useEffect(() => {
    setNavHeader({ title: "Reports", description: "Generate portfolio, workload, delay, and budget reports" });
  }, [setNavHeader]);

  useEffect(() => {
    if (!auth) return;
    setLoading(true);
    Promise.all([
      api.getProjects(auth.token), 
      api.getDepartments(auth.token),
      canViewOrganizations ? api.getOrganizations(auth.token) : Promise.resolve([]),
    ]).then(([projectData, departmentData, organizationData]) => {
      setProjects(projectData);
      setDepartments(departmentData);
      setOrganizations(organizationData);
      if (projectData[0]) setFilters((current) => ({ ...current, projectId: projectData[0].id }));
      if (departmentData[0]) setFilters((current) => ({ ...current, departmentId: departmentData[0].id }));
    }).finally(() => setLoading(false));
  }, [auth, canViewOrganizations]);

  const visibleDepartments = useMemo(() => {
    return filters.organizationId
      ? departments.filter((department) => department.organizationId === filters.organizationId)
      : departments;
  }, [departments, filters.organizationId]);

  const visibleProjects = useMemo(() => {
    if (filters.departmentId) {
      return projects.filter((project) => projectBelongsToDepartment(project, filters.departmentId));
    }

    if (filters.organizationId) {
      const departmentIds = new Set(visibleDepartments.map((department) => department.id));
      return projects.filter((project) => getProjectDepartmentIds(project).some((departmentId) => departmentIds.has(departmentId)));
    }

    return projects;
  }, [filters.departmentId, filters.organizationId, projects, visibleDepartments]);

  useEffect(() => {
    if (filters.departmentId && !visibleDepartments.some((department) => department.id === filters.departmentId)) {
      setFilters((current) => ({ ...current, departmentId: "", projectId: "" }));
      return;
    }

    if (filters.projectId && !visibleProjects.some((project) => project.id === filters.projectId)) {
      setFilters((current) => ({ ...current, projectId: "" }));
    }
  }, [filters.departmentId, filters.projectId, visibleDepartments, visibleProjects]);

  const reportFilterPayload = () => ({
    projectId: filters.projectId || null,
    departmentId: filters.departmentId || null,
    startDate: filters.startDate || null,
    endDate: filters.endDate || null,
    status: filters.status || null,
  });

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
        body: reportFilterPayload()
      })
    );
  };

  const downloadDepartmentWorkload = () => {
    if (!auth) return;
    if (!filters.departmentId) {
      setMessage("Select a department before downloading the department workload report.");
      return;
    }
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
        body: reportFilterPayload()
      })
    );
  };

  if (loading) return <LoadingPage label="Loading reports..." />;

  return (
    <div>
      <AnimatedBackground />



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
          <OrganizationDepartmentFilter
            organizations={organizations}
            departments={departments}
            users={[]}
            selectedOrganizationId={filters.organizationId}
            selectedDepartmentId={filters.departmentId}
            onOrganizationChange={(organizationId) => setFilters((current) => ({
              ...current,
              organizationId,
              departmentId: "",
              projectId: "",
            }))}
            onDepartmentChange={(departmentId) => setFilters((current) => ({
              ...current,
              departmentId,
              projectId: "",
            }))}
          />
          <ReportFilters
            filters={filters}
            projects={visibleProjects}
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
