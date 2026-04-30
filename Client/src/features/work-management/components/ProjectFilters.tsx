import type { Department } from "../../../types";
import { classNames, inputClass } from "../../../ui";

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
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">Search</span>
          <input className={classNames(inputClass, "pl-16")} value={search} onChange={(event) => onChange({ search: event.target.value, status, departmentId })} placeholder="Search code or name..." />
        </div>
        <select className={classNames(inputClass, "lg:w-64")} value={departmentId} onChange={(event) => onChange({ search, status, departmentId: event.target.value })}>
          <option value="">All Departments</option>
          {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
        </select>
      </div>
      <div className="flex gap-2 overflow-x-auto border-b border-white/8">
        {statuses.map((item) => (
          <button
            key={item || "all"}
            className={classNames(
              "shrink-0 border-b-2 px-1 pb-3 text-sm font-semibold transition",
              status === item ? "border-sky-300 text-sky-200" : "border-transparent text-slate-400 hover:text-white",
            )}
            onClick={() => onChange({ search, status: item, departmentId })}
            type="button"
          >
            {item || "All Projects"}
          </button>
        ))}
      </div>
    </div>
  );
}
