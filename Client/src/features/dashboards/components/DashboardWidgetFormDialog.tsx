import { useEffect, useState } from "react";
import { Dialog } from "../../../components/common/Dialog";
import { parseJsonMap, parseLineList, stringifyJsonMap, stringifyLineList } from "../../admin/shared/serializers";
import type { DashboardWidgetRecord } from "../../../types";

type DashboardWidgetFormDialogProps = {
  open: boolean;
  widget?: DashboardWidgetRecord;
  nextOrder: number;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
};

function createState(widget: DashboardWidgetRecord | undefined, nextOrder: number) {
  return {
    widgetType: widget?.widgetType ?? "",
    title: widget?.title ?? "",
    configuration: stringifyJsonMap(widget?.configuration),
    refreshInterval: widget?.refreshInterval ?? 15,
    requiredPermissions: stringifyLineList(widget?.requiredPermissions),
    displayOrder: widget?.displayOrder ?? nextOrder,
  };
}

export function DashboardWidgetFormDialog({
  open,
  widget,
  nextOrder,
  onClose,
  onSubmit,
}: DashboardWidgetFormDialogProps) {
  const [form, setForm] = useState(createState(widget, nextOrder));

  useEffect(() => {
    setForm(createState(widget, nextOrder));
  }, [widget, nextOrder, open]);

  return (
    <Dialog
      open={open}
      title={widget ? "Edit Widget" : "Add Widget"}
      onClose={onClose}
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-1 gap-4">
          <label>
            <span>Widget Type</span>
            <input value={form.widgetType} onChange={(event) => setForm({ ...form, widgetType: event.target.value })} />
          </label>
          <label>
            <span>Title</span>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <label>
            <span>Refresh Interval</span>
            <input type="number" value={form.refreshInterval} onChange={(event) => setForm({ ...form, refreshInterval: Number(event.target.value) })} />
          </label>
          <label>
            <span>Display Order</span>
            <input type="number" value={form.displayOrder} onChange={(event) => setForm({ ...form, displayOrder: Number(event.target.value) })} />
          </label>
          <label>
            <span>Required Permissions</span>
            <textarea rows={4} value={form.requiredPermissions} onChange={(event) => setForm({ ...form, requiredPermissions: event.target.value })} />
          </label>
          <label>
            <span>Configuration JSON</span>
            <textarea rows={7} value={form.configuration} onChange={(event) => setForm({ ...form, configuration: event.target.value })} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={onClose}>Cancel</button>
          <button
            className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() =>
              onSubmit({
                widgetType: form.widgetType,
                title: form.title,
                configuration: parseJsonMap(form.configuration),
                refreshInterval: Number(form.refreshInterval),
                requiredPermissions: parseLineList(form.requiredPermissions),
                displayOrder: Number(form.displayOrder),
              })
            }
          >
            Save
          </button>
        </div>
      </div>
    </Dialog>
  );
}
