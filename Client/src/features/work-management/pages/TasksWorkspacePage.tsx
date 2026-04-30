import { useMemo, useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { ProjectSelect } from "../../../components/selectors/ProjectSelect";
import { ErrorPanel, LoadingPanel, Notice, Panel } from "../../../ui";
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
    <div className="grid grid-cols-12 gap-4 content-start">
      {message ? <Notice>{message}</Notice> : null}
      <Panel title="Task Workspace" subtitle="Standalone tasks, milestone groups, assignees, and subtasks">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3"><ProjectSelect projects={projects} value={selectedProjectId || projects[0]?.id || ""} onChange={setSelectedProjectId} allowEmpty={false} /><TaskFilters filters={filters} milestones={milestones} users={users} onChange={(next) => setFilters({ ...filters, ...next })} /></div>
        <div className="grid gap-5 lg:grid-cols-2">
          <TaskGroupBoard milestones={groupedTasks} standaloneTasks={standaloneTasks} allTasks={tasks} selectedTaskId={selectedTask?.id ?? ""} onSelect={setSelectedTaskId} />
          <TaskDetail task={selectedTask} subtasks={subtasks} onEdit={() => setEditingTask(selectedTask)} onDelete={() => setConfirmTask(selectedTask)} onCreateSubtask={() => setSubtaskParent(selectedTask)} onUpdateStatus={(status) => auth && selectedTask ? void api.updateTaskStatus(auth.token, selectedTask.id, status).then(() => { setMessage("Task status updated."); refresh(); }) : undefined} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2"><button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setEditingTask({} as Task)}>Create Task</button></div>
      </Panel>
      <TaskFormDialog open={editingTask !== null} task={editingTask?.id ? editingTask : undefined} projects={projects} milestones={milestones} users={users} selectedProjectId={selectedProjectId || projects[0]?.id || ""} onClose={() => setEditingTask(null)} onSubmit={handleTaskSubmit} />
      <TaskFormDialog open={subtaskParent !== null} parentTaskId={subtaskParent?.id} projects={projects} milestones={milestones} users={users} selectedProjectId={selectedProjectId || projects[0]?.id || ""} onClose={() => setSubtaskParent(null)} onSubmit={handleSubtaskSubmit} />
      <ConfirmDialog title="Delete Task" message={`Delete ${confirmTask?.title}?`} open={confirmTask !== null} onClose={() => setConfirmTask(null)} onConfirm={() => auth && confirmTask ? (confirmTask.parentTaskId ? api.deleteSubtask(auth.token, confirmTask.id) : api.deleteTask(auth.token, confirmTask.id)).then(() => { setMessage(confirmTask.parentTaskId ? "Subtask deleted." : "Task deleted."); setConfirmTask(null); refresh(); }) : undefined} confirmLabel="Delete" />
    </div>
  );
}
