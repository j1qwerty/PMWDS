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
      <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void onSubmit(form); }}>
        <ProjectSelect projects={projects} value={form.projectId} onChange={(value) => setForm({ ...form, projectId: value })} allowEmpty={false} />
        <label><span>Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label className="md:col-span-2"><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <label><span>Due Date</span><input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
        <label><span>Order</span><input type="number" value={form.order} onChange={(event) => setForm({ ...form, order: Number(event.target.value) })} /></label>
        <label><span>Progress</span><input type="number" value={form.progressPercentage} onChange={(event) => setForm({ ...form, progressPercentage: Number(event.target.value) })} /></label>
        <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.isCritical} onChange={(event) => setForm({ ...form, isCritical: event.target.checked })} /><span>Critical milestone</span></label>
        <div className="md:col-span-2 mt-4 flex flex-wrap gap-2"><button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={onClose} type="button">Cancel</button><button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" type="submit">{milestone ? "Save Milestone" : "Create Milestone"}</button></div>
      </form>
    </Dialog>
  );
}
