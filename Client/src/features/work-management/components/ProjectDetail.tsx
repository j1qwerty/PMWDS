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
    return <div className="rounded-lg border border-dashed border-[var(--pmwds-border)] bg-white/[0.025] p-8 text-center text-slate-400"><strong>No project selected</strong><span>Choose a project to inspect its work structure.</span></div>;
  }

  return (
    <div className="rounded-lg border border-[var(--pmwds-border)] bg-[var(--pmwds-surface-2)]/86 p-5 shadow-xl shadow-black/15">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h4>{project.name}</h4><div className="mt-4 flex flex-wrap gap-2"><button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={onEdit}>Edit</button><button className="rounded-md border border-rose-300/40 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-400/20" onClick={onDelete}>Delete</button></div></div>
      <p>{project.description || "No description provided."}</p>
      <MetricRow label="Project Code" value={project.projectCode} />
      <MetricRow label="Status" value={project.status} />
      <MetricRow label="Priority" value={project.priority} />
      <MetricRow label="Budget" value={formatMoney(project.plannedBudget)} />
      <MetricRow label="Actual Cost" value={formatMoney(project.actualCost)} />
      <MetricRow label="Progress" value={formatPercent(project.progressPercentage)} />
      <MetricRow label="Tasks" value={`${project.totalTasks}`} />
      <div className="mt-4 flex flex-wrap gap-2">{statuses.map((status) => <button key={status} className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => onStatusChange(status)}>{status}</button>)}</div>
    </div>
  );
}
