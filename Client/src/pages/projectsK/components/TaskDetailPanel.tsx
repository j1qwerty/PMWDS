import { useEffect, useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import type { Milestone, Task, User } from "../../../types";
import { formatDate } from "../../../ui";
import { GlassCard, getStatusColor, PriorityBadge, StatusBadge, useToast } from "../../shared";

interface TaskDetailPanelProps {
  task: Task | null;
  milestone?: Milestone | null;
  users: User[];
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
  onRefresh: () => void;
}

export function TaskDetailPanel({
  task,
  milestone,
  users,
  canManage,
  onEdit,
  onDelete,
  onStatusChange,
  onRefresh,
}: TaskDetailPanelProps) {
  const { auth } = useAuth();
  const { addToast } = useToast();
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");

  useEffect(() => {
    if (!task || !auth) {
      setSubtasks([]);
      return;
    }
    api
      .getTask(auth.token, task.id)
      .then((full) => setSubtasks(full.subTasks || []))
      .catch(() => setSubtasks(task.subTasks || []));
  }, [task?.id, auth]);

  if (!task) {
    return (
      <GlassCard className="p-5">
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <span className="material-symbols-outlined text-4xl mb-2">task</span>
          <p className="text-sm font-medium">Select a task</p>
          <p className="text-xs mt-1">Open from the board to view details</p>
        </div>
      </GlassCard>
    );
  }

  const statusColors = getStatusColor(task.status);
  const assigneeName =
    task.assignees?.[0]?.fullName || task.assignedToUserName || users.find((u) => u.id === task.assignedToUserId)?.fullName || "Unassigned";

  const handleCreateSubtask = async () => {
    if (!auth || !subtaskTitle.trim()) return;
    try {
      await api.createSubtask(auth.token, task.id, {
        title: subtaskTitle,
        projectId: task.projectId,
        milestoneId: task.milestoneId,
        priority: "Medium",
        startDate: new Date().toISOString(),
      });
      setSubtaskTitle("");
      setShowSubtaskForm(false);
      addToast("Subtask created");
      onRefresh();
    } catch {
      addToast("Failed to create subtask", "error");
    }
  };

  const handleSubtaskStatus = async (subtaskId: string, status: string) => {
    if (!auth) return;
    await api.updateSubtaskStatus(auth.token, subtaskId, status);
    setSubtasks((prev) => prev.map((s) => (s.id === subtaskId ? { ...s, status } : s)));
    addToast("Subtask updated");
  };

  return (
    <GlassCard className="p-5 sticky top-20">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-base font-bold text-slate-900 leading-snug">{task.title}</h3>
        {canManage && (
          <div className="flex gap-1 shrink-0">
            <button type="button" onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
              <span className="material-symbols-outlined text-lg">edit</span>
            </button>
            <button type="button" onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
              <span className="material-symbols-outlined text-lg">delete</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <StatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />
      </div>

      {task.description && <p className="text-sm text-slate-600 mb-4">{task.description}</p>}

      <dl className="space-y-2 text-sm mb-4">
        <Row label="Assignee" value={assigneeName} />
        <Row label="Milestone" value={milestone?.name || task.milestoneName || "—"} />
        <Row label="Due" value={task.dueDate ? formatDate(task.dueDate) : "—"} />
        <Row label="Progress" value={`${task.progressPercentage}%`} />
      </dl>

      {canManage && (
        <div className="mb-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Status</p>
          <div className="flex flex-wrap gap-1">
            {["NotStarted", "InProgress", "Completed", "Delayed", "OnHold", "Cancelled"].map((status) => (
              <button
                key={status}
                type="button"
                disabled={task.status === status}
                onClick={() => onStatusChange(status)}
                className={`px-2 py-1 rounded-lg text-[10px] font-medium border ${
                  task.status === status ? `${statusColors.bg} ${statusColors.text}` : "border-slate-200 text-slate-500 hover:border-indigo-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Subtasks ({subtasks.length})</p>
          {canManage && (
            <button type="button" onClick={() => setShowSubtaskForm(!showSubtaskForm)} className="text-xs text-indigo-600 font-medium">
              {showSubtaskForm ? "Cancel" : "Add"}
            </button>
          )}
        </div>
        {showSubtaskForm && (
          <div className="flex gap-2 mb-3">
            <input
              value={subtaskTitle}
              onChange={(e) => setSubtaskTitle(e.target.value)}
              placeholder="Subtask title"
              className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1.5"
            />
            <button type="button" onClick={handleCreateSubtask} className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg font-medium">
              Save
            </button>
          </div>
        )}
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {subtasks.map((sub) => (
            <div key={sub.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-sm">
              <span className="truncate text-slate-700">{sub.title}</span>
              {canManage ? (
                <select
                  value={sub.status}
                  onChange={(e) => handleSubtaskStatus(sub.id, e.target.value)}
                  className="text-[10px] border border-slate-200 rounded px-1"
                >
                  {["NotStarted", "InProgress", "Completed"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-[10px] text-slate-500">{sub.status}</span>
              )}
            </div>
          ))}
          {subtasks.length === 0 && !showSubtaskForm && <p className="text-xs text-slate-400">No subtasks</p>}
        </div>
      </div>
    </GlassCard>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-800 text-right truncate">{value}</dd>
    </div>
  );
}
