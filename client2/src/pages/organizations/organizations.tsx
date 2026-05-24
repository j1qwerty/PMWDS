import { api } from "../../shared/api";
import { ResourcePage } from "../../shared/resourcePage";
import type { Organization } from "../../shared/types";

const demo: Organization[] = [
  { id: "org-1", name: "North Grid Authority", contactEmail: "ops@northgrid.local", departmentCount: 2 },
  { id: "org-2", name: "Metro Delivery Unit", contactEmail: "delivery@metro.local", departmentCount: 2 },
];

export function OrganizationsPage() {
  return (
    <ResourcePage
      config={{
        eyebrow: "Structure",
        title: "Organizations",
        description: "Create and update organization records from the Organizations API.",
        load: api.getOrganizations,
        create: api.createOrganization,
        update: api.updateOrganization,
        demo,
        searchKeys: ["name", "contactEmail"],
        columns: [
          { key: "name", label: "Organization" },
          { key: "contactEmail", label: "Contact" },
          { key: "departmentCount", label: "Departments" },
        ],
        form: [
          { key: "name", label: "Name", required: true },
          { key: "contactEmail", label: "Contact email" },
          { key: "contactPhone", label: "Contact phone" },
          { key: "address", label: "Address", type: "textarea" },
          { key: "taxId", label: "Tax ID" },
        ],
      }}
    />
  );
}
