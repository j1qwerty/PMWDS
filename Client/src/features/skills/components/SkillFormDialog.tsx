import { useEffect, useState } from "react";
import { Dialog } from "../../../components/common/Dialog";
import type { SkillRecord } from "../../../types";

type SkillFormDialogProps = {
  open: boolean;
  skill?: SkillRecord;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
};

function createState(skill?: SkillRecord) {
  return {
    name: skill?.name ?? "",
    category: skill?.category ?? "",
    description: skill?.description ?? "",
  };
}

export function SkillFormDialog({
  open,
  skill,
  onClose,
  onSubmit,
}: SkillFormDialogProps) {
  const [form, setForm] = useState(createState(skill));

  useEffect(() => {
    setForm(createState(skill));
  }, [skill, open]);

  return (
    <Dialog open={open} title={skill ? "Edit Skill" : "Create Skill"} onClose={onClose}>
      <div className="grid gap-4">
        <div className="grid grid-cols-1 gap-4">
          <label>
            <span>Name</span>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            <span>Category</span>
            <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
          </label>
          <label>
            <span>Description</span>
            <textarea rows={5} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={onClose}>Cancel</button>
          <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => onSubmit(form)}>Save</button>
        </div>
      </div>
    </Dialog>
  );
}
