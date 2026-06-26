import { useState, useEffect, type FormEvent } from "react";
import type { PermissionRecord, RoleRecord } from "../../types";

interface RoleFormModalProps {
  initialData?: RoleRecord;
  permissions: PermissionRecord[];
  onSubmit: (payload: Record<string, unknown>) => void;
  onCancel: () => void;
}

export function RoleFormModal({ initialData, permissions, onSubmit, onCancel }: RoleFormModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    permissionLevel: initialData?.permissionLevel || 10,
  });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    initialData?.permissions?.map(p => p.id) || []
  );

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || "",
        description: initialData.description || "",
        permissionLevel: initialData.permissionLevel || 10,
      });
      setSelectedPermissions(initialData.permissions?.map(p => p.id) || []);
    }
  }, [initialData]);

  const togglePermission = (id: string) => {
    setSelectedPermissions(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    onSubmit({ ...form, permissionIds: selectedPermissions });
  };

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const module = perm.module || "Other";
    if (!acc[module]) acc[module] = [];
    acc[module].push(perm);
    return acc;
  }, {} as Record<string, PermissionRecord[]>);

  return (
    <div className="bg-white rounded-2xl p-8 w-[640px] max-w-[95vw] shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
          <span className="material-symbols-outlined text-indigo-600 text-2xl">
            {initialData ? "edit" : "shield"}
          </span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {initialData ? "Edit Role" : "Create Role"}
          </h2>
          <p className="text-sm text-slate-500">Define role name, level, and assign permissions</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
              placeholder="e.g., Project Manager"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Permission Level</label>
            <input
              type="number"
              value={form.permissionLevel}
              onChange={(e) => setForm({ ...form, permissionLevel: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
              placeholder="10"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
            placeholder="Describe this role's responsibilities"
          />
        </div>

        {/* Permissions Selection */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
            Permissions
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({selectedPermissions.length} selected)
            </span>
          </label>
          
          <div className="max-h-64 overflow-y-auto space-y-3 pr-2">
            {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
              <div key={module}>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                  {module}
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {modulePermissions.map((permission) => (
                    <label
                      key={permission.id}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors
                        ${selectedPermissions.includes(permission.id)
                          ? "bg-indigo-50 border border-indigo-100"
                          : "hover:bg-slate-50 border border-transparent"
                        }
                      `}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(permission.id)}
                        onChange={() => togglePermission(permission.id)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-700">{permission.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{permission.code}</div>
                      </div>
                      {permission.isGlobal && (
                        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium">
                          Global
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
          <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={submitting || !form.name} className="px-5 py-2.5 rounded-xl border-none bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? "Saving..." : (initialData ? "Update Role" : "Create Role")}
          </button>
        </div>
      </form>
    </div>
  );
}