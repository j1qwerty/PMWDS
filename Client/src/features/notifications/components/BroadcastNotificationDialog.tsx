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
    <Dialog
      open={open}
      title="Broadcast Notification"
      onClose={onClose}
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-1 gap-4">
          <label>
            <span>Title</span>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <label>
            <span>Message</span>
            <textarea rows={4} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
          </label>
          <label>
            <span>Department Scope</span>
            <select value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value })}>
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Action URL</span>
            <input value={form.actionUrl} onChange={(event) => setForm({ ...form, actionUrl: event.target.value })} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={onClose}>Cancel</button>
          <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => onSubmit({ ...form, departmentId: form.departmentId || null, actionUrl: form.actionUrl || null })}>
            Send
          </button>
        </div>
      </div>
    </Dialog>
  );
}
