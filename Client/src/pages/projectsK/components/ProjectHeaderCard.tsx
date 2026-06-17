import type { Project } from "../../../types";
import { formatDate } from "../../../ui";
import { GlassCard, getStatusColor, getPriorityColor } from "../../shared";
import { Avatark } from "../../shared/Avatark";
import { 
  HiOutlineCalendar, 
  HiOutlineFlag, 
  HiOutlineClipboardList,
  HiOutlineChevronDown,
} from "react-icons/hi";
import { useEffect, useState, useMemo, useCallback } from "react";

interface ProjectHeaderCardProps {
  project: Project;
  canManage: boolean;
  onViewProject?: (project: Project) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: string) => void;
  bare?: boolean;
  users?: any[];
  milestonesCount?: number;
}

const STATUS_OPTIONS = [
  "NotStarted", 
  "InProgress", 
  "OnHold", 
  "Completed", 
  "Cancelled", 
  "Delayed"
] as const;

export function ProjectHeaderCard({
  project,
  canManage,
  onViewProject,
  onEdit,
  onDelete,
  onStatusChange,
  bare = false,
  users = [],
  milestonesCount = 0
}: ProjectHeaderCardProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Memoized values
  const statusColors = useMemo(() => getStatusColor(project.status), [project.status]);
  const priorityColors = useMemo(() => getPriorityColor(project.priority), [project.priority]);
  
  const manager = useMemo(
    () => users?.find((u: any) => u.id === project.projectManagerId),
    [users, project.projectManagerId]
  );

  const progressPercentage = useMemo(
    () => Math.min(Math.max(project.progressPercentage || 0, 0), 100),
    [project.progressPercentage]
  );

  useEffect(() => {
    setAnimatedProgress(progressPercentage);
  }, [progressPercentage]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showStatusDropdown) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('.status-dropdown')) {
        setShowStatusDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStatusDropdown]);

  // Callbacks
  const handleStatusToggle = useCallback(() => {
    if (canManage && onStatusChange) {
      setShowStatusDropdown(prev => !prev);
    }
  }, [canManage, onStatusChange]);

  const handleStatusSelect = useCallback((status: string) => {
    onStatusChange?.(status);
    setShowStatusDropdown(false);
  }, [onStatusChange]);

  // Calculate circle properties
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedProgress / 100) * circumference;

  const content = (
    <>
      {/* Header Section */}
      <div className="flex items-start gap-4">
        {/* Progress Ring */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg 
            className="size-14 -rotate-90" 
            viewBox="0 0 128 128"
            aria-label={`Project progress: ${Math.round(animatedProgress)}%`}
            role="progressbar"
            aria-valuenow={Math.round(animatedProgress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <circle 
              className="stroke-slate-200" 
              cx="64" cy="64" 
              fill="none" 
              r={radius} 
              strokeWidth="8" 
            />
            <circle
              className="stroke-indigo-500 transition-all duration-700 ease-out"
              cx="64" cy="64" 
              fill="none" 
              r={radius}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              strokeWidth="8"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-slate-800">
              {Math.round(animatedProgress)}%
            </span>
          </div>
        </div>

        {/* Project Info */}
        <div className="flex-1 min-w-0">
          {/* Title Row */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h2 className="text-lg font-bold text-slate-900 truncate">
              {project.name}
            </h2>

            {/* Status Badge with Dropdown */}
            <div className="status-dropdown relative shrink-0">
              <button
                onClick={handleStatusToggle}
                disabled={!canManage || !onStatusChange}
                className={`
                  px-2.5 py-1 rounded-md text-[10px] font-bold uppercase 
                  ${statusColors.bg} ${statusColors.text} border ${statusColors.border}
                  disabled:opacity-70 disabled:cursor-not-allowed
                `}
                aria-expanded={showStatusDropdown}
                aria-haspopup="listbox"
              >
                <span className="flex items-center gap-1">
                  {project.status}
                  {canManage && onStatusChange && (
                    <HiOutlineChevronDown className="w-3 h-3" />
                  )}
                </span>
              </button>

              {/* Status Dropdown */}
              {showStatusDropdown && canManage && onStatusChange && (
                <div 
                  className="absolute top-full mt-1 left-0 z-20 bg-white rounded-lg shadow-lg 
                    border border-slate-200 py-1 min-w-[150px]"
                  role="listbox"
                >
                  {STATUS_OPTIONS.map((status) => {
                    const st = getStatusColor(status);
                    const isActive = project.status === status;
                    
                    return (
                      <button
                        key={status}
                        onClick={() => handleStatusSelect(status)}
                        role="option"
                        aria-selected={isActive}
                        className={`
                          w-full text-left px-3 py-1.5 text-xs font-medium flex items-center gap-2
                          ${isActive 
                            ? `${st.bg} ${st.text}` 
                            : 'text-slate-600 hover:bg-slate-50'
                          }
                        `}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot || 'bg-current'}`} />
                        {status}
                        {isActive && (
                          <svg className="w-3 h-3 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Priority Badge */}
            <span 
              className={`
                text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 
                flex items-center gap-1.5
                ${priorityColors.bg} ${priorityColors.text} 
                border ${priorityColors.border}
              `}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${priorityColors.dot}`} />
              {project.priority}
            </span>
          </div>

          {/* Description */}
          {project.description && (
            <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
              {project.description}
            </p>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Milestones & Tasks */}
            <div className="flex items-center gap-3 text-slate-600">
              <div className="flex items-center gap-1.5" title="Milestones">
                <HiOutlineFlag className="size-4 text-slate-400" />
                <span className="text-xs font-semibold">{milestonesCount}</span>
              </div>
              <div className="flex items-center gap-1.5" title="Tasks">
                <HiOutlineClipboardList className="size-4 text-slate-400" />
                <span className="text-xs font-semibold">{project.totalTasks}</span>
              </div>
            </div>

            {/* Date Range */}
            <div 
              className="flex items-center gap-2 text-slate-600"
              title={`${formatDate(project.plannedStartDate)} - ${formatDate(project.plannedEndDate)}`}
            >
              <HiOutlineCalendar className="size-4 shrink-0 text-slate-400" />
              <span className="text-xs font-medium truncate">
                {formatDate(project.plannedStartDate)} - {formatDate(project.plannedEndDate)}
              </span>
            </div>

            {/* Budget */}
            <div className="flex items-center gap-2 text-slate-600">
              <svg className="size-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-semibold">
                ₹{project.plannedBudget.toLocaleString("en-IN")}
              </span>
            </div>

            {/* Manager */}
            {project.projectManagerId && (
              <div 
                className="flex items-center gap-2 text-slate-600"
                title="Project Manager"
              >
                <Avatark 
                  person={manager} 
                  name={project.projectManagerName} 
                  size="xs" 
                />
                <span className="text-xs font-medium truncate">
                  {manager?.fullName || project.projectManagerName}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {onViewProject && (
            <button
              title="View project"
              onClick={(e) => { e.stopPropagation(); onViewProject(project); }}
              className="p-1.5 text-slate-400 hover:text-cyan-500 rounded-lg hover:bg-slate-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          )}
          
          {canManage && onEdit && (
            <button
              title="Edit project"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 text-slate-400 hover:text-amber-500 rounded-lg hover:bg-slate-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}

          {canManage && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"
              title="Delete project"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </>
  );

  if (bare) return <div className="p-4">{content}</div>;
  
  return (
    <GlassCard className="p-4">
      {content}
    </GlassCard>
  );
}