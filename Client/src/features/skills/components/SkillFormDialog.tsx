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
      <div className="dialog-stack">
        <div className="form-grid wide">
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
        <div className="inline-actions">
          <button className="ghost-button" onClick={onClose}>Cancel</button>
          <button className="primary-button" onClick={() => onSubmit(form)}>Save</button>
        </div>
      </div>
    </Dialog>
  );
}
