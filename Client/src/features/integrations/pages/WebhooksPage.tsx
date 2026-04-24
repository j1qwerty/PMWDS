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
    <div className="page-grid">
      {message ? <Notice>{message}</Notice> : null}
      <Panel title="Webhooks" subtitle="Manage webhook endpoints and review recorded delivery attempts">
        <div className="split">
          <div className="list-column">
            {webhooks.map((webhook) => (
              <button
                key={webhook.id}
                className={`list-card ${selectedWebhook?.id === webhook.id ? "selected-card" : ""}`}
                onClick={() => setSelectedId(webhook.id)}
              >
                <strong>{webhook.eventType}</strong>
                <span>{webhook.isActive ? "Active" : "Inactive"}</span>
                <small>{webhook.callbackUrl}</small>
              </button>
            ))}
          </div>
          <div className="detail-card">
            {selectedWebhook ? (
              <>
                <div className="section-row">
                  <h4>{selectedWebhook.eventType}</h4>
                  <div className="inline-actions">
                    <button className="ghost-button" onClick={() => setEditing(selectedWebhook)}>Edit</button>
                    <button className="ghost-button" onClick={() => setLoggingDelivery(true)}>Log Delivery</button>
                    <button className="danger-button" onClick={() => setDeleting(selectedWebhook)}>Delete</button>
                  </div>
                </div>
                <p>{selectedWebhook.callbackUrl}</p>
                <div className="metric-row"><span>Integration</span><strong>{integrations.find((item) => item.id === selectedWebhook.integrationId)?.name ?? "Standalone"}</strong></div>
                <div className="metric-row"><span>Headers</span><strong>{selectedWebhook.headers.join(", ") || "None"}</strong></div>
                <div className="section-row" style={{ marginTop: "1rem" }}>
                  <h4>Deliveries</h4>
                </div>
                <div className="list-column">
                  {(detail?.deliveries ?? []).map((delivery) => (
                    <div className="list-card" key={delivery.id}>
                      <strong>{delivery.statusCode}</strong>
                      <span>{delivery.success ? "Success" : "Failure"}</span>
                      <small>{new Date(delivery.attemptedAt).toLocaleString()}</small>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state"><strong>No webhooks</strong><span>Create a webhook to begin tracking deliveries.</span></div>
            )}
          </div>
        </div>
        <div className="inline-actions">
          <button className="primary-button" onClick={() => setEditing({} as WebhookRecord)}>
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
