import { GlassCard, getStatusColor, getPriorityColor } from "../shared";
import { Icon } from "../../components/ui/Icon";
import { Avatark } from "../shared/Avatark";
import type { Project, User } from "../../types";
import { useMemo, useEffect, useState } from "react";

interface ProjectInfoCardProps {
  project: Project;
  milestonesCount: number;
  canManageProjects?: boolean;
  users?: User[];
  onViewProject?: (project: Project) => void;
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (project: Project) => void;
}

export function ProjectInfoCard({
  project,
  milestonesCount,
  canManageProjects,
  users,
  onViewProject,
  onEditProject,
  onDeleteProject,
}: ProjectInfoCardProps) {
  const manager = useMemo(
    () => users?.find((u) => u.id === project.projectManagerId),
    [users, project.projectManagerId],
  );

  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(project.progressPercentage || 0);
    }, 200);
    return () => clearTimeout(timer);
  }, [project.progressPercentage]);

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-3">
        {/* Animated Progress Ring */}
        <div className="size-11 relative flex items-center justify-center flex-shrink-0">
          <svg className="size-full -rotate-90" viewBox="0 0 36 36">
            <circle className="stroke-slate-200" cx="18" cy="18" fill="none" r="16" strokeWidth="3" />
            <circle
              className="stroke-indigo-500 transition-all duration-1000 ease-out"
              cx="18" cy="18" fill="none" r="16"
              strokeDasharray={2 * Math.PI * 16}
              strokeDashoffset={(2 * Math.PI * 16) - (Math.min(animatedProgress, 100) / 100) * (2 * Math.PI * 16)}
              strokeLinecap="round"
              strokeWidth="3"
            />
          </svg>
          <span className="absolute text-[9px] font-bold text-slate-600">
            {Math.round(animatedProgress)}%
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800 truncate">{project.name}</h2>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${getStatusColor(project.status).bg
                } ${getStatusColor(project.status).text}`}
            >
              {project.status}
            </span>
          </div>
          {project.description && (
            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{project.description}</p>
          )}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getPriorityColor(project.priority).bg} ${getPriorityColor(project.priority).text}`}>
              <span className={`w-1.5 h-1.5 rounded-full inline-block mr-1 ${getPriorityColor(project.priority).dot}`} />
              {project.priority}
            </span>
            <span className="text-[11px] text-slate-500">₹{project.plannedBudget.toLocaleString("en-IN")}</span>
            {project.departmentName && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
                <Icon name="hi-office-building" size={14} />
                {project.departmentName}
              </span>
            )}
            {project.projectManagerId && (
              <div className="flex items-center gap-1.5" title="Project Manager">
                <Avatark person={manager} name={project.projectManagerName} size="xs" />
                <span className={`text-xs font-medium truncate max-w-[120px] ${manager?.isActive === false ? "text-red-500" : "text-slate-500"}`}>
                  {manager?.fullName || project.projectManagerName}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-slate-500">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Icon name="hi-flag" size={16} />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-700 leading-none">{milestonesCount}</span>
            </div>
          </div>
          <Icon name="hi-clipboard" size={16} />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-700 leading-none">{project.totalTasks}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            title="View project"
            onClick={(e) => { e.stopPropagation(); onViewProject?.(project); }}
            className="p-1.5 text-slate-400 hover:text-cyan-500 transition-colors rounded-lg hover:bg-slate-100"
          >
            <Icon name="view" size={16} />
          </button>

          {canManageProjects && (
            <button
              title="Edit project"
              onClick={(e) => { e.stopPropagation(); onEditProject?.(project); }}
              className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors rounded-lg hover:bg-slate-100"
            >
              <Icon name="edit" size={16} />
            </button>
          )}
          {canManageProjects && (
            <button
              title="Delete project"
              onClick={(e) => { e.stopPropagation(); onDeleteProject?.(project); }}
              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
            >
              <Icon name="delete" size={16} />
            </button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}