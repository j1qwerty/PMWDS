import type { Project } from "../../../types";
import { formatDate } from "../../../ui";
import { getStatusColor } from "../../shared/colors";

interface ProjectCardProps {
  project: Project;
  isSelected: boolean;
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

const progressStroke: Record<string, string> = {
  NotStarted: "stroke-slate-400",
  InProgress: "stroke-blue-500",
  Completed: "stroke-emerald-500",
  Delayed: "stroke-amber-500",
  OnHold: "stroke-purple-500",
  Cancelled: "stroke-red-500",
};

function getStatusStyles(status: string) {
  const c = getStatusColor(status);
  return {
    label: statusLabel[status] || "Not Started",
    dot: c.dot,
    textColor: c.text,
    border: c.border,
    bgSelected: c.bg,
    bgHover: c.bg.replace("100", "50"),
    progressColor: progressStroke[status] || "stroke-slate-400",
  };
}

export function ProjectCard({ project, isSelected, onSelectProject, onViewProject, onEditProject, canEdit = false }: ProjectCardProps) {
  const progress = Math.min(Math.round(project.progressPercentage || 0), 100);
  const s = getStatusStyles(project.status);

  return (
  <div
  key={project.id}
  onClick={() => onSelectProject(project.id)}
  className={`rounded-xl p-4 shadow-sm border cursor-pointer transition-all duration-200 ${
    isSelected
      ? `${s.bgSelected} ${s.border} border-b-2`
      : `bg-white ${s.border} hover:shadow-md ${s.bgHover}`
  }`}
>
  {/* Top Section: Progress Ring + Name */}
  <div className="flex items-start gap-2 mb-3">
    {/* Progress Ring - Smaller */}
    <div className="size-11 relative flex items-center justify-center shrink-0">
      <svg className="size-full -rotate-90" viewBox="0 0 36 36">
        <circle className="stroke-slate-100" cx="18" cy="18" fill="none" r="14" strokeWidth="3" />
        <circle
          className={`${s.progressColor} transition-all duration-700`}
          cx="18" cy="18" fill="none" r="14"
          strokeDasharray="87.96"
          strokeDashoffset={87.96 - (progress / 100) * 87.96}
          strokeLinecap="round"
          strokeWidth="3"
        />
      </svg>
      <span className={`absolute text-[10px] font-bold ${s.textColor}`}>{progress}%</span>
    </div>

    {/* Project Name and Status */}
    <div className="flex-1 min-w-0">
      <h4 className="text-sm font-medium leading-snug text-slate-700 line-clamp-2">
        {project.name}
      </h4>
      <div className="flex items-center gap-1 mt-1">
        <div className={`size-1.5 rounded-full ${s.dot} ${project.status === "Delayed" ? "animate-pulse" : ""}`} />
        <span className={`text-[10px] font-semibold ${s.textColor}`}>{s.label}</span>
      </div>
    </div>
  </div>

  {/* Bottom Section: Dates and Actions */}
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-1 text-[10px] text-slate-500">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span>{formatDate(project.createdDate)}</span>
      <span className="text-slate-300">|</span>
      <span>{formatDate(project.plannedEndDate)}</span>
    </div>

    <div className="flex items-center gap-1.5">
      <button
        title="View project"
        className="p-1 text-slate-400 hover:text-cyan-500 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onViewProject(project);
        }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}
    </div>
  </div>
</div>
  );
}
