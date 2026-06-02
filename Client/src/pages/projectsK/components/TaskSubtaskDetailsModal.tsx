import { useEffect, useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import type { Milestone, Project, Task, User } from "../../../types";
import { useToast } from "../../shared";
import { ModalOverlay } from "../../shared/ModalOverlay";
import { TaskSubtaskDetails } from "../../tasks/TaskSubtaskDetails";

interface TaskSubtaskDetailsModalProps {
  task: Task | null;
  project?: Project | null;
  milestone?: Milestone | null;
  users: User[];
  isAdmin: boolean;
  onClose: () => void;
  onEdit?: (task: Task) => void;
  onEscalate?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onMessage?: (message: string) => void;
}

export function TaskSubtaskDetailsModal({
  task,
  project,
  milestone,
  users,
  isAdmin,
  onClose,
  onEdit,
  onEscalate,
  onDelete,
  onMessage,
}: TaskSubtaskDetailsModalProps) {
  const { auth } = useAuth();
  const { addToast } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recommendation, setRecommendation] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [delay, setDelay] = useState<any>(null);
  const [resolvedTask, setResolvedTask] = useState<Task | null>(task);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResolvedTask(task);
  }, [task]);

  useEffect(() => {
    if (!auth || !task || !isAdmin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecommendation(null);
      setDelay(null);
      return;
    }
    let cancelled = false;
    Promise.all([
      api.getTaskRecommendation(auth.token, task.id).catch(() => null),
      api.getTaskDelayPrediction(auth.token, task.id).catch(() => null),
    ]).then(([rec, del]) => {
      if (cancelled) return;
      setRecommendation(rec);
      setDelay(del);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, task?.id, isAdmin]);

  if (!task) return null;

  const handleStatusChange = async (status: string, options?: { confirmReset?: boolean }) => {
    if (!auth) return;
    try {
      const updated = await api.updateTaskStatus(auth.token, task.id, status, { confirmReset: options?.confirmReset });
      if (options?.confirmReset) {
        addToast("Status updated and progress reset.");
        onMessage?.("Status updated and progress reset.");
      } else {
        addToast("Status updated.");
        onMessage?.("Status updated.");
      }
      setResolvedTask(updated);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Update failed";
      addToast(errorMsg, "error");
      onMessage?.(`Error: ${errorMsg}`);
    }
  };

  const handleUpdateProgress = async (progress: number, notes: string) => {
    void notes;
    if (!auth) return;
    try {
      const updated = await api.updateTaskProgress(auth.token, task.id, progress);
      addToast("Progress updated.");
      onMessage?.("Progress updated.");
      setResolvedTask(updated);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Update failed";
      addToast(errorMsg, "error");
      onMessage?.(`Error: ${errorMsg}`);
    }
  };

  const handleAddComment = async (comment: string) => {
    if (!auth) return;
    try {
      await api.addTaskComment(auth.token, task.id, comment);
      addToast("Comment added.");
      onMessage?.("Comment added.");
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Comment failed";
      addToast(errorMsg, "error");
      onMessage?.(`Error: ${errorMsg}`);
    }
  };

  const handleStartTimer = async (description: string) => {
    if (!auth) return;
    try {
      await api.startTaskTimer(auth.token, task.id, description);
      addToast("Timer started.");
      onMessage?.("Timer started.");
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Timer failed";
      addToast(errorMsg, "error");
      onMessage?.(`Error: ${errorMsg}`);
    }
  };

  const handleEscalate = async () => {
    if (!auth) return;
    try {
      const updated = await api.escalateTask(auth.token, task.id);
      addToast("Task escalated.");
      onMessage?.("Task escalated.");
      setResolvedTask(updated);
      onEscalate?.(task);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Escalation failed";
      addToast(errorMsg, "error");
      onMessage?.(`Error: ${errorMsg}`);
    }
  };

  const handleDelete = () => {
    if (onDelete) onDelete(task);
  };

  return (
    <ModalOverlay onClose={onClose} widthClassName="max-w-3xl">
      <div className="bg-white rounded-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200 p-5">
        <TaskSubtaskDetails
          task={resolvedTask ?? task}
          users={users}
          project={project}
          milestone={milestone}
          recommendation={recommendation}
          delay={delay}
          isAdmin={isAdmin}
          onStatusChange={handleStatusChange}
          onEdit={() => onEdit?.(task)}
          onUpdateProgress={handleUpdateProgress}
          onAddComment={handleAddComment}
          onStartTimer={handleStartTimer}
          onRefresh={() => setResolvedTask((prev) => (prev ? { ...prev } : prev))}
          onEscalate={handleEscalate}
          onMessage={onMessage}
          onClose={onClose}
          hideCloseButton
        />
        {isAdmin && onDelete && (
          <div className="border-t border-slate-100 pt-3 mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Delete task
            </button>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
