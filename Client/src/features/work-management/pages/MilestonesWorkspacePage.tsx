import { useEffect, useMemo, useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { ProjectSelect } from "../../../components/selectors/ProjectSelect";
import { ErrorPanel, formatPercent, LoadingPanel, Notice, Panel, primaryButtonClass, classNames } from "../../../ui";
import type { Milestone, Task } from "../../../types";
import { MilestoneFormDialog } from "../components/MilestoneFormDialog";
import { MilestoneList } from "../components/MilestoneList";
import { useProjectWorkspace } from "../hooks/useProjectWorkspace";

export function MilestonesWorkspacePage() {
  const { auth } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedMilestoneId, setSelectedMilestoneId] = useState("");
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [confirmMilestone, setConfirmMilestone] = useState<Milestone | null>(null);
  const [message, setMessage] = useState("");
  const { projects, milestones, loading, error } = useProjectWorkspace(auth?.token, selectedProjectId, refreshKey);

  const refresh = () => setRefreshKey((value) => value + 1);
  const completedMilestones = milestones.filter((milestone) => milestone.status === "Completed").length;
  const criticalMilestones = milestones.filter((milestone) => milestone.isCritical).length;
  const averageProgress = milestones.length ? milestones.reduce((total, milestone) => total + (milestone.progressPercentage ?? 0), 0) / milestones.length : 0;
  const activeProject = projects.find((project) => project.id === (selectedProjectId || projects[0]?.id));
  const selectedMilestone = useMemo(() => milestones.find((m) => m.id === selectedMilestoneId) ?? null, [milestones, selectedMilestoneId]);
  const milestoneTasks = useMemo(() => projectTasks.filter((task) => task.milestoneId === selectedMilestoneId), [projectTasks, selectedMilestoneId]);

  useEffect(() => {
    if (!auth || !selectedProjectId) {
      setProjectTasks([]);
      return;
    }
    api.getTasksByProject(auth.token, selectedProjectId).then(setProjectTasks).catch(() => setProjectTasks([]));
  }, [auth, selectedProjectId]);

  const handleSubmit = (form: Record<string, unknown>) => {
    if (!auth) return;
    const action = editingMilestone?.id ? api.updateMilestone(auth.token, editingMilestone.id, form) : api.createMilestone(auth.token, form);
    void action.then(() => { setMessage(editingMilestone?.id ? "Milestone updated." : "Milestone created."); setEditingMilestone(null); refresh(); });
  };

  if (loading) return <LoadingPanel label="Loading milestones..." />;
  if (error) return <ErrorPanel message={error} />;

  return (
    <div className="grid  gap-4 content-start">
      {message ? <Notice>{message}</Notice> : null}
      <section className="col-span-12 rounded-2xl border border-white/10 bg-gradient-to-br from-[#111827] via-slate-950 to-[#101827] p-6 shadow-2xl shadow-black/25">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-[0.68rem] font-semibold tracking-[0.24em] text-sky-300 uppercase">Critical Path</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Milestones</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Manage checkpoint delivery, critical markers, and milestone completion for {activeProject?.name || "the selected project"}.</p>
          </div>
          <button className={primaryButtonClass} onClick={() => setEditingMilestone({} as Milestone)}>Initialize Milestone</button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-white/8 bg-white/[0.04] p-4"><span className="text-xs text-slate-400">Milestones</span><strong className="mt-1 block text-2xl text-white">{milestones.length}</strong></div>
          <div className="rounded-xl border border-white/8 bg-white/[0.04] p-4"><span className="text-xs text-slate-400">Completed</span><strong className="mt-1 block text-2xl text-teal-200">{completedMilestones}</strong></div>
          <div className="rounded-xl border border-white/8 bg-white/[0.04] p-4"><span className="text-xs text-slate-400">Critical</span><strong className="mt-1 block text-2xl text-rose-200">{criticalMilestones}</strong></div>
          <div className="rounded-xl border border-white/8 bg-white/[0.04] p-4"><span className="text-xs text-slate-400">Average Progress</span><strong className="mt-1 block text-2xl text-sky-200">{formatPercent(averageProgress)}</strong></div>
        </div>
      </section>
      <div className="col-span-12 grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Milestones" subtitle="Project checkpoint management and schedule controls">
          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3"><ProjectSelect projects={projects} value={selectedProjectId || projects[0]?.id || ""} onChange={setSelectedProjectId} allowEmpty={false} /></div>
          <MilestoneList 
            milestones={milestones} 
            onEdit={setEditingMilestone} 
            onSelect={setSelectedMilestoneId}
            selectedId={selectedMilestoneId}
            onComplete={(milestoneId) => auth && void api.completeMilestone(auth.token, milestoneId).then(() => { setMessage("Milestone completed."); refresh(); })} 
            onDelete={setConfirmMilestone} 
          />
        </Panel>

        <Panel title="Tasks" subtitle={selectedMilestone ? `Tasks for: ${selectedMilestone.name}` : "Select a milestone to view tasks"} className="flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {!selectedMilestone ? (
              <div className="flex h-32 items-center justify-center text-slate-400 text-sm">
                Select a milestone to view its tasks
              </div>
            ) : milestoneTasks.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-slate-400 text-sm">
                No tasks found for this milestone
              </div>
            ) : (
              <div className="space-y-3">
                {milestoneTasks.map((task) => {
                  const statusColors: Record<string, { bg: string; text: string }> = {
                    NotStarted: { bg: "bg-slate-500/10", text: "text-slate-400" },
                    Assigned: { bg: "bg-blue-500/10", text: "text-blue-400" },
                    InProgress: { bg: "bg-amber-500/10", text: "text-amber-400" },
                    Completed: { bg: "bg-emerald-500/10", text: "text-emerald-400" },
                    Delayed: { bg: "bg-rose-500/10", text: "text-rose-400" },
                  };
                  const colors = statusColors[task.status] || statusColors.NotStarted;
                  return (
                    <div key={task.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-white truncate">{task.title}</span>
                          <span className="mt-1 block text-xs text-slate-400">
                            {task.assignedToUserName || "Unassigned"} • due {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No date"}
                          </span>
                        </div>
                        <span className={classNames("px-2 py-0.5 text-[10px] font-bold uppercase rounded flex-shrink-0", colors.bg, colors.text)}>
                          {task.status}
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>Progress</span>
                          <span>{task.progressPercentage}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${task.progressPercentage}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>
      </div>
      <MilestoneFormDialog open={editingMilestone !== null} projects={projects} selectedProjectId={selectedProjectId || projects[0]?.id || ""} milestone={editingMilestone?.id ? editingMilestone : undefined} onClose={() => setEditingMilestone(null)} onSubmit={handleSubmit} />
      <ConfirmDialog title="Delete Milestone" message={`Delete ${confirmMilestone?.name}?`} open={confirmMilestone !== null} onClose={() => setConfirmMilestone(null)} onConfirm={() => auth && confirmMilestone ? api.deleteMilestone(auth.token, confirmMilestone.id).then(() => { setMessage("Milestone deleted."); setConfirmMilestone(null); refresh(); }) : undefined} confirmLabel="Delete" />
    </div>
  );
}
