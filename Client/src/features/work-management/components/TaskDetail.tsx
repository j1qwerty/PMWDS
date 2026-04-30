import type { Task } from "../../../types";
import { classNames, dangerButtonClass, EmptyState, formatDate, formatPercent, ghostButtonClass, MetricRow } from "../../../ui";

type TaskDetailProps = {
  task: Task | null;
  subtasks: Task[];
  onEdit: () => void;
  onDelete: () => void;
  onCreateSubtask: () => void;
  onUpdateStatus: (status: string) => void;
};

const statuses = ["NotStarted", "Assigned", "InProgress", "OnHold", "Completed", "Delayed", "Cancelled"];

function riskClass(task: Task) {
  if (task.isOverdue || task.aiDelayProbability >= 0.65) return "text-rose-200";
  if (task.aiDelayProbability >= 0.35) return "text-amber-200";
  return "text-teal-200";
}

export function TaskDetail({ task, subtasks, onEdit, onDelete, onCreateSubtask, onUpdateStatus }: TaskDetailProps) {
  if (!task) {
    return <EmptyState title="No task selected" description="Select a task to inspect details and subtasks." />;
  }

  return (
    <aside className="rounded-2xl border border-[var(--pmwds-border)] bg-[var(--pmwds-surface-2)]/90 p-5 shadow-2xl shadow-black/20">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-slate-300">{task.status}</span>
            <span className="rounded-full bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-200">{task.priority}</span>
          </div>
          <h4 className="text-xl font-semibold text-white">{task.title}</h4>
          <p className="mt-1 text-sm text-slate-400">{task.projectName || task.projectId} / {task.milestoneName || "Standalone"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={ghostButtonClass} onClick={onEdit}>Edit</button>
          <button className={ghostButtonClass} onClick={onCreateSubtask}>Add Subtask</button>
          <button className={dangerButtonClass} onClick={onDelete}>Delete</button>
        </div>
      </div>

      <p className="mb-5 rounded-lg border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300">{task.description || "No description provided."}</p>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-white/8 bg-black/15 p-3 text-center">
          <span className="block text-[0.62rem] font-semibold tracking-[0.16em] text-slate-500 uppercase">Progress</span>
          <strong className="mt-1 block text-2xl font-semibold text-white">{formatPercent(task.progressPercentage)}</strong>
        </div>
        <div className="rounded-lg border border-white/8 bg-black/15 p-3 text-center">
          <span className="block text-[0.62rem] font-semibold tracking-[0.16em] text-slate-500 uppercase">Delay Risk</span>
          <strong className={classNames("mt-1 block text-2xl font-semibold", riskClass(task))}>{formatPercent(task.aiDelayProbability * 100)}</strong>
        </div>
        <div className="rounded-lg border border-white/8 bg-black/15 p-3 text-center">
          <span className="block text-[0.62rem] font-semibold tracking-[0.16em] text-slate-500 uppercase">Subtasks</span>
          <strong className="mt-1 block text-2xl font-semibold text-white">{subtasks.length}</strong>
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-white/8 bg-white/[0.025] p-3">
        <MetricRow label="Assignee" value={task.assignedToUserName || "Unassigned"} />
        <MetricRow label="Start Date" value={formatDate(task.startDate)} />
        <MetricRow label="Due Date" value={formatDate(task.dueDate)} />
        <MetricRow label="Estimated Hours" value={`${task.estimatedHours}`} />
        <MetricRow label="Actual Hours" value={`${task.actualHours}`} />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {statuses.map((status) => (
          <button key={status} className={classNames(ghostButtonClass, task.status === status && "border-sky-300/60 bg-sky-300/10 text-sky-100")} onClick={() => onUpdateStatus(status)}>
            {status}
          </button>
        ))}
      </div>

      <div className="border-t border-[var(--pmwds-border)] pt-4">
        <h5 className="mb-3 text-sm font-semibold text-white">Subtasks</h5>
        <div className="grid gap-2">
          {subtasks.length ? subtasks.map((subtask) => (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.035] px-3 py-2 text-sm" key={subtask.id}>
              <strong className="text-white">{subtask.title}</strong>
              <span className="text-slate-400">{subtask.status} / {formatDate(subtask.dueDate)}</span>
            </div>
          )) : <EmptyState compact title="No subtasks" description="Break this task down into smaller execution items." />}
        </div>
      </div>
    </aside>
  );
}
