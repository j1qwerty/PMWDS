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
      <div className="grid gap-4">
        <div className="grid grid-cols-1 gap-4">
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
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={onClose}>Cancel</button>
          <button
            className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
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
