import { useEffect, useState } from "react";
import { Dialog } from "../../../components/common/Dialog";
import { parseLineList, stringifyLineList } from "../../admin/shared/serializers";
import type { LessonLearnedRecord, Project } from "../../../types";

type LessonFormDialogProps = {
  open: boolean;
  lesson?: LessonLearnedRecord;
  projects: Project[];
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
};

function createState(lesson: LessonLearnedRecord | undefined, projects: Project[]) {
  return {
    projectId: lesson?.projectId ?? projects[0]?.id ?? "",
    title: lesson?.title ?? "",
    description: lesson?.description ?? "",
    category: lesson?.category ?? "",
    impact: lesson?.impact ?? "",
    keywords: stringifyLineList(lesson?.keywords),
  };
}

export function LessonFormDialog({
  open,
  lesson,
  projects,
  onClose,
  onSubmit,
}: LessonFormDialogProps) {
  const [form, setForm] = useState(createState(lesson, projects));

  useEffect(() => {
    setForm(createState(lesson, projects));
  }, [lesson, projects, open]);

  return (
    <Dialog open={open} title={lesson ? "Edit Lesson" : "Create Lesson"} onClose={onClose}>
      <div className="grid gap-4">
        <div className="grid grid-cols-1 gap-4">
          <label>
            <span>Project</span>
            <select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })}>
              <option value="">Select project</option>
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
            <span>Impact</span>
            <input value={form.impact} onChange={(event) => setForm({ ...form, impact: event.target.value })} />
          </label>
          <label>
            <span>Keywords</span>
            <textarea rows={4} value={form.keywords} onChange={(event) => setForm({ ...form, keywords: event.target.value })} />
          </label>
          <label>
            <span>Description</span>
            <textarea rows={7} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={onClose}>Cancel</button>
          <button
            className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() =>
              onSubmit({
                projectId: form.projectId,
                title: form.title,
                description: form.description,
                category: form.category,
                impact: form.impact,
                keywords: parseLineList(form.keywords),
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
