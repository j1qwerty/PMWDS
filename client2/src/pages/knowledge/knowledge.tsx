import { api } from "../../shared/api";
import { ResourcePage } from "../../shared/resourcePage";
import type { KnowledgeArticle } from "../../shared/types";

const demo: KnowledgeArticle[] = [
  { id: "ka-1", title: "Gateway rollback checklist", content: "Steps for restoring gateway stability.", category: "Operations", viewCount: 12, relevanceScore: 0.91 },
  { id: "ka-2", title: "UI compact hierarchy notes", content: "Guidance for project workspace expansion patterns.", category: "Design", viewCount: 7, relevanceScore: 0.83 },
];

export function KnowledgePage() {
  return (
    <ResourcePage
      config={{
        eyebrow: "Knowledge",
        title: "Knowledge",
        description: "Knowledge articles and lessons learned from project execution.",
        load: api.getKnowledgeArticles,
        create: api.createKnowledgeArticle,
        demo,
        searchKeys: ["title", "content", "category"],
        columns: [
          { key: "title", label: "Title" },
          { key: "category", label: "Category" },
          { key: "viewCount", label: "Views" },
          { key: "relevanceScore", label: "Relevance" },
        ],
        form: [
          { key: "title", label: "Title", required: true },
          { key: "category", label: "Category" },
          { key: "projectId", label: "Project ID" },
          { key: "content", label: "Content", type: "textarea" },
        ],
      }}
    />
  );
}
