import type { Milestone, Project, Task, User } from "../../types";
import { formatPercent, formatDate } from "../../ui";
import { Avatar, AvatarStack, GlassCard, GradientButton, getStatusColor, getPriorityColor } from "../shared";
import { TaskCard } from "../projectsK/components/TaskCard";

interface MilestoneDetailProps {
  milestone: Milestone;
  tasks: Task[];
  project?: Project | null;
  users: User[];
  onComplete: () => void;
  onStatusChange: (status: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddTask: () => void;
  isAdmin: boolean;
}

export function MilestoneDetail({ 
  milestone, 
  tasks, 
  project, 
  users, 
  onComplete, 
  onStatusChange,
  onEdit, 
  onDelete,
  onAddTask,
  isAdmin 
}: MilestoneDetailProps) {
  const statusColors = getStatusColor(milestone.status);
  const progress = milestone.progressPercentage || 0;
  const hasTasks = milestone.hasTasks ?? tasks.length > 0;
  const completedTasks = tasks.filter(t => t.status === "Completed").length;
  const isCompleted = milestone.status === "Completed";

  const getProgressColor = (progress: number) => {
    if (progress === 100) return "bg-emerald-500";
    if (progress >= 75) return "bg-amber-400";
    if (progress >= 50) return "bg-cyan-400";
    if (progress >= 25) return "bg-rose-400";
    return "bg-slate-300";
  };

  const getMilestoneIcon = () => {
    switch (milestone.status) {
      case "Completed":
        return "check_circle";
      case "InProgress":
        return "pace";
      case "Delayed":
        return "warning";
      case "OnHold":
        return "pause_circle";
      case "Cancelled":
        return "cancel";
      default:
        return "flag";
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Tasks Section - Left side (wider) */}
      <div className="flex-1 min-w-0">
        <GlassCard className="p-6 h-full">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Tasks</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {tasks.length} task{tasks.length !== 1 ? "s" : ""} associated with this milestone
              </p>
            </div>
            {isAdmin && (
              <GradientButton variant="ghost" onClick={onAddTask}>
                <span className="material-symbols-outlined text-base">add</span>
                Add Task
              </GradientButton>
            )}
          </div>

          {tasks.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {tasks.map((task) => (
                <div key={task.id} className="w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc(50%-0.375rem)] xl:w-[calc(33.333%-0.5rem)]">
                  <TaskCard
                    task={task}
                    canEdit={!!isAdmin}
                    onViewTask={undefined}
                    onEditTask={undefined}
                    getProgressColor={getProgressColor}
                  />
                  {task.subTasks && task.subTasks.length > 0 && (
                    <div className="ml-2 mt-2 space-y-2 border-l-2 border-slate-200 pl-3">
                      {task.subTasks.map((sub) => {
                        const subStatusColors = getStatusColor(sub.status);
                        return (
                          <div
                            key={sub.id}
                            className="p-3 rounded-lg border border-slate-100 bg-slate-50/50"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-slate-700 truncate">{sub.title}</span>
                                  {sub.isOverdue && (
                                    <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded shrink-0">Overdue</span>
                                  )}
                                </div>
                              </div>
                              <span className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-bold uppercase ${subStatusColors.bg} ${subStatusColors.text}`}>
                                {sub.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="flex items-center justify-between text-[9px] text-slate-400 mb-1">
                                  <span>Progress</span>
                                  <span className="font-medium">{sub.progressPercentage || 0}%</span>
                                </div>
                                <div className="w-full h-1 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${subStatusColors.dot}`}
                                    style={{ width: `${sub.progressPercentage || 0}%` }}
                                  />
                                </div>
                              </div>
                              {sub.assignees?.[0] && (
                                <div
                                  className="w-5 h-5 shrink-0 rounded-full bg-cyan-100 text-cyan-700 text-[9px] font-semibold flex items-center justify-center"
                                  title={sub.assignees[0].fullName ?? "Assignee"}
                                >
                                  {(sub.assignees[0].fullName ?? "?").charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-slate-400">task</span>
              </div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">No tasks yet</h4>
              <p className="text-xs text-slate-400 mx-auto x mb-6">
                Tasks assigned to this milestone will appear here. Create your first task to start tracking progress.
              </p>
              {isAdmin && (
                <GradientButton variant="ghost" onClick={onAddTask}>
                  <span className="material-symbols-outlined">add</span>
                  Create First Task
                </GradientButton>
              )}
            </div>
          )}
        </GlassCard>
      </div>

     {/* Details Panel - Right side (narrow) */}
<div className="w-full lg:w-72 xl:w-80 shrink-0">
  <GlassCard className="p-4 h-full">
    {/* Header with actions */}
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0 transition-all duration-300 hover:scale-105 ${
          milestone.isCritical ? "bg-red-500 shadow-red-500/25" : "bg-indigo-600 shadow-indigo-500/25"
        }`}>
          <span className="material-symbols-outlined text-xl text-white">
            {getMilestoneIcon()}
          </span>
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 truncate">{milestone.name}</h3>
          {project && (
            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-[10px] shrink-0">rocket_launch</span>
              <span className="truncate">{project.name}</span>
            </span>
          )}
        </div>
      </div>
      
      {/* Compact action buttons */}
      {isAdmin && (
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200"
            title="Edit milestone"
          >
            <span className="material-symbols-outlined text-base">edit</span>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
            title="Delete milestone"
          >
            <span className="material-symbols-outlined text-base">delete</span>
          </button>
        </div>
      )}
    </div>

    {/* Status badges */}
    <div className="flex items-center gap-2 flex-wrap mb-4">
      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${statusColors.bg} ${statusColors.text} border ${statusColors.border}`}>
        {milestone.status}
      </span>
      {milestone.isCritical && (
        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100 animate-pulse">
          <span className="material-symbols-outlined text-[10px] align-middle mr-0.5">warning</span>
          Critical
        </span>
      )}
    </div>

    {/* Status changer */}
    {isAdmin && (
      <div className="mb-4">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Change Status</p>
        {hasTasks && (
          <div className="mb-2 p-2 rounded-lg bg-indigo-50 border border-indigo-100">
            <p className="text-[10px] text-indigo-600 leading-relaxed">
              Status is auto-calculated from associated tasks. Update individual task statuses to reflect milestone progress.
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          {["Pending", "InProgress", "Completed", "Delayed"].map((status) => {
            const st = getStatusColor(status);
            return (
              <button
                key={status}
                type="button"
                disabled={milestone.status === status}
                onClick={() => {
                  if (status === "Completed") {
                    onComplete();
                  } else {
                    onStatusChange(status);
                  }
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                  milestone.status === status
                    ? `${st.bg} ${st.text} ${st.border} cursor-default`
                    : "border-slate-200 text-slate-500 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>
      </div>
    )}

    {/* Description */}
    {milestone.description && (
      <div className="mb-4 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
        <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">{milestone.description}</p>
      </div>
    )}

    {/* Progress */}
    <div className="mb-4">
      <div className="flex justify-between text-[10px] mb-1.5">
        <span className="text-slate-400 font-medium">
          Progress
          {hasTasks && <span className="ml-1 text-indigo-500 font-normal">(avg of tasks)</span>}
        </span>
        <span className="font-semibold text-slate-700">{Math.round(progress)}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isCompleted 
              ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
              : milestone.isCritical
              ? 'bg-gradient-to-r from-red-400 to-red-500'
              : 'bg-gradient-to-r from-indigo-400 to-indigo-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>

    {/* Info Cards - Compact */}
    <div className="space-y-1.5 mb-4">
      <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50/80 hover:bg-slate-50 transition-colors duration-200">
        <span className="material-symbols-outlined text-slate-400 text-sm shrink-0">calendar_today</span>
        <div className="min-w-0">
          <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Due Date</div>
          <div className="text-xs font-medium text-slate-700 truncate">
            {milestone.dueDate ? formatDate(milestone.dueDate) : "Not set"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50/80 hover:bg-slate-50 transition-colors duration-200">
        <span className="material-symbols-outlined text-slate-400 text-sm shrink-0">format_list_numbered</span>
        <div className="min-w-0">
          <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Order</div>
          <div className="text-xs font-medium text-slate-700">{milestone.order || "N/A"}</div>
        </div>
      </div>
      <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50/80 hover:bg-slate-50 transition-colors duration-200">
        <span className="material-symbols-outlined text-slate-400 text-sm shrink-0">task_alt</span>
        <div className="min-w-0">
          <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Tasks</div>
          <div className="text-xs font-medium text-slate-700">{completedTasks}/{tasks.length} completed</div>
        </div>
      </div>
    </div>

    {/* Complete button - compact */}
    {isAdmin && !isCompleted && (
      <button
        onClick={onComplete}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
      >
        <span className="material-symbols-outlined text-sm">check</span>
        Complete Milestone
      </button>
    )}
  </GlassCard>
</div>
    </div>
  );
}