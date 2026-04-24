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
      <div className="dialog-stack">
        <div className="form-grid wide">
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
        <div className="inline-actions">
          <button className="ghost-button" onClick={onClose}>Cancel</button>
          <button
            className="primary-button"
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
