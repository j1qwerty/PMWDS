import type { Milestone, Task } from "../../../types";
import { formatDate } from "../../../ui";
import { GlassCard, getStatusColor } from "../../shared";

interface MilestonesPanelProps {
  milestones: Milestone[];
  tasks: Task[];
  selectedMilestoneId: string;
  onSelectMilestone: (id: string) => void;
  canManage: boolean;
  onAdd: () => void;
  onEdit: (milestone: Milestone) => void;
  onDelete: (milestone: Milestone) => void;
  onComplete: (milestoneId: string) => void;
  onAddTask: (milestoneId: string) => void;
}

export function MilestonesPanel({
  milestones,
  tasks,
  selectedMilestoneId,
  onSelectMilestone,
  canManage,
  onAdd,
  onEdit,
  onDelete,
  onComplete,
  onAddTask,
}: MilestonesPanelProps) {
  const selected = milestones.find((m) => m.id === selectedMilestoneId) ?? null;
  const milestoneTasks = selected ? tasks.filter((t) => t.milestoneId === selected.id && !t.parentTaskId) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,280px)_1fr] gap-4">
      {/* Milestones List */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Milestones
          </span>
          {canManage && (
            <button type="button" onClick={onAdd} className="text-indigo-600 hover:text-indigo-800">
              <span className="material-symbols-outlined text-lg">add</span>
            </button>
          )}
        </div>
        <div className="flex flex-col gap-3 max-h-[calc(100vh-280px)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {milestones.map((milestone) => {
            const isSelected = milestone.id === selectedMilestoneId;
            const colors = getStatusColor(milestone.status);
            
            // Get the appropriate icon based on status
            const getMilestoneIcon = () => {
              switch (milestone.status) {
                case "Completed":
                  return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  );
                case "InProgress":
                  return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  );
                case "Delayed":
                  return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  );
                case "OnHold":
                  return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  );
                case "Cancelled":
                  return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  );
                default: // NotStarted
                  return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                  );
              }
            };

            return (
              <div
                key={milestone.id}
                onClick={() => onSelectMilestone(milestone.id)}
                className={`rounded-xl p-4 shadow-sm border cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? "bg-indigo-100 border-indigo-200 hover:bg-indigo-100"
                    : "bg-white border-slate-100 hover:bg-indigo-50 hover:shadow-md"
                }`}
              >
                {/* Header with icon and name */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={milestone.isCritical ? "text-red-500" : milestone.status === "Completed" ? "text-emerald-500" : milestone.status === "InProgress" ? "text-blue-500" : milestone.status === "Delayed" ? "text-red-500" : milestone.status === "OnHold" ? "text-amber-500" : milestone.status === "Cancelled" ? "text-slate-400" : "text-slate-400"}>
                    {getMilestoneIcon()}
                  </span>
                  <h4 className="text-sm font-medium leading-snug text-slate-700 flex-1">
                    {milestone.name}
                  </h4>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        (milestone.progressPercentage || 0) >= 75
                          ? "bg-emerald-500"
                          : (milestone.progressPercentage || 0) >= 50
                          ? "bg-amber-500"
                          : (milestone.progressPercentage || 0) >= 25
                          ? "bg-orange-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(milestone.progressPercentage || 0, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Status badge and progress percentage */}
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg border ${colors.bg} ${colors.text} ${colors.border}`}>
                    {milestone.status}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-600">
                    {Math.round(milestone.progressPercentage || 0)}%
                  </span>
                </div>

                {/* Due date if available */}
                {milestone.dueDate && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400">
                      Due: {formatDate(milestone.dueDate)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          {milestones.length === 0 && (
            <div className="text-center py-8">
              <div className="text-slate-400 mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              </div>
              <p className="text-xs text-slate-400">No milestones yet</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Milestone Detail Panel */}
      <GlassCard className="p-5">
        {selected ? (
          <MilestoneDetail
            milestone={selected}
            tasks={milestoneTasks}
            canManage={canManage}
            onEdit={() => onEdit(selected)}
            onDelete={() => onDelete(selected)}
            onComplete={() => onComplete(selected.id)}
            onAddTask={() => onAddTask(selected.id)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2">flag</span>
            <p className="text-sm font-medium">Select a milestone</p>
            <p className="text-xs mt-1">View details and linked tasks</p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function MilestoneDetail({
  milestone,
  tasks,
  canManage,
  onEdit,
  onDelete,
  onComplete,
  onAddTask,
}: {
  milestone: Milestone;
  tasks: Task[];
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onAddTask: () => void;
}) {
  const colors = getStatusColor(milestone.status);
  const progress = milestone.progressPercentage || 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{milestone.name}</h3>
          <div className="flex gap-2 mt-1 flex-wrap">
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg border ${colors.bg} ${colors.text} ${colors.border}`}>
              {milestone.status}
            </span>
            {milestone.isCritical && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-red-50 text-red-600 border border-red-100">
                Critical
              </span>
            )}
          </div>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <ActionBtn onClick={onAddTask} label="Add task" icon="add" />
            {milestone.status !== "Completed" && <ActionBtn onClick={onComplete} label="Complete" icon="check" />}
            <ActionBtn onClick={onEdit} label="Edit" icon="edit" />
            <ActionBtn onClick={onDelete} label="Delete" icon="delete" danger />
          </div>
        )}
      </div>

      {milestone.description && <p className="text-sm text-slate-600 mb-4">{milestone.description}</p>}

      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-500">Progress</span>
          <span className="font-semibold">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
        <div className="p-3 rounded-xl bg-slate-50">
          <p className="text-[10px] uppercase text-slate-400 font-semibold">Due</p>
          <p className="font-medium text-slate-800">{milestone.dueDate ? formatDate(milestone.dueDate) : "—"}</p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50">
          <p className="text-[10px] uppercase text-slate-400 font-semibold">Tasks</p>
          <p className="font-medium text-slate-800">{tasks.length}</p>
        </div>
      </div>

      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Linked tasks</p>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-sm text-slate-700 truncate">{task.title}</span>
            <span className="text-[10px] font-medium text-slate-500">{task.status}</span>
          </div>
        ))}
        {tasks.length === 0 && <p className="text-xs text-slate-400">No tasks on this milestone</p>}
      </div>
    </div>
  );
}

function ActionBtn({ onClick, label, icon, danger }: { onClick: () => void; label: string; icon: string; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border ${
        danger ? "border-red-200 text-red-600 hover:bg-red-50" : "border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
    >
      <span className="material-symbols-outlined text-sm">{icon}</span>
      {label}
    </button>
  );
}