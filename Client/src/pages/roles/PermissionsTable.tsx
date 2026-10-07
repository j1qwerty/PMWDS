import type { PermissionRecord } from "../../types";
import { GlassCard } from "../shared";
import React from "react";
import {
  PERMISSION_FEATURES,
  PERMISSION_MODULE_ORDER,
  isAllScope,
  permissionDescription,
} from "../../permissions";

interface PermissionsTableProps {
  permissions: PermissionRecord[];
  isAdmin: boolean;
}

/**
 * The permission catalogue, read-only.
 *
 * Grouped by feature rather than by module alone, and split into the two scopes,
 * because that is how the catalogue is actually shaped: "view projects" and "view
 * projects across the organization" are separate grants and reading them as one
 * undifferentiated list is what made the roles screen confusing.
 */
export function PermissionsTable({ permissions }: PermissionsTableProps) {
  const grouped = React.useMemo(() => {
    const known = new Set(permissions.map((p) => p.code?.toUpperCase()));
    const missing: PermissionRecord[] = [];
    const byCode = new Map(
      permissions.map((permission) => [permission.code?.toUpperCase(), permission]),
    );

    const modules = PERMISSION_MODULE_ORDER.map((module) => ({
      module,
      features: PERMISSION_FEATURES.filter((feature) => feature.module === module)
        .map((feature) => ({
          feature,
          entries: feature.actions.map((action) => ({
            action,
            own: byCode.get(action.code),
            all: feature.departmentScoped ? byCode.get(`${action.code}_ALL`) : undefined,
          })),
        }))
        // A feature is only worth listing if at least one of its codes exists.
        .filter((group) => group.entries.some((entry) => entry.own || entry.all)),
    })).filter((entry) => entry.features.length > 0);

    // Anything the catalogue does not know about still has to appear, or a code
    // added on the server would look like it had been deleted.
    const described = new Set(
      PERMISSION_FEATURES.flatMap((feature) =>
        feature.actions.flatMap((action) => [action.code, `${action.code}_ALL`]),
      ),
    );
    for (const permission of permissions) {
      const code = permission.code?.toUpperCase();
      if (code && !described.has(code) && !known.has(toOwnFor(code))) missing.push(permission);
    }

    return { modules, missing };
  }, [permissions]);

  const scopeBadge = (code: string | undefined, all: boolean) => {
    if (!code) return <span className="text-slate-300 text-xs">—</span>;
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
          all ? "bg-violet-50 text-violet-600" : "bg-blue-50 text-blue-600"
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${all ? "bg-violet-500" : "bg-blue-500"}`} />
        {all ? "All depts" : "Own dept"}
      </span>
    );
  };

  return (
    <GlassCard className="overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800">Permissions</h3>
        <p className="text-xs text-slate-400">
          Every permission the product understands. Department-scoped features have two independent
          grants: one for the person&apos;s own departments, one for every department in the
          organization.
        </p>
      </div>

      <div className="max-h-[70vh] overflow-y-auto">
        {grouped.modules.map(({ module, features }) => (
          <section key={module}>
            <header className="sticky top-0 bg-slate-50/95 backdrop-blur px-6 py-2 border-y border-slate-100 flex items-center gap-2 z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {module}
              </span>
            </header>

            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-50">
                {features.map(({ feature, entries }) => (
                  <React.Fragment key={feature.key}>
                    <tr className="bg-white">
                      <td colSpan={4} className="px-6 pt-4 pb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-700">
                            {feature.label}
                          </span>
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {feature.description}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {entries.map(({ action, own, all }) => {
                      const description =
                        own?.description || permissionDescription(action.code) || "";
                      return (
                        <tr key={action.code} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-2.5 w-[26%]">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-slate-700">
                                {action.label}
                              </span>
                              {action.action === "manage" && (
                                <span
                                  className="material-symbols-outlined text-[14px] text-emerald-500"
                                  title="Covers create, edit and delete in the same feature and scope"
                                >
                                  shield
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              {scopeBadge(own?.code, false)}
                              <code className="text-[10px] font-mono text-slate-500">
                                {own?.code ?? "—"}
                              </code>
                            </div>
                          </td>

                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              {all ? (
                                scopeBadge(all.code, true)
                              ) : (
                                <span
                                  className="text-[10px] text-slate-300"
                                  title="This feature is not owned by a department, so it has a single scope"
                                >
                                  single scope
                                </span>
                              )}
                              {all && (
                                <code className="text-[10px] font-mono text-slate-500">
                                  {all.code}
                                </code>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-2.5">
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              {description}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </section>
        ))}

        {grouped.missing.length > 0 && (
          <section>
            <header className="px-6 py-2 border-y border-slate-100 bg-amber-50/60">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                Not in the catalogue
              </span>
            </header>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-50">
                {grouped.missing.map((permission) => (
                  <tr key={permission.id}>
                    <td className="px-6 py-2.5">
                      <code className="text-[11px] font-mono text-slate-700">
                        {permission.code}
                      </code>
                      {isAllScope(permission.code ?? "") && (
                        <span className="ml-2 text-[10px] text-violet-600">all departments</span>
                      )}
                    </td>
                    <td className="px-6 py-2.5 text-[11px] text-slate-500" colSpan={3}>
                      {permission.description || permission.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {permissions.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-slate-400">lock</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">No permissions defined</h4>
            <p className="text-xs text-slate-400 mx-auto">
              Permissions are declared in the catalogue and seeded on startup.
            </p>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function toOwnFor(code: string): string {
  return code.endsWith("_ALL") ? code.slice(0, -4) : code;
}
