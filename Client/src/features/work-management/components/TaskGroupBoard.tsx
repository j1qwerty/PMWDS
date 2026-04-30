import { formatDate, formatPercent } from "../../../ui";
import type { Milestone, Task } from "../../../types";
import { getChildTasks } from "../utils";

type TaskGroupBoardProps = {
  milestones: Array<{ milestone: Milestone; tasks: Task[] }>;
  standaloneTasks: Task[];
  allTasks: Task[];
  selectedTaskId: string;
  onSelect: (taskId: string) => void;
};

function TaskCard({ task, childCount, selectedTaskId, onSelect }: { task: Task; childCount: number; selectedTaskId: string; onSelect: (taskId: string) => void; }) {
  return (
    <button className={`rounded-md border border-[var(--pmwds-border)] bg-white/[0.035] px-4 py-3 text-left transition hover:border-sky-300/50 hover:bg-white/[0.06] ${selectedTaskId === task.id ? "selected-card" : ""}`} onClick={() => onSelect(task.id)}>
      <strong>{task.title}</strong>
      <span>{task.status} · {task.priority}</span>
      <small>{task.assignedToUserName || "Unassigned"} · due {formatDate(task.dueDate)} · {formatPercent(task.progressPercentage)}</small>
      {childCount ? <small>{childCount} subtasks</small> : null}
    </button>
  );
}

export function TaskGroupBoard({ milestones, standaloneTasks, allTasks, selectedTaskId, onSelect }: TaskGroupBoardProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-lg border border-[var(--pmwds-border)] bg-white/[0.035] p-3"><h4>Standalone Tasks</h4>{standaloneTasks.length ? standaloneTasks.map((task) => <TaskCard key={task.id} task={task} childCount={getChildTasks(allTasks, task.id).length} selectedTaskId={selectedTaskId} onSelect={onSelect} />) : <div className="rounded-lg border border-dashed border-[var(--pmwds-border)] bg-white/[0.025] p-8 text-center text-slate-400 p-4"><span>No standalone tasks.</span></div>}</div>
      {milestones.map(({ milestone, tasks }) => <div className="rounded-lg border border-[var(--pmwds-border)] bg-white/[0.035] p-3" key={milestone.id}><h4>{milestone.name}</h4>{tasks.length ? tasks.map((task) => <TaskCard key={task.id} task={task} childCount={getChildTasks(allTasks, task.id).length} selectedTaskId={selectedTaskId} onSelect={onSelect} />) : <div className="rounded-lg border border-dashed border-[var(--pmwds-border)] bg-white/[0.025] p-8 text-center text-slate-400 p-4"><span>No milestone tasks.</span></div>}</div>)}
    </div>
  );
}
