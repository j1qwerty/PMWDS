import { useMemo, useState } from "react";
import type { Department, OrganizationRecord, User } from "../../types";
import { useRoleAccess } from "./RoleGate";
import { useUserOrganization } from "./useUserOrganization";

type OrganizationDepartmentFilterProps = {
  organizations: OrganizationRecord[];
  departments: Department[];
  users: User[];
  selectedOrganizationId: string;
  selectedDepartmentId: string;
  onOrganizationChange: (organizationId: string) => void;
  onDepartmentChange: (departmentId: string) => void;
  allOrganizationsLabel?: string;
  allDepartmentsLabel?: string;
  className?: string;
};

export function OrganizationDepartmentFilter({
  organizations,
  departments,
  users,
  selectedOrganizationId,
  selectedDepartmentId,
  onOrganizationChange,
  onDepartmentChange,
  allOrganizationsLabel = "All Organizations",
  allDepartmentsLabel = "All Departments",
  className = "",
}: OrganizationDepartmentFilterProps) {
  const access = useRoleAccess();
  const { userOrganizationId, shouldFilterByOrg } = useUserOrganization(users, departments);
  const [search, setSearch] = useState("");

  const effectiveOrganizationId = shouldFilterByOrg ? userOrganizationId ?? selectedOrganizationId : selectedOrganizationId;
  const visibleOrganizations = useMemo(() => {
    const scoped = shouldFilterByOrg && userOrganizationId
      ? organizations.filter((organization) => organization.id === userOrganizationId)
      : organizations;
    const term = search.trim().toLowerCase();
    return term ? scoped.filter((organization) => organization.name.toLowerCase().includes(term)) : scoped;
  }, [organizations, search, shouldFilterByOrg, userOrganizationId]);

  const visibleDepartments = useMemo(() => {
    const scoped = departments.filter((department) => {
      if (effectiveOrganizationId) return department.organizationId === effectiveOrganizationId;
      if (shouldFilterByOrg && userOrganizationId) return department.organizationId === userOrganizationId;
      return true;
    });
    const term = search.trim().toLowerCase();
    return term
      ? scoped.filter((department) =>
          department.name.toLowerCase().includes(term) ||
          department.code.toLowerCase().includes(term))
      : scoped;
  }, [departments, effectiveOrganizationId, search, shouldFilterByOrg, userOrganizationId]);

  const showOrganizationFilter = access.isAdmin;

  return (
    <div className={` ${className}`}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        

        {showOrganizationFilter && (
          <select
            value={selectedOrganizationId}
            onChange={(event) => {
              onOrganizationChange(event.target.value);
              onDepartmentChange("");
            }}
            className="h-10 min-w-[280px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">{allOrganizationsLabel}</option>
            {visibleOrganizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={selectedDepartmentId}
          onChange={(event) => onDepartmentChange(event.target.value)}
          className="h-10 min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">{allDepartmentsLabel}</option>
          {visibleDepartments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>

        <div className="relative min-w-[260px] flex-1 max-w-150">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400">
            search
          </span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search organizations or departments..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

      </div>
    </div>
  );
}
