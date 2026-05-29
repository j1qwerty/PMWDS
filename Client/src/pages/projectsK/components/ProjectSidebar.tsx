import type { Project } from "../../../types";
import { GlassCard } from "../../shared";

interface ProjectSidebarProps {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  onViewProject: (project: Project) => void;
  onEditProject?: (project: Project) => void;
  canEdit?: boolean;
}

export function ProjectSidebar({
  projects,
  selectedProjectId,
  onSelectProject,
  onViewProject,
  onEditProject,
  canEdit = false,
}: ProjectSidebarProps) {
  return (
    <GlassCard className="p-4">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">
        Projects
      </div>
      <div className="flex flex-col gap-3 max-h-[calc(100vh-280px)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {projects.map((project) => {
          const isSelected = selectedProjectId === project.id;
          return (
            <div
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className={`rounded-xl p-4 shadow-sm border cursor-pointer transition-all duration-200 ${
                isSelected
                  ? "bg-blue-100 border-purple-200 hover:bg-blue-100"
                  : "bg-white border-slate-100 hover:bg-blue-50 hover:shadow-md"
              }`}
            >
              <h4 className="text-sm font-medium  leading-snug text-slate-700">
                {project.name}
              </h4>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  {/* <span className="text-[10px] text-slate-400 font-medium">Progress</span> */}
                 
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      (project.progressPercentage || 0) >= 75
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

              {/* Category Badge & Actions */}
              <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-600 px-1">
                    {Math.round(project.progressPercentage || 0)}%
                  </span>
                {/* <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-600 border-indigo-200">
                  {project.category || "Project"}
                </span> */}

                <div className="flex items-center gap-2">
                  {/* View button */}
                  <button
                    title="View project"
                    className="p-1 text-slate-400 hover:text-cyan-500 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation(); // Don't select card
                      onViewProject(project);
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>

                  {/* Edit button – only if allowed */}
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
        })}

        {/* Empty State */}
        {projects.length === 0 && (
          <div className="text-center py-8">
            <div className="text-slate-400 mb-2">
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-xs text-slate-400">No projects match filters</p>
          </div>
        )}
      </div>
    </GlassCard>
  );
}