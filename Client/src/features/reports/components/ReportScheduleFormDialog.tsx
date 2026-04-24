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
      <div className="dialog-stack">
        <div className="form-grid wide">
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
