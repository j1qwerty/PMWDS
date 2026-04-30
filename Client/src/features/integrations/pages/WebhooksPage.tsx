import { useEffect, useMemo, useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { ErrorPanel, LoadingPanel, Notice, Panel } from "../../../ui";
import type { IntegrationRecord, WebhookDetailRecord, WebhookRecord } from "../../../types";
import { WebhookDeliveryFormDialog } from "../components/WebhookDeliveryFormDialog";
import { WebhookFormDialog } from "../components/WebhookFormDialog";

export function WebhooksPage() {
  const { auth } = useAuth();
  const [integrations, setIntegrations] = useState<IntegrationRecord[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<WebhookDetailRecord | null>(null);
  const [editing, setEditing] = useState<WebhookRecord | null>(null);
  const [deleting, setDeleting] = useState<WebhookRecord | null>(null);
  const [loggingDelivery, setLoggingDelivery] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = () => {
    if (!auth) {
      return Promise.resolve();
    }

    return Promise.all([api.getIntegrations(auth.token), api.getWebhooks(auth.token)])
      .then(([integrationData, webhookData]) => {
        setIntegrations(integrationData);
        setWebhooks(webhookData);
        setSelectedId((current) => current || webhookData[0]?.id || "");
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Failed to load webhooks.");
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

    api.getWebhook(auth.token, selectedId).then(setDetail).catch(() => setDetail(null));
  }, [auth, selectedId]);

  const selectedWebhook = useMemo(
    () => webhooks.find((webhook) => webhook.id === selectedId) ?? webhooks[0] ?? null,
    [webhooks, selectedId],
  );

  if (loading) {
    return <LoadingPanel label="Loading webhooks..." />;
  }

  if (error) {
    return <ErrorPanel message={error} />;
  }

  return (
    <div className="grid grid-cols-12 gap-4 content-start">
      {message ? <Notice>{message}</Notice> : null}
      <Panel title="Webhooks" subtitle="Manage webhook endpoints and review recorded delivery attempts">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
            {webhooks.map((webhook) => (
              <button
                key={webhook.id}
                className={`rounded-md border border-[var(--pmwds-border)] bg-white/[0.035] px-4 py-3 text-left transition hover:border-sky-300/50 hover:bg-white/[0.06] ${selectedWebhook?.id === webhook.id ? "selected-card" : ""}`}
                onClick={() => setSelectedId(webhook.id)}
              >
                <strong>{webhook.eventType}</strong>
                <span>{webhook.isActive ? "Active" : "Inactive"}</span>
                <small>{webhook.callbackUrl}</small>
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-[var(--pmwds-border)] bg-[var(--pmwds-surface-2)]/86 p-5 shadow-xl shadow-black/15">
            {selectedWebhook ? (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h4>{selectedWebhook.eventType}</h4>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setEditing(selectedWebhook)}>Edit</button>
                    <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setLoggingDelivery(true)}>Log Delivery</button>
                    <button className="rounded-md border border-rose-300/40 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-400/20" onClick={() => setDeleting(selectedWebhook)}>Delete</button>
                  </div>
                </div>
                <p>{selectedWebhook.callbackUrl}</p>
                <div className="metric-row"><span>Integration</span><strong>{integrations.find((item) => item.id === selectedWebhook.integrationId)?.name ?? "Standalone"}</strong></div>
                <div className="metric-row"><span>Headers</span><strong>{selectedWebhook.headers.join(", ") || "None"}</strong></div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3" style={{ marginTop: "1rem" }}>
                  <h4>Deliveries</h4>
                </div>
                <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
                  {(detail?.deliveries ?? []).map((delivery) => (
                    <div className="rounded-md border border-[var(--pmwds-border)] bg-white/[0.035] px-4 py-3 text-left transition hover:border-sky-300/50 hover:bg-white/[0.06]" key={delivery.id}>
                      <strong>{delivery.statusCode}</strong>
                      <span>{delivery.success ? "Success" : "Failure"}</span>
                      <small>{new Date(delivery.attemptedAt).toLocaleString()}</small>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--pmwds-border)] bg-white/[0.025] p-8 text-center text-slate-400"><strong>No webhooks</strong><span>Create a webhook to begin tracking deliveries.</span></div>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setEditing({} as WebhookRecord)}>
            Create Webhook
          </button>
        </div>
      </Panel>
      <WebhookFormDialog
        open={editing !== null}
        webhook={editing?.id ? editing : undefined}
        integrations={integrations}
        onClose={() => setEditing(null)}
        onSubmit={(payload) => {
          if (!auth) {
            return;
          }

          const action = editing?.id
            ? api.updateWebhook(auth.token, editing.id, payload)
            : api.createWebhook(auth.token, payload);

          void action.then(() => {
            setEditing(null);
            setMessage(editing?.id ? "Webhook updated." : "Webhook created.");
            void refresh();
          });
        }}
      />
      <WebhookDeliveryFormDialog
        open={loggingDelivery}
        onClose={() => setLoggingDelivery(false)}
        onSubmit={(payload) => {
          if (!auth || !selectedWebhook) {
            return;
          }

          void api.logWebhookDelivery(auth.token, selectedWebhook.id, payload).then(() => {
            setLoggingDelivery(false);
            setMessage("Webhook delivery logged.");
            void refresh();
          });
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete Webhook"
        message={`Delete ${deleting?.eventType}?`}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          auth && deleting
            ? api.deleteWebhook(auth.token, deleting.id).then(() => {
                setDeleting(null);
                setMessage("Webhook deleted.");
                void refresh();
              })
            : undefined
        }
        confirmLabel="Delete"
      />
    </div>
  );
}
