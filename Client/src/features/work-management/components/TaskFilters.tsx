import type { Milestone, User } from "../../../types";
import { inputClass, labelClass } from "../../../ui";

type TaskFiltersProps = {
  filters: Record<string, string>;
  milestones: Milestone[];
  users: User[];
  onChange: (next: Record<string, string>) => void;
};

const statuses = ["", "NotStarted", "Assigned", "InProgress", "OnHold", "Completed", "Delayed", "Cancelled"];
const priorities = ["", "Low", "Medium", "High", "Critical"];

export function TaskFilters({ filters, milestones, users, onChange }: TaskFiltersProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
      <label className={labelClass}><span>Search</span><input className={inputClass} value={filters.search} onChange={(event) => onChange({ ...filters, search: event.target.value })} placeholder="Search tasks..." /></label>
      <label className={labelClass}>
        <span>Status</span>
        <select className={inputClass} value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value })}>
          {statuses.map((item) => <option key={item} value={item}>{item || "All Statuses"}</option>)}
        </select>
      </label>
      <label className={labelClass}>
        <span>Priority</span>
        <select className={inputClass} value={filters.priority} onChange={(event) => onChange({ ...filters, priority: event.target.value })}>
          {priorities.map((item) => <option key={item} value={item}>{item || "All Priorities"}</option>)}
        </select>
      </label>
      <label className={labelClass}>
        <span>Assignee</span>
        <select className={inputClass} value={filters.assigneeId} onChange={(event) => onChange({ ...filters, assigneeId: event.target.value })}>
          <option value="">All Assignees</option>
          {users.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}
        </select>
      </label>
      <label className={labelClass}>
        <span>Milestone</span>
        <select className={inputClass} value={filters.milestoneId} onChange={(event) => onChange({ ...filters, milestoneId: event.target.value })}>
          <option value="">All Tasks</option>
          {milestones.map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.name}</option>)}
        </select>
      </label>
    </div>
  );
}
