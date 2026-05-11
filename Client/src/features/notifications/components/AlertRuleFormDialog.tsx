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
    <Dialog open={open} title={rule?.id ? "Edit Alert Rule" : "Create Alert Rule"} onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input 
              value={form.name} 
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              placeholder="e.g., High Priority Task Alert"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Condition Type</label>
            <input 
              value={form.conditionType} 
              onChange={(event) => setForm({ ...form, conditionType: event.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              placeholder="e.g., task_priority"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Condition Expression</label>
            <textarea 
              rows={3} 
              value={form.conditionExpression} 
              onChange={(event) => setForm({ ...form, conditionExpression: event.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none font-mono text-sm"
              placeholder='{"priority": "high"}'
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Action Type</label>
            <input 
              value={form.actionType} 
              onChange={(event) => setForm({ ...form, actionType: event.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              placeholder="e.g., send_notification"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Action Parameters (JSON)</label>
            <textarea 
              rows={5} 
              value={form.actionParameters} 
              onChange={(event) => setForm({ ...form, actionParameters: event.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none font-mono text-sm"
              placeholder='{"channel": "in_app", "template": "alert"}'
            />
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={form.isEnabled} 
              onChange={(event) => setForm({ ...form, isEnabled: event.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-300"
            />
            <span className="text-sm text-slate-600">Enabled</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button 
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
            disabled={!form.name || !form.conditionType || !form.actionType}
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