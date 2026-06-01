import { ProjectCard } from "./ProjectCard";
import type { Department, OrganizationRecord, Project, User } from "../../../types";
import { GlassCard, projectBelongsToDepartment } from "../../shared";

interface ProjectsBoardProps {
  projects: Project[];
  departments: Department[];
  organizations: OrganizationRecord[];
  users: User[];
  selectedProjectId: string;
  selectedDepartmentId: string;
  onSelectProject: (id: string) => void;
}

export function ProjectsBoard({ 
  projects, 
  departments,
  organizations,
  users,
  selectedProjectId, 
  selectedDepartmentId, 
  onSelectProject 
}: ProjectsBoardProps) {
  const filteredProjects = selectedDepartmentId
    ? projects.filter(p => projectBelongsToDepartment(p, selectedDepartmentId))
    : projects;

  return (
    <GlassCard className="w-1/3 min-w-[380px] flex flex-col gap-md overflow-y-auto custom-scrollbar py-4 px-2">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-h2 text-h2 text-on-surface font-bold">Projects Board</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-outline-variant tracking-widest uppercase">
            {filteredProjects.length} Active
          </span>
          <button className="text-outline hover:text-primary transition-colors">
            <span className="material-symbols-outlined">filter_list</span>
          </button>
        </div>
      </div>

      <div className="relative mb-3">
        <span className="material-symbols-outlined absolute left-3 top-2 text-outline text-[18px]">search</span>
        <input
          className="w-full bg-surface border border-outline-variant rounded-md py-2 pl-10 pr-3 text-sm text-on-surface placeholder-outline focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow outline-none shadow-sm"
          placeholder="Filter projects..."
          type="text"
        />
      </div>

      {filteredProjects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          departments={departments}
          organizations={organizations}
          users={users}
          selectedProjectId={selectedProjectId}
          onSelect={onSelectProject}
        />
      ))}

      {filteredProjects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="material-symbols-outlined text-outline text-4xl mb-3" style={{ fontVariationSettings: "'FILL' 1" }}>
            folder_off
          </span>
          <p className="text-on-surface-variant font-medium">No projects found</p>
          <p className="text-xs text-outline mt-1">
            {selectedDepartmentId ? "Try selecting a different department" : "Create a new project to get started"}
          </p>
        </div>
      )}
    </GlassCard>
  );
}
