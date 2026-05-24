import { api } from "../../shared/api";
import { ResourcePage } from "../../shared/resourcePage";
import type { DashboardRecord } from "../../shared/types";

const demo: DashboardRecord[] = [
  { id: "db-1", userId: "u-admin", name: "Executive Overview", layoutType: "Grid", isDefault: true, lastAccessed: "2026-05-24T08:00:00Z" },
  { id: "db-2", userId: "u-1", name: "Delivery Board", layoutType: "Kanban", isDefault: false, lastAccessed: "2026-05-23T08:00:00Z" },
];

export function DashboardsPage() {
  return (
    <ResourcePage
      config={{
        eyebrow: "System",
        title: "Dashboards",
        description: "Saved dashboards and widget layout records.",
        load: api.getDashboards,
        create: api.createDashboard,
        demo,
        searchKeys: ["name", "layoutType", "userId"],
        columns: [
          { key: "name", label: "Dashboard" },
          { key: "layoutType", label: "Layout" },
          { key: "isDefault", label: "Default" },
          { key: "lastAccessed", label: "Last accessed" },
        ],
        form: [
          { key: "name", label: "Name", required: true },
          { key: "layoutType", label: "Layout type", type: "select", options: ["Grid", "Kanban", "Compact", "Executive"] },
          { key: "isDefault", label: "Default", type: "checkbox" },
          { key: "userId", label: "User ID" },
        ],
      }}
    />
  );
}
