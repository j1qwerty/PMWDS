import { useEffect, useState } from "react";
import { Dialog } from "../../../components/common/Dialog";
import { parseJsonMap, parseLineList, stringifyJsonMap, stringifyLineList } from "../../admin/shared/serializers";
import type { ReportScheduleRecord, StoredReportRecord } from "../../../types";

type ReportScheduleFormDialogProps = {
  open: boolean;
  schedule?: ReportScheduleRecord;
  reports: StoredReportRecord[];
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
};

function createState(schedule: ReportScheduleRecord | undefined, reports: StoredReportRecord[]) {
  return {
    reportId: schedule?.reportId ?? reports[0]?.id ?? "",
    frequency: schedule?.frequency ?? "Weekly",
    nextRun: schedule?.nextRun?.slice(0, 16) ?? "",
    recipients: stringifyLineList(schedule?.recipients),
    deliveryOptions: stringifyJsonMap(schedule?.deliveryOptions),
    isActive: schedule?.isActive ?? true,
  };
}

export function ReportScheduleFormDialog({
  open,
  schedule,
  reports,
  onClose,
  onSubmit,
}: ReportScheduleFormDialogProps) {
  const [form, setForm] = useState(createState(schedule, reports));

  useEffect(() => {
    setForm(createState(schedule, reports));
  }, [schedule, reports, open]);

  return (
    <Dialog open={open} title={schedule ? "Edit Schedule" : "Create Schedule"} onClose={onClose}>
      <div className="grid gap-4">
        <div className="grid grid-cols-1 gap-4">
          <label>
            <span>Report</span>
            <select value={form.reportId} onChange={(event) => setForm({ ...form, reportId: event.target.value })}>
              <option value="">Select report</option>
              {reports.map((report) => (
                <option key={report.id} value={report.id}>
                  {report.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Frequency</span>
            <input value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value })} />
          </label>
          <label>
            <span>Next Run</span>
            <input type="datetime-local" value={form.nextRun} onChange={(event) => setForm({ ...form, nextRun: event.target.value })} />
          </label>
          <label>
            <span>Recipients</span>
            <textarea rows={4} value={form.recipients} onChange={(event) => setForm({ ...form, recipients: event.target.value })} />
          </label>
          <label>
            <span>Delivery Options JSON</span>
            <textarea rows={5} value={form.deliveryOptions} onChange={(event) => setForm({ ...form, deliveryOptions: event.target.value })} />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
            <span>Active</span>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={onClose}>Cancel</button>
          <button
            className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() =>
              onSubmit({
                reportId: form.reportId,
                frequency: form.frequency,
                nextRun: new Date(form.nextRun).toISOString(),
                recipients: parseLineList(form.recipients),
                deliveryOptions: parseJsonMap(form.deliveryOptions),
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
