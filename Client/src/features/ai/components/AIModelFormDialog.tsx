import { useEffect, useState } from "react";
import { Dialog } from "../../../components/common/Dialog";
import { parseJsonMap, parseLineList, stringifyJsonMap, stringifyLineList } from "../../admin/shared/serializers";
import type { AIModelRecord } from "../../../types";

type AIModelFormDialogProps = {
  open: boolean;
  model?: AIModelRecord;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
};

function createState(model?: AIModelRecord) {
  return {
    name: model?.name ?? "",
    version: model?.version ?? "",
    modelType: model?.modelType ?? "",
    modelPath: model?.modelPath ?? "",
    hyperparameters: stringifyJsonMap(model?.hyperparameters),
    features: stringifyLineList(model?.features),
    accuracyScore: model?.accuracyScore ?? 0,
    precisionScore: model?.precisionScore ?? 0,
    recallScore: model?.recallScore ?? 0,
  };
}

export function AIModelFormDialog({
  open,
  model,
  onClose,
  onSubmit,
}: AIModelFormDialogProps) {
  const [form, setForm] = useState(createState(model));

  useEffect(() => {
    setForm(createState(model));
  }, [model, open]);

  return (
    <Dialog open={open} title={model ? "Edit AI Model" : "Create AI Model"} onClose={onClose}>
      <div className="grid gap-4">
        <div className="grid grid-cols-1 gap-4">
          <label>
            <span>Name</span>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            <span>Version</span>
            <input value={form.version} onChange={(event) => setForm({ ...form, version: event.target.value })} />
          </label>
          <label>
            <span>Model Type</span>
            <input value={form.modelType} onChange={(event) => setForm({ ...form, modelType: event.target.value })} />
          </label>
          <label>
            <span>Model Path</span>
            <input value={form.modelPath} onChange={(event) => setForm({ ...form, modelPath: event.target.value })} />
          </label>
          <label>
            <span>Features</span>
            <textarea rows={4} value={form.features} onChange={(event) => setForm({ ...form, features: event.target.value })} />
          </label>
          <label>
            <span>Hyperparameters JSON</span>
            <textarea rows={6} value={form.hyperparameters} onChange={(event) => setForm({ ...form, hyperparameters: event.target.value })} />
          </label>
          <label>
            <span>Accuracy</span>
            <input type="number" step="0.01" value={form.accuracyScore} onChange={(event) => setForm({ ...form, accuracyScore: Number(event.target.value) })} />
          </label>
          <label>
            <span>Precision</span>
            <input type="number" step="0.01" value={form.precisionScore} onChange={(event) => setForm({ ...form, precisionScore: Number(event.target.value) })} />
          </label>
          <label>
            <span>Recall</span>
            <input type="number" step="0.01" value={form.recallScore} onChange={(event) => setForm({ ...form, recallScore: Number(event.target.value) })} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={onClose}>Cancel</button>
          <button
            className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() =>
              onSubmit({
                name: form.name,
                version: form.version,
                modelType: form.modelType,
                modelPath: form.modelPath || null,
                hyperparameters: parseJsonMap(form.hyperparameters) as Record<string, number>,
                features: parseLineList(form.features),
                accuracyScore: form.accuracyScore,
                precisionScore: form.precisionScore,
                recallScore: form.recallScore,
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
