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
    return <div className="empty-state"><strong>No task selected</strong><span>Select a task to inspect details and subtasks.</span></div>;
  }

  return (
    <div className="detail-card">
      <div className="section-row"><h4>{task.title}</h4><div className="inline-actions"><button className="ghost-button" onClick={onEdit}>Edit</button><button className="ghost-button" onClick={onCreateSubtask}>Add Subtask</button><button className="danger-button" onClick={onDelete}>Delete</button></div></div>
      <p>{task.description || "No description provided."}</p>
      <MetricRow label="Project" value={task.projectName || task.projectId} />
      <MetricRow label="Milestone" value={task.milestoneName || "Standalone"} />
      <MetricRow label="Assignee" value={task.assignedToUserName || "Unassigned"} />
      <MetricRow label="Due Date" value={formatDate(task.dueDate)} />
      <MetricRow label="Progress" value={formatPercent(task.progressPercentage)} />
      <MetricRow label="Delay Risk" value={formatPercent(task.aiDelayProbability * 100)} />
      <div className="inline-actions">{statuses.map((status) => <button key={status} className="ghost-button" onClick={() => onUpdateStatus(status)}>{status}</button>)}</div>
      <div className="subtask-block"><h5>Subtasks</h5>{subtasks.length ? subtasks.map((subtask) => <div className="subtask-row" key={subtask.id}><strong>{subtask.title}</strong><span>{subtask.status} · {formatDate(subtask.dueDate)}</span></div>) : <div className="empty-state compact-empty"><span>No subtasks on this task yet.</span></div>}</div>
    </div>
  );
}
