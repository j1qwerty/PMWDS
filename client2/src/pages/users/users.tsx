import { api } from "../../shared/api";
import { ResourcePage } from "../../shared/resourcePage";
import type { User } from "../../shared/types";

const demoUsers: User[] = [
  { id: "u-1", fullName: "Asha Kapoor", email: "asha@pmwds.local", jobTitle: "Project Manager", department: "Platform", roles: ["ProjectManager"], availabilityStatus: "Available", availabilityPercentage: 80 },
  { id: "u-2", fullName: "Mira Joshi", email: "mira@pmwds.local", jobTitle: "Department Head", department: "Operations", roles: ["DepartmentHead"], availabilityStatus: "Busy", availabilityPercentage: 45 },
  { id: "u-3", fullName: "Sara Rao", email: "sara@pmwds.local", jobTitle: "Designer", department: "Design Systems", roles: ["TeamMember"], availabilityStatus: "Available", availabilityPercentage: 70 },
];

export function UsersPage() {
  return (
    <ResourcePage
      config={{
        eyebrow: "Team",
        title: "Users",
        description: "Manage users, availability, departments, and role assignments through the Users API.",
        load: api.getUsers,
        create: api.registerUser,
        update: api.updateUser,
        demo: demoUsers,
        searchKeys: ["fullName", "email", "department", "jobTitle"],
        columns: [
          { key: "fullName", label: "Name" },
          { key: "email", label: "Email" },
          { key: "jobTitle", label: "Title" },
          { key: "department", label: "Department" },
          { key: "availabilityStatus", label: "Availability" },
        ],
        form: [
          { key: "fullName", label: "Full name", required: true },
          { key: "email", label: "Email", required: true },
          { key: "jobTitle", label: "Job title" },
          { key: "departmentId", label: "Department ID" },
          { key: "availabilityStatus", label: "Availability", type: "select", options: ["Available", "Busy", "Unavailable"] },
          { key: "availabilityPercentage", label: "Availability percentage", type: "number" },
        ],
      }}
    />
  );
}
