import { useEffect, useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import type { Task } from "../../../types";
import { getPriorityColor, getStatusColor, useToast } from "../../shared";

interface TaskSubtaskCardProps {
  task: Task;
  canEdit: boolean;
  onViewTask?: (task: Task) => void;
  onEditTask?: (task: Task) => void;
  getProgressColor: (progress: number) => string;
  onAddSubtask?: (parentTaskId: string) => void;
}

export function TaskSubtaskCard({
  task,
  canEdit,
  onViewTask,
  onEditTask,
  getProgressColor,
  onAddSubtask,
}: TaskSubtaskCardProps) {
  const { auth } = useAuth();
  const { addToast } = useToast();
  const priorityColor = getPriorityColor(task.priority);
  const statusColors = getStatusColor(task.status);

  const [expanded, setExpanded] = useState(false);
  const [subtasks, setSubtasks] = useState<Task[]>(task.subTasks ?? []);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const hasSubtasks = (task.subTasks?.length ?? 0) > 0 || subtasks.length > 0;

  useEffect(() => {
    if (loaded || !auth || !hasSubtasks) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api
      .getSubtasks(auth.token, task.id)
      .then((list) => {
        setSubtasks(list);
        setLoaded(true);
      })
      .catch(() => {
        setSubtasks(task.subTasks ?? []);
        setLoaded(true);
      })
      .finally(() => setLoading(false));
  }, [loaded, auth, task.id, hasSubtasks, task.subTasks]);

  const refreshSubtasks = async () => {
    if (!auth) return;
    try {
      const list = await api.getSubtasks(auth.token, task.id);
      setSubtasks(list);
    } catch {
      /* ignore */
    }
  };

  const handleCreateSubtask = async () => {
    if (!auth || !newTitle.trim()) return;
    try {
      await api.createSubtask(auth.token, task.id, {
        title: newTitle.trim(),
        projectId: task.projectId,
        milestoneId: task.milestoneId,
        priority: "Medium",
        startDate: new Date().toISOString(),
      });
      setNewTitle("");
      setShowInlineForm(false);
      addToast("Subtask created");
      await refreshSubtasks();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to create subtask", "error");
    }
  };

  const handleSubtaskStatus = async (subtaskId: string, status: string) => {
    if (!auth) return;
    try {
      await api.updateSubtaskStatus(auth.token, subtaskId, status);
      setSubtasks((prev) => prev.map((s) => (s.id === subtaskId ? { ...s, status } : s)));
      addToast("Subtask status updated");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to update subtask", "error");
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!auth) return;
    try {
      await api.deleteSubtask(auth.token, subtaskId);
      setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
      addToast("Subtask deleted");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to delete subtask", "error");
    }
  };

  const handleCardOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewTask?.(task);
  };

  const stopRowClick = (handler?: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    handler?.();
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-500 hover:shadow-blue-300 transition-shadow duration-200">
      {/* Title + progress — clickable to open the task details modal */}
      <div
        className={onViewTask ? "cursor-pointer" : ""}
        onClick={handleCardOpen}
        role={onViewTask ? "button" : undefined}
        tabIndex={onViewTask ? 0 : -1}
        onKeyDown={(e) => {
          if (onViewTask && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onViewTask(task);
          }
        }}
      >
        <h4 className="text-sm font-medium text-slate-700 mb-3 leading-snug">{task.title}</h4>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-slate-400 font-medium">Progress</span>
            <span className="text-[10px] font-semibold text-slate-600">
              {task.progressPercentage}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className={`${getProgressColor(task.progressPercentage)} h-1.5 rounded-full transition-all duration-300`}
              style={{ width: `${task.progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Subtask strip + expanded list — interactions do NOT open the modal */}
      {hasSubtasks && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`mb-3 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 ${
            expanded ? "bg-indigo-50/60" : "bg-slate-50"
          }`}
        >
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center gap-2 min-w-0 flex-1 text-left"
            aria-expanded={expanded}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Subtasks
            </span>
            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
              {subtasks.length}
            </span>
            {!expanded && subtasks.length > 0 && (
              <span className="text-[10px] text-slate-500 truncate">
                {subtasks.slice(0, 2).map((s) => s.title).join(", ")}
                {subtasks.length > 2 ? "…" : ""}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="shrink-0"
            aria-label={expanded ? "Collapse subtasks" : "Expand subtasks"}
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 text-slate-500 ${
                expanded ? "rotate-90 text-indigo-600" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {((expanded && hasSubtasks) || showInlineForm) && (
        <div className="mb-3 space-y-2 border-t border-slate-100 pt-3" onClick={(e) => e.stopPropagation()}>
          {loading && (
            <div className="text-[10px] text-slate-400 px-1">Loading subtasks…</div>
          )}
          {!loading &&
            subtasks.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColors.dot}`}
                    title={sub.status}
                  />
                  <span className="text-xs text-slate-700 truncate">{sub.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-16 bg-slate-200 rounded-full h-1 overflow-hidden">
                    <div
                      className={`${getProgressColor(sub.progressPercentage || 0)} h-1 rounded-full`}
                      style={{ width: `${sub.progressPercentage || 0}%` }}
                    />
                  </div>
                  {canEdit ? (
                    <select
                      value={sub.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleSubtaskStatus(sub.id, e.target.value)}
                      className="text-[10px] border border-slate-200 rounded px-1 py-0.5 bg-white"
                    >
                      {["NotStarted", "InProgress", "Completed", "Delayed", "OnHold", "Cancelled"].map(
                        (s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ),
                      )}
                    </select>
                  ) : (
                    <span className={`text-[10px] font-medium ${statusColors.text}`}>
                      {sub.status}
                    </span>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={stopRowClick(() => handleDeleteSubtask(sub.id))}
                      className="p-1 text-slate-400 hover:text-red-500"
                      title="Delete subtask"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}

          {canEdit && !onAddSubtask && showInlineForm && (
            <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleCreateSubtask();
                  }
                }}
                placeholder="New subtask title"
                className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-400"
                autoFocus
              />
              <button
                type="button"
                onClick={handleCreateSubtask}
                className="px-3 py-1.5 bg-indigo-600 text-white text-[11px] rounded-lg font-medium hover:bg-indigo-700"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowInlineForm(false);
                  setNewTitle("");
                }}
                className="px-2 py-1.5 text-slate-500 text-[11px] rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bottom action row: priority, edit, add subtask, assignee */}
      <div
        className="flex items-center justify-between border-t border-slate-100 pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${priorityColor.bg} ${priorityColor.text} ${priorityColor.border}`}
        >
          {task.priority}
        </span>

        <div className="flex items-center gap-1.5">
          {canEdit &&
            (onAddSubtask ? (
              <button
                type="button"
                title="Add subtask"
                onClick={() => onAddSubtask(task.id)}
                className="p-1 text-slate-400 hover:text-indigo-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                title="Add subtask"
                onClick={() => {
                  setShowInlineForm(true);
                  setExpanded(true);
                }}
                className="p-1 text-slate-400 hover:text-indigo-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
            ))}

          {canEdit && onEditTask && (
            <button
              type="button"
              title="Edit task"
              onClick={() => onEditTask(task)}
              className="p-1 text-slate-400 hover:text-amber-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}

          {task.assignees?.[0] && (
            <div
              className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 text-[9px] font-semibold flex items-center justify-center ml-1"
              title={task.assignees[0].fullName ?? "Assignee"}
            >
              {(task.assignees[0].fullName ?? "?").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
