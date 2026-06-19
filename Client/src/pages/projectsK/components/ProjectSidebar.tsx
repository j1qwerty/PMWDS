import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import type { Project } from "../../../types";
import { GlassCard } from "../../shared";
import { ProjectCard } from "./ProjectCard";

const PAGE_SIZE = 10;
const PIN_THRESHOLD = 5;

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
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [savedScrollPos, setSavedScrollPos] = useState(0);
  const [pinnedProject, setPinnedProject] = useState<Project | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredProjects = useMemo(
    () =>
      projects.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      ),
    [projects, search]
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search]);

  const visibleProjects = useMemo(
    () => filteredProjects.slice(0, visibleCount),
    [filteredProjects, visibleCount]
  );

  const remaining = filteredProjects.length - visibleCount;

  const handleSelect = useCallback((id: string) => {
    onSelectProject(id);
    const idx = filteredProjects.findIndex((p) => p.id === id);
    const project = filteredProjects.find((p) => p.id === id) ?? null;

    if (idx >= PIN_THRESHOLD) {
      setSavedScrollPos(window.scrollY);
      setPinnedProject(project);
    } else {
      setPinnedProject(null);
      setSavedScrollPos(0);
    }
  }, [onSelectProject, filteredProjects]);

  useEffect(() => {
    if (!pinnedProject) return;
    requestAnimationFrame(() => {
      const grid = listRef.current?.closest<HTMLElement>('div.grid');
      if (grid) {
        const rect = grid.getBoundingClientRect();
        if (rect.top < 0 || rect.top > window.innerHeight) {
          window.scrollBy({ top: rect.top - 16, behavior: "smooth" });
        }
      }
    });
  }, [pinnedProject]);

  const handleJumpBack = () => {
    setPinnedProject(null);
    if (savedScrollPos > 0) {
      window.scrollTo({ top: savedScrollPos, behavior: "smooth" });
    }
    setSavedScrollPos(0);
  };

  return (
    <GlassCard className="p-4 h-full flex flex-col relative">
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

      <div ref={listRef} className="flex flex-col gap-3 flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {pinnedProject && (
          <div className="shrink-0">
            <div className="relative">
              <ProjectCard
                project={pinnedProject}
                isSelected={selectedProjectId === pinnedProject.id}
                onSelectProject={handleSelect}
                onViewProject={onViewProject}
                onEditProject={onEditProject}
                canEdit={canEdit}
              />
              <span className="absolute -top-1.5 -right-1.5 text-[9px] font-semibold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-200 shadow-sm">
                Pinned
              </span>
            </div>
          </div>
        )}

        {visibleProjects.map((project) => (
          <div key={project.id} data-project-id={project.id}>
            <ProjectCard
              project={project}
              isSelected={selectedProjectId === project.id}
              onSelectProject={handleSelect}
              onViewProject={onViewProject}
              onEditProject={onEditProject}
              canEdit={canEdit}
            />
          </div>
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

        {remaining > 0 && (
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="text-xs text-indigo-500 hover:text-indigo-700 font-medium py-1.5 text-center transition-colors"
          >
            Show {Math.min(remaining, PAGE_SIZE)} more ({remaining} remaining)
          </button>
        )}
        {visibleCount > PAGE_SIZE && (
          <button
            type="button"
            onClick={() => setVisibleCount(PAGE_SIZE)}
            className="text-[11px] text-indigo-500 hover:text-indigo-700 font-medium py-1 text-center transition-colors"
          >
            Show less
          </button>
        )}
      </div>

      {savedScrollPos > 0 && (
        <button
          type="button"
          onClick={handleJumpBack}
          className="absolute bottom-4 right-4 size-9 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-lg text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-all z-10"
          title="Back to previous position"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
    </GlassCard>
  );
}
