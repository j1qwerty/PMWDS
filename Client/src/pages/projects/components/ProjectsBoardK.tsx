import { GlassCard } from "../../shared";
import type { Project } from "../../../types";
import { ProjectCardK } from "../../projectsK/components/ProjectCardK";

interface ProjectsBoardKProps {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  onViewProject: (project: Project) => void;
  milestonesCountByProject?: Record<string, number>;
}

export function ProjectsBoardK({
  projects,
  selectedProjectId,
  onSelectProject,
  onViewProject,
  milestonesCountByProject = {},
}: ProjectsBoardKProps) {

  return (
    <GlassCard className="w-full flex flex-col gap-md overflow-y-auto custom-scrollbar p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-h2 text-h2 text-on-surface font-bold">Projects (Compact)</h2>
        <span className="text-xs font-bold text-outline-variant tracking-widest uppercase">
          {projects.length} Active
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {projects.map((project) => (
          <ProjectCardK
            key={project.id}
            project={project}
            isSelected={selectedProjectId === project.id}
            onSelectProject={onSelectProject}
            onViewProject={onViewProject}
            milestonesCount={milestonesCountByProject[project.id] ?? 0}
          />
        ))}
      </div>

      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="material-symbols-outlined text-outline text-4xl mb-3" style={{ fontVariationSettings: "'FILL' 1" }}>
            folder_off
          </span>
          <p className="text-on-surface-variant font-medium">No projects found</p>
        </div>
      )}
    </GlassCard>
  );
}
