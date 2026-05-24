import { api } from "../../shared/api";
import { ResourcePage } from "../../shared/resourcePage";
import type { GenericRecord } from "../../shared/types";

const demo: GenericRecord[] = [
  { id: "perm-1", code: "projects.manage", name: "Manage Projects", module: "Projects", isGlobal: false },
  { id: "perm-2", code: "settings.manage", name: "Manage Settings", module: "System", isGlobal: true },
];

export function PermissionsPage() {
  return (
    <ResourcePage
      config={{
        eyebrow: "Access",
        title: "Permissions",
        description: "Permission codes and modules used by roles.",
        load: api.getPermissions,
        create: api.createPermission,
        update: api.updatePermission,
        demo,
        searchKeys: ["code", "name", "module"],
        columns: [
          { key: "code", label: "Code" },
          { key: "name", label: "Name" },
          { key: "module", label: "Module" },
          { key: "isGlobal", label: "Global" },
        ],
        form: [
          { key: "code", label: "Code", required: true },
          { key: "name", label: "Name", required: true },
          { key: "module", label: "Module" },
          { key: "description", label: "Description", type: "textarea" },
          { key: "isGlobal", label: "Global", type: "checkbox" },
        ],
      }}
    />
  );
}
