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
    <div className="list-column">
      {projects.map((project) => (
        <button key={project.id} className={`list-card ${selectedId === project.id ? "selected-card" : ""}`} onClick={() => onSelect(project.id)}>
          <strong>{project.name}</strong>
          <span>{project.projectCode}</span>
          <small>{formatDate(project.plannedEndDate)} · {formatMoney(project.plannedBudget)} · {formatPercent(project.progressPercentage)}</small>
          <div className="badge-row">
            <StatusBadge label={project.status} tone={project.status === "Completed" ? "success" : project.status === "Delayed" ? "danger" : "info"} />
            <StatusBadge label={project.priority} tone="warning" />
          </div>
        </button>
      ))}
    </div>
  );
}
