import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiEdit, FiTrash2, FiClock, FiBarChart2, FiMessageSquare, FiChevronDown, FiX, FiAlertTriangle, FiCalendar, FiFlag, FiNavigation, FiPlus } from "react-icons/fi";
import type { Milestone, Project, Task, User } from "../../types";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { useToast } from "../shared";
import { formatPercent, formatDate } from "../../ui";
import { AvatarStack, getStatusColor, StatusButtons, StatusBadge, PriorityBadge } from "../shared";
import { DependencyManagement } from "./DependencyManagement";
import { StatusButtonsMin } from "../shared/StatusBadgeMininmal";
import { StatusBadgeK, StatusButtonsK } from "../shared/StatusBadgeK";

interface TaskDetailProps {
  task: Task;
  users: User[];
  allTasks?: Task[];
  project?: Project | null;
  milestone?: Milestone | null;
  recommendation?: any;
  delay?: any;
  isAdmin: boolean;
  onStatusChange: (status: string) => void;
  onEdit: () => void;
  onUpdateProgress: (progress: number, notes: string) => void;
  onAddComment: (comment: string) => void;
  onStartTimer: (description: string) => void;
  onRefresh: () => void;
  onMessage?: (message: string) => void;
  onClose?: () => void; // close detail panel
}

export function TaskDetail({
  task,
  users,
  allTasks = [],
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
  onMessage,
  onClose,
}: TaskDetailProps) {
  const { auth } = useAuth();
  const { addToast } = useToast();
  const statusColors = getStatusColor(task.status);
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
  const isAssignee = auth ? assignedUsers.some(a => a.id === auth.userId) : false;

  const [progress, setProgress] = useState(task.progressPercentage || 0);
  const [comment, setComment] = useState("");
  const [timerDescription, setTimerDescription] = useState("Focused execution block");
  const [activeTab, setActiveTab] = useState<"progress" | "comments" | "timer">("progress");
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [showDependencies, setShowDependencies] = useState(false);
  const [subtasks, setSubtasks] = useState<Task[]>(task.subTasks || []);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [subtaskForm, setSubtaskForm] = useState({ title: "", priority: "Medium", dueDate: "", assignedToUserId: "" });

  useEffect(() => {
    setSubtasks(task.subTasks || []);
    setProgress(task.progressPercentage || 0);
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
    setSubtasks(prev => [...prev, newSubtask]);
    setSubtaskForm({ title: "", priority: "Medium", dueDate: "", assignedToUserId: "" });
    setShowSubtaskForm(false);
    addToast("Subtask created.");
    onMessage?.("Subtask created.");
  };

  const handleSubtaskStatusChange = async (subtaskId: string, status: string) => {
    if (!auth) return;
    await api.updateSubtaskStatus(auth.token, subtaskId, status);
    setSubtasks(prev => prev.map(s => s.id === subtaskId ? { ...s, status } : s));
    addToast("Subtask status updated.");
    onMessage?.("Subtask status updated.");
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!auth) return;
    await api.deleteSubtask(auth.token, subtaskId);
    setSubtasks(prev => prev.filter(s => s.id !== subtaskId));
    addToast("Subtask deleted.");
    onMessage?.("Subtask deleted.");
  };

  const handleUpdateProgress = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProgress(progress, "");
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
        {/* Close button top right */}
        {onClose && (
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
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
              <StatusBadgeK status={task.status} />sasassaa
              {task.isOverdue && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-600 animate-pulse">
                  Overdue
                </span>
              )}
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={onEdit} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
                <FiEdit className="w-4 h-4" />
              </button>
              <button
                onClick={() => { if(confirm("Delete task?")) onRefresh(); }}
                className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {task.description && (
          <p className="text-sm text-slate-600 mb-4 line-clamp-2">{task.description}</p>
        )}

        {/* Info Chips */}
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

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-500 font-medium">Progress</span>
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

        {/* Status Buttons */}
        <div className="mt-4">
          <StatusButtonsMin currentStatus={task.status} onStatusChange={onStatusChange} variant="task" />
          <StatusButtonsK currentStatus={task.status} onStatusChange={onStatusChange} variant="task" />
        </div>

        {/* Alerts */}
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
              <motion.form key="progress" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleUpdateProgress} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Progress ({progress}%)</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={progress}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none bg-slate-200 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>0%</span><span>50%</span><span>100%</span>
                  </div>
                </div>
                <button type="submit" className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-semibold hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md">
                  Update Progress
                </button>
              </motion.form>
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

      {/* Expandable Sections */}
      <div className="space-y-2">
        {/* Subtasks */}
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
                  {subtasks.map(subtask => (
                    <div key={subtask.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                      <span className="text-sm text-slate-700 flex-1 truncate">{subtask.title}</span>
                      <StatusBadge status={subtask.status} />
                      {isAdmin && (
                        <button onClick={() => handleDeleteSubtask(subtask.id)} className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-500">
                          <FiX className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
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

        {/* Dependencies */}
        {allTasks.length > 0 && (
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            <button
              onClick={() => setShowDependencies(!showDependencies)}
              className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <span className="text-sm font-semibold text-slate-800">Dependencies</span>
              <motion.span animate={{ rotate: showDependencies ? 180 : 0 }}>
                <FiChevronDown className="w-4 h-4 text-slate-400" />
              </motion.span>
            </button>
            <AnimatePresence>
              {showDependencies && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="px-5 pb-4">
                    <DependencyManagement task={task} allTasks={allTasks} onRefresh={onRefresh} onMessage={onMessage} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
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
