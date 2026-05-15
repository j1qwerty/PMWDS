import type { Department, OrganizationRecord, User } from "../../types";
import { formatPercent } from "../../ui";

interface DepartmentDetailCardProps {
  department: Department;
  organization?: OrganizationRecord;
  departmentHead?: User;
  parentDepartment?: Department;
  childCount: number;
  teamMembers?: User[];
  dashboard?: Record<string, unknown> | null;
}

export function DepartmentDetailCard({
  department,
  organization,
  departmentHead,
  parentDepartment,
  childCount,
  teamMembers = [],
  dashboard,
}: DepartmentDetailCardProps) {
  const activeProjects = Number(dashboard?.["activeProjects"] ?? 0);
  const completedProjects = Number(dashboard?.["completedProjects"] ?? 0);
  const teamMembersCount = teamMembers.length || Number(dashboard?.["teamMembers"] ?? 0);
  const avgWorkload = Math.round(Number(dashboard?.["averageWorkload"] ?? 0));
  const capacityPercent = Math.min((department.capacityUtilization || 0) * 100, 100);
  const displayMembers = teamMembers.slice(0, 5);
  const extraCount = Math.max(0, teamMembers.length - 5);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <span className="material-symbols-outlined text-3xl text-white">groups</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">{department.name}</h3>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100">
                {department.code}
              </span>
              {organization && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">business</span>
                  {organization.name}
                </span>
              )}
            </div>
          </div>
        </div>
        {department.maxCapacity > 0 && (
          <div className="text-right shrink-0 bg-slate-50 rounded-xl px-4 py-3">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Capacity</p>
            <p className="text-2xl font-bold text-slate-800">{department.maxCapacity}</p>
          </div>
        )}
      </div>

      {/* Description */}
      {department.description && (
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">{department.description}</p>
      )}

      {/* Capacity Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-slate-500 font-medium">Capacity Utilization</span>
          <span className={`font-semibold ${
            capacityPercent > 80 ? "text-amber-600" : capacityPercent > 60 ? "text-emerald-600" : "text-slate-600"
          }`}>
            {formatPercent(department.capacityUtilization)}
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              capacityPercent > 80
                ? "bg-gradient-to-r from-amber-400 to-amber-500"
                : capacityPercent > 60
                ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                : "bg-gradient-to-r from-indigo-400 to-indigo-500"
            }`}
            style={{ width: `${capacityPercent}%` }}
          />
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <DetailItem icon="business" label="Organization" value={organization?.name ?? "Unassigned"} />
        <DetailItem icon="account_tree" label="Parent Dept" value={parentDepartment?.name ?? "None"} />
        <DetailItem icon="person" label="Dept Head" value={departmentHead?.fullName ?? "Unassigned"} avatar={departmentHead} />
        <DetailItem icon="subdirectory_arrow_right" label="Sub-departments" value={childCount.toString()} />
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Team Members" value={teamMembersCount} color="indigo" />
        <StatCard label="Avg Workload" value={`${avgWorkload}%`} color="slate" />
        <StatCard label="Active Projects" value={activeProjects} color="emerald" />
        <StatCard label="Completed" value={completedProjects} color="sky" />
      </div>

      {/* Team Members Section */}
      {teamMembers.length > 0 && (
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Team Members</h4>
            <span className="text-xs text-slate-400">{teamMembers.length} members</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {displayMembers.map((member) => (
                <img
                  key={member.id}
                  className="size-9 rounded-full border-2 border-white shadow-sm ring-2 ring-slate-50"
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.fullName)}&background=4f46e5&color=fff&size=36`}
                  alt={member.fullName}
                  title={member.fullName}
                />
              ))}
              {extraCount > 0 && (
                <div className="size-9 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-600 shadow-sm ring-2 ring-slate-50">
                  +{extraCount}
                </div>
              )}
            </div>
            {departmentHead && (
              <div className="flex items-center gap-2 ml-4 pl-4 border-l-2 border-slate-200">
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Head</span>
                <img
                  className="size-9 rounded-full border-2 border-indigo-300 shadow-sm ring-2 ring-indigo-100"
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(departmentHead.fullName)}&background=4f46e5&color=fff&size=36`}
                  alt={departmentHead.fullName}
                  title={`Department Head: ${departmentHead.fullName}`}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workload Bar */}
      {avgWorkload > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-500 font-medium">Team Workload</span>
            <span className={`font-semibold ${
              avgWorkload > 80 ? "text-red-600" : avgWorkload > 60 ? "text-amber-600" : "text-emerald-600"
            }`}>
              {avgWorkload}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                avgWorkload > 80
                  ? "bg-gradient-to-r from-red-400 to-red-500"
                  : avgWorkload > 60
                  ? "bg-gradient-to-r from-amber-400 to-amber-500"
                  : "bg-gradient-to-r from-emerald-400 to-emerald-500"
              }`}
              style={{ width: `${Math.min(avgWorkload, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function DetailItem({ icon, label, value, avatar }: { 
  icon: string; 
  label: string; 
  value: string; 
  avatar?: User;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
      <span className="material-symbols-outlined text-slate-400 text-lg">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</div>
        <div className="text-sm font-medium text-slate-700 flex items-center gap-2 mt-0.5">
          {avatar && (
            <img
              className="size-5 rounded-full"
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(avatar.fullName)}&background=e0e7ff&color=4f46e5&size=20`}
              alt={avatar.fullName}
            />
          )}
          <span className="truncate">{value}</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { 
  label: string; 
  value: string | number; 
  color: "indigo" | "slate" | "emerald" | "sky";
}) {
  const colorMap = {
    indigo: { text: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
    slate: { text: "text-slate-600", bg: "bg-slate-50", border: "border-slate-100" },
    emerald: { text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
    sky: { text: "text-sky-600", bg: "bg-sky-50", border: "border-sky-100" },
  };

  return (
    <div className={`rounded-xl border p-4 text-center ${colorMap[color].border} ${colorMap[color].bg}`}>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorMap[color].text}`}>{value}</p>
    </div>
  );
}