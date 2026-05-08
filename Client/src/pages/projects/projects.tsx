import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Department, Milestone, Project, ProjectHealth, User } from "../../types";
import {
  EmptyState,
  MetricRow,
  MetricTile,
  Panel,
  SimpleProjectCards,
  classNames,
  formatMoney,
  formatPercent,
  ghostButtonClass,
} from "../../ui";
import { projectStatuses, priorities } from "../constants";

export function ProjectsPage() {
  const { auth, hasRole } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [_milestones, setMilestones] = useState<Milestone[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [health, setHealth] = useState<ProjectHealth | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [_message, setMessage] = useState("");
  const [form, setForm] = useState({
    projectCode: "",
    name: "",
    description: "",
    category: "Monitoring",
    plannedStartDate: "",
    plannedEndDate: "",
    plannedBudget: 25000,
    departmentId: "",
    projectManagerId: "",
    priority: "Medium",
  });
  const [milestoneForm, setMilestoneForm] = useState({
    name: "",
    description: "",
    dueDate: "",
    order: 1,
    isCritical: false,
  });

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;

  async function loadProjects() {
    if (!auth) return;
    const [projectData, departmentData, userData] = await Promise.all([
      api.getProjects(auth.token),
      api.getDepartments(auth.token),
      hasRole("SuperAdmin", "ProjectManager", "DepartmentHead") ? api.getUsers(auth.token) : Promise.resolve([]),
    ]);
    setProjects(projectData);
    setDepartments(departmentData);
    setUsers(userData as User[]);
    if (!selectedProjectId && projectData[0]) setSelectedProjectId(projectData[0].id);
  }

  useEffect(() => {
    void loadProjects().catch((cause) => setMessage(cause instanceof Error ? cause.message : "Failed to load projects."));
  }, [auth]);

  useEffect(() => {
    if (!auth || !selectedProjectId) return;
    Promise.allSettled([
      api.getMilestonesByProject(auth.token, selectedProjectId),
      api.getProjectInsights(auth.token, selectedProjectId),
      hasRole("SuperAdmin", "ProjectManager", "DepartmentHead")
        ? api.getProjectHealth(auth.token, selectedProjectId)
        : Promise.resolve(null),
    ]).then(([milestoneResult, insightResult, healthResult]) => {
      if (milestoneResult.status === "fulfilled") setMilestones(milestoneResult.value);
      if (insightResult.status === "fulfilled") setInsights(insightResult.value);
      if (healthResult.status === "fulfilled") setHealth(healthResult.value as ProjectHealth | null);
    });
  }, [auth, selectedProjectId]);

  async function handleCreateProject(event: FormEvent) {
    event.preventDefault();
    if (!auth) return;
    await api.createProject(auth.token, form);
    setMessage("Project created.");
    await loadProjects();
  }

  return (
    <div className="grid  gap-4 content-start">
      <Panel title="Portfolio Board" subtitle="Projects, milestones, AI summaries, and budget posture">
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h4>Active Projects</h4>
              <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <SimpleProjectCards projects={projects} onPick={setSelectedProjectId} selectedId={selectedProjectId} />
          </div>
          <div>
            {selectedProject ? (
              <div className="rounded-lg border border-[var(--pmwds-border)] bg-[var(--pmwds-surface-2)]/86 p-5 shadow-xl shadow-black/15">
                <h4>{selectedProject.name}</h4>
                <p>{selectedProject.description || "No description provided."}</p>
                <MetricRow label="Budget" value={formatMoney(selectedProject.plannedBudget)} />
                <MetricRow label="Actual Cost" value={formatMoney(selectedProject.actualCost)} />
                <MetricRow label="Progress" value={formatPercent(selectedProject.progressPercentage)} />
                <MetricRow label="Health" value={formatPercent(selectedProject.aiHealthScore)} />
                <MetricRow label="Delay Risk" value={formatPercent(selectedProject.aiDelayRiskScore * 100)} />
                <MetricRow label="Status" value={selectedProject.status} />
                <MetricRow label="Department" value={selectedProject.departmentName || "Unknown"} />
                {hasRole("SuperAdmin", "ProjectManager", "DepartmentHead") ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {projectStatuses.map((status) => (
                      <button
                        key={status}
                        className={classNames(ghostButtonClass, selectedProject.status === status && "border-sky-300/60 bg-sky-300/10 text-sky-100")}
                        onClick={async () => {
                          if (!auth) return;
                          await api.updateProjectStatus(auth.token, selectedProject.id, status);
                          await loadProjects();
                        }}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {insights.map((insight) => (
                    <span className="inline-flex rounded-full bg-sky-300/10 px-2.5 py-1 text-xs font-medium text-sky-200 ring-1 ring-sky-300/15" key={insight}>
                      {insight}
                    </span>
                  ))}
                </div>
                {health ? (
                  <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
                    <MetricTile label="Schedule" value={formatPercent(health.scheduleHealth)} />
                    <MetricTile label="Budget" value={formatPercent(health.budgetHealth)} />
                    <MetricTile label="Team" value={formatPercent(health.teamHealth)} />
                    <MetricTile label="Quality" value={formatPercent(health.qualityHealth)} />
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <input type="file" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} />
                  <button
                    className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={async () => {
                      if (!auth || !uploadFile) return;
                      await api.uploadProjectDocument(auth.token, selectedProject.id, uploadFile);
                      setMessage("Project document uploaded.");
                    }}
                  >
                    Upload Document
                  </button>
                  {hasRole("SuperAdmin") ? (
                    <button
                      className="rounded-md border border-rose-300/40 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-400/20"
                      onClick={async () => {
                        if (!auth) return;
                        await api.deleteProject(auth.token, selectedProject.id);
                        setSelectedProjectId("");
                        await loadProjects();
                      }}
                    >
                      Delete Project
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <EmptyState title="No project selected" description="Choose a project to inspect milestones and AI signals." />
            )}
          </div>
        </div>
      </Panel>

      {hasRole("SuperAdmin", "ProjectManager", "DepartmentHead") ? (
        <Panel title="Create Project" subtitle="Manager-only project intake">
          <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={(event) => void handleCreateProject(event)}>
            <label><span>Project Code</span><input value={form.projectCode} onChange={(event) => setForm({ ...form, projectCode: event.target.value })} /></label>
            <label><span>Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="md:col-span-2"><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <label><span>Category</span><input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
            <label><span>Start Date</span><input type="date" value={form.plannedStartDate} onChange={(event) => setForm({ ...form, plannedStartDate: event.target.value })} /></label>
            <label><span>End Date</span><input type="date" value={form.plannedEndDate} onChange={(event) => setForm({ ...form, plannedEndDate: event.target.value })} /></label>
            <label><span>Budget</span><input type="number" value={form.plannedBudget} onChange={(event) => setForm({ ...form, plannedBudget: Number(event.target.value) })} /></label>
            <label>
              <span>Priority</span>
              <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
                {priorities.map((priority) => (<option key={priority}>{priority}</option>))}
              </select>
            </label>
            <label>
              <span>Department</span>
              <select value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value })}>
                <option value="">Choose</option>
                {departments.map((department) => (<option key={department.id} value={department.id}>{department.name}</option>))}
              </select>
            </label>
            <label>
              <span>Project Manager</span>
              <select value={form.projectManagerId} onChange={(event) => setForm({ ...form, projectManagerId: event.target.value })}>
                <option value="">Choose</option>
                {users.map((user) => (<option key={user.id} value={user.id}>{user.fullName}</option>))}
              </select>
            </label>
            <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2" type="submit">Create Project</button>
          </form>
        </Panel>
      ) : null}

      {selectedProjectId && hasRole("SuperAdmin", "ProjectManager", "DepartmentHead") ? (
        <Panel title="Create Milestone" subtitle="Add milestone to selected project">
          <form
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!auth || !selectedProjectId) return;
              void api.createMilestone(auth.token, { ...milestoneForm, projectId: selectedProjectId }).then(() => {
                setMessage("Milestone created.");
              });
            }}
          >
            <label><span>Name</span><input value={milestoneForm.name} onChange={(event) => setMilestoneForm({ ...milestoneForm, name: event.target.value })} /></label>
            <label><span>Due Date</span><input type="date" value={milestoneForm.dueDate} onChange={(event) => setMilestoneForm({ ...milestoneForm, dueDate: event.target.value })} /></label>
            <label className="md:col-span-2"><span>Description</span><textarea value={milestoneForm.description} onChange={(event) => setMilestoneForm({ ...milestoneForm, description: event.target.value })} /></label>
            <label><span>Order</span><input type="number" value={milestoneForm.order} onChange={(event) => setMilestoneForm({ ...milestoneForm, order: Number(event.target.value) })} /></label>
            <label>
              <span>Critical</span>
              <input type="checkbox" checked={milestoneForm.isCritical} onChange={(event) => setMilestoneForm({ ...milestoneForm, isCritical: event.target.checked })} />
            </label>
            <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2" type="submit">Create Milestone</button>
          </form>
        </Panel>
      ) : null}
    </div>
  );
}