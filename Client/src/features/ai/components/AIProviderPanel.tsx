import { Panel } from "../../../ui";
import type {
  AIModel,
  AIProvider,
  AIProviderTestResult,
  BurnoutRiskRecord,
  ChatResponse,
  Project,
  ProjectHealth,
  ResourceOptimizationRecord,
} from "../../../types";

type AIProviderPanelProps = {
  providers: AIProvider[];
  provider: string;
  models: AIModel[];
  selectedModel: string;
  modelSearch: string;
  projects: Project[];
  selectedProjectId: string;
  projectHealth: ProjectHealth | null;
  projectInsights: string[];
  resourcePlan: ResourceOptimizationRecord | null;
  chatPrompt: string;
  chatResult: ChatResponse | null;
  testResult: AIProviderTestResult | null;
  burnout: BurnoutRiskRecord[];
  onProviderChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onModelSearchChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onOptimizeResources: () => void;
  onChatPromptChange: (value: string) => void;
  onTestProvider: () => void;
  onRunChat: () => void;
};

export function AIProviderPanel(props: AIProviderPanelProps) {
  return (
    <Panel title="Provider Workbench" subtitle="Search providers, test models, inspect health, and run AI chat prompts">
      <div className="split">
        <div className="list-column">
          {props.providers.map((item) => (
            <button key={item.provider} className={`list-card ${props.provider === item.provider ? "selected-card" : ""}`} onClick={() => props.onProviderChange(item.provider)}>
              <strong>{item.displayName}</strong>
              <span>{item.defaultModel}</span>
              <small>{item.isConfigured ? "Configured" : "Not configured"}</small>
            </button>
          ))}
        </div>
        <div className="detail-card">
          <div className="form-grid wide">
            <label>
              <span>Model Search</span>
              <input value={props.modelSearch} onChange={(event) => props.onModelSearchChange(event.target.value)} />
            </label>
            <label>
              <span>Model</span>
              <select value={props.selectedModel} onChange={(event) => props.onModelChange(event.target.value)}>
                {props.models.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          </div>
          <div className="inline-actions">
            <button className="primary-button" onClick={props.onTestProvider}>Test Provider</button>
          </div>
          {props.testResult ? <p className="dialog-copy">{props.testResult.message}</p> : null}
          <div className="form-grid wide" style={{ marginTop: "1rem" }}>
            <label>
              <span>Project</span>
              <select value={props.selectedProjectId} onChange={(event) => props.onProjectChange(event.target.value)}>
                {props.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
          </div>
          {props.projectHealth ? (
            <div className="badge-row">
              {["overallHealthScore", "scheduleHealth", "budgetHealth", "teamHealth"].map((key) => (
                <span className="signal-chip" key={key}>
                  {key.replace("Health", "")}: {Math.round(Number(props.projectHealth?.[key as keyof ProjectHealth] ?? 0))}%
                </span>
              ))}
            </div>
          ) : null}
          {props.projectInsights.length ? (
            <div className="badge-row" style={{ marginTop: "0.75rem" }}>
              {props.projectInsights.map((item) => <span className="signal-chip" key={item}>{item}</span>)}
            </div>
          ) : null}
          <div className="inline-actions" style={{ marginTop: "0.75rem" }}>
            <button className="ghost-button" onClick={props.onOptimizeResources}>Optimize Resources</button>
          </div>
          {props.resourcePlan ? <p className="dialog-copy">Expected efficiency gain: {Math.round(props.resourcePlan.expectedEfficiencyGain * 100)}% across {props.resourcePlan.tasksAtRisk} tasks at risk.</p> : null}
          <div className="form-grid wide" style={{ marginTop: "1rem" }}>
            <label>
              <span>Chat Prompt</span>
              <textarea rows={4} value={props.chatPrompt} onChange={(event) => props.onChatPromptChange(event.target.value)} />
            </label>
          </div>
          <div className="inline-actions">
            <button className="primary-button" onClick={props.onRunChat}>Run Prompt</button>
          </div>
          {props.chatResult ? <p className="dialog-copy">{props.chatResult.message}</p> : null}
          <div className="list-column" style={{ marginTop: "1rem" }}>
            {props.burnout.slice(0, 5).map((item) => (
              <div className="list-card" key={item.userId}>
                <strong>{item.fullName}</strong>
                <span>{item.riskLevel}</span>
                <small>Burnout {Math.round(item.burnoutRisk * 100)}% · Load {Math.round(item.workloadScore)}%</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}
