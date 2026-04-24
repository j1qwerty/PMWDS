import { useEffect, useMemo, useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { ErrorPanel, LoadingPanel, Notice, Panel } from "../../../ui";
import type { ReportScheduleRecord, StoredReportDetailRecord, StoredReportRecord } from "../../../types";
import { ReportScheduleFormDialog } from "../components/ReportScheduleFormDialog";
import { StoredReportFormDialog } from "../components/StoredReportFormDialog";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const { auth } = useAuth();
  const [reports, setReports] = useState<StoredReportRecord[]>([]);
  const [schedules, setSchedules] = useState<ReportScheduleRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<StoredReportDetailRecord | null>(null);
  const [editingReport, setEditingReport] = useState<StoredReportRecord | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<ReportScheduleRecord | null>(null);
  const [deletingReport, setDeletingReport] = useState<StoredReportRecord | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<ReportScheduleRecord | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = () => {
    if (!auth) {
      return Promise.resolve();
    }

    return Promise.all([api.getStoredReports(auth.token), api.getReportSchedules(auth.token)])
      .then(([reportData, scheduleData]) => {
        setReports(reportData);
        setSchedules(scheduleData);
        setSelectedId((current) => current || reportData[0]?.id || "");
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Failed to load reports.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void refresh();
  }, [auth]);

  useEffect(() => {
    if (!auth || !selectedId) {
      setDetail(null);
      return;
    }

    api.getStoredReport(auth.token, selectedId).then(setDetail).catch(() => setDetail(null));
  }, [auth, selectedId]);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedId) ?? reports[0] ?? null,
    [reports, selectedId],
  );

  if (loading) {
    return <LoadingPanel label="Loading reports..." />;
  }

  if (error) {
    return <ErrorPanel message={error} />;
  }

  return (
    <div className="page-grid">
      {message ? <Notice>{message}</Notice> : null}
      <Panel title="Stored Reports" subtitle="Manage generated report files and their reusable metadata">
        <div className="split">
          <div className="list-column">
            {reports.map((report) => (
              <button
                key={report.id}
                className={`list-card ${selectedReport?.id === report.id ? "selected-card" : ""}`}
                onClick={() => setSelectedId(report.id)}
              >
                <strong>{report.name}</strong>
                <span>{report.reportType}</span>
                <small>{report.format} · {report.sizeBytes} bytes</small>
              </button>
            ))}
          </div>
          <div className="detail-card">
            {selectedReport ? (
              <>
                <div className="section-row">
                  <h4>{selectedReport.name}</h4>
                  <div className="inline-actions">
                    <button className="ghost-button" onClick={() => setEditingReport(selectedReport)}>Edit</button>
                    <button
                      className="ghost-button"
                      onClick={() =>
                        auth &&
                        api.downloadStoredReport(auth.token, selectedReport.id).then((blob) => {
                          downloadBlob(blob, `${selectedReport.name}.${selectedReport.format}`);
                        })
                      }
                    >
                      Download
                    </button>
                    <button className="danger-button" onClick={() => setDeletingReport(selectedReport)}>Delete</button>
                  </div>
                </div>
                <p>{JSON.stringify(detail?.report.parameters ?? selectedReport.parameters, null, 2)}</p>
                <div className="metric-row"><span>Generated</span><strong>{new Date(selectedReport.generatedDate).toLocaleString()}</strong></div>
                <div className="metric-row"><span>Schedules</span><strong>{detail?.schedules.length ?? 0}</strong></div>
              </>
            ) : (
              <div className="empty-state"><strong>No stored reports</strong><span>Create one to start scheduling exports.</span></div>
            )}
          </div>
        </div>
        <div className="inline-actions">
          <button className="primary-button" onClick={() => setEditingReport({} as StoredReportRecord)}>
            Create Stored Report
          </button>
        </div>
      </Panel>
      <Panel title="Schedules" subtitle="Automate report delivery and recurring exports">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Frequency</th>
                <th>Next Run</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule) => (
                <tr key={schedule.id}>
                  <td>{reports.find((report) => report.id === schedule.reportId)?.name ?? schedule.reportId}</td>
                  <td>{schedule.frequency}</td>
                  <td>{new Date(schedule.nextRun).toLocaleString()}</td>
                  <td>
                    <div className="inline-actions">
                      <button className="ghost-button" onClick={() => setEditingSchedule(schedule)}>Edit</button>
                      <button className="danger-button" onClick={() => setDeletingSchedule(schedule)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="inline-actions">
          <button className="primary-button" onClick={() => setEditingSchedule({} as ReportScheduleRecord)}>
            Create Schedule
          </button>
        </div>
      </Panel>
      <StoredReportFormDialog
        open={editingReport !== null}
        report={editingReport?.id ? editingReport : undefined}
        onClose={() => setEditingReport(null)}
        onSubmit={(payload) => {
          if (!auth) {
            return;
          }

          const action = editingReport?.id
            ? api.updateStoredReport(auth.token, editingReport.id, payload)
            : api.createStoredReport(auth.token, payload);

          void action.then(() => {
            setEditingReport(null);
            setMessage(editingReport?.id ? "Stored report updated." : "Stored report created.");
            void refresh();
          });
        }}
      />
      <ReportScheduleFormDialog
        open={editingSchedule !== null}
        schedule={editingSchedule?.id ? editingSchedule : undefined}
        reports={reports}
        onClose={() => setEditingSchedule(null)}
        onSubmit={(payload) => {
          if (!auth) {
            return;
          }

          const action = editingSchedule?.id
            ? api.updateReportSchedule(auth.token, editingSchedule.id, payload)
            : api.createReportSchedule(auth.token, payload);

          void action.then(() => {
            setEditingSchedule(null);
            setMessage(editingSchedule?.id ? "Schedule updated." : "Schedule created.");
            void refresh();
          });
        }}
      />
      <ConfirmDialog
        open={deletingReport !== null}
        title="Delete Report"
        message={`Delete ${deletingReport?.name}?`}
        onClose={() => setDeletingReport(null)}
        onConfirm={() =>
          auth && deletingReport
            ? api.deleteStoredReport(auth.token, deletingReport.id).then(() => {
                setDeletingReport(null);
                setMessage("Stored report deleted.");
                void refresh();
              })
            : undefined
        }
        confirmLabel="Delete"
      />
      <ConfirmDialog
        open={deletingSchedule !== null}
        title="Delete Schedule"
        message={`Delete ${deletingSchedule?.frequency} schedule?`}
        onClose={() => setDeletingSchedule(null)}
        onConfirm={() =>
          auth && deletingSchedule
            ? api.deleteReportSchedule(auth.token, deletingSchedule.id).then(() => {
                setDeletingSchedule(null);
                setMessage("Schedule deleted.");
                void refresh();
              })
            : undefined
        }
        confirmLabel="Delete"
      />
    </div>
  );
}
