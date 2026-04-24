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
    return <div className="empty-state compact-empty"><strong>No milestones</strong><span>Create milestones to group tasks and track delivery checkpoints.</span></div>;
  }

  return (
    <div className="list-column">
      {milestones.map((milestone) => (
        <div className="list-card" key={milestone.id}>
          <strong>{milestone.name}</strong>
          <small>{formatDate(milestone.dueDate)} · order {milestone.order} · progress {formatPercent(milestone.progressPercentage)}</small>
          <div className="badge-row"><StatusBadge label={milestone.status} tone={milestone.status === "Completed" ? "success" : "info"} />{milestone.isCritical ? <StatusBadge label="Critical" tone="danger" /> : null}</div>
          <div className="inline-actions"><button className="ghost-button" onClick={() => onEdit(milestone)}>Edit</button><button className="ghost-button" onClick={() => onComplete(milestone.id)}>Complete</button><button className="danger-button" onClick={() => onDelete(milestone)}>Delete</button></div>
        </div>
      ))}
    </div>
  );
}
