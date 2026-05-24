import { api } from "../../shared/api";
import { ResourcePage } from "../../shared/resourcePage";
import type { ActivityLog } from "../../shared/types";

const demo: ActivityLog[] = [
  { id: "a-1", userId: "u-1", projectId: "prj-1", activityType: "TaskUpdated", description: "Gateway retry policy progressed to 60%.", timestamp: "2026-05-24T09:00:00Z" },
  { id: "a-2", userId: "u-2", projectId: "prj-2", activityType: "CommentAdded", description: "Rollback approval requested.", timestamp: "2026-05-24T10:00:00Z" },
];

export function ActivityPage() {
  return (
    <ResourcePage
      config={{
        eyebrow: "Audit",
        title: "Activity",
        description: "Activity logs across user, team, and project scopes.",
        load: api.getAllActivityLogs,
        create: api.createActivityLog,
        demo,
        searchKeys: ["activityType", "description", "userId", "projectId"],
        columns: [
          { key: "activityType", label: "Type" },
          { key: "description", label: "Description" },
          { key: "userId", label: "User" },
          { key: "projectId", label: "Project" },
          { key: "timestamp", label: "Time" },
        ],
        form: [
          { key: "activityType", label: "Activity type", required: true },
          { key: "description", label: "Description", type: "textarea", required: true },
          { key: "projectId", label: "Project ID" },
          { key: "metadata", label: "Metadata JSON", type: "textarea" },
        ],
      }}
    />
  );
}
