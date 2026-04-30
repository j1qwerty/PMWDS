import { useEffect, useState } from "react";
import { Dialog } from "../../../components/common/Dialog";
import { UserSelect } from "../../../components/selectors/UserSelect";
import type { Department, Project, User } from "../../../types";
import { ghostButtonClass, inputClass, labelClass, primaryButtonClass } from "../../../ui";
import { createProjectForm, type ProjectFormState } from "../forms";

type ProjectFormDialogProps = {
  open: boolean;
  project?: Project | null;
  departments: Department[];
  users: User[];
  onClose: () => void;
  onSubmit: (form: ProjectFormState) => void | Promise<void>;
};

export function ProjectFormDialog({ open, project, departments, users, onClose, onSubmit }: ProjectFormDialogProps) {
  const [form, setForm] = useState(createProjectForm(project ?? undefined));

  useEffect(() => {
    setForm(createProjectForm(project ?? undefined));
  }, [project, open]);

  return (
    <Dialog title={project ? "Edit Project" : "Create Project"} open={open} onClose={onClose} width="lg">
      <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void onSubmit(form); }}>
        <label className={labelClass}><span>Project Code</span><input className={inputClass} value={form.projectCode} onChange={(event) => setForm({ ...form, projectCode: event.target.value })} /></label>
        <label className={labelClass}><span>Name</span><input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label className={`${labelClass} md:col-span-2`}><span>Description</span><textarea className={inputClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <label className={labelClass}><span>Category</span><input className={inputClass} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
        <label className={labelClass}><span>Start Date</span><input className={inputClass} type="date" value={form.plannedStartDate} onChange={(event) => setForm({ ...form, plannedStartDate: event.target.value })} /></label>
        <label className={labelClass}><span>End Date</span><input className={inputClass} type="date" value={form.plannedEndDate} onChange={(event) => setForm({ ...form, plannedEndDate: event.target.value })} /></label>
        <label className={labelClass}><span>Budget</span><input className={inputClass} type="number" value={form.plannedBudget} onChange={(event) => setForm({ ...form, plannedBudget: Number(event.target.value) })} /></label>
        <label className={labelClass}><span>Priority</span><input className={inputClass} value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} /></label>
        <label className={labelClass}><span>Department</span><select className={inputClass} value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value })}><option value="">Choose</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
        <UserSelect users={users} value={form.projectManagerId} onChange={(value) => setForm({ ...form, projectManagerId: value })} label="Project Manager" allowEmpty={false} />
        <div className="md:col-span-2 mt-4 flex flex-wrap gap-2"><button className={ghostButtonClass} onClick={onClose} type="button">Cancel</button><button className={primaryButtonClass} type="submit">{project ? "Save Project" : "Create Project"}</button></div>
      </form>
    </Dialog>
  );
}
