import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { Project, Task, User } from "../../types";
import {
  EmptyState,
  MetricRow,
  Notice,
  Panel,
  TaskList,
  classNames,
  formatDate,
  formatPercent,
  ghostButtonClass,
} from "../../ui";
import { taskStatuses } from "../constants";

export function TasksPage() {
  const { auth, hasRole } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [delay, setDelay] = useState<any>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    startDate: "",
    dueDate: "",
    estimatedHours: 8,
    projectId: "",
    milestoneId: null as string | null,
    parentTaskId: null as string | null,
    assignedToUserId: "",
    priority: "Medium"
  });
  const [progressForm, setProgressForm] = useState({ progressPercentage: 50, notes: "" });
  const [comment, setComment] = useState("");
  const [timerDescription, setTimerDescription] = useState("Focused execution block");
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  async function loadTasks(projectId?: string) {
    if (!auth) return;
    const [projectData, userData] = await Promise.all([
      api.getProjects(auth.token),
      hasRole("SuperAdmin", "ProjectManager", "DepartmentHead", "TeamLead") ? api.getAvailableUsers(auth.token) : Promise.resolve([]),
    ]);
    setProjects(projectData);
    setUsers(userData as User[]);
    const activeProjectId = projectId || selectedProjectId || projectData[0]?.id;
    if (activeProjectId) {
      setSelectedProjectId(activeProjectId);
      const taskData = await api.getTasksByProject(auth.token, activeProjectId);
      setTasks(taskData);
      if (taskData[0] && !selectedTaskId) setSelectedTaskId(taskData[0].id);
    } else {
      setTasks(await api.getMyTasks(auth.token));
    }
  }

  useEffect(() => {
    void loadTasks().catch((cause) => setMessage(cause instanceof Error ? cause.message : "Failed to load tasks."));
  }, [auth]);

  useEffect(() => {
    if (!auth || !selectedTaskId || !hasRole("SuperAdmin", "ProjectManager", "DepartmentHead", "TeamLead")) return;
    Promise.all([api.getTaskRecommendation(auth.token, selectedTaskId), api.getTaskDelayPrediction(auth.token, selectedTaskId)]).then(([recommendationData, delayData]) => {
      setRecommendation(recommendationData);
      setDelay(delayData);
    });
  }, [auth, selectedTaskId]);

  return (
    <div className="grid gap-4 content-start">
      <Panel title="Task Command Center" subtitle="Assignments, progress, comments, timers, and escalation">
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h4>Project Queue</h4>
              <select value={selectedProjectId} onChange={(event) => void loadTasks(event.target.value)}>
                {projects.map((project) => (<option key={project.id} value={project.id}>{project.name}</option>))}
              </select>
            </div>
            <TaskList tasks={tasks} onPick={setSelectedTaskId} selectedId={selectedTaskId} />
          </div>
          <div>
            {selectedTask ? (
              <div className="rounded-lg border border-[var(--pmwds-border)] bg-[var(--pmwds-surface-2)]/86 p-5 shadow-xl shadow-black/15">
                <h4>{selectedTask.title}</h4>
                <p>{selectedTask.description || "No task description yet."}</p>
                <MetricRow label="Project" value={selectedTask.projectName || "Unlinked"} />
                <MetricRow label="Assignee" value={selectedTask.assignedToUserName || selectedTask.assignedToUserId || "Unassigned"} />
                <MetricRow label="Progress" value={formatPercent(selectedTask.progressPercentage)} />
                <MetricRow label="Priority" value={selectedTask.priority} />
                <MetricRow label="Due" value={formatDate(selectedTask.dueDate)} />
                <MetricRow label="Delay Risk" value={formatPercent(selectedTask.aiDelayProbability * 100)} />
                <div className="mt-4 flex flex-wrap gap-2">
                  {taskStatuses.map((status) => (
                    <button
                      key={status}
                      className={classNames(ghostButtonClass, selectedTask.status === status && "border-sky-300/60 bg-sky-300/10 text-sky-100")}
                      onClick={async () => {
                        if (!auth) return;
                        await api.updateTaskStatus(auth.token, selectedTask.id, status);
                        await loadTasks(selectedProjectId);
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
                <form
                  className="grid grid-cols-1 gap-3 md:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!auth || !selectedTask) return;
                    void api.updateTaskProgress(auth.token, selectedTask.id, progressForm.progressPercentage, progressForm.notes).then(() => loadTasks(selectedProjectId));
                  }}
                >
                  <label><span>Progress</span><input type="number" min={0} max={100} value={progressForm.progressPercentage} onChange={(event) => setProgressForm({ ...progressForm, progressPercentage: Number(event.target.value) })} /></label>
                  <label><span>Notes</span><input value={progressForm.notes} onChange={(event) => setProgressForm({ ...progressForm, notes: event.target.value })} /></label>
                  <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" type="submit">Update Progress</button>
                </form>
                {hasRole("SuperAdmin", "ProjectManager", "DepartmentHead", "TeamLead") ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <input type="file" onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} />
                    <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={async () => { if (!auth || !attachment) return; await api.uploadTaskAttachment(auth.token, selectedTask.id, attachment); setMessage("Attachment uploaded."); }}>Upload</button>
                  </div>
                ) : null}
                {recommendation ? (
                  <div className="mt-4 rounded-lg border border-[var(--pmwds-border)] bg-[var(--pmwds-surface-2)]/86 p-5 shadow-xl shadow-black/15 nested">
                    <h4>AI Recommendation</h4>
                    <p>{recommendation.message}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(recommendation.suggestedActions ?? []).map((action: string) => (<span className="inline-flex rounded-full bg-sky-300/10 px-2.5 py-1 text-xs font-medium text-sky-200 ring-1 ring-sky-300/15" key={action}>{action}</span>))}
                    </div>
                  </div>
                ) : null}
                {delay ? (
                  <div className="mt-4 rounded-lg border border-[var(--pmwds-border)] bg-[var(--pmwds-surface-2)]/86 p-5 shadow-xl shadow-black/15 nested">
                    <h4>Delay Prediction</h4>
                    <p>Probability: {formatPercent(delay.delayProbability * 100)}</p>
                    <p className="text-xs text-slate-400">{delay.predictedCompletionDate ? `Est. completion: ${formatDate(delay.predictedCompletionDate)}` : ""}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState title="No task selected" description="Select a task to view details." />
            )}
          </div>
        </div>
      </Panel>

      {selectedTask && hasRole("SuperAdmin", "ProjectManager", "DepartmentHead", "TeamLead") && selectedProjectId ? (
        <Panel title="Add Comment" subtitle="Log work or observations">
          <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); if (!auth || !selectedTaskId) return; void api.addTaskComment(auth.token, selectedTaskId, comment).then(() => setComment("")); }}>
            <label><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment..." rows={3} /></label>
            <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" type="submit">Add Comment</button>
          </form>
        </Panel>
      ) : null}

      {selectedTask && hasRole("SuperAdmin", "ProjectManager", "DepartmentHead") && selectedProjectId ? (
        <Panel title="Timer" subtitle="Track time spent">
          <div className="grid gap-3">
            <label><span>Description</span><input value={timerDescription} onChange={(event) => setTimerDescription(event.target.value)} /></label>
            <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={async () => { if (!auth || !selectedTaskId) return; await api.startTaskTimer(auth.token, selectedTaskId, timerDescription); setMessage("Timer started."); }}>Start Timer</button>
          </div>
        </Panel>
      ) : null}

      {selectedProjectId && hasRole("SuperAdmin", "ProjectManager", "DepartmentHead", "TeamLead") ? (
        <Panel title="Create Task" subtitle="Add task to selected project">
          <form
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!auth) return;
              setForm({ ...form, projectId: selectedProjectId });
              void api.createTask(auth.token, form).then(() => loadTasks(selectedProjectId));
            }}
          >
            <label><span>Title</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
            <label><span>Assignee</span><select value={form.assignedToUserId} onChange={(event) => setForm({ ...form, assignedToUserId: event.target.value })}><option value="">Unassigned</option>{users.map((user) => (<option key={user.id} value={user.id}>{user.fullName}</option>))}</select></label>
            <label><span>Start Date</span><input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label>
            <label><span>Due Date</span><input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
            <label><span>Estimated Hours</span><input type="number" value={form.estimatedHours} onChange={(event) => setForm({ ...form, estimatedHours: Number(event.target.value) })} /></label>
            <label><span>Priority</span><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label>
            <label className="md:col-span-2"><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2" type="submit">Create Task</button>
          </form>
        </Panel>
      ) : null}

      {message ? <Notice>{message}</Notice> : null}
    </div>
  );
}