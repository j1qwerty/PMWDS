import type { Project } from "../../../types";
import { formatDate } from "../../../ui";

interface ProjectCardProps {
  project: Project;
  isSelected: boolean;
  onSelectProject: (id: string) => void;
  onViewProject: (project: Project) => void;
  onEditProject?: (project: Project) => void;
  canEdit?: boolean;
}

export function ProjectCard({ project, isSelected, onSelectProject, onViewProject, onEditProject, canEdit = false }: ProjectCardProps) {
  return (
    <div
      key={project.id}
      onClick={() => onSelectProject(project.id)}
      className={`rounded-xl p-4 shadow-sm border cursor-pointer transition-all duration-200 ${isSelected
          ? "bg-indigo-50 border-blue-500 border-b-2 sha hover:bg-blue-100"
          : "bg-white border-slate-100 hover:shadow-md  hover:border-blue-500 hover:shadow-blue-300 transition-shadow duration-200"
        }`}
    >
      <h4 className="text-sm font-medium  leading-snug text-slate-700">
        {project.name}
      </h4>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5" />
        <div className="w-full bg-slate-100 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${(project.progressPercentage || 0) >= 75
                ? "bg-emerald-500"
                : (project.progressPercentage || 0) >= 50
                  ? "bg-amber-500"
                  : (project.progressPercentage || 0) >= 25
                    ? "bg-orange-500"
                    : "bg-red-500"
              }`}
            style={{ width: `${Math.min(project.progressPercentage || 0, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] text-slate-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>          <span>{formatDate(project.createdDate)}</span>
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
