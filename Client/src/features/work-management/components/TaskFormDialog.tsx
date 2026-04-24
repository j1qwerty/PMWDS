import { useEffect, useState } from "react";
import { Dialog } from "../../../components/common/Dialog";
import { MilestoneSelect } from "../../../components/selectors/MilestoneSelect";
import { ProjectSelect } from "../../../components/selectors/ProjectSelect";
import { UserSelect } from "../../../components/selectors/UserSelect";
import type { Milestone, Project, Task, User } from "../../../types";
import { createTaskForm, type TaskFormState } from "../forms";

type TaskFormDialogProps = {
  open: boolean;
  task?: Task | null;
  parentTaskId?: string;
  projects: Project[];
  milestones: Milestone[];
  users: User[];
  selectedProjectId: string;
  onClose: () => void;
  onSubmit: (form: TaskFormState) => void | Promise<void>;
};

export function TaskFormDialog({ open, task, parentTaskId = "", projects, milestones, users, selectedProjectId, onClose, onSubmit }: TaskFormDialogProps) {
  const [form, setForm] = useState(createTaskForm(selectedProjectId, task ?? undefined, parentTaskId));

  useEffect(() => {
    setForm(createTaskForm(selectedProjectId, task ?? undefined, parentTaskId));
  }, [selectedProjectId, task, parentTaskId, open]);

  return (
    <Dialog title={task ? (task.parentTaskId ? "Edit Subtask" : "Edit Task") : parentTaskId ? "Create Subtask" : "Create Task"} open={open} onClose={onClose} width="lg">
      <form className="form-grid" onSubmit={(event) => { event.preventDefault(); void onSubmit(form); }}>
        <ProjectSelect projects={projects} value={form.projectId} onChange={(value) => setForm({ ...form, projectId: value })} allowEmpty={false} />
        <MilestoneSelect milestones={milestones} value={form.milestoneId} onChange={(value) => setForm({ ...form, milestoneId: value })} />
        <label><span>Title</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
        <UserSelect users={users} value={form.assignedToUserId} onChange={(value) => setForm({ ...form, assignedToUserId: value })} />
        <label className="wide"><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <label><span>Start Date</span><input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label>
        <label><span>Due Date</span><input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
        <label><span>Estimated Hours</span><input type="number" value={form.estimatedHours} onChange={(event) => setForm({ ...form, estimatedHours: Number(event.target.value) })} /></label>
        <label><span>Priority</span><input value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} /></label>
        <div className="wide inline-actions"><button className="ghost-button" onClick={onClose} type="button">Cancel</button><button className="primary-button" type="submit">{task ? "Save Task" : "Create Task"}</button></div>
      </form>
    </Dialog>
  );
}
