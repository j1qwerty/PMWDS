import { useEffect, useState } from "react";
import { Dialog } from "../../../components/common/Dialog";
import { parseLineList, stringifyLineList } from "../../admin/shared/serializers";
import type { NotificationTemplateRecord } from "../../../types";

type NotificationTemplateFormDialogProps = {
  open: boolean;
  template?: NotificationTemplateRecord;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
};

function createState(template?: NotificationTemplateRecord) {
  return {
    templateType: template?.templateType ?? "",
    subjectTemplate: template?.subjectTemplate ?? "",
    bodyTemplate: template?.bodyTemplate ?? "",
    variables: stringifyLineList(template?.variables),
    supportedChannels: stringifyLineList(template?.supportedChannels),
  };
}

export function NotificationTemplateFormDialog({
  open,
  template,
  onClose,
  onSubmit,
}: NotificationTemplateFormDialogProps) {
  const [form, setForm] = useState(createState(template));

  useEffect(() => {
    setForm(createState(template));
  }, [template, open]);

  return (
    <Dialog open={open} title={template?.id ? "Edit Template" : "Create Template"} onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Template Type</label>
            <input 
              value={form.templateType} 
              onChange={(event) => setForm({ ...form, templateType: event.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              placeholder="e.g., task_reminder"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject Template</label>
            <input 
              value={form.subjectTemplate} 
              onChange={(event) => setForm({ ...form, subjectTemplate: event.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              placeholder="Task reminder: {{taskName}}"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Body Template</label>
            <textarea 
              rows={5} 
              value={form.bodyTemplate} 
              onChange={(event) => setForm({ ...form, bodyTemplate: event.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
              placeholder="Hello {{userName}}, this is a reminder for {{taskName}}..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Variables (one per line)</label>
            <textarea 
              rows={4} 
              value={form.variables} 
              onChange={(event) => setForm({ ...form, variables: event.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none font-mono text-sm"
              placeholder="userName&#10;taskName&#10;dueDate"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Supported Channels (one per line)</label>
            <textarea 
              rows={4} 
              value={form.supportedChannels} 
              onChange={(event) => setForm({ ...form, supportedChannels: event.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none font-mono text-sm"
              placeholder="in_app&#10;email&#10;push"
            />
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
            disabled={!form.templateType || !form.subjectTemplate}
            onClick={() =>
              onSubmit({
                templateType: form.templateType,
                subjectTemplate: form.subjectTemplate,
                bodyTemplate: form.bodyTemplate,
                variables: parseLineList(form.variables),
                supportedChannels: parseLineList(form.supportedChannels),
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