import { useState, type FormEvent } from "react";
import type { Department, OrganizationRecord, User } from "../../types";
import { InputF } from "./InputF";
import { SelectF } from "./SelectF";
import { ScopedUserSelect } from "./ScopedUserSelect";
import { useRoleAccess } from "./RoleGate";

interface DeptFormModalProps {
  initialData?: Department;
  departments: Department[];
  organizations: OrganizationRecord[];
  users?: User[];
  selectedOrgId: string;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}

export function DeptFormModal({ 
  initialData, 
  organizations, 
  users = [], 
  selectedOrgId, 
  onSubmit, 
  onCancel 
}: DeptFormModalProps) {
  const [form, setForm] = useState({
    name: initialData?.name || "",
    code: initialData?.code || "",
    description: initialData?.description || "",
    organizationId: initialData?.organizationId || selectedOrgId,
    parentDepartmentId: initialData?.parentDepartmentId || "",
    departmentHeadUserId: initialData?.departmentHeadUserId || "",
    maxCapacity: initialData?.maxCapacity ?? 24,
  });

  const access = useRoleAccess();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      parentDepartmentId: form.parentDepartmentId || null,
      departmentHeadUserId: form.departmentHeadUserId || null,
    });
  };

  return (
    <div className="bg-white rounded-2xl p-8 w-[560px] max-w-[95vw] shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
          <span className="material-symbols-outlined text-indigo-600 text-2xl">
            {initialData ? "edit" : "group_add"}
          </span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {initialData ? "Edit Department" : "Create Department"}
          </h2>
          <p className="text-sm text-slate-500">
            {initialData ? "Update department details" : "Add a new department to the organization"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <InputF label="Department Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <InputF label="Department Code" value={form.code} onChange={(v) => setForm({ ...form, code: v })} required />
        </div>

        <InputF 
          label="Description" 
          value={form.description} 
          onChange={(v) => setForm({ ...form, description: v })} 
        />

        {access.isAdmin ? (
          <SelectF
            label="Organization"
            value={form.organizationId}
            onChange={(v) => setForm({ ...form, organizationId: v, parentDepartmentId: "" })}
            options={organizations.map((o) => ({ value: o.id, label: o.name }))}
          />
        ) : (
          <InputF
            label="Organization"
            value={organizations.find((organization) => organization.id === form.organizationId)?.name || "Assigned organization"}
            onChange={() => undefined}
            disabled
          />
        )}

        {/* Parent department is intentionally hidden. Submit null so departments remain top-level. */}
        <ScopedUserSelect
          users={users}
          value={form.departmentHeadUserId}
          organizationId={form.organizationId}
          label="Department Head"
          onChange={(departmentHeadUserId) => setForm({ ...form, departmentHeadUserId })}
        />

        <InputF
          label="Maximum Capacity"
          type="number"
          value={form.maxCapacity}
          onChange={(v) => setForm({ ...form, maxCapacity: Number(v) })}
        />

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl border-none bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 shadow-sm transition-colors"
          >
            {initialData ? "Update Department" : "Create Department"}
          </button>
        </div>
      </form>
    </div>
  );
}
