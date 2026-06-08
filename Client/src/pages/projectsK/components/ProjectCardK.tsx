import type { Project } from "../../../types";
import { formatDate } from "../../../ui";
import { HiOutlineFlag, HiOutlineClipboardList } from "react-icons/hi";
import { statusColorPalette, getStatusColor } from "../../shared/colors";

interface ProjectCardKProps {
  project: Project;
  isSelected: boolean;
  milestonesCount?: number;
  onSelectProject: (id: string) => void;
  onViewProject: (project: Project) => void;
  onEditProject?: (project: Project) => void;
  canEdit?: boolean;
}

const statusLabel: Record<string, string> = {
  NotStarted: "Not Started",
  InProgress: "On Track",
  Completed: "Completed",
  Delayed: "At Risk",
  OnHold: "On Hold",
  Cancelled: "Cancelled",
};

export function ProjectCardK({
  project,
  isSelected,
  milestonesCount = 0,
  onSelectProject,
  onViewProject,
  onEditProject,
  canEdit = false,
}: ProjectCardKProps) {
  const progress = Math.min(Math.round(project.progressPercentage || 0), 100);
  const sc = getStatusColor(project.status);
  const label = statusLabel[project.status] || "Not Started";

  const progressStroke: Record<string, string> = {
    NotStarted: "stroke-slate-400",
    InProgress: "stroke-blue-500",
    Completed: "stroke-emerald-500",
    Delayed: "stroke-amber-500",
    OnHold: "stroke-purple-500",
    Cancelled: "stroke-red-500",
  };
  const strokeColor = progressStroke[project.status] || "stroke-slate-400";

  return (
    <div
      key={project.id}
      onClick={() => onSelectProject(project.id)}
      className={`rounded-xl p-4 shadow-sm border cursor-pointer transition-all duration-200 ${isSelected
        ? "bg-indigo-50 border-blue-500 border-b-2 hover:bg-blue-100"
        : "bg-white border-slate-100 hover:shadow-md hover:border-blue-500 hover:shadow-blue-300 transition-shadow duration-200"
      }`}
    >
      <h4 className="text-sm font-medium leading-snug text-slate-700 mb-2">
        {project.name}
      </h4>

      <div className="flex items-center gap-1.5 mb-3">
        <div className={`size-2 rounded-full ${sc.dot} ${project.status === "Delayed" ? "animate-pulse" : ""}`} />
        <span className={`text-[11px] font-semibold ${sc.text}`}>{label}</span>
      </div>

      <div className="flex items-center justify-center mb-3">
        <div className="size-16 relative flex items-center justify-center">
          <svg className="size-full -rotate-90" viewBox="0 0 36 36">
            <circle className="stroke-slate-100" cx="18" cy="18" fill="none" r="16" strokeWidth="3" />
            <circle
              className={`${strokeColor} transition-all duration-700`}
              cx="18" cy="18" fill="none" r="16"
              strokeDasharray="100"
              strokeDashoffset={100 - progress}
              strokeLinecap="round"
              strokeWidth="3"
            />
          </svg>
          <span className="absolute text-xs font-bold text-slate-600">{progress}%</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mb-3">
        <div className="flex items-center gap-1 text-[11px] text-slate-500">
          <HiOutlineFlag className="size-3.5" />
          <span>{milestonesCount}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-500">
          <HiOutlineClipboardList className="size-3.5" />
          <span>{project.totalTasks ?? 0}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <span>{formatDate(project.createdDate)}</span>
          <span className="text-slate-300">|</span>
          <span>{formatDate(project.plannedEndDate)}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            title="View project"
            className="p-1 text-slate-400 hover:text-cyan-500 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onViewProject(project);
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>

          {canEdit && onEditProject && (
            <button
              title="Edit project"
              className="p-1 text-slate-400 hover:text-amber-500 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onEditProject(project);
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
