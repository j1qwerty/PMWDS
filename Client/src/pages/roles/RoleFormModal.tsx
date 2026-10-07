import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import type { PermissionRecord, RoleRecord } from "../../types";
import {
  ALL_PERMISSION_CODES,
  PERMISSION_COVERAGE,
  PERMISSION_FEATURES,
  PERMISSION_MODULE_ORDER,
  isAllScope,
  permissionDescription,
  toAllScope,
  toOwnScope,
  type PermissionFeatureDefinition,
  type PermissionScope,
} from "../../permissions";

interface RoleFormModalProps {
  initialData?: RoleRecord;
  permissions: PermissionRecord[];
  onSubmit: (payload: Record<string, unknown>) => void;
  onCancel: () => void;
}

type Selection = Set<string>;

/** One rendered row: a feature, an action, and the code at each scope it has. */
type MatrixRow = {
  feature: PermissionFeatureDefinition;
  action: (typeof PERMISSION_FEATURES)[number]["actions"][number];
  ownCode?: string;
  allCode?: string;
};

const SCOPE_HEADINGS: { key: PermissionScope; label: string; hint: string }[] = [
  {
    key: "own",
    label: "Own department",
    hint: "Only the departments the person belongs to",
  },
  {
    key: "all",
    label: "All departments",
    hint: "Every department in the organization",
  },
];

/**
 * Creates or edits a role.
 *
 * The permission picker is a matrix rather than a flat list because the model is
 * not flat: every department-scoped feature has two independent scopes, and the
 * whole point of the split is that the two are easy to tell apart. Rows are
 * grouped by feature and the two scopes sit side by side, so reading across a row
 * answers "what may this role do with its own departments, and with the rest of
 * the organization".
 */
export function RoleFormModal({
  initialData,
  permissions,
  onSubmit,
  onCancel,
}: RoleFormModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedModules, setCollapsedModules] = useState<Selection>(new Set());
  const [expandedFeatures, setExpandedFeatures] = useState<Selection>(new Set());

  const [form, setForm] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    permissionLevel: initialData?.permissionLevel || 10,
  });

  // Only the permissions this role may actually be given. A non-superadmin cannot
  // assign a permission they do not hold themselves, so offering it would be a lie.
  const assignableCodes = useMemo(() => {
    const available = new Set(
      permissions
        .map((permission) => permission.code?.toUpperCase())
        .filter((code): code is string => Boolean(code)),
    );

    // A permission the server has not published yet is still shown, so a freshly
    // added code is visible in the matrix the moment it is seeded rather than
    // silently missing. What it is not shown as is any code outside the catalogue.
    return new Set([...available, ...ALL_PERMISSION_CODES].filter((code) => available.has(code) || ALL_PERMISSION_CODES.includes(code)));
  }, [permissions]);

  const [selected, setSelected] = useState<Selection>(() => {
    const codes = new Set(
      (initialData?.permissions ?? [])
        .map((permission) => permission.code?.toUpperCase())
        .filter((code): code is string => Boolean(code)),
    );
    return codes;
  });

  useEffect(() => {
    if (!initialData) return;
    setForm({
      name: initialData.name || "",
      description: initialData.description || "",
      permissionLevel: initialData.permissionLevel || 10,
    });
    setSelected(
      new Set(
        (initialData.permissions ?? [])
          .map((permission) => permission.code?.toUpperCase())
          .filter((code): code is string => Boolean(code)),
      ),
    );
  }, [initialData]);

  // ── Matrix construction ───────────────────────────────────────────────────

  const rows = useMemo(() => {
    const built: MatrixRow[] = [];

    for (const feature of PERMISSION_FEATURES) {
      for (const action of feature.actions) {
        const ownCode = assignableCodes.has(action.code) ? action.code : undefined;
        const allCandidate = toAllScope(action.code);
        const allCode =
          feature.departmentScoped && assignableCodes.has(allCandidate)
            ? allCandidate
            : undefined;

        if (!ownCode && !allCode) continue;
        built.push({ feature, action, ownCode, allCode });
      }
    }

    return built;
  }, [assignableCodes]);

  const modules = useMemo(() => {
    const byModule = new Map<string, MatrixRow[]>();
    for (const row of rows) {
      const list = byModule.get(row.feature.module);
      if (list) list.push(row);
      else byModule.set(row.feature.module, [row]);
    }

    const ordered = PERMISSION_MODULE_ORDER.filter((module) => byModule.has(module));
    const extras = Array.from(byModule.keys()).filter((module) => !ordered.includes(module));

    return [...ordered, ...extras].map((module) => ({
      module,
      features: PERMISSION_FEATURES.filter((feature) =>
        byModule.get(module)?.some((row) => row.feature.key === feature.key),
      ),
    }));
  }, [rows]);

  // ── Search ────────────────────────────────────────────────────────────────

  const query = searchQuery.trim().toLowerCase();

  const matches = useCallback(
    (row: MatrixRow) => {
      if (!query) return true;
      return (
        row.feature.label.toLowerCase().includes(query) ||
        row.feature.module.toLowerCase().includes(query) ||
        row.feature.description.toLowerCase().includes(query) ||
        row.action.label.toLowerCase().includes(query) ||
        row.action.code.toLowerCase().includes(query) ||
        toAllScope(row.action.code).toLowerCase().includes(query)
      );
    },
    [query],
  );

  const visibleModules = useMemo(
    () =>
      modules
        .map((entry) => ({
          ...entry,
          features: entry.features
            .map((feature) => ({
              feature,
              rows: rows.filter((row) => row.feature.key === feature.key && matches(row)),
            }))
            .filter((group) => group.rows.length > 0),
        }))
        .filter((entry) => entry.features.length > 0),
    [modules, rows, matches],
  );

  // ── Selection ─────────────────────────────────────────────────────────────

  const isSelected = useCallback(
    (code: string | undefined) => Boolean(code && selected.has(code)),
    [selected],
  );

  /** The codes a grant confers, filtered to what this role may be given. */
  const impliedBy = useCallback(
    (code: string) =>
      (PERMISSION_COVERAGE[code] ?? []).filter((implied) => assignableCodes.has(implied)),
    [assignableCodes],
  );

  const setCodes = useCallback((codes: string[], selectedState: boolean) => {
    setSelected((previous) => {
      const next = new Set(previous);
      for (const code of codes) {
        if (selectedState) next.add(code);
        else next.delete(code);
      }
      return next;
    });
  }, []);

  /**
   * Ticking or unticking a grant moves everything it covers with it.
   *
   * This is the requirement that manage means manage: ticking Manage ticks View,
   * Create, Edit and Delete, and they read as ticked. Un-ticking Manage un-ticks
   * them too, which the previous one-way cascade never did — it cleared the
   * children when Manage was ticked and left them gone when it was un-ticked.
   */
  const toggleGrant = useCallback(
    (code: string) => {
      const willSelect = !selected.has(code);
      setCodes([code, ...impliedBy(code)], willSelect);

      if (!willSelect) {
        // Anything that implied this grant loses its reason for covering it.
        setSelected((previous) => {
          const next = new Set(previous);
          for (const [grant, covered] of Object.entries(PERMISSION_COVERAGE)) {
            if (grant !== code && (covered as readonly string[]).includes(code)) {
              next.delete(code);
            }
          }
          return next;
        });
      }
    },
    [selected, impliedBy, setCodes],
  );

  /**
   * Whether a grant is on because it was ticked in its own right, or only because
   * an umbrella covers it. Only the former is shown as independently ticked.
   */
  const coveredByOther = useCallback(
    (code: string | undefined) => {
      if (!code || selected.has(code)) return undefined;
      return Object.entries(PERMISSION_COVERAGE).find(
        ([grant, covered]) =>
          grant !== code &&
          selected.has(grant) &&
          (covered as readonly string[]).includes(code),
      )?.[0];
    },
    [selected],
  );

  const toggleModule = useCallback((module: string) => {
    setCollapsedModules((previous) => {
      const next = new Set(previous);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  }, []);

  const toggleFeature = useCallback((key: string) => {
    setExpandedFeatures((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // ── Counts ────────────────────────────────────────────────────────────────

  const countsFor = useCallback(
    (featureRows: MatrixRow[]) => {
      let selectedCount = 0;
      let total = 0;
      for (const row of featureRows) {
        for (const code of [row.ownCode, row.allCode]) {
          if (!code) continue;
          total += 1;
          if (selected.has(code)) selectedCount += 1;
        }
      }
      return { selectedCount, total };
    },
    [selected],
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    // Only codes actually ticked are stored. Anything an umbrella already implies
    // is left out, so the role's stored permissions always say exactly what the
    // matrix showed.
    const permissionIds = permissions
      .filter((permission) => {
        const code = permission.code?.toUpperCase();
        return Boolean(code && selected.has(code));
      })
      .map((permission) => permission.id);

    onSubmit({ ...form, permissionIds });
  };

  const selectedCount = selected.size;
  const noResults = visibleModules.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onCancel} />

      {/* Deliberately wide: the matrix needs room for two scope columns plus the
          labels beside them, and squeezing it into a narrow dialog is what made
          the scope distinction unreadable. */}
      <div className="relative bg-white rounded-2xl w-[min(1180px,96vw)] max-h-[92vh] shadow-2xl border border-slate-200 flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-indigo-600 text-xl">
              {initialData ? "edit" : "shield"}
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">
              {initialData ? "Edit Role" : "Create Role"}
            </h2>
            <p className="text-xs text-slate-500">
              Tick what this role may do. Each feature has two independent scopes.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="ml-auto w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-3 flex-shrink-0">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Name *</label>
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                placeholder="e.g., Project Manager"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Level</label>
              <input
                type="number"
                value={form.permissionLevel}
                onChange={(event) =>
                  setForm({ ...form, permissionLevel: Number(event.target.value) })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Description</label>
              <input
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                placeholder="Brief description of this role"
              />
            </div>
          </div>

          <div className="px-6 flex items-center gap-3 flex-shrink-0 pb-3">
            <span className="text-xs font-semibold text-slate-600">Permissions</span>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {selectedCount} ticked
            </span>
            <div className="relative ml-auto w-64">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search features or permissions…"
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4 space-y-3">
            {noResults && (
              <div className="text-center py-12 text-slate-400">
                <span className="material-symbols-outlined text-3xl mb-2 block">search_off</span>
                <p className="text-sm">No permissions match “{searchQuery}”</p>
              </div>
            )}

            {visibleModules.map(({ module, features }) => {
              const collapsed = collapsedModules.has(module);
              const moduleRows = features.flatMap((group) => group.rows);
              const { selectedCount: moduleSelected, total: moduleTotal } =
                countsFor(moduleRows);

              return (
                <section
                  key={module}
                  className="border border-slate-200 rounded-xl bg-white overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleModule(module)}
                    className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <span
                      className="material-symbols-outlined text-slate-400 text-lg flex-shrink-0 transition-transform duration-200"
                      style={{ transform: collapsed ? "rotate(0deg)" : "rotate(90deg)" }}
                    >
                      chevron_right
                    </span>
                    <span className="text-sm font-semibold text-slate-800">{module}</span>
                    <span className="text-[11px] text-slate-400">
                      {moduleSelected}/{moduleTotal}
                    </span>
                    {moduleSelected > 0 && (
                      <span className="ml-auto text-[11px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                        {moduleSelected} ticked
                      </span>
                    )}
                  </button>

                  {!collapsed &&
                    features.map(({ feature, rows: featureRows }) => {
                      const expanded = query ? true : expandedFeatures.has(feature.key);
                      const { selectedCount: featureSelected, total: featureTotal } =
                        countsFor(featureRows);
                      const hasBothScopes = featureRows.some((row) => row.allCode);

                      return (
                        <div key={feature.key} className="border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => toggleFeature(feature.key)}
                            className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50/70 transition-colors text-left"
                          >
                            <span
                              className="material-symbols-outlined text-slate-300 text-base flex-shrink-0 mt-0.5 transition-transform duration-200"
                              style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
                            >
                              chevron_right
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2 flex-wrap">
                                <span className="text-[13px] font-semibold text-slate-800">
                                  {feature.label}
                                </span>
                                {featureSelected > 0 && (
                                  <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">
                                    {featureSelected}/{featureTotal}
                                  </span>
                                )}
                                {!hasBothScopes && (
                                  <span
                                    className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded"
                                    title="This feature is not owned by a department, so it has a single scope."
                                  >
                                    single scope
                                  </span>
                                )}
                              </span>
                              <span className="block text-[11px] text-slate-500 leading-relaxed mt-0.5">
                                {feature.description}
                              </span>
                            </span>
                          </button>

                          {expanded && (
                            <table className="w-full border-t border-slate-100">
                              <thead>
                                <tr className="bg-slate-50/60">
                                  <th className="text-left px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 w-[46%]">
                                    Action
                                  </th>
                                  {hasBothScopes
                                    ? SCOPE_HEADINGS.map((heading) => (
                                        <th
                                          key={heading.key}
                                          className="text-left px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                                          title={heading.hint}
                                        >
                                          <span className="flex items-center gap-1">
                                            {heading.label}
                                            <span
                                              className="material-symbols-outlined text-[13px] text-slate-300 hover:text-slate-500"
                                              title={heading.hint}
                                            >
                                              help
                                            </span>
                                          </span>
                                        </th>
                                      ))
                                    : (
                                        <th className="text-left px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                          Grant
                                        </th>
                                      )}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {featureRows.map((row) => (
                                  <tr key={`${row.feature.key}-${row.action.code}`}>
                                    <td className="px-4 py-2 align-top">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-medium text-slate-700">
                                          {row.action.label}
                                        </span>
                                        {row.action.action === "manage" && (
                                          <span
                                            className="material-symbols-outlined text-[14px] text-emerald-500"
                                            title="Ticking this also ticks every other action in this feature at the same scope."
                                          >
                                            shield
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono">
                                        {row.ownCode}
                                      </div>
                                      {permissionDescription(row.ownCode) && (
                                        <p className="text-[10px] text-slate-500 leading-relaxed mt-1 max-w-prose">
                                          {permissionDescription(row.ownCode)}
                                        </p>
                                      )}
                                    </td>

                                    {hasBothScopes ? (
                                      <>
                                        <td className="px-3 py-2 align-top">
                                          <ScopeCell
                                            code={row.ownCode}
                                            ticked={isSelected(row.ownCode)}
                                            impliedBy={coveredByOther(row.ownCode)}
                                            onToggle={toggleGrant}
                                          />
                                        </td>
                                        <td className="px-3 py-2 align-top">
                                          <ScopeCell
                                            code={row.allCode}
                                            ticked={isSelected(row.allCode)}
                                            impliedBy={coveredByOther(row.allCode)}
                                            onToggle={toggleGrant}
                                          />
                                        </td>
                                      </>
                                    ) : (
                                      <td className="px-3 py-2 align-top">
                                        <ScopeCell
                                          code={row.ownCode}
                                          ticked={isSelected(row.ownCode)}
                                          impliedBy={coveredByOther(row.ownCode)}
                                          onToggle={toggleGrant}
                                        />
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      );
                    })}
                </section>
              );
            })}
          </div>

          <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3 flex-shrink-0">
            <p className="text-[11px] text-slate-400 max-w-xl">
              Ticking <strong>Manage</strong> ticks every other action in that feature at the same
              scope. An all-departments grant also satisfies the own-department policy, so it is
              never necessary to tick both.
            </p>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !form.name.trim()}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Saving…" : initialData ? "Update Role" : "Create Role"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * One scope's checkbox.
 *
 * Three visual states, because they mean different things:
 *  - ticked: this grant is held
 *  - ticked but filled by an umbrella: held only because something else covers it,
 *    so unticking here would not change anything
 *  - unticked: not held
 */
function ScopeCell({
  code,
  ticked,
  impliedBy,
  onToggle,
}: {
  code: string | undefined;
  ticked: boolean;
  impliedBy: string | undefined;
  onToggle: (code: string) => void;
}) {
  if (!code) {
    return <span className="text-[11px] text-slate-300">—</span>;
  }

  const all = isAllScope(code);
  const title = impliedBy
    ? `Implied by ${impliedBy}. Un-tick ${impliedBy} to remove it.`
    : permissionDescription(code);

  return (
    <button
      type="button"
      onClick={() => onToggle(code)}
      title={title}
      aria-pressed={ticked}
      aria-label={`${all ? "All departments" : "Own department"}: ${permissionLabelFor(code)}`}
      className={`group inline-flex items-center gap-2 px-2 py-1 -mx-2 rounded-lg transition-colors ${
        ticked ? "hover:bg-emerald-50" : "hover:bg-slate-50"
      }`}
    >
      <span
        className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          ticked
            ? impliedBy
              ? "bg-emerald-400 border-emerald-400"
              : "bg-indigo-600 border-indigo-600"
            : "border-slate-300 group-hover:border-slate-400"
        }`}
      >
        {ticked && (
          <span className="material-symbols-outlined text-white text-[11px]">
            {impliedBy ? "check" : "check"}
          </span>
        )}
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span
          className={`text-[10px] font-mono ${
            ticked ? "text-slate-700" : "text-slate-400"
          }`}
        >
          {code}
        </span>
        {impliedBy && <span className="text-[9px] text-emerald-600">implied</span>}
      </span>
    </button>
  );
}

function permissionLabelFor(code: string): string {
  const own = toOwnScope(code);
  const entry = PERMISSION_FEATURES.flatMap((feature) => feature.actions).find(
    (candidate) => candidate.code === own,
  );
  return `${entry?.label ?? own}${isAllScope(code) ? " (all departments)" : ""}`;
}
