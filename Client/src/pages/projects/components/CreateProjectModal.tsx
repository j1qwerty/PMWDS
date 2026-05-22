import { priorities } from "../../constants";
import type { Department, OrganizationRecord, User } from "../../../types";
import { ScopedUserSelect } from "../../shared";

type ProjectFormState = {
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

interface CreateProjectModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  form: ProjectFormState;
  setForm: React.Dispatch<React.SetStateAction<ProjectFormState>>;
  departments: Department[];
  organizations: OrganizationRecord[];
  showOrganizationFilter?: boolean;
  users: User[];
}

export function CreateProjectModal({
  show,
  onClose,
  onSubmit,
  form,
  setForm,
  departments,
  organizations,
  showOrganizationFilter = false,
  users,
}: CreateProjectModalProps) {
  if (!show) return null;
  const filteredDepartments = form.organizationId
    ? departments.filter((department) => department.organizationId === form.organizationId)
    : departments;
  const selectedDepartment = departments.find((department) => department.id === form.departmentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-xl p-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl ambient-glow">
        <div className="flex justify-between items-center mb-md pb-sm border-b border-surface-variant">
          <h2 className="font-h2 text-h2 text-on-surface">Create New Project</h2>
          <button onClick={onClose} className="material-symbols-outlined text-outline hover:text-primary">close</button>
        </div>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Project Code</span>
            <input value={form.projectCode} onChange={(e) => setForm({ ...form, projectCode: e.target.value })} className="border border-outline-variant rounded-lg p-2 text-sm" required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Name</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border border-outline-variant rounded-lg p-2 text-sm" required />
          </label>
          <div className="md:col-span-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Description</span>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border border-outline-variant rounded-lg p-2 text-sm" rows={3} />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Category</span>
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="border border-outline-variant rounded-lg p-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Priority</span>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="border border-outline-variant rounded-lg p-2 text-sm">
              {priorities.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Start Date</span>
            <input type="date" value={form.plannedStartDate} onChange={(e) => setForm({ ...form, plannedStartDate: e.target.value })} className="border border-outline-variant rounded-lg p-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider">End Date</span>
            <input type="date" value={form.plannedEndDate} onChange={(e) => setForm({ ...form, plannedEndDate: e.target.value })} className="border border-outline-variant rounded-lg p-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Budget</span>
            <input type="number" value={form.plannedBudget} onChange={(e) => setForm({ ...form, plannedBudget: Number(e.target.value) })} className="border border-outline-variant rounded-lg p-2 text-sm" />
          </label>
          {showOrganizationFilter && (
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Organization</span>
              <select
                value={form.organizationId}
                onChange={(e) => setForm({ ...form, organizationId: e.target.value, departmentId: "", projectManagerId: "" })}
                className="border border-outline-variant rounded-lg p-2 text-sm"
              >
                <option value="">Choose</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>{organization.name}</option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Department</span>
            <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="border border-outline-variant rounded-lg p-2 text-sm">
              <option value="">Choose</option>
              {filteredDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <div className="md:col-span-2">
            <ScopedUserSelect
              users={users}
              value={form.projectManagerId}
              organizationId={selectedDepartment?.organizationId}
              label="Project Manager"
              onChange={(projectManagerId) => setForm({ ...form, projectManagerId })}
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-outline-variant rounded-lg text-sm font-medium text-on-surface-variant">Cancel</button>
            <button type="submit" className="px-6 py-2 primary-gradient text-white font-bold rounded-lg text-sm">Create Project</button>
          </div>
        </form>
      </div>
    </div>
  );
}
