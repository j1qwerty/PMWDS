import { useEffect, useState } from "react";
import { Dialog } from "../../../components/common/Dialog";

type WebhookDeliveryFormDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
};

const initialState = {
  statusCode: 200,
  responseBody: "",
  success: true,
  errorMessage: "",
};

export function WebhookDeliveryFormDialog({
  open,
  onClose,
  onSubmit,
}: WebhookDeliveryFormDialogProps) {
  const [form, setForm] = useState(initialState);

  useEffect(() => {
    if (open) {
      setForm(initialState);
    }
  }, [open]);

  return (
    <Dialog open={open} title="Log Webhook Delivery" onClose={onClose}>
      <div className="grid gap-4">
        <div className="grid grid-cols-1 gap-4">
          <label>
            <span>Status Code</span>
            <input type="number" value={form.statusCode} onChange={(event) => setForm({ ...form, statusCode: Number(event.target.value) })} />
          </label>
          <label>
            <span>Response Body</span>
            <textarea rows={5} value={form.responseBody} onChange={(event) => setForm({ ...form, responseBody: event.target.value })} />
          </label>
          <label>
            <span>Error Message</span>
            <input value={form.errorMessage} onChange={(event) => setForm({ ...form, errorMessage: event.target.value })} />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={form.success} onChange={(event) => setForm({ ...form, success: event.target.checked })} />
            <span>Success</span>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={onClose}>Cancel</button>
          <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => onSubmit({ ...form, errorMessage: form.errorMessage || null })}>
            Save
          </button>
        </div>
      </div>
    </Dialog>
  );
}
