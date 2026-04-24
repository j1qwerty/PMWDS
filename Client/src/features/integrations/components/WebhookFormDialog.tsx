import { useEffect, useState } from "react";
import { Dialog } from "../../../components/common/Dialog";
import { parseLineList, stringifyLineList } from "../../admin/shared/serializers";
import type { IntegrationRecord, WebhookRecord } from "../../../types";

type WebhookFormDialogProps = {
  open: boolean;
  webhook?: WebhookRecord;
  integrations: IntegrationRecord[];
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
};

function createState(webhook: WebhookRecord | undefined, integrations: IntegrationRecord[]) {
  return {
    integrationId: webhook?.integrationId ?? integrations[0]?.id ?? "",
    eventType: webhook?.eventType ?? "",
    callbackUrl: webhook?.callbackUrl ?? "",
    secret: "",
    headers: stringifyLineList(webhook?.headers),
    isActive: webhook?.isActive ?? true,
  };
}

export function WebhookFormDialog({
  open,
  webhook,
  integrations,
  onClose,
  onSubmit,
}: WebhookFormDialogProps) {
  const [form, setForm] = useState(createState(webhook, integrations));

  useEffect(() => {
    setForm(createState(webhook, integrations));
  }, [webhook, integrations, open]);

  return (
    <Dialog open={open} title={webhook ? "Edit Webhook" : "Create Webhook"} onClose={onClose}>
      <div className="dialog-stack">
        <div className="form-grid wide">
          <label>
            <span>Integration</span>
            <select value={form.integrationId} onChange={(event) => setForm({ ...form, integrationId: event.target.value })}>
              <option value="">No integration</option>
              {integrations.map((integration) => (
                <option key={integration.id} value={integration.id}>
                  {integration.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Event Type</span>
            <input value={form.eventType} onChange={(event) => setForm({ ...form, eventType: event.target.value })} />
          </label>
          <label>
            <span>Callback URL</span>
            <input value={form.callbackUrl} onChange={(event) => setForm({ ...form, callbackUrl: event.target.value })} />
          </label>
          <label>
            <span>Secret</span>
            <input value={form.secret} onChange={(event) => setForm({ ...form, secret: event.target.value })} />
          </label>
          <label>
            <span>Headers</span>
            <textarea rows={5} value={form.headers} onChange={(event) => setForm({ ...form, headers: event.target.value })} />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
            <span>Active</span>
          </label>
        </div>
        <div className="inline-actions">
          <button className="ghost-button" onClick={onClose}>Cancel</button>
          <button
            className="primary-button"
            onClick={() =>
              onSubmit({
                integrationId: form.integrationId || null,
                eventType: form.eventType,
                callbackUrl: form.callbackUrl,
                secret: form.secret,
                headers: parseLineList(form.headers),
                isActive: form.isActive,
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
