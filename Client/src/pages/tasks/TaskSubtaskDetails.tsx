import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiEdit,
  FiTrash2,
  FiClock,
  FiBarChart2,
  FiChevronDown,
  FiX,
  FiAlertTriangle,
  FiCalendar,
  FiFlag,
  FiNavigation,
  FiPlus,
  FiCheck,
  FiMessageSquare,
} from "react-icons/fi";
import type { Milestone, Project, Task, User } from "../../types";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { usePermission, useToast } from "../shared";
import { formatPercent, formatDate } from "../../ui";
import { AvatarStack, StatusBadge, PriorityBadge } from "../shared";
import { StatusBadgeMinimal } from "../shared/StatusBadgeMininmal";
import { StatusButtonsK } from "../shared/StatusBadgeK";
import { StatusDropdown } from "../nested/components/StatusDropdown";

interface TaskSubtaskDetailsProps {
  task: Task;
  users: User[];
  project?: Project | null;
  milestone?: Milestone | null;
  recommendation?: any;
  delay?: any;
  isAdmin?: boolean;
  permissionEdit?: string;
  onStatusChange: (status: string, options?: { confirmReset?: boolean }) => void;
  onEdit: () => void;
  onUpdateProgress: (progress: number, notes: string) => void;
  onAddComment: (comment: string) => void;
  onStartTimer: (description: string) => void;
  onRefresh: () => void;
  onEscalate: () => void;
  onMessage?: (message: string) => void;
  onClose?: () => void;
  hideCloseButton?: boolean;
}

export function TaskSubtaskDetails({
  task,
  users,
  project,
  milestone,
  recommendation,
  delay,
  isAdmin,
  permissionEdit,
  onStatusChange,
  onEdit,
  onUpdateProgress,
  onAddComment,
  onStartTimer,
  onRefresh,
  onEscalate,
  onMessage,
  onClose,
  hideCloseButton = false,
}: TaskSubtaskDetailsProps) {
  const perm = usePermission();
  const mayEdit = isAdmin ?? (permissionEdit ? perm.has(permissionEdit) : false);
  const { auth } = useAuth();
  const { addToast } = useToast();

  // Resolve assigned users
  const assignedUsers = (task.assignees && task.assignees.length > 0)
    ? task.assignees.map(a => ({ id: a.userId, fullName: a.fullName ?? undefined }))
    : (task.assignedToUserId ? [{ id: task.assignedToUserId, fullName: task.assignedToUserName ?? undefined }] : []);
  const assignedUsersResolved = assignedUsers.map(u => {
    const matchedUser = users.find(usr => usr.id === u.id);
    return {
      id: u.id,
      fullName: u.fullName || (matchedUser?.fullName ?? undefined),
      profilePictureUrl: matchedUser?.profilePictureUrl ?? null,
    };
  });

  const hasSubTasks = task.hasSubTasks ?? (task.subTasks && task.subTasks.length > 0);

  // Main task progress & comment (only used when no subtasks)
  const [progress, setProgress] = useState(Math.round(task.progressPercentage || 0));
  const [progressComment, setProgressComment] = useState("");
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Timer
  const [timerDescription, setTimerDescription] = useState("Focused execution block");
  const [showTimer, setShowTimer] = useState(false);

  // Subtasks
  const [subtasks, setSubtasks] = useState<Task[]>(task.subTasks || []);
  const [subtasksExpanded, setSubtasksExpanded] = useState(false);
  const [expandedSubtaskIds, setExpandedSubtaskIds] = useState<Set<string>>(new Set());
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [subtaskForm, setSubtaskForm] = useState({
    title: "",
    priority: "Medium",
    dueDate: "",
    assignedToUserId: "",
  });

  // AI & delay collapse
  const [aiExpanded, setAiExpanded] = useState(false);

  // "NotStarted" reset confirmation
  const [pendingNotStarted, setPendingNotStarted] = useState<string | null>(null);

  // Sync state when task updates
  useEffect(() => {
    setSubtasks(task.subTasks || []);
    setProgress(Math.round(task.progressPercentage || 0));
  }, [task.id, task.subTasks, task.progressPercentage]);

  // ---------- progress bar interactivity ----------
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mayEdit || hasSubTasks || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.round((x / rect.width) * 100);
    setProgress(Math.max(0, Math.min(100, pct)));
  };

  const handleProgressDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mayEdit || hasSubTasks) return;
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!progressBarRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = moveEvent.clientX - rect.left;
      const pct = Math.round((x / rect.width) * 100);
      setProgress(Math.max(0, Math.min(100, pct)));
    };
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // ---------- main progress update ----------
  const handleProgressUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasSubTasks) return;
    onUpdateProgress(progress, progressComment.trim());
    setProgressComment("");
  };

  // ---------- status dropdown ----------

  const handleMainStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value;
    if (
      nextStatus === "NotStarted" &&
      task.progressPercentage > 0 &&
      task.status !== "NotStarted"
    ) {
      setPendingNotStarted(nextStatus);
      return;
    }
    onStatusChange(nextStatus);
  };

  // ---------- timer ----------
  const handleStartTimer = () => {
    onStartTimer(timerDescription);
    setTimerDescription("Focused execution block");
    setShowTimer(false);
  };

  // ---------- subtask handlers ----------
  const handleCreateSubtask = async () => {
    if (!auth || !subtaskForm.title) return;
    const newSubtask = await api.createSubtask(auth.token, task.id, {
      ...subtaskForm,
      description: "",
      projectId: task.projectId,
      milestoneId: task.milestoneId,
      startDate: new Date().toISOString(),
      estimatedHours: 0,
    });
    setSubtasks(prev => [...prev, { ...newSubtask, hasSubTasks: false }]);
    setSubtaskForm({ title: "", priority: "Medium", dueDate: "", assignedToUserId: "" });
    setShowSubtaskForm(false);
    addToast("Subtask created.");
    onMessage?.("Subtask created.");
    onRefresh();
  };

  const handleSubtaskStatusChange = async (subtaskId: string, status: string) => {
    if (!auth) return;
    const updated = await api.updateSubtaskStatus(auth.token, subtaskId, status);
    setSubtasks(prev =>
      prev.map(s =>
        s.id === subtaskId
          ? { ...s, status: updated.status, progressPercentage: updated.progressPercentage, hasSubTasks: updated.hasSubTasks }
          : s
      )
    );
    addToast("Subtask status updated.");
    onMessage?.("Subtask status updated.");
    onRefresh();
  };

  const handleSubtaskToggleCompleted = async (subtaskId: string, currentlyCompleted: boolean) => {
    const nextStatus = currentlyCompleted ? "InProgress" : "Completed";
    await handleSubtaskStatusChange(subtaskId, nextStatus);
  };

  const handleSubtaskProgressUpdate = async (subtaskId: string, value: number, comment?: string) => {
    if (!auth) return;
    const updated = await api.updateSubtaskProgress(auth.token, subtaskId, value);
    setSubtasks(prev =>
      prev.map(s =>
        s.id === subtaskId
          ? { ...s, progressPercentage: updated.progressPercentage, status: updated.status, hasSubTasks: updated.hasSubTasks }
          : s
      )
    );
    if (comment && comment.trim()) {
      await api.addTaskComment(auth.token, subtaskId, comment);
    }
    onRefresh();
  };

  const handleSubtaskAddCommentOnly = async (subtaskId: string, text: string) => {
    if (!auth || !text.trim()) return;
    await api.addTaskComment(auth.token, subtaskId, text);
    addToast("Comment added to subtask.");
    onMessage?.("Comment added to subtask.");
    onRefresh();
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!auth) return;
    if (!confirm("Delete this subtask?")) return;
    await api.deleteSubtask(auth.token, subtaskId);
    setSubtasks(prev => prev.filter(s => s.id !== subtaskId));
    setExpandedSubtaskIds(prev => {
      const next = new Set(prev);
      next.delete(subtaskId);
      return next;
    });
    addToast("Subtask deleted.");
    onMessage?.("Subtask deleted.");
    onRefresh();
  };

  const toggleSubtaskExpand = (id: string) => {
    setExpandedSubtaskIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ---------- progress bar colors ----------
  const progressColor = progress >= 80
    ? "from-emerald-400 to-emerald-500"
    : progress >= 50
      ? "from-cyan-400 to-cyan-500"
      : progress >= 25
        ? "from-amber-400 to-amber-500"
        : "from-rose-400 to-rose-500";

  return (
    <div className="flex flex-col gap-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
      {/* ========== MAIN CARD ========== */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60 relative">
        {onClose && !hideCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <FiX className="w-5 h-5" />
          </button>
        )}

        {/* Title, actions */}
        <div className="flex items-start justify-between mb-3 pr-6">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900">
              {task.title}
              {hasSubTasks && (
                <span className="ml-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-600">
                  {subtasks.length} subtask{subtasks.length !== 1 ? "s" : ""}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <StatusBadgeMinimal status={task.status} />
              <PriorityBadge priority={task.priority} />
              {task.isOverdue && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-600 animate-pulse">
                  Overdue
                </span>
              )}
            </div>
          </div>
          {mayEdit && (
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={onEdit} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="Edit task">
                <FiEdit className="w-4 h-4" />
              </button>
              <button onClick={onEscalate} className="p-2 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600" title="Escalate">
                <FiAlertTriangle className="w-4 h-4" />
              </button>
              <button
                onClick={() => { if (confirm("Delete task?")) onRefresh(); }}
                className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                title="Delete task"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {task.description && (
          <p className="text-sm text-slate-600 mb-3 line-clamp-2">{task.description}</p>
        )}

        {/* Info chips */}
        <div className="flex flex-wrap gap-2 mb-3">
          <InfoChip icon={<FiNavigation className="w-3.5 h-3.5" />} label="Project" value={project?.name || task.projectName || "N/A"} />
          <InfoChip icon={<FiFlag className="w-3.5 h-3.5" />} label="Milestone" value={milestone?.name || "None"} />
          <InfoChip icon={<FiCalendar className="w-3.5 h-3.5" />} label="Due" value={task.dueDate ? formatDate(task.dueDate) : "Not set"} />
          {assignedUsersResolved.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-xs">
              <AvatarStack people={assignedUsersResolved} size="xs" />
              <span className="text-slate-600 font-medium truncate max-w-[120px]">
                {assignedUsersResolved.map(u => u.fullName).join(", ")}
              </span>
            </div>
          )}
        </div>

        {/* Editable progress bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500 font-medium">
              Progress{hasSubTasks && <span className="ml-1 text-indigo-500">(auto)</span>}
            </span>
            <span className="font-bold text-slate-700">{progress}%</span>
          </div>
          <div
            ref={progressBarRef}
            className={`w-full h-2.5 rounded-full bg-slate-100 overflow-hidden relative ${!hasSubTasks && mayEdit ? "cursor-pointer group" : ""
              }`}
            onClick={handleProgressBarClick}
            onMouseDown={handleProgressDrag}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`h-full rounded-full bg-gradient-to-r ${progressColor}`}
            />
            {!hasSubTasks && mayEdit && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-3 h-3 bg-white rounded-full shadow border border-slate-300" />
              </div>
            )}
          </div>
        </div>

        {/* Status dropdown (if mayEdit) */}
        {mayEdit ? (
          <div className="mt-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Status</label>
            <StatusDropdown
              currentStatus={task.status}
              onChange={handleMainStatusChange}
            />
          </div>
        ) : (
          <div className="mt-2">
            <StatusBadgeMinimal status={task.status} />
          </div>
        )}

        {/* Escalated / delay warnings */}
        {task.isEscalated && (
          <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200 text-xs flex items-center gap-2">
            <FiAlertTriangle className="text-red-500 w-4 h-4" />
            <span className="font-semibold text-red-700">Escalated</span>
            <span className="ml-auto text-red-500">Lv.{task.escalationLevel}</span>
          </div>
        )}
      </div>

      {/* "Not Started" reset confirmation */}
      <AnimatePresence>
        {pendingNotStarted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-sm"
          >
            <div className="flex gap-2 items-start">
              <FiAlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-800">Reset progress warning</p>
                <p className="text-xs text-amber-700 mt-1">
                  This will reset progress to 0% for this task{hasSubTasks ? " and all subtasks" : ""}. Continue?
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      onStatusChange(pendingNotStarted, { confirmReset: true });
                      setPendingNotStarted(null);
                    }}
                    className="px-3 py-1 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                  >
                    Yes, reset
                  </button>
                  <button
                    onClick={() => setPendingNotStarted(null)}
                    className="px-3 py-1 text-xs font-semibold bg-white border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Combined Progress + Comment (only when no subtasks) ===== */}
      {!hasSubTasks && mayEdit && (
        <form onSubmit={handleProgressUpdate} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <FiMessageSquare className="w-3.5 h-3.5" /> Comment
          </div>
          <textarea
            value={progressComment}
            onChange={(e) => setProgressComment(e.target.value)}
            placeholder="Add a comment with this update..."
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-300 resize-none"
          />
          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
          >
            Update Progress ({progress}%)
          </button>
        </form>
      )}

      {/* ===== Subtasks ===== */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
        <button
          onClick={() => setSubtasksExpanded(!subtasksExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">Subtasks</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
              {subtasks.length}
            </span>
          </div>
          <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${subtasksExpanded ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence initial={false}>
          {subtasksExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden border-t border-slate-100"
            >
              <div className="px-4 py-2 space-y-2">
                {subtasks.length === 0 && (
                  <p className="text-xs text-slate-400 italic py-2">No subtasks yet.</p>
                )}
                {subtasks.map(subtask => {
                  const isCompleted = subtask.status === "Completed";
                  const isExpanded = expandedSubtaskIds.has(subtask.id);
                  return (
                    <div key={subtask.id} className="border border-slate-100 rounded-lg overflow-hidden">
                      {/* Subtask row */}
                      <div className="flex items-center gap-2 p-2 bg-slate-50/50">
                        {mayEdit && (
                          <button
                            onClick={() => handleSubtaskToggleCompleted(subtask.id, isCompleted)}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${isCompleted
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "bg-white border-slate-300 hover:border-indigo-400"
                              }`}
                          >
                            {isCompleted && <FiCheck className="w-3 h-3" />}
                          </button>
                        )}
                        <button
                          onClick={() => toggleSubtaskExpand(subtask.id)}
                          className="flex-1 text-left flex items-center gap-2 min-w-0"
                        >
                          <span className={`text-sm truncate ${isCompleted ? "text-slate-400 line-through" : "text-slate-700"}`}>
                            {subtask.title}
                          </span>
                        </button>
                        {/* Mini progress bar */}
                        <div className="w-12 h-1 rounded-full bg-slate-200 overflow-hidden hidden sm:block">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-500"
                            style={{ width: `${subtask.progressPercentage || 0}%` }}
                          />
                        </div>
                        <StatusBadge status={subtask.status} />
                        <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        {mayEdit && (
                          <button
                            onClick={() => handleDeleteSubtask(subtask.id)}
                            className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-500"
                          >
                            <FiX className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {/* Expanded subtask editing */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            className="overflow-hidden bg-white border-t border-slate-100"
                          >
                            <div className="px-3 py-3 space-y-2">
                              {/* Editable progress bar for subtask */}
                              {mayEdit && (
                                <SubtaskProgressBar
                                  value={subtask.progressPercentage || 0}
                                  onChange={(val) => handleSubtaskProgressUpdate(subtask.id, val)}
                                />
                              )}
                              {/* Subtask comment */}
                              <div className="flex gap-2 items-start">
                                <FiMessageSquare className="w-4 h-4 text-slate-400 mt-1.5" />
                                <div className="flex-1 flex gap-2">
                                  <input
                                    placeholder="Add a comment..."
                                    className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-300"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                                        handleSubtaskAddCommentOnly(subtask.id, (e.target as HTMLInputElement).value);
                                        (e.target as HTMLInputElement).value = "";
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={(e) => {
                                      const input = (e.currentTarget.previousSibling as HTMLInputElement);
                                      if (input.value.trim()) {
                                        handleSubtaskAddCommentOnly(subtask.id, input.value);
                                        input.value = "";
                                      }
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                                  >
                                    Post
                                  </button>
                                </div>
                              </div>
                         
                              {/* Subtask status dropdown */}
                              {mayEdit && (
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Status</label>
                                  <StatusDropdown
                                    currentStatus={subtask.status}
                                    onChange={(status) => handleSubtaskStatusChange(subtask.id, status)}
                                  />
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
                {mayEdit && (
                  showSubtaskForm ? (
                    <div className="flex gap-2 pt-1">
                      <input
                        value={subtaskForm.title}
                        onChange={(e) => setSubtaskForm({ ...subtaskForm, title: e.target.value })}
                        placeholder="Subtask title"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-300"
                      />
                      <button onClick={handleCreateSubtask} disabled={!subtaskForm.title} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                        Add
                      </button>
                      <button onClick={() => setShowSubtaskForm(false)} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSubtaskForm(true)}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-1"
                    >
                      <FiPlus className="w-3.5 h-3.5" /> Add subtask
                    </button>
                  )
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== Timer ===== */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
        <button
          onClick={() => setShowTimer(!showTimer)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <FiClock className="w-3.5 h-3.5" /> Timer
          </div>
          <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showTimer ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence initial={false}>
          {showTimer && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden border-t border-slate-100"
            >
              <div className="px-4 py-3 space-y-2">
                <input
                  value={timerDescription}
                  onChange={(e) => setTimerDescription(e.target.value)}
                  placeholder="What are you working on?"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-300"
                />
                <button onClick={handleStartTimer} className="w-full py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 flex items-center justify-center gap-2">
                  <FiClock className="w-4 h-4" /> Start Timer
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== AI Insights ===== */}
      {(recommendation || delay) && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
          <button
            onClick={() => setAiExpanded(!aiExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
              <FiBarChart2 className="w-3.5 h-3.5" /> AI Insights
              {(delay || task.isEscalated) && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </div>
            <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${aiExpanded ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence initial={false}>
            {aiExpanded && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden border-t border-slate-100"
              >
                <div className="px-4 py-3 space-y-2">
                  {delay && (
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2">
                      <FiClock className="text-amber-500 w-4 h-4" />
                      <span className="text-sm font-medium text-amber-700">Delay Risk</span>
                      <span className="ml-auto text-sm font-bold text-amber-600">
                        {formatPercent(delay.delayProbability * 100)}
                      </span>
                    </div>
                  )}
                  {recommendation && (
                    <div>
                      <p className="text-sm text-indigo-800 font-medium mb-1">Recommendation</p>
                      <p className="text-sm text-indigo-700">{recommendation.message}</p>
                      {recommendation.suggestedActions?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {recommendation.suggestedActions.map((action: string) => (
                            <span key={action} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-700">
                              {action}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/** Small inline progress bar for subtask editing */
function SubtaskProgressBar({ value, onChange }: { value: number; onChange: (val: number) => void }) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-8">{value}%</span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={handleChange}
        className="flex-1 h-1.5 rounded-full appearance-none bg-slate-200 cursor-pointer [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:shadow"
      />
    </div>
  );
}

function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-xs">
      <span className="text-slate-400">{icon}</span>
      <span className="text-slate-400">{label}:</span>
      <span className="font-medium text-slate-700 truncate max-w-[120px]">{value}</span>
    </div>
  );
}