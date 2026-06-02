import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiEdit, FiTrash2, FiClock, FiBarChart2, FiMessageSquare, FiChevronDown, FiX, FiAlertTriangle, FiCalendar, FiFlag, FiNavigation, FiPlus, FiCheck } from "react-icons/fi";
import type { Milestone, Project, Task, User } from "../../types";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { useToast } from "../shared";
import { formatPercent, formatDate } from "../../ui";
import { AvatarStack, StatusButtons, StatusBadge, PriorityBadge } from "../shared";
import { StatusBadgeMinimal, StatusButtonsMin } from "../shared/StatusBadgeMininmal";
import { SubtaskUpdatePanel } from "./SubtaskUpdatePanel";
import { StatusBadgeK, StatusButtonsK } from "../shared/StatusBadgeK";

interface TaskSubtaskDetailsProps {
  task: Task;
  users: User[];
  allTasks?: Task[];
  project?: Project | null;
  milestone?: Milestone | null;
  recommendation?: any;
  delay?: any;
  isAdmin: boolean;
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
  const { auth } = useAuth();
  const { addToast } = useToast();
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

  const [progress, setProgress] = useState(Math.round(task.progressPercentage || 0));
  const [progressInput, setProgressInput] = useState(String(Math.round(task.progressPercentage || 0)));
  const [comment, setComment] = useState("");
  const [timerDescription, setTimerDescription] = useState("Focused execution block");
  const [activeTab, setActiveTab] = useState<"progress" | "comments" | "timer">("progress");
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [subtasks, setSubtasks] = useState<Task[]>(task.subTasks || []);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [subtaskForm, setSubtaskForm] = useState({ title: "", priority: "Medium", dueDate: "", assignedToUserId: "" });
  const [pendingNotStarted, setPendingNotStarted] = useState<string | null>(null);

  const [expandedSubtaskIds, setExpandedSubtaskIds] = useState<Set<string>>(new Set());

  const toggleSubtask = (id: string) => {
    setExpandedSubtaskIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    setSubtasks(task.subTasks || []);
    setProgress(Math.round(task.progressPercentage || 0));
    setProgressInput(String(Math.round(task.progressPercentage || 0)));
  }, [task.id, task.subTasks, task.progressPercentage]);

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
    setSubtasks(prev => prev.map(s => s.id === subtaskId
      ? { ...s, status: updated.status, progressPercentage: updated.progressPercentage, hasSubTasks: updated.hasSubTasks }
      : s));
    addToast("Subtask status updated.");
    onMessage?.("Subtask status updated.");
    onRefresh();
  };

  const handleSubtaskToggleCompleted = async (subtaskId: string, currentlyCompleted: boolean) => {
    if (!auth) return;
    const nextStatus = currentlyCompleted ? "InProgress" : "Completed";
    const updated = await api.updateSubtaskStatus(auth.token, subtaskId, nextStatus);
    setSubtasks(prev => prev.map(s => s.id === subtaskId
      ? { ...s, status: updated.status, progressPercentage: updated.progressPercentage, hasSubTasks: updated.hasSubTasks }
      : s));
    addToast(currentlyCompleted ? "Subtask reopened." : "Subtask marked completed.");
    onMessage?.(currentlyCompleted ? "Subtask reopened." : "Subtask marked completed.");
    onRefresh();
  };

  const handleSubtaskProgressUpdate = async (subtaskId: string, value: number) => {
    if (!auth) return;
    const updated = await api.updateSubtaskProgress(auth.token, subtaskId, value);
    setSubtasks(prev => prev.map(s => s.id === subtaskId
      ? { ...s, progressPercentage: updated.progressPercentage, status: updated.status, hasSubTasks: updated.hasSubTasks }
      : s));
    onRefresh();
  };

  const handleSubtaskAddComment = async (subtaskId: string, text: string) => {
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
    addToast("Subtask deleted. Parent progress retained.");
    onMessage?.("Subtask deleted. Parent progress retained.");
    onRefresh();
  };

  const handleStatusClick = (nextStatus: string) => {
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

  const confirmPendingNotStarted = () => {
    if (!pendingNotStarted) return;
    onStatusChange(pendingNotStarted, { confirmReset: true });
    setPendingNotStarted(null);
  };

  const cancelPendingNotStarted = () => {
    setPendingNotStarted(null);
  };

  const handleUpdateProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasSubTasks) return;
    onUpdateProgress(progress, "");
  };

  const handleProgressInput = (value: string) => {
    setProgressInput(value);
    const num = Math.max(0, Math.min(100, Number(value) || 0));
    setProgress(num);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    onAddComment(comment);
    setComment("");
  };

  const handleStartTimer = () => {
    onStartTimer(timerDescription);
    setTimerDescription("Focused execution block");
  };

  const progressColor = progress >= 80 ? "from-emerald-400 to-emerald-500" :
                         progress >= 50 ? "from-cyan-400 to-cyan-500" :
                         progress >= 25 ? "from-amber-400 to-amber-500" :
                         "from-rose-400 to-rose-500";

  const tabIcons = {
    progress: <FiBarChart2 className="w-4 h-4" />,
    comments: <FiMessageSquare className="w-4 h-4" />,
    timer: <FiClock className="w-4 h-4" />,
  };

  return (
    <div className="flex flex-col gap-4 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
      {/* Header Card with close button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white/90 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-slate-200/60"
      >
        {onClose && !hideCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-start justify-between mb-4 pr-8">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 mb-2">{task.title}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadgeMinimal status={task.status} />
              {/* <StatusBadgeK status={task.status} /> */}
              <PriorityBadge priority={task.priority} />
              {task.isOverdue && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-600 animate-pulse">
                  Overdue
                </span>
              )}
              {hasSubTasks && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-600">
                  {subtasks.length} subtask{subtasks.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={onEdit} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors" title="Edit task">
                <FiEdit className="w-4 h-4" />
              </button>
              <button
                onClick={onEscalate}
                className="p-2 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors"
                title="Escalate task"
              >
                <FiAlertTriangle className="w-4 h-4" />
              </button>
              <button
                onClick={() => { if(confirm("Delete task? This will remove all subtasks.")) onRefresh(); }}
                className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                title="Delete task"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {task.description && (
          <p className="text-sm text-slate-600 mb-4 line-clamp-2">{task.description}</p>
        )}

        <div className="flex flex-wrap gap-3 mb-4">
          <InfoChip icon={<FiNavigation className="w-3.5 h-3.5" />} label="Project" value={project?.name || task.projectName || "N/A"} />
          <InfoChip icon={<FiFlag className="w-3.5 h-3.5" />} label="Milestone" value={milestone?.name || "None"} />
          <InfoChip icon={<FiCalendar className="w-3.5 h-3.5" />} label="Due" value={task.dueDate ? formatDate(task.dueDate) : "Not set"} />
          {assignedUsersResolved.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-xs">
              <AvatarStack people={assignedUsersResolved} size="xs" />
              <span className="text-slate-600 font-medium">{assignedUsersResolved.map(u => u.fullName).join(", ")}</span>
            </div>
          )}
        </div>

        <div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-500 font-medium">
              Progress
              {hasSubTasks && <span className="ml-1 text-indigo-500">(cumulative of subtasks)</span>}
            </span>
            <span className="font-bold text-slate-700">{progress}%</span>
          </div>
          <div className="relative w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full bg-gradient-to-r ${progressColor}`}
            />
          </div>
        </div>

        <div className="mt-4">
          {/* <StatusButtons currentStatus={task.status} onStatusChange={handleStatusClick} variant="task" />
          <StatusButtonsMin currentStatus={task.status} onStatusChange={handleStatusClick} variant="task" /> */}
          <StatusButtonsK currentStatus={task.status} onStatusChange={handleStatusClick} variant="task" />
        </div>

        <AnimatePresence>
          {task.isEscalated && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200">
              <div className="flex items-center gap-2">
                <FiAlertTriangle className="text-red-500 w-4 h-4" />
                <span className="text-sm font-semibold text-red-700">Escalated</span>
                <span className="ml-auto text-xs text-red-500">Level {task.escalationLevel}</span>
              </div>
            </motion.div>
          )}
          {delay && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2">
                <FiClock className="text-amber-500 w-4 h-4" />
                <span className="text-sm font-semibold text-amber-700">Delay Risk</span>
                <span className="ml-auto text-xs font-bold text-amber-600">{formatPercent(delay.delayProbability * 100)}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Confirmation dialog for NotStarted reset */}
      <AnimatePresence>
        {pendingNotStarted && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-amber-50 border border-amber-300 shadow-sm"
          >
            <div className="flex items-start gap-2.5">
              <FiAlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">Reset progress warning</p>
                <p className="text-xs text-amber-700 mt-1">
                  This task is currently at <strong>{Math.round(task.progressPercentage)}%</strong>.
                  Switching to <strong>Not Started</strong> will reset this task{hasSubTasks ? " and all of its subtasks" : ""} to 0% progress. Do you want to continue?
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={confirmPendingNotStarted}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors"
                  >
                    Yes, reset to 0%
                  </button>
                  <button
                    onClick={cancelPendingNotStarted}
                    className="px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabbed Actions Card */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="flex border-b border-slate-100">
          {(["progress", "comments", "timer"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === tab
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tabIcons[tab]}
              {tab === "progress" ? "Progress" : tab === "comments" ? "Comment" : "Timer"}
            </button>
          ))}
        </div>

        <div className="p-4">
          <AnimatePresence mode="wait">
            {activeTab === "progress" && (
              <motion.div
                key="progress"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3"
              >
                {hasSubTasks ? (
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                    <p className="text-xs text-indigo-700">
                      This task has subtasks. Progress is calculated as the average of all subtask progress and cannot be updated manually. Update the progress of individual subtasks below.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateProgress} className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                        Progress ({progress}%)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={progress}
                          onChange={(e) => {
                            setProgress(Number(e.target.value));
                            setProgressInput(String(e.target.value));
                          }}
                          className="flex-1 h-2 rounded-full appearance-none bg-slate-200 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={progressInput}
                          onChange={(e) => handleProgressInput(e.target.value)}
                          className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-center font-semibold outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                        <span>0%</span><span>50%</span><span>100%</span>
                      </div>
                    </div>
                    <button type="submit" className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-semibold hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md">
                      Update Progress
                    </button>
                  </form>
                )}
              </motion.div>
            )}

            {activeTab === "comments" && (
              <motion.form key="comments" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleAddComment} className="space-y-3">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 resize-none transition-all"
                />
                <button type="submit" disabled={!comment.trim()} className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-semibold hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                  Post Comment
                </button>
              </motion.form>
            )}

            {activeTab === "timer" && (
              <motion.div key="timer" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3">
                <input
                  value={timerDescription}
                  onChange={(e) => setTimerDescription(e.target.value)}
                  placeholder="What are you working on?"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
                <button onClick={handleStartTimer} className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-semibold hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2">
                  <FiClock className="w-4 h-4" />
                  Start Timer
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Subtasks section */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <button
          onClick={() => setShowSubtasks(!showSubtasks)}
          className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">Subtasks</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">{subtasks.length}</span>
          </div>
          <motion.span animate={{ rotate: showSubtasks ? 180 : 0 }}>
            <FiChevronDown className="w-4 h-4 text-slate-400" />
          </motion.span>
        </button>
        <AnimatePresence>
          {showSubtasks && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="px-5 pb-4 space-y-2">
                {subtasks.length === 0 && (
                  <p className="text-xs text-slate-400 italic py-2">No subtasks yet.</p>
                )}
                {subtasks.map(subtask => {
                  const isCompleted = subtask.status === "Completed";
                  const isOpen = expandedSubtaskIds.has(subtask.id);
                  return (
                    <div key={subtask.id} className="rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
                      <div className="flex items-center gap-3 p-2.5">
                        {isAdmin && (
                          <button
                            onClick={() => handleSubtaskToggleCompleted(subtask.id, isCompleted)}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                              isCompleted
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "bg-white border-slate-300 hover:border-indigo-400"
                            }`}
                            title={isCompleted ? "Reopen subtask" : "Mark subtask completed"}
                          >
                            {isCompleted && <FiCheck className="w-3 h-3" />}
                          </button>
                        )}
                        <button
                          onClick={() => toggleSubtask(subtask.id)}
                          className="text-sm text-slate-700 flex-1 text-left truncate hover:text-indigo-600 transition-colors"
                        >
                          {subtask.title}
                        </button>
                        <StatusBadge status={subtask.status} />
                        <motion.span animate={{ rotate: isOpen ? 180 : 0 }}>
                          <FiChevronDown className="w-4 h-4 text-slate-400" />
                        </motion.span>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteSubtask(subtask.id)}
                            className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-500"
                            title="Delete subtask"
                          >
                            <FiX className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div
                        className={`grid transition-all duration-300 ease-in-out ${
                          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="px-3 pb-3 pt-2 border-t border-slate-200/70">
                            <SubtaskUpdatePanel
                              subtask={subtask}
                              isAdmin={isAdmin}
                              onUpdateProgress={handleSubtaskProgressUpdate}
                              onUpdateStatus={handleSubtaskStatusChange}
                              onAddComment={handleSubtaskAddComment}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isAdmin && (
                  showSubtaskForm ? (
                    <div className="flex gap-2">
                      <input
                        value={subtaskForm.title}
                        onChange={(e) => setSubtaskForm({ ...subtaskForm, title: e.target.value })}
                        placeholder="Subtask title"
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-300"
                      />
                      <button onClick={handleCreateSubtask} disabled={!subtaskForm.title} className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50">
                        Add
                      </button>
                      <button onClick={() => { setShowSubtaskForm(false); setSubtaskForm({ title: "", priority: "Medium", dueDate: "", assignedToUserId: "" }); }} className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs hover:bg-slate-200">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setShowSubtaskForm(true)} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                      <FiPlus className="w-3.5 h-3.5" /> Add subtask
                    </button>
                  )
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Recommendation */}
      {recommendation && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-200/60"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-indigo-600"><FiBarChart2 className="w-4 h-4" /></span>
            <span className="text-sm font-bold text-indigo-800">AI Recommendation</span>
          </div>
          <p className="text-sm text-indigo-700">{recommendation.message}</p>
          {recommendation.suggestedActions?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {recommendation.suggestedActions.map((action: string) => (
                <span key={action} className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-700">
                  {action}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-xs">
      <span className="text-slate-400">{icon}</span>
      <span className="text-slate-400">{label}:</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  );
}


