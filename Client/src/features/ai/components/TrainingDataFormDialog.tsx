import { useState } from "react";
import { Dialog } from "../../../components/common/Dialog";
import { parseJsonMap } from "../../admin/shared/serializers";

type TrainingDataFormDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
};

export function TrainingDataFormDialog({
  open,
  onClose,
  onSubmit,
}: TrainingDataFormDialogProps) {
  const [form, setForm] = useState({
    dataType: "",
    features: "{}",
    labels: "{}",
    source: "",
  });

  return (
    <Dialog open={open} title="Add Training Data" onClose={onClose}>
      <div className="grid gap-4">
        <div className="grid grid-cols-1 gap-4">
          <label>
            <span>Data Type</span>
            <input value={form.dataType} onChange={(event) => setForm({ ...form, dataType: event.target.value })} />
          </label>
          <label>
            <span>Source</span>
            <input value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} />
          </label>
          <label>
            <span>Features JSON</span>
            <textarea rows={6} value={form.features} onChange={(event) => setForm({ ...form, features: event.target.value })} />
          </label>
          <label>
            <span>Labels JSON</span>
            <textarea rows={6} value={form.labels} onChange={(event) => setForm({ ...form, labels: event.target.value })} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={onClose}>Cancel</button>
          <button
            className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() =>
              onSubmit({
                dataType: form.dataType,
                features: parseJsonMap(form.features),
                labels: parseJsonMap(form.labels),
                source: form.source,
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
