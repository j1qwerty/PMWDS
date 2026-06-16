import { GlassCard, getStatusColor } from "../shared";
import { HiOutlineFlag, HiOutlineClipboardList } from "react-icons/hi";
import type { Project } from "../../types";

interface ProjectInfoCardProps {
  project: Project;
  milestonesCount: number;
  canManageProjects?: boolean;
  onViewProject?: (project: Project) => void;
  onEditProject?: (project: Project) => void;
}

export function ProjectInfoCard({
  project,
  milestonesCount,
  canManageProjects,
  onViewProject,
  onEditProject,
}: ProjectInfoCardProps) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-xl">folder_open</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800 truncate">{project.name}</h2>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                getStatusColor(project.status).bg
              } ${getStatusColor(project.status).text}`}
            >
              {project.status}
            </span>
          </div>
          {project.description && (
            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{project.description}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-slate-500">
          <HiOutlineClipboardList className="size-4" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-700 leading-none">{project.totalTasks}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-slate-500">
          <HiOutlineFlag className="size-4" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-700 leading-none">{milestonesCount}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            title="View project"
            onClick={(e) => { e.stopPropagation(); onViewProject?.(project); }}
            className="p-1.5 text-slate-400 hover:text-cyan-500 transition-colors rounded-lg hover:bg-slate-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>

          {canManageProjects && (
            <button
              title="Edit project"
              onClick={(e) => { e.stopPropagation(); onEditProject?.(project); }}
              className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors rounded-lg hover:bg-slate-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
        </div>

        <div className="size-11 relative flex items-center justify-center flex-shrink-0">
          <svg className="size-full -rotate-90" viewBox="0 0 36 36">
            <circle className="stroke-slate-200" cx="18" cy="18" fill="none" r="16" strokeWidth="3" />
            <circle
              className="stroke-indigo-500 transition-all duration-700"
              cx="18" cy="18" fill="none" r="16"
              strokeDasharray="100"
              strokeDashoffset={100 - Math.min(Math.round(project.progressPercentage || 0), 100)}
              strokeLinecap="round"
              strokeWidth="3"
            />
          </svg>
          <span className="absolute text-[9px] font-bold text-slate-600">
            {Math.min(Math.round(project.progressPercentage || 0), 100)}%
          </span>
        </div>
      </div>
    </GlassCard>
  );
}
