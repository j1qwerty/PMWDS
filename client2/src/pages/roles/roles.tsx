import { api } from "../../shared/api";
import { ResourcePage } from "../../shared/resourcePage";
import type { RoleRecord } from "../../shared/types";

const demo: RoleRecord[] = [
  { id: "role-1", name: "SuperAdmin", description: "Full system access", permissionLevel: 100 },
  { id: "role-2", name: "ProjectManager", description: "Manage projects, milestones, and tasks", permissionLevel: 70 },
];

export function RolesPage() {
  return (
    <ResourcePage
      config={{
        eyebrow: "Access",
        title: "Roles",
        description: "Role records and permission levels through the Roles API.",
        load: api.getRoles,
        create: api.createRole,
        update: api.updateRole,
        demo,
        searchKeys: ["name", "description"],
        columns: [
          { key: "name", label: "Role" },
          { key: "description", label: "Description" },
          { key: "permissionLevel", label: "Level" },
        ],
        form: [
          { key: "name", label: "Name", required: true },
          { key: "description", label: "Description", type: "textarea" },
          { key: "permissionLevel", label: "Permission level", type: "number" },
        ],
      }}
    />
  );
}
