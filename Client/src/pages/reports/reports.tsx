import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Department, Project } from "../../types";
import {
  Panel,
} from "../../ui";

export function ReportsPage() {
  const { auth } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [downloads, setDownloads] = useState<string[]>([]);
  const [filters, setFilters] = useState({ projectId: "", departmentId: "", startDate: "", endDate: "", status: "" });

  useEffect(() => {
    if (!auth) return;
    Promise.all([api.getProjects(auth.token), api.getDepartments(auth.token)]).then(([projectData, departmentData]) => {
      setProjects(projectData);
      setDepartments(departmentData);
      if (projectData[0]) setFilters((current) => ({ ...current, projectId: current.projectId || projectData[0].id }));
      if (departmentData[0]) setFilters((current) => ({ ...current, departmentId: current.departmentId || departmentData[0].id }));
    });
  }, [auth]);

  async function download(label: string, action: () => Promise<Blob>) {
    const blob = await action();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${label}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
    setDownloads((current) => [label, ...current].slice(0, 5));
  }

  return (
    <div className="grid  gap-4 content-start">
      <Panel title="Report Studio" subtitle="Generate portfolio, workload, delay, and budget outputs">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label><span>Project</span><select value={filters.projectId} onChange={(event) => setFilters({ ...filters, projectId: event.target.value })}>{projects.map((project) => (<option key={project.id} value={project.id}>{project.name}</option>))}</select></label>
          <label><span>Department</span><select value={filters.departmentId} onChange={(event) => setFilters({ ...filters, departmentId: event.target.value })}>{departments.map((department) => (<option key={department.id} value={department.id}>{department.name}</option>))}</select></label>
          <label><span>Start Date</span><input type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} /></label>
          <label><span>End Date</span><input type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} /></label>
          <label><span>Status</span><input value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} /></label>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => auth && void download("project-status", () => api.downloadReport(auth.token, `reports/project-status/${filters.projectId}`))}>Project Status</button>
          <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => auth && void download("budget-variance", () => api.downloadReport(auth.token, `reports/budget-variance/${filters.projectId}`))}>Budget Variance</button>
          <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => auth && void download("task-completion", () => api.downloadReport(auth.token, "reports/task-completion", { method: "POST", body: filters }))}>Task Completion</button>
          <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => auth && void download("department-workload", () => api.downloadReport(auth.token, "reports/department-workload", { method: "POST", body: { departmentId: filters.departmentId, startDate: filters.startDate || new Date().toISOString(), endDate: filters.endDate || new Date().toISOString() } }))}>Department Workload</button>
          <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => auth && void download("delay-analysis", () => api.downloadReport(auth.token, "reports/delay-analysis", { method: "POST", body: filters }))}>Delay Analysis</button>
        </div>
      </Panel>

      <Panel title="Recent Exports" subtitle="The last report actions from this browser session">
        <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
          {downloads.map((item) => (
            <div className="rounded-md border border-[var(--pmwds-border)] bg-white/[0.035] px-4 py-3 text-left transition hover:border-sky-300/50 hover:bg-white/[0.06]" key={item}>
              <strong>{item}</strong>
              <span>Downloaded</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}