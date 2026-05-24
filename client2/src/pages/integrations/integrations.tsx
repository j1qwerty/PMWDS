import { api } from "../../shared/api";
import { ResourcePage } from "../../shared/resourcePage";
import type { Integration } from "../../shared/types";

const demo: Integration[] = [
  { id: "int-1", integrationType: "Slack", name: "Operations Slack", isEnabled: true, status: "Connected", lastSync: "2026-05-24T08:00:00Z" },
  { id: "int-2", integrationType: "Jira", name: "Delivery Jira", isEnabled: false, status: "Paused" },
];

export function IntegrationsPage() {
  return (
    <ResourcePage
      config={{
        eyebrow: "System",
        title: "Integrations",
        description: "External integrations and synchronization state.",
        load: api.getIntegrations,
        create: api.createIntegration,
        update: api.updateIntegration,
        demo,
        searchKeys: ["name", "integrationType", "status"],
        columns: [
          { key: "name", label: "Integration" },
          { key: "integrationType", label: "Type" },
          { key: "status", label: "Status" },
          { key: "isEnabled", label: "Enabled" },
          { key: "lastSync", label: "Last sync" },
        ],
        form: [
          { key: "name", label: "Name", required: true },
          { key: "integrationType", label: "Type", type: "select", options: ["Slack", "Teams", "Jira", "GitHub", "Webhook"] },
          { key: "status", label: "Status", type: "select", options: ["Connected", "Paused", "Failed", "Pending"] },
          { key: "isEnabled", label: "Enabled", type: "checkbox" },
          { key: "configuration", label: "Configuration JSON", type: "textarea" },
        ],
      }}
    />
  );
}
