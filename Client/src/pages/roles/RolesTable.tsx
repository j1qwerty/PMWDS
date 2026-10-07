import { useMemo } from "react";
import type { RoleRecord } from "../../types";
import { roleDisplayName, isAllScope } from "../../permissions";
import { GlassCard, GradientButton } from "../shared";

interface RolesTableProps {
  roles: RoleRecord[];
  onEdit: (role: RoleRecord) => void;
  onDelete: (role: RoleRecord) => void;
  onCreate: () => void;
  isAdmin: boolean;
}

export function RolesTable({ roles, onEdit, onDelete, onCreate, isAdmin }: RolesTableProps) {
  // The scope split is the first thing to check when working out why somebody can
  // or cannot see something, so it is summarised here rather than only inside the
  // edit dialog.
  const scopeOf = (role: RoleRecord) =>
    role.permissions.reduce(
      (counts, permission) => {
        if (isAllScope(permission.code ?? "")) counts.all += 1;
        else counts.own += 1;
        return counts;
      },
      { own: 0, all: 0 },
    );

  const rows = useMemo(
    () => roles.map((role) => ({ role, scope: scopeOf(role) })),
    [roles],
  );

  return (
    <GlassCard className="overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Roles</h3>
          <p className="text-xs text-slate-400">
            Role definitions and permission assignment. Each feature has an own-department and an
            all-departments grant.
          </p>
        </div>
        {isAdmin && (
          <GradientButton onClick={onCreate}>
            <span className="material-symbols-outlined text-sm">add</span>
            Create Role
          </GradientButton>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Name</th>
              <th className="text-left px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Level</th>
              <th className="text-left px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Reach</th>
              <th className="text-right px-6 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ role, scope }) => (
              <tr key={role.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-indigo-600 text-lg">shield</span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">{roleDisplayName(role.name)}</div>
                      {role.description && (
                        <div className="text-xs text-slate-400 mt-0.5">{role.description}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                    <span className="material-symbols-outlined text-sm">signal_cellular_alt</span>
                    Level {role.permissionLevel}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {role.permissions.length > 0 ? (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {scope.own > 0 && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100"
                            title="Reaches only the departments the person belongs to"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            {scope.own} own-dept
                          </span>
                        )}
                        {scope.all > 0 && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-100"
                            title="Reaches every department in the organization"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                            {scope.all} all-dept
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {role.permissions.slice(0, 3).map((permission) => (
                          <span
                            key={permission.id}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${
                              isAllScope(permission.code ?? "")
                                ? "bg-violet-50 text-violet-700 border-violet-100"
                                : "bg-slate-50 text-slate-500 border-slate-200"
                            }`}
                          >
                            {permission.code}
                          </span>
                        ))}
                        {role.permissions.length > 3 && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 text-slate-400 border border-slate-200">
                            +{role.permissions.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No permissions</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {isAdmin && (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEdit(role)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(role)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {roles.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-slate-400">shield</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">No roles defined</h4>
            <p className="text-xs text-slate-400  mx-auto">
              Create roles to manage permission levels and access control
            </p>
            {isAdmin && (
              <button onClick={onCreate} className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">add</span>
                Create Role
              </button>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
}