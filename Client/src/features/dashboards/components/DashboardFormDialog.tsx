import { useEffect, useState } from "react";
import { Dialog } from "../../../components/common/Dialog";
import type { DashboardRecord } from "../../../types";

type DashboardFormDialogProps = {
  open: boolean;
  dashboard?: DashboardRecord;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
};

function createState(dashboard?: DashboardRecord) {
  return {
    name: dashboard?.name ?? "",
    layoutType: dashboard?.layoutType ?? "grid",
    isDefault: dashboard?.isDefault ?? false,
  };
}

export function DashboardFormDialog({
  open,
  dashboard,
  onClose,
  onSubmit,
}: DashboardFormDialogProps) {
  const [form, setForm] = useState(createState(dashboard));

  useEffect(() => {
    setForm(createState(dashboard));
  }, [dashboard, open]);

  return (
    <Dialog
      open={open}
      title={dashboard ? "Edit Dashboard" : "Create Dashboard"}
      onClose={onClose}
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label>
            <span>Name</span>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            <span>Layout Type</span>
            <input value={form.layoutType} onChange={(event) => setForm({ ...form, layoutType: event.target.value })} />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={form.isDefault} onChange={(event) => setForm({ ...form, isDefault: event.target.checked })} />
            <span>Default dashboard</span>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={onClose}>Cancel</button>
          <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => onSubmit(form)}>Save</button>
        </div>
      </div>
    </Dialog>
  );
}
