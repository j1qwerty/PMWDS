import { useState, type FormEvent } from "react";

interface OrgFormModalProps {
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}

export function OrgFormModal({ onSubmit, onCancel }: OrgFormModalProps) {
  const [form, setForm] = useState({
    name: "",
    taxId: "",
    address: "",
    contactEmail: "",
    contactPhone: "",
    foundedDate: "",
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="bg-white rounded-2xl p-8 w-[520px] max-w-[100vw] shadow-xl border border-slate-200">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
          <span className="material-symbols-outlined text-emerald-600 text-2xl">add_business</span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Create Organization</h2>
          <p className="text-sm text-slate-400">Add a new organization to your structure</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Organization Name <span className="text-red-500">*</span>
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Enter organization name"
            required
            className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none bg-white/80 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Tax ID</label>
            <input
              value={form.taxId}
              onChange={(e) => setForm({ ...form, taxId: e.target.value })}
              placeholder="Tax ID"
              className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none bg-white/80 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 transition-all"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Phone</label>
            <input
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              placeholder="Phone"
              className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none bg-white/80 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Email</label>
          <input
            type="email"
            value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            placeholder="contact@organization.com"
            className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none bg-white/80 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 transition-all"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Address</label>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Address"
            className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none bg-white/80 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 transition-all"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Founded Date</label>
          <input
            type="date"
            value={form.foundedDate}
            onChange={(e) => setForm({ ...form, foundedDate: e.target.value })}
            className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none bg-white/80 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 transition-all"
          />
        </div>

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
            className="px-5 py-2.5 rounded-xl border-none bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 shadow-sm transition-colors"
          >
            Create Organization
          </button>
        </div>
      </form>
    </div>
  );
}
