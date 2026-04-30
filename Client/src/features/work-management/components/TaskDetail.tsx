import { MetricRow, formatDate, formatPercent } from "../../../ui";
import type { Task } from "../../../types";

type TaskDetailProps = {
  task: Task | null;
  subtasks: Task[];
  onEdit: () => void;
  onDelete: () => void;
  onCreateSubtask: () => void;
  onUpdateStatus: (status: string) => void;
};

const statuses = ["NotStarted", "Assigned", "InProgress", "OnHold", "Completed", "Delayed", "Cancelled"];

export function TaskDetail({ task, subtasks, onEdit, onDelete, onCreateSubtask, onUpdateStatus }: TaskDetailProps) {
  if (!task) {
    return <div className="rounded-lg border border-dashed border-[var(--pmwds-border)] bg-white/[0.025] p-8 text-center text-slate-400"><strong>No task selected</strong><span>Select a task to inspect details and subtasks.</span></div>;
  }

  return (
    <div className="rounded-lg border border-[var(--pmwds-border)] bg-[var(--pmwds-surface-2)]/86 p-5 shadow-xl shadow-black/15">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h4>{task.title}</h4><div className="mt-4 flex flex-wrap gap-2"><button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={onEdit}>Edit</button><button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={onCreateSubtask}>Add Subtask</button><button className="rounded-md border border-rose-300/40 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-400/20" onClick={onDelete}>Delete</button></div></div>
      <p>{task.description || "No description provided."}</p>
      <MetricRow label="Project" value={task.projectName || task.projectId} />
      <MetricRow label="Milestone" value={task.milestoneName || "Standalone"} />
      <MetricRow label="Assignee" value={task.assignedToUserName || "Unassigned"} />
      <MetricRow label="Due Date" value={formatDate(task.dueDate)} />
      <MetricRow label="Progress" value={formatPercent(task.progressPercentage)} />
      <MetricRow label="Delay Risk" value={formatPercent(task.aiDelayProbability * 100)} />
      <div className="mt-4 flex flex-wrap gap-2">{statuses.map((status) => <button key={status} className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => onUpdateStatus(status)}>{status}</button>)}</div>
      <div className="mt-4 border-t border-[var(--pmwds-border)] pt-4"><h5>Subtasks</h5>{subtasks.length ? subtasks.map((subtask) => <div className="flex justify-between gap-3 border-b border-white/8 py-2 text-sm" key={subtask.id}><strong>{subtask.title}</strong><span>{subtask.status} · {formatDate(subtask.dueDate)}</span></div>) : <div className="rounded-lg border border-dashed border-[var(--pmwds-border)] bg-white/[0.025] p-8 text-center text-slate-400 p-4"><span>No subtasks on this task yet.</span></div>}</div>
    </div>
  );
}
