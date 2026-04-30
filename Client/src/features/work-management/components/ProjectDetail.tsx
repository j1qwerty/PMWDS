import { StatusBadge } from "../../../components/common/StatusBadge";
import type { Project } from "../../../types";
import { classNames, dangerButtonClass, EmptyState, formatDate, formatMoney, formatPercent, ghostButtonClass, MetricRow } from "../../../ui";

type ProjectDetailProps = {
  project: Project | null;
  onStatusChange: (status: string) => void;
  onEdit: () => void;
  onDelete: () => void;
};

const statuses = ["NotStarted", "InProgress", "OnHold", "Completed", "Cancelled", "Delayed"];

function healthTone(score: number) {
  if (score >= 80) return "text-teal-200";
  if (score >= 55) return "text-amber-200";
  return "text-rose-200";
}

export function ProjectDetail({ project, onStatusChange, onEdit, onDelete }: ProjectDetailProps) {
  if (!project) {
    return <EmptyState title="No project selected" description="Choose a project to inspect its work structure." />;
  }

  return (
    <aside className="rounded-xl border border-[var(--pmwds-border)] bg-[var(--pmwds-surface-2)]/90 p-5 shadow-2xl shadow-black/20">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <StatusBadge label={project.status} tone={project.status === "Completed" ? "success" : project.status === "Delayed" ? "danger" : "info"} />
            <StatusBadge label={project.priority} tone="warning" />
          </div>
          <h4 className="text-xl font-semibold text-white">{project.name}</h4>
          <p className="mt-1 text-sm text-slate-400">{project.departmentName || "No department"} / {project.projectManagerName || "No manager"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={ghostButtonClass} onClick={onEdit}>Edit</button>
          <button className={dangerButtonClass} onClick={onDelete}>Delete</button>
        </div>
      </div>

      <p className="mb-5 rounded-lg border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300">{project.description || "No description provided."}</p>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-white/8 bg-black/15 p-3 text-center">
          <span className="block text-[0.62rem] font-semibold tracking-[0.16em] text-slate-500 uppercase">AI Health</span>
          <strong className={classNames("mt-1 block text-2xl font-semibold", healthTone(project.aiHealthScore))}>{formatPercent(project.aiHealthScore)}</strong>
        </div>
        <div className="rounded-lg border border-white/8 bg-black/15 p-3 text-center">
          <span className="block text-[0.62rem] font-semibold tracking-[0.16em] text-slate-500 uppercase">Delay Risk</span>
          <strong className={classNames("mt-1 block text-2xl font-semibold", healthTone(100 - project.aiDelayRiskScore))}>{formatPercent(project.aiDelayRiskScore)}</strong>
        </div>
        <div className="rounded-lg border border-white/8 bg-black/15 p-3 text-center">
          <span className="block text-[0.62rem] font-semibold tracking-[0.16em] text-slate-500 uppercase">Tasks</span>
          <strong className="mt-1 block text-2xl font-semibold text-white">{project.completedTasks}/{project.totalTasks}</strong>
        </div>
      </div>

      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-400">Portfolio progress</span>
          <strong className="text-white">{formatPercent(project.progressPercentage)}</strong>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-gradient-to-r from-sky-300 via-indigo-300 to-teal-200" style={{ width: `${Math.min(100, Math.max(0, project.progressPercentage ?? 0))}%` }} />
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-white/8 bg-white/[0.025] p-3">
        <MetricRow label="Project Code" value={project.projectCode} />
        <MetricRow label="Planned End" value={formatDate(project.plannedEndDate)} />
        <MetricRow label="Budget" value={formatMoney(project.plannedBudget)} />
        <MetricRow label="Actual Cost" value={formatMoney(project.actualCost)} />
        <MetricRow label="Budget Variance" value={formatMoney(project.budgetVariance)} />
        <MetricRow label="Overdue Tasks" value={`${project.overdueTasks}`} />
      </div>

      <div className="flex flex-wrap gap-2">
        {statuses.map((status) => (
          <button key={status} className={classNames(ghostButtonClass, project.status === status && "border-sky-300/60 bg-sky-300/10 text-sky-100")} onClick={() => onStatusChange(status)}>
            {status}
          </button>
        ))}
      </div>
    </aside>
  );
}
