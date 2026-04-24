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
      <div className="inline-actions">
        <button className="primary-button" onClick={props.onCreateModel}>Create Model</button>
        <button className="ghost-button" onClick={props.onAddTrainingData}>Add Training Data</button>
        <button className="ghost-button" onClick={props.onTrainModels}>Trigger Training</button>
      </div>
      <div className="split">
        <div className="list-column">
          {props.models.map((model) => (
            <div className="list-card" key={model.id}>
              <strong>{model.name}</strong>
              <span>{model.modelType}</span>
              <small>{model.version} · {model.predictionCount} predictions</small>
              <div className="inline-actions">
                <button className="ghost-button" onClick={() => props.onEditModel(model)}>Edit</button>
                <button className="danger-button" onClick={() => props.onDeleteModel(model)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
        <div className="list-column">
          {props.trainingData.slice(0, 8).map((item) => (
            <div className="list-card" key={item.id}>
              <strong>{item.dataType}</strong>
              <span>{item.source}</span>
              <small>{new Date(item.createdDate).toLocaleString()}</small>
            </div>
          ))}
        </div>
      </div>
      <div className="badge-row" style={{ marginTop: "1rem" }}>
        {Object.entries(props.performance).map(([key, value]) => (
          <span className="signal-chip" key={key}>{key}: {Math.round(value * 100) / 100}</span>
        ))}
      </div>
    </Panel>
  );
}
