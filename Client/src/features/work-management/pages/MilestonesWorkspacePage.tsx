import { useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { ProjectSelect } from "../../../components/selectors/ProjectSelect";
import { ErrorPanel, LoadingPanel, Notice, Panel } from "../../../ui";
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
  const handleSubmit = (form: Record<string, unknown>) => {
    if (!auth) return;
    const action = editingMilestone?.id ? api.updateMilestone(auth.token, editingMilestone.id, form) : api.createMilestone(auth.token, form);
    void action.then(() => { setMessage(editingMilestone?.id ? "Milestone updated." : "Milestone created."); setEditingMilestone(null); refresh(); });
  };

  if (loading) return <LoadingPanel label="Loading milestones..." />;
  if (error) return <ErrorPanel message={error} />;

  return (
    <div className="page-grid">
      {message ? <Notice>{message}</Notice> : null}
      <Panel title="Milestones" subtitle="Project checkpoint management and schedule controls">
        <div className="toolbar-grid"><ProjectSelect projects={projects} value={selectedProjectId || projects[0]?.id || ""} onChange={setSelectedProjectId} allowEmpty={false} /></div>
        <MilestoneList milestones={milestones} onEdit={setEditingMilestone} onComplete={(milestoneId) => auth && void api.completeMilestone(auth.token, milestoneId).then(() => { setMessage("Milestone completed."); refresh(); })} onDelete={setConfirmMilestone} />
        <div className="inline-actions"><button className="primary-button" onClick={() => setEditingMilestone({} as Milestone)}>Create Milestone</button></div>
      </Panel>
      <MilestoneFormDialog open={editingMilestone !== null} projects={projects} selectedProjectId={selectedProjectId || projects[0]?.id || ""} milestone={editingMilestone?.id ? editingMilestone : undefined} onClose={() => setEditingMilestone(null)} onSubmit={handleSubmit} />
      <ConfirmDialog title="Delete Milestone" message={`Delete ${confirmMilestone?.name}?`} open={confirmMilestone !== null} onClose={() => setConfirmMilestone(null)} onConfirm={() => auth && confirmMilestone ? api.deleteMilestone(auth.token, confirmMilestone.id).then(() => { setMessage("Milestone deleted."); setConfirmMilestone(null); refresh(); }) : undefined} confirmLabel="Delete" />
    </div>
  );
}
