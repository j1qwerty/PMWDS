import { useState, useMemo } from "react";
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
  const [search, setSearch] = useState("");

  const filteredProjects = useMemo(
    () =>
      projects.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      ),
    [projects, search]
  );

  return (
    <GlassCard className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 px-1 shrink-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Projects
        </span>
        {canEdit && onAdd && (
          <button type="button" onClick={onAdd} className="text-indigo-600 hover:text-indigo-800">
            <span className="material-symbols-outlined text-lg">add</span>
          </button>
        )}
      </div>

      <div className="relative mb-3 px-1 shrink-0">
        <span className="material-symbols-outlined absolute left-3 top-1.5 text-slate-400 text-[16px]">search</span>
        <input
          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-shadow outline-none shadow-sm"
          placeholder="Filter projects..."
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3 flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {filteredProjects.map((project) => (
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

        {filteredProjects.length === 0 && (
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
