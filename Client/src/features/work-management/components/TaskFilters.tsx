import type { Milestone, User } from "../../../types";

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
    <div className="toolbar-grid">
      <label><span>Search</span><input value={filters.search} onChange={(event) => onChange({ ...filters, search: event.target.value })} /></label>
      <label>
        <span>Status</span>
        <select value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value })}>
          {statuses.map((item) => <option key={item} value={item}>{item || "All Statuses"}</option>)}
        </select>
      </label>
      <label>
        <span>Priority</span>
        <select value={filters.priority} onChange={(event) => onChange({ ...filters, priority: event.target.value })}>
          {priorities.map((item) => <option key={item} value={item}>{item || "All Priorities"}</option>)}
        </select>
      </label>
      <label>
        <span>Assignee</span>
        <select value={filters.assigneeId} onChange={(event) => onChange({ ...filters, assigneeId: event.target.value })}>
          <option value="">All Assignees</option>
          {users.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}
        </select>
      </label>
      <label>
        <span>Milestone</span>
        <select value={filters.milestoneId} onChange={(event) => onChange({ ...filters, milestoneId: event.target.value })}>
          <option value="">All Tasks</option>
          {milestones.map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.name}</option>)}
        </select>
      </label>
    </div>
  );
}
