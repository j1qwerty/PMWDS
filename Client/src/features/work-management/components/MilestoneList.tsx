import { formatDate, formatPercent } from "../../../ui";
import type { Milestone } from "../../../types";
import { StatusBadge } from "../../../components/common/StatusBadge";

type MilestoneListProps = {
  milestones: Milestone[];
  onEdit: (milestone: Milestone) => void;
  onComplete: (milestoneId: string) => void;
  onDelete: (milestone: Milestone) => void;
};

export function MilestoneList({ milestones, onEdit, onComplete, onDelete }: MilestoneListProps) {
  if (!milestones.length) {
    return <div className="rounded-lg border border-dashed border-[var(--pmwds-border)] bg-white/[0.025] p-8 text-center text-slate-400 p-4"><strong>No milestones</strong><span>Create milestones to group tasks and track delivery checkpoints.</span></div>;
  }

  return (
    <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
      {milestones.map((milestone) => (
        <div className="rounded-md border border-[var(--pmwds-border)] bg-white/[0.035] px-4 py-3 text-left transition hover:border-sky-300/50 hover:bg-white/[0.06]" key={milestone.id}>
          <strong>{milestone.name}</strong>
          <small>{formatDate(milestone.dueDate)} · order {milestone.order} · progress {formatPercent(milestone.progressPercentage)}</small>
          <div className="mt-2 flex flex-wrap gap-2"><StatusBadge label={milestone.status} tone={milestone.status === "Completed" ? "success" : "info"} />{milestone.isCritical ? <StatusBadge label="Critical" tone="danger" /> : null}</div>
          <div className="mt-4 flex flex-wrap gap-2"><button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => onEdit(milestone)}>Edit</button><button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => onComplete(milestone.id)}>Complete</button><button className="rounded-md border border-rose-300/40 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-400/20" onClick={() => onDelete(milestone)}>Delete</button></div>
        </div>
      ))}
    </div>
  );
}
