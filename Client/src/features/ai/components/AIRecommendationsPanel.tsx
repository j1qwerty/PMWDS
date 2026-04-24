import { Panel } from "../../../ui";
import type { AllocationRecommendationRecord, AssigneeRecommendation, Task, TaskAnalysisRecord } from "../../../types";

type AIRecommendationsPanelProps = {
  tasks: Task[];
  selectedTaskId: string;
  recommendation: AssigneeRecommendation | null;
  generated: AllocationRecommendationRecord | null;
  history: AllocationRecommendationRecord[];
  analysis: TaskAnalysisRecord | null;
  rejectionReason: string;
  explanation: string;
  onTaskChange: (value: string) => void;
  onGenerate: () => void;
  onRefreshRecommendation: () => void;
  onAnalyzeTask: () => void;
  onAccept: (recommendationId: string) => void;
  onReject: (recommendationId: string) => void;
  onExplain: (recommendationId: string) => void;
  onRejectionReasonChange: (value: string) => void;
};

export function AIRecommendationsPanel(props: AIRecommendationsPanelProps) {
  return (
    <Panel title="Task Allocation AI" subtitle="Generate assignee recommendations, inspect history, and review task analysis">
      <div className="form-grid wide">
        <label>
          <span>Task</span>
          <select value={props.selectedTaskId} onChange={(event) => props.onTaskChange(event.target.value)}>
            {props.tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
          </select>
        </label>
      </div>
      <div className="inline-actions">
        <button className="primary-button" onClick={props.onRefreshRecommendation}>Get Optimal Assignee</button>
        <button className="ghost-button" onClick={props.onGenerate}>Generate Recommendation</button>
        <button className="ghost-button" onClick={props.onAnalyzeTask}>Analyze Task</button>
      </div>
      {props.recommendation ? <p className="dialog-copy">Recommended: {props.recommendation.recommendedUserName} with {Math.round(props.recommendation.confidenceScore * 100)}% confidence.</p> : null}
      {props.analysis ? <p className="dialog-copy">{props.analysis.summary}</p> : null}
      <div className="form-grid wide">
        <label>
          <span>Reject Reason</span>
          <input value={props.rejectionReason} onChange={(event) => props.onRejectionReasonChange(event.target.value)} />
        </label>
      </div>
      <div className="list-column">
        {props.history.map((item) => (
          <div className="list-card" key={item.id}>
            <strong>{item.recommendedUserId}</strong>
            <span>{item.status}</span>
            <small>Match {Math.round(item.matchScore * 100)}%</small>
            <div className="inline-actions">
              <button className="ghost-button" onClick={() => props.onAccept(item.id)}>Accept</button>
              <button className="ghost-button" onClick={() => props.onReject(item.id)}>Reject</button>
              <button className="ghost-button" onClick={() => props.onExplain(item.id)}>Explain</button>
            </div>
          </div>
        ))}
      </div>
      {props.generated ? <p className="dialog-copy">Latest generated recommendation: {props.generated.id}</p> : null}
      {props.explanation ? <p className="dialog-copy">{props.explanation}</p> : null}
    </Panel>
  );
}
