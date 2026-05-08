import { useMemo, useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { ProjectSelect } from "../../../components/selectors/ProjectSelect";
import { ErrorPanel, formatPercent, LoadingPanel, Notice, Panel, primaryButtonClass } from "../../../ui";
import type { Task } from "../../../types";
import { TaskDetail } from "../components/TaskDetail";
import { TaskFilters } from "../components/TaskFilters";
import { TaskFormDialog } from "../components/TaskFormDialog";
import { TaskGroupBoard } from "../components/TaskGroupBoard";
import { useTaskWorkspace } from "../hooks/useTaskWorkspace";
import { filterTasks, getChildTasks, getStandaloneTasks, groupTasksByMilestone } from "../utils";

export function TasksWorkspacePage() {
  const { auth } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [filters, setFilters] = useState({ search: "", status: "", priority: "", assigneeId: "", milestoneId: "" });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [subtaskParent, setSubtaskParent] = useState<Task | null>(null);
  const [confirmTask, setConfirmTask] = useState<Task | null>(null);
  const [message, setMessage] = useState("");
  const { projects, users, milestones, tasks, loading, error } = useTaskWorkspace(auth?.token, selectedProjectId, refreshKey);

  const visibleTasks = useMemo(() => filterTasks(tasks, filters), [tasks, filters]);
  const groupedTasks = useMemo(() => groupTasksByMilestone(visibleTasks, milestones), [visibleTasks, milestones]);
  const standaloneTasks = useMemo(() => getStandaloneTasks(visibleTasks), [visibleTasks]);
  const selectedTask = useMemo(() => visibleTasks.find((task) => task.id === selectedTaskId) ?? visibleTasks[0] ?? null, [visibleTasks, selectedTaskId]);
  const subtasks = useMemo(() => selectedTask ? getChildTasks(tasks, selectedTask.id) : [], [selectedTask, tasks]);

  const refresh = () => setRefreshKey((value) => value + 1);
  const overdueTasks = visibleTasks.filter((task) => task.isOverdue).length;
  const inProgressTasks = visibleTasks.filter((task) => task.status === "InProgress").length;
  const averageProgress = visibleTasks.length ? visibleTasks.reduce((total, task) => total + (task.progressPercentage ?? 0), 0) / visibleTasks.length : 0;
  const highRiskTasks = visibleTasks.filter((task) => task.aiDelayProbability >= 0.65).length;

  const handleTaskSubmit = (form: Record<string, unknown>) => {
    if (!auth) return;
    const payload = { ...form, milestoneId: form.milestoneId || null, parentTaskId: null, assignedToUserId: form.assignedToUserId || null };
    const action = editingTask?.id ? api.updateTask(auth.token, editingTask.id, payload) : api.createTask(auth.token, payload);
    void action.then(() => { setMessage(editingTask?.id ? "Task updated." : "Task created."); setEditingTask(null); refresh(); });
  };

  const handleSubtaskSubmit = (form: Record<string, unknown>) => {
    if (!auth || !subtaskParent) return;
    const payload = { ...form, milestoneId: form.milestoneId || null, assignedToUserId: form.assignedToUserId || null };
    void api.createSubtask(auth.token, subtaskParent.id, payload).then(() => { setMessage("Subtask created."); setSubtaskParent(null); refresh(); });
  };

  if (loading) return <LoadingPanel label="Loading task workspace..." />;
  if (error) return <ErrorPanel message={error} />;

  return (
    <div className="grid  gap-4 content-start">
      {message ? <Notice>{message}</Notice> : null}
      <section className="col-span-12 rounded-2xl border border-white/10 bg-gradient-to-br from-[#111827] via-slate-950 to-[#0f172a] p-6 shadow-2xl shadow-black/25">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-[0.68rem] font-semibold tracking-[0.24em] text-sky-300 uppercase">Production Workspace</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Tasks Management</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Orchestrate standalone work, milestone task groups, assignees, subtasks, and AI delay signals in one board.</p>
          </div>
          <button className={primaryButtonClass} onClick={() => setEditingTask({} as Task)}>New Task</button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-white/8 bg-white/[0.04] p-4"><span className="text-xs text-slate-400">Visible Tasks</span><strong className="mt-1 block text-2xl text-white">{visibleTasks.length}</strong></div>
          <div className="rounded-xl border border-white/8 bg-white/[0.04] p-4"><span className="text-xs text-slate-400">In Progress</span><strong className="mt-1 block text-2xl text-sky-200">{inProgressTasks}</strong></div>
          <div className="rounded-xl border border-white/8 bg-white/[0.04] p-4"><span className="text-xs text-slate-400">Overdue / High Risk</span><strong className="mt-1 block text-2xl text-rose-200">{overdueTasks} / {highRiskTasks}</strong></div>
          <div className="rounded-xl border border-white/8 bg-white/[0.04] p-4"><span className="text-xs text-slate-400">Average Progress</span><strong className="mt-1 block text-2xl text-teal-200">{formatPercent(averageProgress)}</strong></div>
        </div>
      </section>
      <Panel title="Task Workspace" subtitle="Standalone tasks, milestone groups, assignees, and subtasks">
        <div className="mb-5 grid grid-cols-1 gap-3 xl:grid-cols-[280px_minmax(0,1fr)]"><ProjectSelect projects={projects} value={selectedProjectId || projects[0]?.id || ""} onChange={setSelectedProjectId} allowEmpty={false} /><TaskFilters filters={filters} milestones={milestones} users={users} onChange={(next) => setFilters({ ...filters, ...next })} /></div>
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
          <div className="xl:col-span-3">
            <TaskGroupBoard milestones={groupedTasks} standaloneTasks={standaloneTasks} allTasks={tasks} selectedTaskId={selectedTask?.id ?? ""} onSelect={setSelectedTaskId} />
          </div>
          <div className="xl:col-span-1">
            <TaskDetail task={selectedTask} subtasks={subtasks} onEdit={() => setEditingTask(selectedTask)} onDelete={() => setConfirmTask(selectedTask)} onCreateSubtask={() => setSubtaskParent(selectedTask)} onUpdateStatus={(status) => auth && selectedTask ? void api.updateTaskStatus(auth.token, selectedTask.id, status).then(() => { setMessage("Task status updated."); refresh(); }) : undefined} />
          </div>
        </div>
      </Panel>
      <TaskFormDialog open={editingTask !== null} task={editingTask?.id ? editingTask : undefined} projects={projects} milestones={milestones} users={users} selectedProjectId={selectedProjectId || projects[0]?.id || ""} onClose={() => setEditingTask(null)} onSubmit={handleTaskSubmit} />
      <TaskFormDialog open={subtaskParent !== null} parentTaskId={subtaskParent?.id} projects={projects} milestones={milestones} users={users} selectedProjectId={selectedProjectId || projects[0]?.id || ""} onClose={() => setSubtaskParent(null)} onSubmit={handleSubtaskSubmit} />
      <ConfirmDialog title="Delete Task" message={`Delete ${confirmTask?.title}?`} open={confirmTask !== null} onClose={() => setConfirmTask(null)} onConfirm={() => auth && confirmTask ? (confirmTask.parentTaskId ? api.deleteSubtask(auth.token, confirmTask.id) : api.deleteTask(auth.token, confirmTask.id)).then(() => { setMessage(confirmTask.parentTaskId ? "Subtask deleted." : "Task deleted."); setConfirmTask(null); refresh(); }) : undefined} confirmLabel="Delete" />
    </div>
  );
}
