import type { Department } from "../../../types";

type ProjectFiltersProps = {
  search: string;
  status: string;
  departmentId: string;
  departments: Department[];
  onChange: (next: { search: string; status: string; departmentId: string }) => void;
};

const statuses = ["", "NotStarted", "InProgress", "OnHold", "Completed", "Cancelled", "Delayed"];

export function ProjectFilters({ search, status, departmentId, departments, onChange }: ProjectFiltersProps) {
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
      <label><span>Search</span><input value={search} onChange={(event) => onChange({ search: event.target.value, status, departmentId })} /></label>
      <label>
        <span>Status</span>
        <select value={status} onChange={(event) => onChange({ search, status: event.target.value, departmentId })}>
          {statuses.map((item) => <option key={item} value={item}>{item || "All Statuses"}</option>)}
        </select>
      </label>
      <label>
        <span>Department</span>
        <select value={departmentId} onChange={(event) => onChange({ search, status, departmentId: event.target.value })}>
          <option value="">All Departments</option>
          {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
        </select>
      </label>
    </div>
  );
}
