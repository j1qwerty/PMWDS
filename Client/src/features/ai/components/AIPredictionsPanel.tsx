import { Panel } from "../../../ui";
import type { DelayPrediction, DelayPredictionRecord, PredictionResultRecord, Project, Task } from "../../../types";

type AIPredictionsPanelProps = {
  projects: Project[];
  tasks: Task[];
  selectedProjectId: string;
  selectedTaskId: string;
  delayPrediction: DelayPrediction | null;
  generatedPrediction: DelayPredictionRecord | null;
  predictionHistory: DelayPredictionRecord[];
  projectPredictions: DelayPredictionRecord[];
  predictionResults: PredictionResultRecord[];
  onProjectChange: (value: string) => void;
  onTaskChange: (value: string) => void;
  onGenerateTaskPrediction: () => void;
  onLoadProjectPredictions: () => void;
  onRefreshHistory: () => void;
};

export function AIPredictionsPanel(props: AIPredictionsPanelProps) {
  return (
    <Panel title="Predictive AI" subtitle="Run delay predictions and inspect model outputs across tasks and projects">
      <div className="form-grid">
        <label>
          <span>Project</span>
          <select value={props.selectedProjectId} onChange={(event) => props.onProjectChange(event.target.value)}>
            {props.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </label>
        <label>
          <span>Task</span>
          <select value={props.selectedTaskId} onChange={(event) => props.onTaskChange(event.target.value)}>
            {props.tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
          </select>
        </label>
      </div>
      <div className="inline-actions">
        <button className="primary-button" onClick={props.onGenerateTaskPrediction}>Generate Task Prediction</button>
        <button className="ghost-button" onClick={props.onRefreshHistory}>Refresh History</button>
        <button className="ghost-button" onClick={props.onLoadProjectPredictions}>Project Predictions</button>
      </div>
      {props.delayPrediction ? <p className="dialog-copy">Current task risk: {Math.round(props.delayPrediction.delayProbability * 100)}% · {props.delayPrediction.riskLevel}</p> : null}
      {props.generatedPrediction ? <p className="dialog-copy">Generated prediction expected delay: {props.generatedPrediction.expectedDelayDays} days.</p> : null}
      <div className="split">
        <div className="list-column">
          {props.predictionHistory.map((item) => (
            <div className="list-card" key={item.id}>
              <strong>{item.riskLevel}</strong>
              <span>{Math.round(item.delayProbability * 100)}%</span>
              <small>{new Date(item.createdDate).toLocaleString()}</small>
            </div>
          ))}
        </div>
        <div className="list-column">
          {props.projectPredictions.map((item) => (
            <div className="list-card" key={item.id}>
              <strong>{item.taskId}</strong>
              <span>{item.riskLevel}</span>
              <small>{item.expectedDelayDays} day delay</small>
            </div>
          ))}
        </div>
      </div>
      <div className="list-column" style={{ marginTop: "1rem" }}>
        {props.predictionResults.slice(0, 5).map((item) => (
          <div className="list-card" key={item.id}>
            <strong>{item.recommendation}</strong>
            <span>{Math.round(item.confidenceScore * 100)}%</span>
            <small>{new Date(item.predictionDate).toLocaleString()}</small>
          </div>
        ))}
      </div>
    </Panel>
  );
}
