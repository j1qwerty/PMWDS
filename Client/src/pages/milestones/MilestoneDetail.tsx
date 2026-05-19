import type { Milestone, Project, Task, User } from "../../types";
import { formatPercent, formatDate } from "../../ui";
import { Avatar, AvatarStack, GlassCard, GradientButton, getStatusColor, getPriorityColor } from "../shared";

interface MilestoneDetailProps {
  milestone: Milestone;
  tasks: Task[];
  project?: Project | null;
  users: User[];
  onComplete: () => void;
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
  onEdit, 
  onDelete,
  onAddTask,
  isAdmin 
}: MilestoneDetailProps) {
  const statusColors = getStatusColor(milestone.status);
  const progress = milestone.progressPercentage || 0;
  const completedTasks = tasks.filter(t => t.status === "Completed").length;
  const isCompleted = milestone.status === "Completed";

  return (
    <div className="flex flex-col gap-5">
      {/* Milestone Info Card */}
      <GlassCard className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
              milestone.isCritical ? "bg-red-500 shadow-red-500/25" : "bg-indigo-600 shadow-indigo-500/25"
            }`}>
              <span className="material-symbols-outlined text-3xl text-white">
                {isCompleted ? "check_circle" : "flag"}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{milestone.name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusColors.bg} ${statusColors.text} border ${statusColors.border}`}>
                  {milestone.status}
                </span>
                {milestone.isCritical && (
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">
                    <span className="material-symbols-outlined text-xs align-middle mr-1">warning</span>
                    Critical
                  </span>
                )}
                {project && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">rocket_launch</span>
                    {project.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2 flex-wrap">
              <GradientButton variant="ghost" onClick={onAddTask}>
              <span className="material-symbols-outlined text-base">add</span>
              Add Task
            </GradientButton>
              {!isCompleted && (
                <GradientButton onClick={onComplete}>
                  <span className="material-symbols-outlined text-base">check</span>
                  Complete
                </GradientButton>
              )}
              <GradientButton variant="ghost" onClick={onEdit}>
                <span className="material-symbols-outlined text-base">edit</span>
                Edit
              </GradientButton>
              <GradientButton variant="danger" onClick={onDelete}>
                <span className="material-symbols-outlined text-base">delete</span>
              </GradientButton>
            </div>
          )}
        </div>

        {/* Description */}
        {milestone.description && (
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">{milestone.description}</p>
        )}

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-500 font-medium">Overall Progress</span>
            <span className="font-semibold text-slate-700">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
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

        {/* Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
            <span className="material-symbols-outlined text-slate-400 text-lg">calendar_today</span>
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Due Date</div>
              <div className="text-sm font-medium text-slate-700">
                {milestone.dueDate ? formatDate(milestone.dueDate) : "Not set"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
            <span className="material-symbols-outlined text-slate-400 text-lg">format_list_numbered</span>
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Order</div>
              <div className="text-sm font-medium text-slate-700">{milestone.order || "N/A"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
            <span className="material-symbols-outlined text-slate-400 text-lg">task_alt</span>
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tasks</div>
              <div className="text-sm font-medium text-slate-700">{completedTasks}/{tasks.length} completed</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
            <span className="material-symbols-outlined text-slate-400 text-lg">rocket_launch</span>
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Project</div>
              <div className="text-sm font-medium text-slate-700 truncate">{project?.name || "N/A"}</div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Tasks Card */}
      <GlassCard className="p-6 flex-1">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h4 className="text-sm font-bold text-slate-800">Tasks</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {tasks.length} task{tasks.length !== 1 ? "s" : ""} associated with this milestone
            </p>
          </div>
          {isAdmin && tasks.length > 0 && (
            <GradientButton variant="ghost" onClick={onAddTask}>
              <span className="material-symbols-outlined text-base">add</span>
              Add Task
            </GradientButton>
          )}
        </div>

        {tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.map((task) => {
              const taskStatusColors = getStatusColor(task.status);
              const taskPriorityColors = getPriorityColor(task.priority);
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

              return (
                <div 
                  key={task.id} 
                  className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all bg-white"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="block text-sm font-semibold text-slate-800 truncate">{task.title}</span>
                        {task.isOverdue && (
                          <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded shrink-0">
                            Overdue
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mb-2">{task.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${taskStatusColors.bg} ${taskStatusColors.text}`}>
                        {task.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${taskPriorityColors.bg} ${taskPriorityColors.text}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>

                  {/* Task Meta */}
                  <div className="flex items-center justify-between mb-2">
                    {assignedUsersResolved.length > 0 ? (
                      <AvatarStack people={assignedUsersResolved} size="xs" />
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Unassigned</span>
                    )}
                    {task.dueDate && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">calendar_today</span>
                        {formatDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                  
                  {/* Task Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>Progress</span>
                      <span className="font-medium">{task.progressPercentage || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${taskStatusColors.dot}`}
                        style={{ width: `${task.progressPercentage || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Estimated Hours */}
                  {task.estimatedHours && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                      <span className="material-symbols-outlined text-xs">schedule</span>
                      {task.estimatedHours} hours estimated
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-slate-400">task</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">No tasks yet</h4>
            <p className="text-xs text-slate-400 mx-auto mb-6">
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
  );
}
