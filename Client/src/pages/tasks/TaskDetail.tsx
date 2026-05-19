import { useEffect, useState } from "react";
import type { Milestone, Project, Task, User, Role } from "../../types";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { useToast } from "../shared";
import { formatPercent, formatDate } from "../../ui";
import { Avatar, AvatarStack, GlassCard, GradientButton, getStatusColor, StatusButtons, StatusBadge, PriorityBadge } from "../shared";
import { DependencyManagement } from "./DependencyManagement";

interface TaskDetailProps {
  task: Task;
  users: User[];
  allTasks?: Task[];
  project?: Project | null;
  milestone?: Milestone | null;
  recommendation?: any;
  delay?: any;
  isAdmin: boolean;
  hasRole: (...roles: Role[]) => boolean;
  onStatusChange: (status: string) => void;
  onEdit: () => void;
  onUpdateProgress: (progress: number, notes: string) => void;
  onAddComment: (comment: string) => void;
  onStartTimer: (description: string) => void;
  onUploadAttachment: (file: File) => void;
  onRefresh: () => void;
  onMessage?: (message: string) => void;
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
  hasRole,
  onStatusChange,
  onEdit,
  onUpdateProgress,
  onAddComment,
  onStartTimer,
  onUploadAttachment,
  onRefresh,
  onMessage,
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
  
  const [progressForm, setProgressForm] = useState({ progressPercentage: task.progressPercentage || 0, notes: "" });
  const [comment, setComment] = useState("");
  const [timerDescription, setTimerDescription] = useState("Focused execution block");
  const [attachment, setAttachment] = useState<File | null>(null);

  const [subtasks, setSubtasks] = useState<Task[]>(task.subTasks || []);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [subtaskForm, setSubtaskForm] = useState({ title: "", description: "", priority: "Medium", dueDate: "", estimatedHours: 0, assignedToUserId: "" });

  useEffect(() => {
    setSubtasks(task.subTasks || []);
  }, [task.id, task.subTasks]);

  const handleCreateSubtask = async () => {
    if (!auth || !subtaskForm.title) return;
    const newSubtask = await api.createSubtask(auth.token, task.id, {
      ...subtaskForm,
      projectId: task.projectId,
      milestoneId: task.milestoneId,
      startDate: new Date().toISOString(),
    });
    setSubtasks(prev => [...prev, newSubtask]);
    setSubtaskForm({ title: "", description: "", priority: "Medium", dueDate: "", estimatedHours: 0, assignedToUserId: "" });
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

  const handleEscalate = async () => {
    if (!auth) return;
    try {
      await api.escalateTask(auth.token, task.id);
      addToast("Task escalated.");
      onMessage?.("Task escalated.");
      onRefresh();
    } catch {
      addToast("Failed to escalate task.", "error");
    }
  };

  const handleDeleteTask = async () => {
    if (!auth) return;
    if (!confirm("Are you sure you want to delete this task? This action cannot be undone.")) return;
    try {
      await api.deleteTask(auth.token, task.id);
      addToast("Task deleted.");
      onMessage?.("Task deleted.");
      onRefresh();
    } catch {
      addToast("Failed to delete task.", "error");
    }
  };

  return (
    <div className="flex flex-col gap-5 max-h-[calc(100vh-220px)] overflow-y-auto">
      {/* Task Info Card */}
      <GlassCard className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-900 mb-2">{task.title}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
              {task.isOverdue && (
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-red-50 text-red-600">
                  Overdue
                </span>
              )}
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <GradientButton variant="ghost" onClick={onEdit}>
                <span className="material-symbols-outlined text-base">edit</span>
                Edit
              </GradientButton>
              <button
                onClick={handleDeleteTask}
                className="px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">delete</span>
                Delete
              </button>
            </div>
          )}
        </div>

        {task.description && (
          <p className="text-sm text-slate-600 mb-4">{task.description}</p>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <DetailItem icon="rocket_launch" label="Project" value={project?.name || task.projectName || "N/A"} />
          <DetailItem icon="flag" label="Milestone" value={milestone?.name || "None"} />
          <DetailItem icon="person" label="Assignee" value={assignedUsersResolved.length > 0 ? assignedUsersResolved.map(u => u.fullName).join(", ") : "Unassigned"} avatars={assignedUsersResolved} />
          <DetailItem icon="calendar_today" label="Due Date" value={task.dueDate ? formatDate(task.dueDate) : "Not set"} />
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-500 font-medium">Progress</span>
            <span className="font-semibold text-slate-700">{task.progressPercentage || 0}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${statusColors.dot}`}
              style={{ width: `${task.progressPercentage || 0}%` }}
            />
          </div>
        </div>

        {/* Status Buttons */}
        <StatusButtons
          currentStatus={task.status}
          hasRole={hasRole}
          onStatusChange={onStatusChange}
          variant="task"
        />

        {/* Escalation */}
        {isAdmin && !task.isEscalated && (
          <button
            onClick={handleEscalate}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">warning</span>
            Escalate Task
          </button>
        )}
        {task.isEscalated && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-lg">warning</span>
              <span className="text-sm font-semibold text-red-700">Escalated</span>
              <span className="ml-auto text-xs text-red-500">Level {task.escalationLevel}</span>
            </div>
            {task.escalatedDate && (
              <p className="text-xs text-red-500 mt-1">Since {formatDate(task.escalatedDate)}</p>
            )}
          </div>
        )}

        {delay && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-amber-500 text-lg">warning</span>
              <span className="text-sm font-semibold text-amber-700">Delay Prediction</span>
            </div>
            <p className="text-xs text-amber-600">
              Probability: {formatPercent(delay.delayProbability * 100)}
              {delay.predictedCompletionDate && ` • Est. completion: ${formatDate(delay.predictedCompletionDate)}`}
            </p>
          </div>
        )}
      </GlassCard>

      {/* Subtasks Section */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            {/* <span className="text-lg"></span> */}
            Subtasks
            <span className="text-xs font-medium text-slate-400">({subtasks.length})</span>
          </h4>
          {isAdmin && (
            <GradientButton variant="ghost" onClick={() => setShowSubtaskForm(!showSubtaskForm)}>
              <span className="material-symbols-outlined text-base">{showSubtaskForm ? "close" : "add"}</span>
              {showSubtaskForm ? "Cancel" : "Add"}
            </GradientButton>
          )}
        </div>

        {showSubtaskForm && isAdmin && (
          <div className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="space-y-3">
              <input
                value={subtaskForm.title}
                onChange={(e) => setSubtaskForm({ ...subtaskForm, title: e.target.value })}
                placeholder="Subtask title"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-300"
              />
              <textarea
                value={subtaskForm.description}
                onChange={(e) => setSubtaskForm({ ...subtaskForm, description: e.target.value })}
                placeholder="Description (optional)"
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-300 resize-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={subtaskForm.priority}
                  onChange={(e) => setSubtaskForm({ ...subtaskForm, priority: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-300"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
                <input
                  type="date"
                  value={subtaskForm.dueDate}
                  onChange={(e) => setSubtaskForm({ ...subtaskForm, dueDate: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min={0}
                  value={subtaskForm.estimatedHours}
                  onChange={(e) => setSubtaskForm({ ...subtaskForm, estimatedHours: Number(e.target.value) })}
                  placeholder="Est. hours"
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-300"
                />
                <select
                  value={subtaskForm.assignedToUserId}
                  onChange={(e) => setSubtaskForm({ ...subtaskForm, assignedToUserId: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-300"
                >
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleCreateSubtask}
                disabled={!subtaskForm.title}
                className="w-full px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Subtask
              </button>
            </div>
          </div>
        )}

        {subtasks.length > 0 ? (
          <div className="space-y-2">
            {subtasks.map((subtask) => {
              const subStatusColors = getStatusColor(subtask.status);
              const subAssignedUsers = (subtask.assignees && subtask.assignees.length > 0)
                ? subtask.assignees.map(a => ({ id: a.userId, fullName: a.fullName ?? undefined }))
                : (subtask.assignedToUserId ? [{ id: subtask.assignedToUserId, fullName: subtask.assignedToUserName ?? undefined }] : []);
              const subAssignedUsersResolved = subAssignedUsers.map(u => {
                const matchedUser = users.find(usr => usr.id === u.id);
                return {
                  id: u.id,
                  fullName: u.fullName || (matchedUser?.fullName ?? undefined),
                  profilePictureUrl: matchedUser?.profilePictureUrl ?? null,
                };
              });

              return (
                <div
                  key={subtask.id}
                  className="p-3 rounded-xl bg-white border border-slate-100 hover:border-slate-200 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-800 truncate">{subtask.title}</span>
                        <PriorityBadge priority={subtask.priority} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        {subAssignedUsersResolved.length > 0 && (
                          <span className="flex items-center gap-1">
                            <AvatarStack people={subAssignedUsersResolved} size="xs" />
                          </span>
                        )}
                        {subtask.dueDate && (
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-xs">calendar_today</span>
                            {formatDate(subtask.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteSubtask(subtask.id)}
                          className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${subStatusColors.dot}`}
                        style={{ width: `${subtask.progressPercentage || 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">{subtask.progressPercentage || 0}%</span>
                  </div>

                  <div className="mt-2">
                    <StatusButtons
                      currentStatus={subtask.status}
                      hasRole={hasRole}
                      onStatusChange={(status) => handleSubtaskStatusChange(subtask.id, status)}
                      variant="task"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !showSubtaskForm && (
            <div className="text-center py-8 text-slate-400">
              {/* <span className="material-symbols-outlined text-2xl mb-2 block">subtasks</span> */}
              <p className="text-xs">No subtasks yet</p>
              <p className="text-[10px] mt-1">Add subtasks to break down this task</p>
            </div>
          )
        )}
      </GlassCard>

      {/* Dependencies Section */}
      {allTasks.length > 0 && (
        <DependencyManagement
          task={task}
          allTasks={allTasks}
          onRefresh={onRefresh}
          onMessage={onMessage}
        />
      )}

      {/* Update Progress Card */}
      {isAdmin && (
        <GlassCard className="p-5">
          <h4 className="text-sm font-bold text-slate-800 mb-3">Update Progress</h4>
          <form onSubmit={(e) => { e.preventDefault(); onUpdateProgress(progressForm.progressPercentage, progressForm.notes); }}>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Progress (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={progressForm.progressPercentage}
                  onChange={(e) => setProgressForm({ ...progressForm, progressPercentage: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-300"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Notes</label>
                <input
                  value={progressForm.notes}
                  onChange={(e) => setProgressForm({ ...progressForm, notes: e.target.value })}
                  placeholder="What changed?"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-300"
                />
              </div>
              <button type="submit" className="w-full px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
                Update Progress
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Comment Card */}
      {isAdmin && (
        <GlassCard className="p-5">
          <h4 className="text-sm font-bold text-slate-800 mb-3">Add Comment</h4>
          <form onSubmit={(e) => { e.preventDefault(); onAddComment(comment); setComment(""); }}>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-300 resize-none mb-3"
            />
            <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
              Add Comment
            </button>
          </form>
        </GlassCard>
      )}

      {/* Timer Card */}
      {isAdmin && (
        <GlassCard className="p-5">
          <h4 className="text-sm font-bold text-slate-800 mb-3">Start Timer</h4>
          <div className="flex gap-2">
            <input
              value={timerDescription}
              onChange={(e) => setTimerDescription(e.target.value)}
              placeholder="What are you working on?"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-300"
            />
            <button
              onClick={() => onStartTimer(timerDescription)}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">timer</span>
              Start
            </button>
          </div>
        </GlassCard>
      )}

      {/* Attachment Card */}
      {isAdmin && (
        <GlassCard className="p-5">
          <h4 className="text-sm font-bold text-slate-800 mb-3">Upload Attachment</h4>
          <div className="flex gap-2">
            <input
              type="file"
              onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
              className="flex-1 text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <button
              onClick={() => attachment && onUploadAttachment(attachment)}
              disabled={!attachment}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Upload
            </button>
          </div>
        </GlassCard>
      )}

      {/* AI Recommendations */}
      {recommendation && (
        <GlassCard className="p-5 border-indigo-200 bg-indigo-50/50">
          <h4 className="text-sm font-bold text-indigo-800 mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">psychology</span>
            AI Recommendation
          </h4>
          <p className="text-sm text-indigo-700 mb-2">{recommendation.message}</p>
          {recommendation.suggestedActions?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recommendation.suggestedActions.map((action: string) => (
                <span key={action} className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                  {action}
                </span>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      
    </div>
  );
}

function DetailItem({ icon, label, value, avatars }: { icon: string; label: string; value: string; avatars?: { id?: string; fullName?: string | null }[] | null }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg">
      <span className="material-symbols-outlined text-slate-400 text-lg mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold text-slate-400 uppercase">{label}</div>
        <div className="text-sm font-medium text-slate-700 flex items-start gap-1.5">
          {avatars && avatars.length > 0 && <AvatarStack people={avatars} size="xs" />}
          <span className="break-words">{value}</span>
        </div>
      </div>
    </div>
  );
}
