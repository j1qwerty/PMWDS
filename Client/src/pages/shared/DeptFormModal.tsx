import { useState, type FormEvent } from "react";
import type { Department, OrganizationRecord, User } from "../../types";
import { RoleKey, hasRoleKey } from "../../permissions";
import { InputF } from "./InputF";
import { SelectF } from "./SelectF";
import { Dialog } from "./Dialog";

interface DeptFormModalProps {
  initialData?: Department;
  departments: Department[];
  organizations: OrganizationRecord[];
  users?: User[];
  selectedOrgId: string;
  showOrganization?: boolean;
  onSubmit: (data: Record<string, unknown>) => void | Promise<void>;
  onCancel: () => void;
}

export function DeptFormModal({
  initialData,
  departments: _departments,
  organizations,
  users = [],
  selectedOrgId,
  showOrganization,
  onSubmit,
  onCancel,
}: DeptFormModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: initialData?.name || "",
    code: initialData?.code || "",
    description: initialData?.description || "",
    organizationId: initialData?.organizationId || selectedOrgId,
    parentDepartmentId: initialData?.parentDepartmentId || "",
    departmentHeadUserId: initialData?.departmentHeadUserId ?? "",
    maxCapacity: initialData?.maxCapacity ?? 24,
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        code: form.code.trim(),
        parentDepartmentId: form.parentDepartmentId || null,
        departmentHeadUserId: form.departmentHeadUserId || null,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to save the department.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      title={initialData ? "Edit department" : "Create department"}
      description={initialData ? "Update the department details and reporting structure." : "Add a department to the current organization."}
      icon={initialData ? "edit" : "group_add"}
      size="lg"
      onClose={onCancel}
      closeOnBackdrop={!submitting}
      showCloseButton={!submitting}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={submitting} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" form="department-form" disabled={submitting} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? "Saving…" : initialData ? "Update department" : "Create department"}
          </button>
        </div>
      }
    >
      <form id="department-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <InputF label="Department name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
          <InputF label="Department code" value={form.code} onChange={(value) => setForm({ ...form, code: value })} required />
        </div>

        <InputF label="Description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} />

        {showOrganization && (
          <SelectF
            label="Organization"
            value={form.organizationId}
            onChange={(value) => setForm({ ...form, organizationId: value, parentDepartmentId: "" })}
            options={organizations.map((organization) => ({ value: organization.id, label: organization.name }))}
          />
        )}

        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Department head</span>
          <select
            value={form.departmentHeadUserId}
            onChange={(event) => setForm({ ...form, departmentHeadUserId: event.target.value })}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">None</option>
            {users
              .filter((user) => !hasRoleKey(user.roleKeys ?? user.roles, RoleKey.SuperAdmin))
              .map((user) => (
                <option key={user.id} value={user.id}>{user.fullName}</option>
              ))}
          </select>
        </label>

        <InputF
          label="Maximum capacity"
          type="number"
          value={form.maxCapacity}
          onChange={(value) => setForm({ ...form, maxCapacity: Number(value) })}
        />
      </form>
    </Dialog>
  );
}
