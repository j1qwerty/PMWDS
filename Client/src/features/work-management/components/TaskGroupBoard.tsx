import type { Milestone, Task } from "../../../types";
import { classNames, EmptyState, formatDate, formatPercent, selectedCardClass } from "../../../ui";
import { getChildTasks } from "../utils";

type TaskGroupBoardProps = {
  milestones: Array<{ milestone: Milestone; tasks: Task[] }>;
  standaloneTasks: Task[];
  allTasks: Task[];
  selectedTaskId: string;
  onSelect: (taskId: string) => void;
};

function riskTone(task: Task) {
  if (task.isOverdue || task.aiDelayProbability >= 0.65) return "bg-rose-400/10 text-rose-200";
  if (task.aiDelayProbability >= 0.35) return "bg-amber-300/10 text-amber-200";
  return "bg-teal-300/10 text-teal-200";
}

function TaskCard({ task, childCount, selectedTaskId, onSelect }: { task: Task; childCount: number; selectedTaskId: string; onSelect: (taskId: string) => void; }) {
  return (
    <button
      className={classNames(
        "group rounded-xl border border-transparent bg-white/[0.045] p-4 text-left shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-0.5 hover:border-sky-300/30 hover:bg-white/[0.07]",
        selectedTaskId === task.id && selectedCardClass,
      )}
      onClick={() => onSelect(task.id)}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="rounded-full bg-amber-300/10 px-2 py-1 text-[0.62rem] font-bold tracking-[0.12em] text-amber-200 uppercase">{task.priority}</span>
        <span className={classNames("rounded-full px-2 py-1 text-[0.62rem] font-bold uppercase", riskTone(task))}>{task.isOverdue ? "Overdue" : `${formatPercent(task.aiDelayProbability * 100)} risk`}</span>
      </div>
      <strong className="block text-sm font-semibold leading-5 text-white transition group-hover:text-sky-200">{task.title}</strong>
      <span className="mt-2 block text-xs text-slate-400">{task.assignedToUserName || "Unassigned"} / due {formatDate(task.dueDate)}</span>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-300 to-teal-200" style={{ width: `${Math.min(100, Math.max(0, task.progressPercentage ?? 0))}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{task.status}</span>
        <span>{childCount ? `${childCount} subtasks` : "No subtasks"}</span>
      </div>
    </button>
  );
}

function TaskColumn({ title, tasks, allTasks, selectedTaskId, onSelect }: { title: string; tasks: Task[]; allTasks: Task[]; selectedTaskId: string; onSelect: (taskId: string) => void; }) {
  return (
    <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">{title}</h4>
        <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[0.65rem] font-bold text-slate-300">{tasks.length}</span>
      </div>
      <div className="grid gap-3">
        {tasks.length ? tasks.map((task) => <TaskCard key={task.id} task={task} childCount={getChildTasks(allTasks, task.id).length} selectedTaskId={selectedTaskId} onSelect={onSelect} />) : <EmptyState compact title="No tasks" description="No work items in this lane." />}
      </div>
    </section>
  );
}

export function TaskGroupBoard({ milestones, standaloneTasks, allTasks, selectedTaskId, onSelect }: TaskGroupBoardProps) {
  return (
    <div className="grid max-h-[760px] grid-cols-1 gap-4 overflow-y-auto pr-1 xl:grid-cols-3">
      <TaskColumn title="Standalone" tasks={standaloneTasks} allTasks={allTasks} selectedTaskId={selectedTaskId} onSelect={onSelect} />
      {milestones.map(({ milestone, tasks }) => (
        <TaskColumn key={milestone.id} title={milestone.name} tasks={tasks} allTasks={allTasks} selectedTaskId={selectedTaskId} onSelect={onSelect} />
      ))}
    </div>
  );
}
