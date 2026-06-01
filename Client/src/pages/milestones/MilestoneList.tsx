import type { Milestone } from "../../types";
import { formatPercent, formatDate } from "../../ui";
import { getStatusColor } from "../shared";

type MilestoneListProps = {
  milestones: Milestone[];
  onEdit: (milestone: Milestone) => void;
  onSelect?: (milestoneId: string) => void;
  selectedId?: string;
  onComplete: (milestoneId: string) => void;
  onDelete: (milestone: Milestone) => void;
};

export function MilestoneList({ 
  milestones, 
  onEdit, 
  onSelect, 
  selectedId, 
  onComplete, 
  onDelete 
}: MilestoneListProps) {
  if (!milestones.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-3xl text-slate-400">flag</span>
        </div>
        <h4 className="text-sm font-semibold text-slate-700 mb-2">No milestones</h4>
        <p className="text-xs text-slate-400">
          Create milestones to group tasks and track delivery checkpoints.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
      {milestones.map((milestone) => {
        const isSelected = selectedId === milestone.id;
        const statusColors = getStatusColor(milestone.status);
        const isCompleted = milestone.status === "Completed";
        const progress = Math.min(100, Math.max(0, milestone.progressPercentage ?? 0));

        return (
          <article
            key={milestone.id}
            onClick={() => onSelect?.(milestone.id)}
            className={`
              rounded-xl border p-4 cursor-pointer transition-all duration-200
              ${isSelected
                ? "border-indigo-300 bg-indigo-50 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
              }
            `}
          >
            {/* Header */}
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {/* Status Badges */}
                <div className="mb-2 flex flex-wrap gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusColors.bg} ${statusColors.text} border ${statusColors.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusColors.dot} mr-1.5`}></span>
                    {milestone.status}
                  </span>
                  {milestone.isCritical && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span>
                      Critical
                    </span>
                  )}
                </div>

                {/* Name */}
                <strong className={`block text-base font-semibold ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                  {milestone.name}
                </strong>

                {/* Meta Info */}
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                  {milestone.dueDate && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">calendar_today</span>
                      {formatDate(milestone.dueDate)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">format_list_numbered</span>
                    Order {milestone.order}
                  </span>
                </div>
              </div>

              {/* Progress Badge */}
              <span className={`
                shrink-0 rounded-full px-3 py-1 text-xs font-semibold
                ${isSelected 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'bg-slate-100 text-slate-600'
                }
              `}>
                {formatPercent(milestone.progressPercentage)}
              </span>
            </div>

            {/* Description */}
            {milestone.description && (
              <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
                {milestone.description}
              </p>
            )}

            {/* Progress Bar */}
            <div className="mb-3 h-2 rounded-full bg-slate-100 overflow-hidden">
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

            {/* Progress Label */}
            <div className="flex justify-between text-[10px] text-slate-400 mb-3">
              <span>Progress</span>
              <span className="font-medium">{Math.round(progress)}% complete</span>
            </div>

            {/* Actions */}
            <div 
              className="flex flex-wrap gap-2 pt-3 border-t border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => onEdit(milestone)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Edit
              </button>
              
              {!isCompleted && (
                <button
                  onClick={() => onComplete(milestone.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Complete
                </button>
              )}
              
              <button
                onClick={() => onDelete(milestone)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-1 ml-auto"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                Delete
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}