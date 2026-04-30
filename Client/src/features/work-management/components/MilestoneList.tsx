import { StatusBadge } from "../../../components/common/StatusBadge";
import type { Milestone } from "../../../types";
import { dangerButtonClass, EmptyState, formatDate, formatPercent, ghostButtonClass } from "../../../ui";

type MilestoneListProps = {
  milestones: Milestone[];
  onEdit: (milestone: Milestone) => void;
  onComplete: (milestoneId: string) => void;
  onDelete: (milestone: Milestone) => void;
};

export function MilestoneList({ milestones, onEdit, onComplete, onDelete }: MilestoneListProps) {
  if (!milestones.length) {
    return <EmptyState compact title="No milestones" description="Create milestones to group tasks and track delivery checkpoints." />;
  }

  return (
    <div className="grid max-h-[520px] gap-3 overflow-y-auto pr-1">
      {milestones.map((milestone) => (
        <article className="rounded-xl border border-white/8 bg-white/[0.04] p-4 shadow-lg shadow-black/10 transition hover:border-sky-300/30 hover:bg-white/[0.06]" key={milestone.id}>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                <StatusBadge label={milestone.status} tone={milestone.status === "Completed" ? "success" : "info"} />
                {milestone.isCritical ? <StatusBadge label="Critical" tone="danger" /> : null}
              </div>
              <strong className="block text-base font-semibold text-white">{milestone.name}</strong>
              <small className="mt-1 block text-sm text-slate-400">{formatDate(milestone.dueDate)} / order {milestone.order}</small>
            </div>
            <span className="rounded-full bg-sky-300/10 px-3 py-1 text-xs font-semibold text-sky-200">{formatPercent(milestone.progressPercentage)}</span>
          </div>
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-300 to-teal-200" style={{ width: `${Math.min(100, Math.max(0, milestone.progressPercentage ?? 0))}%` }} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={ghostButtonClass} onClick={() => onEdit(milestone)}>Edit</button>
            <button className={ghostButtonClass} onClick={() => onComplete(milestone.id)}>Complete</button>
            <button className={dangerButtonClass} onClick={() => onDelete(milestone)}>Delete</button>
          </div>
        </article>
      ))}
    </div>
  );
}
