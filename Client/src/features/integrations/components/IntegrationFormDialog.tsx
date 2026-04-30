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
      <div className="grid gap-4">
        <div className="grid grid-cols-1 gap-4">
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
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={form.isEnabled} onChange={(event) => setForm({ ...form, isEnabled: event.target.checked })} />
            <span>Enabled</span>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={onClose}>Cancel</button>
          <button
            className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
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
