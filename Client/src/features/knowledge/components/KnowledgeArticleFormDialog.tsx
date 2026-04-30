import { useEffect, useState } from "react";
import { Dialog } from "../../../components/common/Dialog";
import { parseLineList, stringifyLineList } from "../../admin/shared/serializers";
import type { KnowledgeArticleRecord, Project } from "../../../types";

type KnowledgeArticleFormDialogProps = {
  open: boolean;
  article?: KnowledgeArticleRecord;
  projects: Project[];
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
};

function createState(article: KnowledgeArticleRecord | undefined, projects: Project[]) {
  return {
    projectId: article?.projectId ?? projects[0]?.id ?? "",
    title: article?.title ?? "",
    content: article?.content ?? "",
    category: article?.category ?? "",
    tags: stringifyLineList(article?.tags),
    relevanceScore: article?.relevanceScore ?? 0.5,
  };
}

export function KnowledgeArticleFormDialog({
  open,
  article,
  projects,
  onClose,
  onSubmit,
}: KnowledgeArticleFormDialogProps) {
  const [form, setForm] = useState(createState(article, projects));

  useEffect(() => {
    setForm(createState(article, projects));
  }, [article, projects, open]);

  return (
    <Dialog open={open} title={article ? "Edit Article" : "Create Article"} onClose={onClose}>
      <div className="grid gap-4">
        <div className="grid grid-cols-1 gap-4">
          <label>
            <span>Project</span>
            <select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })}>
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Title</span>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <label>
            <span>Category</span>
            <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
          </label>
          <label>
            <span>Relevance Score</span>
            <input type="number" min="0" max="1" step="0.1" value={form.relevanceScore} onChange={(event) => setForm({ ...form, relevanceScore: Number(event.target.value) })} />
          </label>
          <label>
            <span>Tags</span>
            <textarea rows={4} value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} />
          </label>
          <label>
            <span>Content</span>
            <textarea rows={8} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={onClose}>Cancel</button>
          <button
            className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() =>
              onSubmit({
                projectId: form.projectId || null,
                title: form.title,
                content: form.content,
                category: form.category,
                tags: parseLineList(form.tags),
                relevanceScore: form.relevanceScore,
              })
            }
          >
            Save
          </button>
        </div>
      </div>
    </Dialog>
  );
}
