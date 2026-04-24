import type { Milestone } from "../../types";

type MilestoneSelectProps = {
  milestones: Milestone[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
};

export function MilestoneSelect({
  milestones,
  value,
  onChange,
  label = "Milestone",
  allowEmpty = true,
  emptyLabel = "Standalone",
}: MilestoneSelectProps) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {allowEmpty ? <option value="">{emptyLabel}</option> : null}
        {milestones.map((milestone) => (
          <option key={milestone.id} value={milestone.id}>
            {milestone.name}
          </option>
        ))}
      </select>
    </label>
  );
}
