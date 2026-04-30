import { formatDate, formatMoney, formatPercent } from "../../../ui";
import type { Project } from "../../../types";
import { StatusBadge } from "../../../components/common/StatusBadge";

type ProjectListProps = {
  projects: Project[];
  selectedId: string;
  onSelect: (projectId: string) => void;
};

export function ProjectList({ projects, selectedId, onSelect }: ProjectListProps) {
  return (
    <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
      {projects.map((project) => (
        <button key={project.id} className={`rounded-md border border-[var(--pmwds-border)] bg-white/[0.035] px-4 py-3 text-left transition hover:border-sky-300/50 hover:bg-white/[0.06] ${selectedId === project.id ? "selected-card" : ""}`} onClick={() => onSelect(project.id)}>
          <strong>{project.name}</strong>
          <span>{project.projectCode}</span>
          <small>{formatDate(project.plannedEndDate)} · {formatMoney(project.plannedBudget)} · {formatPercent(project.progressPercentage)}</small>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge label={project.status} tone={project.status === "Completed" ? "success" : project.status === "Delayed" ? "danger" : "info"} />
            <StatusBadge label={project.priority} tone="warning" />
          </div>
        </button>
      ))}
    </div>
  );
}
