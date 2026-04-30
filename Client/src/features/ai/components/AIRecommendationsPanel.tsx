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
      <div className="grid grid-cols-1 gap-4">
        <label>
          <span>Task</span>
          <select value={props.selectedTaskId} onChange={(event) => props.onTaskChange(event.target.value)}>
            {props.tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={props.onRefreshRecommendation}>Get Optimal Assignee</button>
        <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={props.onGenerate}>Generate Recommendation</button>
        <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={props.onAnalyzeTask}>Analyze Task</button>
      </div>
      {props.recommendation ? <p className="text-sm text-slate-300">Recommended: {props.recommendation.recommendedUserName} with {Math.round(props.recommendation.confidenceScore * 100)}% confidence.</p> : null}
      {props.analysis ? <p className="text-sm text-slate-300">{props.analysis.summary}</p> : null}
      <div className="grid grid-cols-1 gap-4">
        <label>
          <span>Reject Reason</span>
          <input value={props.rejectionReason} onChange={(event) => props.onRejectionReasonChange(event.target.value)} />
        </label>
      </div>
      <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
        {props.history.map((item) => (
          <div className="rounded-md border border-[var(--pmwds-border)] bg-white/[0.035] px-4 py-3 text-left transition hover:border-sky-300/50 hover:bg-white/[0.06]" key={item.id}>
            <strong>{item.recommendedUserId}</strong>
            <span>{item.status}</span>
            <small>Match {Math.round(item.matchScore * 100)}%</small>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => props.onAccept(item.id)}>Accept</button>
              <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => props.onReject(item.id)}>Reject</button>
              <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => props.onExplain(item.id)}>Explain</button>
            </div>
          </div>
        ))}
      </div>
      {props.generated ? <p className="text-sm text-slate-300">Latest generated recommendation: {props.generated.id}</p> : null}
      {props.explanation ? <p className="text-sm text-slate-300">{props.explanation}</p> : null}
    </Panel>
  );
}
