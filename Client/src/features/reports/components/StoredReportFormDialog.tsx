import { useEffect, useState } from "react";
import { Dialog } from "../../../components/common/Dialog";
import { parseJsonMap, stringifyJsonMap } from "../../admin/shared/serializers";
import type { StoredReportRecord } from "../../../types";

type StoredReportFormDialogProps = {
  open: boolean;
  report?: StoredReportRecord;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
};

function createState(report?: StoredReportRecord) {
  return {
    name: report?.name ?? "",
    reportType: report?.reportType ?? "",
    parameters: stringifyJsonMap(report?.parameters),
    format: report?.format ?? "json",
    contentBase64: "",
  };
}

export function StoredReportFormDialog({
  open,
  report,
  onClose,
  onSubmit,
}: StoredReportFormDialogProps) {
  const [form, setForm] = useState(createState(report));

  useEffect(() => {
    setForm(createState(report));
  }, [report, open]);

  return (
    <Dialog open={open} title={report ? "Edit Stored Report" : "Create Stored Report"} onClose={onClose}>
      <div className="dialog-stack">
        <div className="form-grid wide">
          <label>
            <span>Name</span>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            <span>Report Type</span>
            <input value={form.reportType} onChange={(event) => setForm({ ...form, reportType: event.target.value })} />
          </label>
          <label>
            <span>Format</span>
            <input value={form.format} onChange={(event) => setForm({ ...form, format: event.target.value })} />
          </label>
          <label>
            <span>Parameters JSON</span>
            <textarea rows={6} value={form.parameters} onChange={(event) => setForm({ ...form, parameters: event.target.value })} />
          </label>
          <label>
            <span>Content Base64</span>
            <textarea rows={4} value={form.contentBase64} onChange={(event) => setForm({ ...form, contentBase64: event.target.value })} />
          </label>
        </div>
        <div className="inline-actions">
          <button className="ghost-button" onClick={onClose}>Cancel</button>
          <button
            className="primary-button"
            onClick={() =>
              onSubmit({
                name: form.name,
                reportType: form.reportType,
                parameters: parseJsonMap(form.parameters),
                format: form.format,
                contentBase64: form.contentBase64 || null,
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
