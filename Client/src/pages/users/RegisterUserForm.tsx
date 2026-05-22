import { useState, type FormEvent } from "react";
import type { Department, OrganizationRecord } from "../../types";
import { GlassCard } from "../shared";

interface RegisterUserFormProps {
  departments: Department[];
  organizations: OrganizationRecord[];
  lockedOrganizationId?: string;
  onSubmit: (form: Record<string, unknown>) => void;
}

export function RegisterUserForm({ departments, organizations, lockedOrganizationId, onSubmit }: RegisterUserFormProps) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "Pmwds@123",
    jobTitle: "TeamMember",
    organizationId: lockedOrganizationId ?? "",
    departmentId: "",
    role: "TeamMember",
  });

  const selectedOrganizationId = lockedOrganizationId ?? form.organizationId;
  const filteredDepartments = departments.filter(
    d => !selectedOrganizationId || d.organizationId === selectedOrganizationId
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(form);
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "Pmwds@123",
      jobTitle: "TeamMember",
      organizationId: lockedOrganizationId ?? "",
      departmentId: "",
      role: "TeamMember",
    });
  };

  return (
    <GlassCard className="p-6">
      <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-indigo-500">person_add</span>
        Register New User
      </h3>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">First Name *</label>
          <input
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
            placeholder="John"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Last Name *</label>
          <input
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
            placeholder="Doe"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
            placeholder="john@example.com"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Password *</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Job Title</label>
          <input
            value={form.jobTitle}
            onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
            placeholder="Team Member"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Role *</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          >
            <option>SuperAdmin</option>
            <option>Director</option>
            <option>ProjectManager</option>
            <option>DepartmentHead</option>
            <option>TeamMember</option>
            <option>Viewer</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Organization</label>
          <select
            value={selectedOrganizationId}
            disabled={Boolean(lockedOrganizationId)}
            onChange={(e) => setForm({ ...form, organizationId: e.target.value, departmentId: "" })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          >
            <option value="">None</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Department</label>
          <select
            value={form.departmentId}
            onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          >
            <option value="">None</option>
            {filteredDepartments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2 pt-2">
          <button
            type="submit"
            className="w-full px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 shadow-sm transition-colors"
          >
            Register User
          </button>
        </div>
      </form>
    </GlassCard>
  );
}
