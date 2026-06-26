import type { Milestone } from "../../../types";
import { getStatusColor } from "../../shared";

interface MilestoneCardProps {
  milestone: Milestone;
  isSelected: boolean;
  index: number;
  onSelectMilestone: (id: string) => void;
  onViewMilestone?: (milestone: Milestone) => void;
  onEditMilestone?: (milestone: Milestone) => void;
  canManage?: boolean;
}

export function MilestoneCard({ milestone, isSelected, index, onSelectMilestone, onViewMilestone, onEditMilestone, canManage = false }: MilestoneCardProps) {
  const statusColors = getStatusColor(milestone.status);
  const progress = milestone.progressPercentage || 0;

  const handleSelect = () => onSelectMilestone(milestone.id);

  return (
    <div
      key={milestone.id}
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleSelect();
        }
      }}
      className={`text-left p-3 rounded-xl shadow-sm border cursor-pointer transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-blue-400 ${
        isSelected
          ? "bg-indigo-50 border-blue-500 border-b hover:bg-blue-100"
          : "bg-white border-slate-100 hover:shadow-md hover:border-blue-500 hover:shadow-blue-300 transition-shadow duration-200"
      }`}
      style={{ animation: `slideIn 0.3s ease ${index * 0.05}s both` }}
    >
      {/* Row 1: Small icon and name (full name wrap text) */}
      <div className="flex items-start gap-2 mb-2">
        <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${
          milestone.isCritical ? "bg-red-100" : "bg-slate-100"
        }`}>
          <span className={`material-symbols-outlined text-sm ${
            milestone.isCritical ? "text-red-500" : "text-slate-400"
          }`}>
            {milestone.status === "Completed" ? "check_circle" : "flag"}
          </span>
        </div>
        <span className="font-semibold text-sm text-slate-800 leading-tight">
          {milestone.name}
        </span>
      </div>

      {/* Row 2: Status, progress bar and progress percent */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-semibold text-slate-400 shrink-0 tabular-nums">
          {Math.round(progress)}%
        </span>
        
        <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${statusColors.dot}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <span className={`text-[10px] font-medium shrink-0 ${statusColors.text}`}>
          {milestone.status}
        </span>
      </div>

      {/* Row 3: Critical tag and action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          
          {milestone.departmentNames && milestone.departmentNames.length > 0 && (
            <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
              {milestone.departmentNames.join(", ")}
            </span>
          )}
          {milestone.dueDate && (
            <span className="text-[10px] text-slate-400">
              Due {new Date(milestone.dueDate).toLocaleDateString()}
            </span>
          )}
          {milestone.isCritical && (
            <span className="text-[10px] font-bold text-red-500 uppercase bg-red-50 px-1.5 py-0.5 rounded">
              Critical
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onViewMilestone && (
            <button
              title="View milestone"
              className="p-1 text-slate-400 hover:text-cyan-500 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onViewMilestone(milestone);
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          )}
          {canManage && onEditMilestone && (
            <button
              title="Edit milestone"
              className="p-1 text-slate-400 hover:text-amber-500 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onEditMilestone(milestone);
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}