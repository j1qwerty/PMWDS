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
    <Dialog
      open={open}
      title={template ? "Edit Template" : "Create Template"}
      onClose={onClose}
    >
      <div className="dialog-stack">
        <div className="form-grid wide">
          <label>
            <span>Template Type</span>
            <input value={form.templateType} onChange={(event) => setForm({ ...form, templateType: event.target.value })} />
          </label>
          <label>
            <span>Subject Template</span>
            <input value={form.subjectTemplate} onChange={(event) => setForm({ ...form, subjectTemplate: event.target.value })} />
          </label>
          <label>
            <span>Body Template</span>
            <textarea rows={5} value={form.bodyTemplate} onChange={(event) => setForm({ ...form, bodyTemplate: event.target.value })} />
          </label>
          <label>
            <span>Variables</span>
            <textarea rows={4} value={form.variables} onChange={(event) => setForm({ ...form, variables: event.target.value })} />
          </label>
          <label>
            <span>Supported Channels</span>
            <textarea rows={4} value={form.supportedChannels} onChange={(event) => setForm({ ...form, supportedChannels: event.target.value })} />
          </label>
        </div>
        <div className="inline-actions">
          <button className="ghost-button" onClick={onClose}>Cancel</button>
          <button
            className="primary-button"
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
