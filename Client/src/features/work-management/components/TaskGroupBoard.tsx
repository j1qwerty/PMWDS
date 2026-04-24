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
    <button className={`list-card ${selectedTaskId === task.id ? "selected-card" : ""}`} onClick={() => onSelect(task.id)}>
      <strong>{task.title}</strong>
      <span>{task.status} · {task.priority}</span>
      <small>{task.assignedToUserName || "Unassigned"} · due {formatDate(task.dueDate)} · {formatPercent(task.progressPercentage)}</small>
      {childCount ? <small>{childCount} subtasks</small> : null}
    </button>
  );
}

export function TaskGroupBoard({ milestones, standaloneTasks, allTasks, selectedTaskId, onSelect }: TaskGroupBoardProps) {
  return (
    <div className="task-board">
      <div className="task-column"><h4>Standalone Tasks</h4>{standaloneTasks.length ? standaloneTasks.map((task) => <TaskCard key={task.id} task={task} childCount={getChildTasks(allTasks, task.id).length} selectedTaskId={selectedTaskId} onSelect={onSelect} />) : <div className="empty-state compact-empty"><span>No standalone tasks.</span></div>}</div>
      {milestones.map(({ milestone, tasks }) => <div className="task-column" key={milestone.id}><h4>{milestone.name}</h4>{tasks.length ? tasks.map((task) => <TaskCard key={task.id} task={task} childCount={getChildTasks(allTasks, task.id).length} selectedTaskId={selectedTaskId} onSelect={onSelect} />) : <div className="empty-state compact-empty"><span>No milestone tasks.</span></div>}</div>)}
    </div>
  );
}
