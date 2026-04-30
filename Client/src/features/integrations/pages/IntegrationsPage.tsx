import { useEffect, useMemo, useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { classNames, dangerButtonClass, detailCardClass, EmptyState, ErrorPanel, ghostButtonClass, inputClass, listCardClass, listColumnClass, LoadingPanel, MetricRow, Notice, Panel, primaryButtonClass, selectedCardClass } from "../../../ui";
import type { IntegrationDetailRecord, IntegrationRecord } from "../../../types";
import { IntegrationFormDialog } from "../components/IntegrationFormDialog";

export function IntegrationsPage() {
  const { auth } = useAuth();
  const [integrations, setIntegrations] = useState<IntegrationRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<IntegrationDetailRecord | null>(null);
  const [editing, setEditing] = useState<IntegrationRecord | null>(null);
  const [deleting, setDeleting] = useState<IntegrationRecord | null>(null);
  const [syncStatus, setSyncStatus] = useState("Synced");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = () => {
    if (!auth) {
      return Promise.resolve();
    }

    return api.getIntegrations(auth.token)
      .then((integrationData) => {
        setIntegrations(integrationData);
        setSelectedId((current) => current || integrationData[0]?.id || "");
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Failed to load integrations.");
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

    api.getIntegration(auth.token, selectedId).then(setDetail).catch(() => setDetail(null));
  }, [auth, selectedId]);

  const selectedIntegration = useMemo(
    () => integrations.find((integration) => integration.id === selectedId) ?? integrations[0] ?? null,
    [integrations, selectedId],
  );

  if (loading) {
    return <LoadingPanel label="Loading integrations..." />;
  }

  if (error) {
    return <ErrorPanel message={error} />;
  }

  return (
    <div className="grid grid-cols-12 gap-4 content-start">
      {message ? <Notice>{message}</Notice> : null}
      <Panel title="Integrations" subtitle="Configure external systems and track webhook-enabled connections">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className={listColumnClass}>
            {integrations.map((integration) => (
              <button
                key={integration.id}
                className={classNames(listCardClass, selectedIntegration?.id === integration.id && selectedCardClass)}
                onClick={() => setSelectedId(integration.id)}
              >
                <strong>{integration.name}</strong>
                <span>{integration.integrationType}</span>
                <small>{integration.status}</small>
              </button>
            ))}
          </div>
          <div className={detailCardClass}>
            {selectedIntegration ? (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h4>{selectedIntegration.name}</h4>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className={ghostButtonClass} onClick={() => setEditing(selectedIntegration)}>Edit</button>
                    <button className={dangerButtonClass} onClick={() => setDeleting(selectedIntegration)}>Delete</button>
                  </div>
                </div>
                <p>{JSON.stringify(selectedIntegration.configuration, null, 2)}</p>
                <MetricRow label="Status" value={selectedIntegration.status} />
                <MetricRow label="Webhooks" value={`${detail?.webhooks.length ?? 0}`} />
                <div className="mt-4 flex flex-wrap gap-2">
                  <input className={inputClass} value={syncStatus} onChange={(event) => setSyncStatus(event.target.value)} />
                  <button
                    className={primaryButtonClass}
                    onClick={() =>
                      auth &&
                      api.syncIntegration(auth.token, selectedIntegration.id, syncStatus).then(() => {
                        setMessage("Integration sync updated.");
                        void refresh();
                      })
                    }
                  >
                    Mark Sync
                  </button>
                </div>
              </>
            ) : (
              <EmptyState title="No integrations" description="Create one to start managing outbound hooks." />
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className={primaryButtonClass} onClick={() => setEditing({} as IntegrationRecord)}>
            Create Integration
          </button>
        </div>
      </Panel>
      <IntegrationFormDialog
        open={editing !== null}
        integration={editing?.id ? editing : undefined}
        onClose={() => setEditing(null)}
        onSubmit={(payload) => {
          if (!auth) {
            return;
          }

          const action = editing?.id
            ? api.updateIntegration(auth.token, editing.id, payload)
            : api.createIntegration(auth.token, payload);

          void action.then(() => {
            setEditing(null);
            setMessage(editing?.id ? "Integration updated." : "Integration created.");
            void refresh();
          });
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete Integration"
        message={`Delete ${deleting?.name}?`}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          auth && deleting
            ? api.deleteIntegration(auth.token, deleting.id).then(() => {
                setDeleting(null);
                setMessage("Integration deleted.");
                void refresh();
              })
            : undefined
        }
        confirmLabel="Delete"
      />
    </div>
  );
}
