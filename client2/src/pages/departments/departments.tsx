import { api } from "../../shared/api";
import { ResourcePage } from "../../shared/resourcePage";
import type { Department } from "../../shared/types";

const demo: Department[] = [
  { id: "dept-1", organizationId: "org-1", name: "Platform", code: "PLT", capacityUtilization: 82 },
  { id: "dept-2", organizationId: "org-1", name: "Operations", code: "OPS", capacityUtilization: 74 },
  { id: "dept-3", organizationId: "org-2", name: "Design Systems", code: "DSN", capacityUtilization: 63 },
];

export function DepartmentsPage() {
  return (
    <ResourcePage
      config={{
        eyebrow: "Structure",
        title: "Departments",
        description: "Department records with organization scope and capacity fields.",
        load: api.getDepartments,
        create: api.createDepartment,
        update: api.updateDepartment,
        demo,
        searchKeys: ["name", "code", "organizationId"],
        columns: [
          { key: "name", label: "Department" },
          { key: "code", label: "Code" },
          { key: "organizationId", label: "Organization" },
          { key: "capacityUtilization", label: "Capacity" },
        ],
        form: [
          { key: "name", label: "Name", required: true },
          { key: "code", label: "Code", required: true },
          { key: "organizationId", label: "Organization ID" },
          { key: "description", label: "Description", type: "textarea" },
          { key: "maxCapacity", label: "Max capacity", type: "number" },
        ],
      }}
    />
  );
}
