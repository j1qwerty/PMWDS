import { useEffect, useState } from "react";
import { Dialog } from "../../../components/common/Dialog";
import type { Department } from "../../../types";

type BroadcastNotificationDialogProps = {
  open: boolean;
  departments: Department[];
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
};

const initialState = {
  title: "",
  message: "",
  departmentId: "",
  actionUrl: "",
};

export function BroadcastNotificationDialog({
  open,
  departments,
  onClose,
  onSubmit,
}: BroadcastNotificationDialogProps) {
  const [form, setForm] = useState(initialState);

  useEffect(() => {
    if (open) {
      setForm(initialState);
    }
  }, [open]);

  return (
    <Dialog open={open} title="Broadcast Notification" onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input 
              value={form.title} 
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              placeholder="Notification title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
            <textarea 
              rows={4} 
              value={form.message} 
              onChange={(event) => setForm({ ...form, message: event.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
              placeholder="Message content"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Department Scope</label>
            <select 
              value={form.departmentId} 
              onChange={(event) => setForm({ ...form, departmentId: event.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white"
            >
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Action URL (optional)</label>
            <input 
              value={form.actionUrl} 
              onChange={(event) => setForm({ ...form, actionUrl: event.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              placeholder="https://example.com/action"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button 
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
            disabled={!form.title || !form.message}
            onClick={() => onSubmit({ ...form, departmentId: form.departmentId || null, actionUrl: form.actionUrl || null })}
          >
            Send
          </button>
        </div>
      </div>
    </Dialog>
  );
}