import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Department, Milestone, OrganizationRecord } from "../../../types";
import { ModalOverlay, InputF } from "../../shared";
import { FiX } from "react-icons/fi";

interface MilestoneFormModalProps {
  open: boolean;
  projectId: string;
  initialData?: Milestone;
  departments: Department[];
  organizations: OrganizationRecord[];
  isSuperAdmin: boolean;
  userOrganizationId?: string | null;
  onSubmit: (data: Record<string, unknown>) => void;
  onClose: () => void;
  serverError?: string;
}

export function MilestoneFormModal({ open, projectId, initialData, departments, organizations, isSuperAdmin, userOrganizationId, onSubmit, onClose, serverError }: MilestoneFormModalProps) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    dueDate: "",
    progressPercentage: 0,
    isCritical: false,
    departmentIds: [] as string[],
    organizationId: "",
  });
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    setValidationError("");
    if (open) {
      setForm({
        name: initialData?.name || "",
        description: initialData?.description || "",
        dueDate: initialData?.dueDate?.slice(0, 10) || "",
        progressPercentage: initialData?.progressPercentage || 0,
        isCritical: initialData?.isCritical || false,
        departmentIds: initialData?.departmentIds || [],
        organizationId: "",
      });
    }
  }, [open, initialData]);

  const filteredDepartments = useMemo(() => {
    if (isSuperAdmin) {
      if (!form.organizationId) return departments;
      return departments.filter((d) => d.organizationId === form.organizationId);
    }
    if (userOrganizationId) {
      return departments.filter((d) => d.organizationId === userOrganizationId);
    }
    return departments;
  }, [isSuperAdmin, userOrganizationId, form.organizationId, departments]);

  if (!open) return null;

  const hasTasks = initialData?.hasTasks ?? false;
  const isEditMode = !!initialData;

  const toggleDepartment = (deptId: string) => {
    setForm((prev) => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(deptId)
        ? prev.departmentIds.filter((id) => id !== deptId)
        : [...prev.departmentIds, deptId],
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (!form.name.trim()) {
      setValidationError("Name is required");
      return;
    }
    if (!form.dueDate) {
      setValidationError("Due date is required");
      return;
    }

    const payload: Record<string, unknown> = {
      name: form.name,
      description: form.description,
      dueDate: form.dueDate,
      isCritical: form.isCritical,
      departmentIds: form.departmentIds,
      projectId,
    };
    payload.progressPercentage = 0;
    onSubmit(payload);
  };

  return (
    <ModalOverlay onClose={onClose} showCloseButton={false}>
      <div className="bg-white rounded-2xl p-8 w-[520px] max-w-[95vw] shadow-xl border border-slate-200 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <FiX className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-indigo-600 text-2xl">{initialData ? "edit" : "flag"}</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{initialData ? "Edit Milestone" : "New Milestone"}</h2>
            <p className="text-sm text-slate-500">Track deliverables for this project</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <InputF label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <InputF label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
          <InputF label="Due Date" type="date" value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} required />

          {isSuperAdmin && (
            <div>
              <label className="text-[11px] font-bold text-[#191c1e] uppercase tracking-wider block mb-1">Organization</label>
              <select
                value={form.organizationId}
                onChange={(e) => setForm({ ...form, organizationId: e.target.value, departmentIds: [] })}
                className="w-full border border-slate-200 rounded-lg p-2 text-sm"
              >
                <option value="">All organizations</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-[#191c1e] uppercase tracking-wider block mb-1">
              Departments ({form.departmentIds.length} selected)
            </label>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
              {filteredDepartments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">No departments available</p>
              ) : (
                filteredDepartments.map((d) => {
                  const checked = form.departmentIds.includes(d.id);
                  return (
                    <label
                      key={d.id}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDepartment(d.id)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-700">{d.name}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {isEditMode && hasTasks ? (
            <div>
              <label className="text-[11px] font-bold text-[#191c1e] uppercase tracking-wider block mb-1">Progress %</label>
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-500"
                    style={{ width: `${form.progressPercentage}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-slate-700 tabular-nums">
                  {Math.round(form.progressPercentage)}%
                </span>
              </div>
              <p className="text-[10px] text-indigo-500 mt-1">
                Progress is calculated from tasks
              </p>
            </div>
          ) : null}

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.isCritical} onChange={(e) => setForm({ ...form, isCritical: e.target.checked })} className="rounded" />
            Critical milestone
          </label>

          {validationError || serverError ? (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
              <span className="material-symbols-outlined text-base mt-0.5">error</span>
              <span>{validationError || serverError}</span>
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold">
              Save
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
