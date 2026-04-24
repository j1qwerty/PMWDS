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
      <div className="dialog-stack">
        <div className="form-grid wide">
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
          <label className="checkbox-row">
            <input type="checkbox" checked={form.success} onChange={(event) => setForm({ ...form, success: event.target.checked })} />
            <span>Success</span>
          </label>
        </div>
        <div className="inline-actions">
          <button className="ghost-button" onClick={onClose}>Cancel</button>
          <button className="primary-button" onClick={() => onSubmit({ ...form, errorMessage: form.errorMessage || null })}>
            Save
          </button>
        </div>
      </div>
    </Dialog>
  );
}
