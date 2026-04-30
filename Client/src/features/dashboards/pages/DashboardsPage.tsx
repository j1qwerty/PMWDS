import { useEffect, useMemo, useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { ErrorPanel, LoadingPanel, Notice, Panel } from "../../../ui";
import type { DashboardRecord, DashboardWidgetRecord } from "../../../types";
import { DashboardFormDialog } from "../components/DashboardFormDialog";
import { DashboardWidgetFormDialog } from "../components/DashboardWidgetFormDialog";

export function DashboardsPage() {
  const { auth } = useAuth();
  const [dashboards, setDashboards] = useState<DashboardRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [editingDashboard, setEditingDashboard] = useState<DashboardRecord | null>(null);
  const [editingWidget, setEditingWidget] = useState<DashboardWidgetRecord | null>(null);
  const [deletingDashboard, setDeletingDashboard] = useState<DashboardRecord | null>(null);
  const [deletingWidget, setDeletingWidget] = useState<DashboardWidgetRecord | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = () => {
    if (!auth) {
      return Promise.resolve();
    }

    return api.getDashboards(auth.token)
      .then((dashboardData) => {
        setDashboards(dashboardData);
        setSelectedId((current) => current || dashboardData[0]?.id || "");
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Failed to load dashboards.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void refresh();
  }, [auth]);

  const selectedDashboard = useMemo(
    () => dashboards.find((item) => item.id === selectedId) ?? dashboards[0] ?? null,
    [dashboards, selectedId],
  );

  if (loading) {
    return <LoadingPanel label="Loading dashboards..." />;
  }

  if (error) {
    return <ErrorPanel message={error} />;
  }

  return (
    <div className="grid grid-cols-12 gap-4 content-start">
      {message ? <Notice>{message}</Notice> : null}
      <Panel title="Dashboards" subtitle="Manage dashboard layouts, default views, and operational widgets">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
            {dashboards.map((dashboard) => (
              <button
                key={dashboard.id}
                className={`rounded-md border border-[var(--pmwds-border)] bg-white/[0.035] px-4 py-3 text-left transition hover:border-sky-300/50 hover:bg-white/[0.06] ${selectedDashboard?.id === dashboard.id ? "selected-card" : ""}`}
                onClick={() => setSelectedId(dashboard.id)}
              >
                <strong>{dashboard.name}</strong>
                <span>{dashboard.layoutType}</span>
                <small>{dashboard.widgets.length} widgets</small>
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-[var(--pmwds-border)] bg-[var(--pmwds-surface-2)]/86 p-5 shadow-xl shadow-black/15">
            {selectedDashboard ? (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h4>{selectedDashboard.name}</h4>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setEditingDashboard(selectedDashboard)}>Edit</button>
                    <button className="rounded-md border border-rose-300/40 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-400/20" onClick={() => setDeletingDashboard(selectedDashboard)}>Delete</button>
                  </div>
                </div>
                <p>{selectedDashboard.isDefault ? "Default dashboard for the current user." : "Custom dashboard layout."}</p>
                <div className="metric-row"><span>Layout</span><strong>{selectedDashboard.layoutType}</strong></div>
                <div className="metric-row"><span>Last Accessed</span><strong>{new Date(selectedDashboard.lastAccessed).toLocaleString()}</strong></div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3" style={{ marginTop: "1rem" }}>
                  <h4>Widgets</h4>
                  <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setEditingWidget({} as DashboardWidgetRecord)}>
                    Add Widget
                  </button>
                </div>
                <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
                  {selectedDashboard.widgets.map((widget) => (
                    <div className="rounded-md border border-[var(--pmwds-border)] bg-white/[0.035] px-4 py-3 text-left transition hover:border-sky-300/50 hover:bg-white/[0.06]" key={widget.id}>
                      <strong>{widget.title}</strong>
                      <span>{widget.widgetType}</span>
                      <small>Order {widget.displayOrder} · refresh {widget.refreshInterval} min</small>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setEditingWidget(widget)}>Edit</button>
                        <button
                          className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() =>
                            auth &&
                            api.reorderDashboardWidgets(
                              auth.token,
                              selectedDashboard.id,
                              selectedDashboard.widgets
                                .map((item) => item.id)
                                .filter((itemId) => itemId !== widget.id)
                                .concat(widget.id),
                            ).then(() => {
                              setMessage("Widget order updated.");
                              void refresh();
                            })
                          }
                        >
                          Move Last
                        </button>
                        <button className="rounded-md border border-rose-300/40 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-400/20" onClick={() => setDeletingWidget(widget)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--pmwds-border)] bg-white/[0.025] p-8 text-center text-slate-400">
                <strong>No dashboards</strong>
                <span>Create a dashboard to start configuring widgets.</span>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setEditingDashboard({} as DashboardRecord)}>
            Create Dashboard
          </button>
        </div>
      </Panel>
      <DashboardFormDialog
        open={editingDashboard !== null}
        dashboard={editingDashboard?.id ? editingDashboard : undefined}
        onClose={() => setEditingDashboard(null)}
        onSubmit={(payload) => {
          if (!auth) {
            return;
          }

          const action = editingDashboard?.id
            ? api.updateDashboard(auth.token, editingDashboard.id, payload)
            : api.createDashboard(auth.token, payload);

          void action.then(() => {
            setEditingDashboard(null);
            setMessage(editingDashboard?.id ? "Dashboard updated." : "Dashboard created.");
            void refresh();
          });
        }}
      />
      <DashboardWidgetFormDialog
        open={editingWidget !== null}
        widget={editingWidget?.id ? editingWidget : undefined}
        nextOrder={selectedDashboard?.widgets.length ?? 0}
        onClose={() => setEditingWidget(null)}
        onSubmit={(payload) => {
          if (!auth || !selectedDashboard) {
            return;
          }

          const action = editingWidget?.id
            ? api.updateDashboardWidget(auth.token, editingWidget.id, payload)
            : api.addDashboardWidget(auth.token, selectedDashboard.id, payload);

          void action.then(() => {
            setEditingWidget(null);
            setMessage(editingWidget?.id ? "Widget updated." : "Widget added.");
            void refresh();
          });
        }}
      />
      <ConfirmDialog
        open={deletingDashboard !== null}
        title="Delete Dashboard"
        message={`Delete ${deletingDashboard?.name}?`}
        onClose={() => setDeletingDashboard(null)}
        onConfirm={() =>
          auth && deletingDashboard
            ? api.deleteDashboard(auth.token, deletingDashboard.id).then(() => {
                setDeletingDashboard(null);
                setMessage("Dashboard deleted.");
                void refresh();
              })
            : undefined
        }
        confirmLabel="Delete"
      />
      <ConfirmDialog
        open={deletingWidget !== null}
        title="Delete Widget"
        message={`Delete ${deletingWidget?.title}?`}
        onClose={() => setDeletingWidget(null)}
        onConfirm={() =>
          auth && deletingWidget
            ? api.deleteDashboardWidget(auth.token, deletingWidget.id).then(() => {
                setDeletingWidget(null);
                setMessage("Widget deleted.");
                void refresh();
              })
            : undefined
        }
        confirmLabel="Delete"
      />
    </div>
  );
}
