import { useEffect, useState, type FormEvent } from "react";
import type { Milestone } from "../../../types";
import { ModalOverlay, InputF } from "../../shared";

interface MilestoneFormModalProps {
  open: boolean;
  projectId: string;
  initialData?: Milestone;
  onSubmit: (data: Record<string, unknown>) => void;
  onClose: () => void;
}

export function MilestoneFormModal({ open, projectId, initialData, onSubmit, onClose }: MilestoneFormModalProps) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    dueDate: "",
    order: 0,
    progressPercentage: 0,
    isCritical: false,
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: initialData?.name || "",
        description: initialData?.description || "",
        dueDate: initialData?.dueDate?.slice(0, 10) || "",
        order: initialData?.order || 0,
        progressPercentage: initialData?.progressPercentage || 0,
        isCritical: initialData?.isCritical || false,
      });
    }
  }, [open, initialData]);

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ ...form, projectId });
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl p-8 w-[520px] max-w-[95vw] shadow-xl border border-slate-200">
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
          <div className="grid grid-cols-2 gap-4">
            <InputF label="Due Date" type="date" value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} />
            <InputF label="Order" type="number" value={form.order} onChange={(v) => setForm({ ...form, order: Number(v) })} />
          </div>
          <InputF
            label="Progress %"
            type="number"
            value={form.progressPercentage}
            onChange={(v) => setForm({ ...form, progressPercentage: Math.min(100, Math.max(0, Number(v))) })}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.isCritical} onChange={(e) => setForm({ ...form, isCritical: e.target.checked })} className="rounded" />
            Critical milestone
          </label>
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
