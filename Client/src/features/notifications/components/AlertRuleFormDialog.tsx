import { useEffect, useState } from "react";
import { Dialog } from "../../../components/common/Dialog";
import { parseJsonMap, stringifyJsonMap } from "../../admin/shared/serializers";
import type { AlertRuleRecord } from "../../../types";

type AlertRuleFormDialogProps = {
  open: boolean;
  rule?: AlertRuleRecord;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
};

function createState(rule?: AlertRuleRecord) {
  return {
    name: rule?.name ?? "",
    conditionType: rule?.conditionType ?? "",
    conditionExpression: rule?.conditionExpression ?? "",
    actionType: rule?.actionType ?? "",
    actionParameters: stringifyJsonMap(rule?.actionParameters),
    isEnabled: rule?.isEnabled ?? true,
  };
}

export function AlertRuleFormDialog({
  open,
  rule,
  onClose,
  onSubmit,
}: AlertRuleFormDialogProps) {
  const [form, setForm] = useState(createState(rule));

  useEffect(() => {
    setForm(createState(rule));
  }, [rule, open]);

  return (
    <Dialog
      open={open}
      title={rule ? "Edit Alert Rule" : "Create Alert Rule"}
      onClose={onClose}
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-1 gap-4">
          <label>
            <span>Name</span>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            <span>Condition Type</span>
            <input value={form.conditionType} onChange={(event) => setForm({ ...form, conditionType: event.target.value })} />
          </label>
          <label>
            <span>Condition Expression</span>
            <textarea rows={3} value={form.conditionExpression} onChange={(event) => setForm({ ...form, conditionExpression: event.target.value })} />
          </label>
          <label>
            <span>Action Type</span>
            <input value={form.actionType} onChange={(event) => setForm({ ...form, actionType: event.target.value })} />
          </label>
          <label>
            <span>Action Parameters JSON</span>
            <textarea rows={5} value={form.actionParameters} onChange={(event) => setForm({ ...form, actionParameters: event.target.value })} />
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
                name: form.name,
                conditionType: form.conditionType,
                conditionExpression: form.conditionExpression,
                actionType: form.actionType,
                actionParameters: parseJsonMap(form.actionParameters),
                isEnabled: form.isEnabled,
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
