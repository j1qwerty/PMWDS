import { api } from "../../shared/api";
import { ResourcePage } from "../../shared/resourcePage";
import type { SkillRecord } from "../../shared/types";

const demo: SkillRecord[] = [
  { id: "sk-1", name: "React", category: "Frontend", description: "Modern React app delivery", userCount: 4 },
  { id: "sk-2", name: "Incident Response", category: "Operations", description: "Production recovery workflow", userCount: 3 },
];

export function SkillsPage() {
  return (
    <ResourcePage
      config={{
        eyebrow: "Team",
        title: "Skills",
        description: "Skill catalog scoped by organization and assigned to users.",
        load: api.getSkills,
        create: api.createSkill,
        update: api.updateSkill,
        demo,
        searchKeys: ["name", "category", "description"],
        columns: [
          { key: "name", label: "Skill" },
          { key: "category", label: "Category" },
          { key: "userCount", label: "Users" },
          { key: "organizationId", label: "Organization" },
        ],
        form: [
          { key: "name", label: "Name", required: true },
          { key: "category", label: "Category" },
          { key: "description", label: "Description", type: "textarea" },
          { key: "organizationId", label: "Organization ID" },
        ],
      }}
    />
  );
}
