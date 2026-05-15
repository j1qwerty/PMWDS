import { useState } from "react";
import type { Milestone, Project, Task, User } from "../../types";
import { formatPercent, formatDate } from "../../ui";
import { GlassCard, GradientButton, getStatusColor, getPriorityColor } from "../shared";

interface TaskDetailProps {
  task: Task;
  users: User[];
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
  onUploadAttachment: (file: File) => void;
}

export function TaskDetail({
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
  onUploadAttachment,
}: TaskDetailProps) {
  const statusColors = getStatusColor(task.status);
  const priorityColors = getPriorityColor(task.priority);
  const assignedUser = task.assignedToUserId ? users.find(u => u.id === task.assignedToUserId) : null;
  
  const [progressForm, setProgressForm] = useState({ progressPercentage: task.progressPercentage || 0, notes: "" });
  const [comment, setComment] = useState("");
  const [timerDescription, setTimerDescription] = useState("Focused execution block");
  const [attachment, setAttachment] = useState<File | null>(null);

  const statuses = ["NotStarted", "Assigned", "InProgress", "Completed", "Delayed", "OnHold"];

  return (
    <div className="flex flex-col gap-5 max-h-[calc(100vh-220px)] overflow-y-auto">
      {/* Task Info Card */}
      <GlassCard className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-900 mb-2">{task.title}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${statusColors.bg} ${statusColors.text}`}>
                {task.status}
              </span>
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${priorityColors.bg} ${priorityColors.text}`}>
                {task.priority}
              </span>
              {task.isOverdue && (
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-red-50 text-red-600">
                  Overdue
                </span>
              )}
            </div>
          </div>
          {isAdmin && (
            <GradientButton variant="ghost" onClick={onEdit}>
              <span className="material-symbols-outlined text-base">edit</span>
              Edit
            </GradientButton>
          )}
        </div>

        {task.description && (
          <p className="text-sm text-slate-600 mb-4">{task.description}</p>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <DetailItem icon="rocket_launch" label="Project" value={project?.name || task.projectName || "N/A"} />
          <DetailItem icon="flag" label="Milestone" value={milestone?.name || "None"} />
          <DetailItem icon="person" label="Assignee" value={assignedUser?.fullName || task.assignedToUserName || "Unassigned"} avatar={assignedUser} />
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
        <div className="flex flex-wrap gap-2 mb-4">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => onStatusChange(status)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${task.status === status
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-200"
                }
              `}
            >
              {status}
            </button>
          ))}
        </div>

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

function DetailItem({ icon, label, value, avatar }: { icon: string; label: string; value: string; avatar?: User | null }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg">
      <span className="material-symbols-outlined text-slate-400 text-lg">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold text-slate-400 uppercase">{label}</div>
        <div className="text-sm font-medium text-slate-700 flex items-center gap-1.5 truncate">
          {avatar && (
            <img
              className="size-4 rounded-full"
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(avatar.fullName)}&background=e0e7ff&color=4f46e5&size=16`}
              alt={avatar.fullName}
            />
          )}
          {value}
        </div>
      </div>
    </div>
  );
}