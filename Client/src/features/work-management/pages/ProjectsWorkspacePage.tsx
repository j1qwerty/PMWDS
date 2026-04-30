import { useMemo, useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { ErrorPanel, formatMoney, formatPercent, LoadingPanel, Notice, Panel, primaryButtonClass } from "../../../ui";
import type { Milestone, Project } from "../../../types";
import { MilestoneFormDialog } from "../components/MilestoneFormDialog";
import { MilestoneList } from "../components/MilestoneList";
import { ProjectDetail } from "../components/ProjectDetail";
import { ProjectFilters } from "../components/ProjectFilters";
import { ProjectFormDialog } from "../components/ProjectFormDialog";
import { ProjectList } from "../components/ProjectList";
import { createMilestoneForm } from "../forms";
import { useProjectWorkspace } from "../hooks/useProjectWorkspace";
import { filterProjects } from "../utils";

export function ProjectsWorkspacePage() {
  const { auth } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [filters, setFilters] = useState({ search: "", status: "", departmentId: "" });
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [confirmProject, setConfirmProject] = useState<Project | null>(null);
  const [confirmMilestone, setConfirmMilestone] = useState<Milestone | null>(null);
  const [message, setMessage] = useState("");
  const { projects, departments, users, milestones, loading, error } = useProjectWorkspace(auth?.token, selectedProjectId, refreshKey);

  const selectedProject = useMemo(() => projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null, [projects, selectedProjectId]);
  const visibleProjects = useMemo(() => filterProjects(projects, filters.search, filters.status, filters.departmentId), [projects, filters]);

  const refresh = () => setRefreshKey((value) => value + 1);
  const activeProjects = projects.filter((project) => project.status === "InProgress").length;
  const delayedProjects = projects.filter((project) => project.status === "Delayed").length;
  const totalBudget = projects.reduce((total, project) => total + (project.plannedBudget ?? 0), 0);
  const averageHealth = projects.length ? projects.reduce((total, project) => total + (project.aiHealthScore ?? 0), 0) / projects.length : 0;

  const handleProjectStatus = (status: string) => {
    if (!auth || !selectedProject) return;
    void api.updateProjectStatus(auth.token, selectedProject.id, status).then(() => { setMessage("Project status updated."); refresh(); });
  };

  const handleProjectSubmit = (form: Record<string, unknown>) => {
    if (!auth) return;
    const action = editingProject?.id ? api.updateProject(auth.token, editingProject.id, form) : api.createProject(auth.token, form);
    void action.then(() => { setMessage(editingProject?.id ? "Project updated." : "Project created."); setEditingProject(null); refresh(); });
  };

  const handleMilestoneSubmit = (form: Record<string, unknown>) => {
    if (!auth) return;
    const action = editingMilestone?.id ? api.updateMilestone(auth.token, editingMilestone.id, form) : api.createMilestone(auth.token, form);
    void action.then(() => { setMessage(editingMilestone?.id ? "Milestone updated." : "Milestone created."); setEditingMilestone(null); refresh(); });
  };

  if (loading) return <LoadingPanel label="Loading project workspace..." />;
  if (error) return <ErrorPanel message={error} />;

  return (
    <div className="grid grid-cols-12 gap-4 content-start">
      {message ? <Notice>{message}</Notice> : null}
      <section className="col-span-12 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-[#111827] to-[#0b1120] p-6 shadow-2xl shadow-black/25">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-[0.68rem] font-semibold tracking-[0.24em] text-sky-300 uppercase">Portfolio Command</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Project Portfolio</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Track active initiatives, milestone checkpoints, delivery risk, and budget signals from one operational workspace.</p>
          </div>
          <button className={primaryButtonClass} onClick={() => setEditingProject({} as Project)}>Create Project</button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-white/8 bg-white/[0.04] p-4"><span className="text-xs text-slate-400">Projects</span><strong className="mt-1 block text-2xl text-white">{projects.length}</strong></div>
          <div className="rounded-xl border border-white/8 bg-white/[0.04] p-4"><span className="text-xs text-slate-400">In Progress</span><strong className="mt-1 block text-2xl text-sky-200">{activeProjects}</strong></div>
          <div className="rounded-xl border border-white/8 bg-white/[0.04] p-4"><span className="text-xs text-slate-400">Delayed</span><strong className="mt-1 block text-2xl text-rose-200">{delayedProjects}</strong></div>
          <div className="rounded-xl border border-white/8 bg-white/[0.04] p-4"><span className="text-xs text-slate-400">Budget / Health</span><strong className="mt-1 block text-lg text-white">{formatMoney(totalBudget)} / {formatPercent(averageHealth)}</strong></div>
        </div>
      </section>
      <Panel title="Projects" subtitle="Portfolio overview, project controls, and milestone management">
        <ProjectFilters search={filters.search} status={filters.status} departmentId={filters.departmentId} departments={departments} onChange={setFilters} />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <ProjectList projects={visibleProjects} selectedId={selectedProject?.id ?? ""} onSelect={setSelectedProjectId} />
          <ProjectDetail project={selectedProject} onStatusChange={handleProjectStatus} onEdit={() => setEditingProject(selectedProject)} onDelete={() => setConfirmProject(selectedProject)} />
        </div>
      </Panel>
      <Panel title="Milestones" subtitle="Manage milestones for the selected project">
        <MilestoneList milestones={milestones} onEdit={setEditingMilestone} onComplete={(milestoneId) => auth && void api.completeMilestone(auth.token, milestoneId).then(() => { setMessage("Milestone marked complete."); refresh(); })} onDelete={setConfirmMilestone} />
        <div className="mt-4 flex flex-wrap gap-2"><button className={primaryButtonClass} onClick={() => setEditingMilestone({ ...createMilestoneForm(selectedProject?.id ?? ""), id: "" } as unknown as Milestone)}>Create Milestone</button></div>
      </Panel>
      <ProjectFormDialog open={editingProject !== null} project={editingProject?.id ? editingProject : undefined} departments={departments} users={users} onClose={() => setEditingProject(null)} onSubmit={handleProjectSubmit} />
      <MilestoneFormDialog open={editingMilestone !== null} projects={projects} selectedProjectId={selectedProject?.id ?? ""} milestone={editingMilestone?.id ? editingMilestone : undefined} onClose={() => setEditingMilestone(null)} onSubmit={handleMilestoneSubmit} />
      <ConfirmDialog title="Delete Project" message={`Delete ${confirmProject?.name}?`} open={confirmProject !== null} onClose={() => setConfirmProject(null)} onConfirm={() => auth && confirmProject ? api.deleteProject(auth.token, confirmProject.id).then(() => { setMessage("Project deleted."); setConfirmProject(null); refresh(); }) : undefined} confirmLabel="Delete" />
      <ConfirmDialog title="Delete Milestone" message={`Delete ${confirmMilestone?.name}?`} open={confirmMilestone !== null} onClose={() => setConfirmMilestone(null)} onConfirm={() => auth && confirmMilestone ? api.deleteMilestone(auth.token, confirmMilestone.id).then(() => { setMessage("Milestone deleted."); setConfirmMilestone(null); refresh(); }) : undefined} confirmLabel="Delete" />
    </div>
  );
}
