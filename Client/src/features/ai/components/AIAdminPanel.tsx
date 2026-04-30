import { Panel } from "../../../ui";
import type { AIModelRecord, TrainingDataPointRecord } from "../../../types";

type AIAdminPanelProps = {
  models: AIModelRecord[];
  trainingData: TrainingDataPointRecord[];
  performance: Record<string, number>;
  onCreateModel: () => void;
  onEditModel: (model: AIModelRecord) => void;
  onDeleteModel: (model: AIModelRecord) => void;
  onAddTrainingData: () => void;
  onTrainModels: () => void;
};

export function AIAdminPanel(props: AIAdminPanelProps) {
  return (
    <Panel title="AI Admin" subtitle="Manage persisted models, training datasets, and aggregate model performance">
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={props.onCreateModel}>Create Model</button>
        <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={props.onAddTrainingData}>Add Training Data</button>
        <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={props.onTrainModels}>Trigger Training</button>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
          {props.models.map((model) => (
            <div className="rounded-md border border-[var(--pmwds-border)] bg-white/[0.035] px-4 py-3 text-left transition hover:border-sky-300/50 hover:bg-white/[0.06]" key={model.id}>
              <strong>{model.name}</strong>
              <span>{model.modelType}</span>
              <small>{model.version} · {model.predictionCount} predictions</small>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => props.onEditModel(model)}>Edit</button>
                <button className="rounded-md border border-rose-300/40 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-400/20" onClick={() => props.onDeleteModel(model)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
          {props.trainingData.slice(0, 8).map((item) => (
            <div className="rounded-md border border-[var(--pmwds-border)] bg-white/[0.035] px-4 py-3 text-left transition hover:border-sky-300/50 hover:bg-white/[0.06]" key={item.id}>
              <strong>{item.dataType}</strong>
              <span>{item.source}</span>
              <small>{new Date(item.createdDate).toLocaleString()}</small>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2" style={{ marginTop: "1rem" }}>
        {Object.entries(props.performance).map(([key, value]) => (
          <span className="inline-flex rounded-full bg-sky-300/10 px-2.5 py-1 text-xs font-medium text-sky-200 ring-1 ring-sky-300/15" key={key}>{key}: {Math.round(value * 100) / 100}</span>
        ))}
      </div>
    </Panel>
  );
}
