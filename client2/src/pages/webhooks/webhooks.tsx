import { api } from "../../shared/api";
import { ResourcePage } from "../../shared/resourcePage";
import type { Webhook } from "../../shared/types";

const demo: Webhook[] = [
  { id: "wh-1", integrationId: "int-1", eventType: "TaskUpdated", callbackUrl: "https://hooks.example.local/task", isActive: true },
  { id: "wh-2", integrationId: "int-2", eventType: "ProjectDelayed", callbackUrl: "https://hooks.example.local/project", isActive: false },
];

export function WebhooksPage() {
  return (
    <ResourcePage
      config={{
        eyebrow: "System",
        title: "Webhooks",
        description: "Webhook callback records and event routing.",
        load: api.getWebhooks,
        create: api.createWebhook,
        update: api.updateWebhook,
        demo,
        searchKeys: ["eventType", "callbackUrl", "integrationId"],
        columns: [
          { key: "eventType", label: "Event" },
          { key: "callbackUrl", label: "Callback" },
          { key: "integrationId", label: "Integration" },
          { key: "isActive", label: "Active" },
        ],
        form: [
          { key: "eventType", label: "Event type", required: true },
          { key: "callbackUrl", label: "Callback URL", required: true },
          { key: "integrationId", label: "Integration ID" },
          { key: "isActive", label: "Active", type: "checkbox" },
          { key: "headers", label: "Headers JSON", type: "textarea" },
        ],
      }}
    />
  );
}
