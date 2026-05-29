import type { FormEvent } from "react";
import type { Department, OrganizationRecord, User } from "../../../types";
import { priorities } from "../../constants";
import { ModalOverlay, ScopedUserSelect } from "../../shared";

export type ProjectFormState = {
  projectCode: string;
  name: string;
  description: string;
  category: string;
  plannedStartDate: string;
  plannedEndDate: string;
  plannedBudget: number;
  organizationId: string;
  departmentId: string;
  projectManagerId: string;
  priority: string;
};

interface ProjectFormModalProps {
  open: boolean;
  title: string;
  submitLabel: string;
  form: ProjectFormState;
  setForm: React.Dispatch<React.SetStateAction<ProjectFormState>>;
  departments: Department[];
  organizations: OrganizationRecord[];
  showOrganizationFilter?: boolean;
  users: User[];
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

export function ProjectFormModal({
  open,
  title,
  submitLabel,
  form,
  setForm,
  departments,
  organizations,
  showOrganizationFilter = false,
  users,
  onSubmit,
  onClose,
}: ProjectFormModalProps) {
  if (!open) return null;

  const filteredDepartments = form.organizationId
    ? departments.filter((d) => d.organizationId === form.organizationId)
    : departments;
  const selectedDepartment = departments.find((d) => d.id === form.departmentId);

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-indigo-600 text-2xl">folder</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500">Project workspace details</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Code" required>
            <input value={form.projectCode} onChange={(e) => setForm({ ...form, projectCode: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 text-sm" required />
          </Field>
          <Field label="Name" required>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 text-sm" required />
          </Field>
          <div className="md:col-span-2">
            <Field label="Description">
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 text-sm" rows={3} />
            </Field>
          </div>
          <Field label="Category">
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 text-sm" />
          </Field>
          <Field label="Priority">
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 text-sm">
              {priorities.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Start">
            <input type="date" value={form.plannedStartDate} onChange={(e) => setForm({ ...form, plannedStartDate: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 text-sm" />
          </Field>
          <Field label="End">
            <input type="date" value={form.plannedEndDate} onChange={(e) => setForm({ ...form, plannedEndDate: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 text-sm" />
          </Field>
          <Field label="Budget">
            <input type="number" value={form.plannedBudget} onChange={(e) => setForm({ ...form, plannedBudget: Number(e.target.value) })} className="w-full border border-slate-200 rounded-lg p-2 text-sm" />
          </Field>
          {showOrganizationFilter && (
            <Field label="Organization">
              <select
                value={form.organizationId}
                onChange={(e) => setForm({ ...form, organizationId: e.target.value, departmentId: "", projectManagerId: "" })}
                className="w-full border border-slate-200 rounded-lg p-2 text-sm"
              >
                <option value="">Choose</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Department">
            <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 text-sm">
              <option value="">Choose</option>
              {filteredDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="md:col-span-2">
            <ScopedUserSelect
              users={users}
              value={form.projectManagerId}
              organizationId={selectedDepartment?.organizationId}
              label="Project Manager"
              onChange={(projectManagerId) => setForm({ ...form, projectManagerId })}
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        {label}
        {required && " *"}
      </span>
      {children}
    </label>
  );
}
