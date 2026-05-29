import type { Project } from "../../../types";
import { GlassCard } from "../../shared";
import { ProjectCard } from "./ProjectCard";

interface ProjectSidebarProps {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  onViewProject: (project: Project) => void;
  onEditProject?: (project: Project) => void;
  canEdit?: boolean;
  onAdd?: () => void;
}

export function ProjectSidebar({
  projects,
  selectedProjectId,
  onSelectProject,
  onViewProject,
  onEditProject,
  canEdit = false,
  onAdd,
}: ProjectSidebarProps) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Projects
        </span>
        {canEdit && onAdd && (
          <button type="button" onClick={onAdd} className="text-indigo-600 hover:text-indigo-800">
            <span className="material-symbols-outlined text-lg">add</span>
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3 max-h-[calc(100vh-20px)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            isSelected={selectedProjectId === project.id}
            onSelectProject={onSelectProject}
            onViewProject={onViewProject}
            onEditProject={onEditProject}
            canEdit={canEdit}
          />
        ))}

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