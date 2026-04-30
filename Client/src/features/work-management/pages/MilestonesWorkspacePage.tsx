import { useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { ProjectSelect } from "../../../components/selectors/ProjectSelect";
import { ErrorPanel, formatPercent, LoadingPanel, Notice, Panel, primaryButtonClass } from "../../../ui";
import type { Milestone } from "../../../types";
import { MilestoneFormDialog } from "../components/MilestoneFormDialog";
import { MilestoneList } from "../components/MilestoneList";
import { useProjectWorkspace } from "../hooks/useProjectWorkspace";

export function MilestonesWorkspacePage() {
  const { auth } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [confirmMilestone, setConfirmMilestone] = useState<Milestone | null>(null);
  const [message, setMessage] = useState("");
  const { projects, milestones, loading, error } = useProjectWorkspace(auth?.token, selectedProjectId, refreshKey);

  const refresh = () => setRefreshKey((value) => value + 1);
  const completedMilestones = milestones.filter((milestone) => milestone.status === "Completed").length;
  const criticalMilestones = milestones.filter((milestone) => milestone.isCritical).length;
  const averageProgress = milestones.length ? milestones.reduce((total, milestone) => total + (milestone.progressPercentage ?? 0), 0) / milestones.length : 0;
  const activeProject = projects.find((project) => project.id === (selectedProjectId || projects[0]?.id));

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
      <Panel title="Milestones" subtitle="Project checkpoint management and schedule controls">
        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3"><ProjectSelect projects={projects} value={selectedProjectId || projects[0]?.id || ""} onChange={setSelectedProjectId} allowEmpty={false} /></div>
        <MilestoneList milestones={milestones} onEdit={setEditingMilestone} onComplete={(milestoneId) => auth && void api.completeMilestone(auth.token, milestoneId).then(() => { setMessage("Milestone completed."); refresh(); })} onDelete={setConfirmMilestone} />
      </Panel>
      <MilestoneFormDialog open={editingMilestone !== null} projects={projects} selectedProjectId={selectedProjectId || projects[0]?.id || ""} milestone={editingMilestone?.id ? editingMilestone : undefined} onClose={() => setEditingMilestone(null)} onSubmit={handleSubmit} />
      <ConfirmDialog title="Delete Milestone" message={`Delete ${confirmMilestone?.name}?`} open={confirmMilestone !== null} onClose={() => setConfirmMilestone(null)} onConfirm={() => auth && confirmMilestone ? api.deleteMilestone(auth.token, confirmMilestone.id).then(() => { setMessage("Milestone deleted."); setConfirmMilestone(null); refresh(); }) : undefined} confirmLabel="Delete" />
    </div>
  );
}
