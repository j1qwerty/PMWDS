import { useMemo, useState } from "react";
import type { Department, OrganizationRecord } from "../../../types";
import { GlassCard } from "../../shared";

interface MilestoneEntry {
  id: string;
  departmentIds: string[];
  name: string;
  description: string;
  dueDate: string;
  isCritical: boolean;
}

interface MilestoneDepartmentsStepProps {
  milestones: MilestoneEntry[];
  departments: Department[];
  organizations?: OrganizationRecord[];
  isSuperAdmin?: boolean;
  userOrganizationId?: string | null;
  onChange: (milestones: MilestoneEntry[]) => void;
}

export function MilestoneDepartmentsStep({
  milestones,
  departments,
  organizations,
  isSuperAdmin,
  userOrganizationId,
  onChange,
}: MilestoneDepartmentsStepProps) {
  const [search, setSearch] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");

  const orgFilteredDepartments = useMemo(() => {
    if (isSuperAdmin) {
      if (!selectedOrgId) return departments;
      return departments.filter((d) => d.organizationId === selectedOrgId);
    }
    if (userOrganizationId) {
      return departments.filter((d) => d.organizationId === userOrganizationId);
    }
    return departments;
  }, [isSuperAdmin, userOrganizationId, selectedOrgId, departments]);

  const filteredDepartments = orgFilteredDepartments.filter(
    (d) => !search || d.name.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleDepartment = (milestoneId: string, departmentId: string) => {
    onChange(
      milestones.map((milestone) => {
        if (milestone.id !== milestoneId) return milestone;
        const has = milestone.departmentIds.includes(departmentId);
        return {
          ...milestone,
          departmentIds: has
            ? milestone.departmentIds.filter((id) => id !== departmentId)
            : [...milestone.departmentIds, departmentId],
        };
      }),
    );
  };

  if (milestones.length === 0) {
    return (
      <GlassCard className="p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-3xl text-amber-400">flag</span>
        </div>
        <p className="text-sm font-semibold text-slate-600">Create milestones first</p>
        <p className="text-xs text-slate-400 mt-1">Each project milestone needs at least one department assigned.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {isSuperAdmin && (
        <div className="mb-4">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Organization</label>
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="w-full border border-slate-200 rounded-lg p-2 text-sm"
          >
            <option value="">All organizations</option>
            {organizations?.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      )}
      {milestones.map((milestone) => (
        <div
          key={milestone.id}
          className="p-4 rounded-xl border border-slate-200 bg-white/80"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-base text-indigo-500">flag</span>
            <span className="font-semibold text-sm text-slate-800">{milestone.name}</span>
            {milestone.isCritical && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600 uppercase">
                Critical
              </span>
            )}
            <span className="text-xs text-slate-400 ml-auto">
              {milestone.departmentIds.length} department{milestone.departmentIds.length !== 1 ? "s" : ""} selected
            </span>
          </div>

          <div className="mb-3">
            <input
              type="text"
              placeholder="Search departments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredDepartments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">No departments found</p>
            ) : (
              filteredDepartments.map((department) => {
                const checked = milestone.departmentIds.includes(department.id);
                return (
                  <label
                    key={department.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDepartment(milestone.id, department.id)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-700">{department.name}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
