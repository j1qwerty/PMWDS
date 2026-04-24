import { useEffect, useState } from "react";
import { Dialog } from "../../../components/common/Dialog";
import { ProjectSelect } from "../../../components/selectors/ProjectSelect";
import type { Milestone, Project } from "../../../types";
import { createMilestoneForm, type MilestoneFormState } from "../forms";

type MilestoneFormDialogProps = {
  open: boolean;
  projects: Project[];
  selectedProjectId: string;
  milestone?: Milestone | null;
  onClose: () => void;
  onSubmit: (form: MilestoneFormState) => void | Promise<void>;
};

export function MilestoneFormDialog({ open, projects, selectedProjectId, milestone, onClose, onSubmit }: MilestoneFormDialogProps) {
  const [form, setForm] = useState(createMilestoneForm(selectedProjectId, milestone ?? undefined));

  useEffect(() => {
    setForm(createMilestoneForm(selectedProjectId, milestone ?? undefined));
  }, [selectedProjectId, milestone, open]);

  return (
    <Dialog title={milestone ? "Edit Milestone" : "Create Milestone"} open={open} onClose={onClose}>
      <form className="form-grid" onSubmit={(event) => { event.preventDefault(); void onSubmit(form); }}>
        <ProjectSelect projects={projects} value={form.projectId} onChange={(value) => setForm({ ...form, projectId: value })} allowEmpty={false} />
        <label><span>Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label className="wide"><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <label><span>Due Date</span><input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
        <label><span>Order</span><input type="number" value={form.order} onChange={(event) => setForm({ ...form, order: Number(event.target.value) })} /></label>
        <label><span>Progress</span><input type="number" value={form.progressPercentage} onChange={(event) => setForm({ ...form, progressPercentage: Number(event.target.value) })} /></label>
        <label className="checkbox-row"><input type="checkbox" checked={form.isCritical} onChange={(event) => setForm({ ...form, isCritical: event.target.checked })} /><span>Critical milestone</span></label>
        <div className="wide inline-actions"><button className="ghost-button" onClick={onClose} type="button">Cancel</button><button className="primary-button" type="submit">{milestone ? "Save Milestone" : "Create Milestone"}</button></div>
      </form>
    </Dialog>
  );
}
