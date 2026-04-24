import { MetricRow, formatMoney, formatPercent } from "../../../ui";
import type { Project } from "../../../types";

type ProjectDetailProps = {
  project: Project | null;
  onStatusChange: (status: string) => void;
  onEdit: () => void;
  onDelete: () => void;
};

const statuses = ["NotStarted", "InProgress", "OnHold", "Completed", "Cancelled", "Delayed"];

export function ProjectDetail({ project, onStatusChange, onEdit, onDelete }: ProjectDetailProps) {
  if (!project) {
    return <div className="empty-state"><strong>No project selected</strong><span>Choose a project to inspect its work structure.</span></div>;
  }

  return (
    <div className="detail-card">
      <div className="section-row"><h4>{project.name}</h4><div className="inline-actions"><button className="ghost-button" onClick={onEdit}>Edit</button><button className="danger-button" onClick={onDelete}>Delete</button></div></div>
      <p>{project.description || "No description provided."}</p>
      <MetricRow label="Project Code" value={project.projectCode} />
      <MetricRow label="Status" value={project.status} />
      <MetricRow label="Priority" value={project.priority} />
      <MetricRow label="Budget" value={formatMoney(project.plannedBudget)} />
      <MetricRow label="Actual Cost" value={formatMoney(project.actualCost)} />
      <MetricRow label="Progress" value={formatPercent(project.progressPercentage)} />
      <MetricRow label="Tasks" value={`${project.totalTasks}`} />
      <div className="inline-actions">{statuses.map((status) => <button key={status} className="ghost-button" onClick={() => onStatusChange(status)}>{status}</button>)}</div>
    </div>
  );
}
