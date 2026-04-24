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
      <div className="dialog-stack">
        <div className="form-grid">
          <label>
            <span>Name</span>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            <span>Layout Type</span>
            <input value={form.layoutType} onChange={(event) => setForm({ ...form, layoutType: event.target.value })} />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={form.isDefault} onChange={(event) => setForm({ ...form, isDefault: event.target.checked })} />
            <span>Default dashboard</span>
          </label>
        </div>
        <div className="inline-actions">
          <button className="ghost-button" onClick={onClose}>Cancel</button>
          <button className="primary-button" onClick={() => onSubmit(form)}>Save</button>
        </div>
      </div>
    </Dialog>
  );
}
