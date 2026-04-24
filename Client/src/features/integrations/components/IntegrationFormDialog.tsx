import { useEffect, useState } from "react";
import { Dialog } from "../../../components/common/Dialog";
import { parseJsonMap, stringifyJsonMap } from "../../admin/shared/serializers";
import type { IntegrationRecord } from "../../../types";

type IntegrationFormDialogProps = {
  open: boolean;
  integration?: IntegrationRecord;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
};

function createState(integration?: IntegrationRecord) {
  return {
    integrationType: integration?.integrationType ?? "",
    name: integration?.name ?? "",
    configuration: stringifyJsonMap(integration?.configuration),
    isEnabled: integration?.isEnabled ?? true,
    status: integration?.status ?? "Configured",
  };
}

export function IntegrationFormDialog({
  open,
  integration,
  onClose,
  onSubmit,
}: IntegrationFormDialogProps) {
  const [form, setForm] = useState(createState(integration));

  useEffect(() => {
    setForm(createState(integration));
  }, [integration, open]);

  return (
    <Dialog open={open} title={integration ? "Edit Integration" : "Create Integration"} onClose={onClose}>
      <div className="dialog-stack">
        <div className="form-grid wide">
          <label>
            <span>Integration Type</span>
            <input value={form.integrationType} onChange={(event) => setForm({ ...form, integrationType: event.target.value })} />
          </label>
          <label>
            <span>Name</span>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            <span>Status</span>
            <input value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} />
          </label>
          <label>
            <span>Configuration JSON</span>
            <textarea rows={7} value={form.configuration} onChange={(event) => setForm({ ...form, configuration: event.target.value })} />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={form.isEnabled} onChange={(event) => setForm({ ...form, isEnabled: event.target.checked })} />
            <span>Enabled</span>
          </label>
        </div>
        <div className="inline-actions">
          <button className="ghost-button" onClick={onClose}>Cancel</button>
          <button
            className="primary-button"
            onClick={() =>
              onSubmit({
                integrationType: form.integrationType,
                name: form.name,
                configuration: parseJsonMap(form.configuration),
                isEnabled: form.isEnabled,
                status: form.status,
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
