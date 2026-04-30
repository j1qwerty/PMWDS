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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={props.onGenerateTaskPrediction}>Generate Task Prediction</button>
        <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={props.onRefreshHistory}>Refresh History</button>
        <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={props.onLoadProjectPredictions}>Project Predictions</button>
      </div>
      {props.delayPrediction ? <p className="text-sm text-slate-300">Current task risk: {Math.round(props.delayPrediction.delayProbability * 100)}% · {props.delayPrediction.riskLevel}</p> : null}
      {props.generatedPrediction ? <p className="text-sm text-slate-300">Generated prediction expected delay: {props.generatedPrediction.expectedDelayDays} days.</p> : null}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
          {props.predictionHistory.map((item) => (
            <div className="rounded-md border border-[var(--pmwds-border)] bg-white/[0.035] px-4 py-3 text-left transition hover:border-sky-300/50 hover:bg-white/[0.06]" key={item.id}>
              <strong>{item.riskLevel}</strong>
              <span>{Math.round(item.delayProbability * 100)}%</span>
              <small>{new Date(item.createdDate).toLocaleString()}</small>
            </div>
          ))}
        </div>
        <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
          {props.projectPredictions.map((item) => (
            <div className="rounded-md border border-[var(--pmwds-border)] bg-white/[0.035] px-4 py-3 text-left transition hover:border-sky-300/50 hover:bg-white/[0.06]" key={item.id}>
              <strong>{item.taskId}</strong>
              <span>{item.riskLevel}</span>
              <small>{item.expectedDelayDays} day delay</small>
            </div>
          ))}
        </div>
      </div>
      <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1" style={{ marginTop: "1rem" }}>
        {props.predictionResults.slice(0, 5).map((item) => (
          <div className="rounded-md border border-[var(--pmwds-border)] bg-white/[0.035] px-4 py-3 text-left transition hover:border-sky-300/50 hover:bg-white/[0.06]" key={item.id}>
            <strong>{item.recommendation}</strong>
            <span>{Math.round(item.confidenceScore * 100)}%</span>
            <small>{new Date(item.predictionDate).toLocaleString()}</small>
          </div>
        ))}
      </div>
    </Panel>
  );
}
