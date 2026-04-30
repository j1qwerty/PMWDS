import { useState } from "react";
import { classNames, detailCardClass, ghostButtonClass, inputClass, labelClass, listCardClass, listColumnClass, Panel, primaryButtonClass, selectedCardClass } from "../../../ui";
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
  const [expanded, setExpanded] = useState(false);
  const selectedProvider = props.providers.find((item) => item.provider === props.provider);

  return (
    <Panel title="Provider Workbench" subtitle="Search providers, test models, inspect health, and run AI chat prompts">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4>{selectedProvider?.displayName ?? props.provider}</h4>
          <p className="text-sm text-slate-300">
            {selectedProvider?.isConfigured ? "Configured" : "Not configured"} / {props.selectedModel || selectedProvider?.defaultModel || "No model selected"}
          </p>
        </div>
        <button className={ghostButtonClass} onClick={() => setExpanded((current) => !current)}>
          {expanded ? "Collapse" : "Configure"}
        </button>
      </div>
      {!expanded ? null : (
      <div className="grid gap-5 lg:grid-cols-2">
        <div className={listColumnClass}>
          {props.providers.map((item) => (
            <button key={item.provider} className={classNames(listCardClass, props.provider === item.provider && selectedCardClass)} onClick={() => props.onProviderChange(item.provider)}>
              <strong>{item.displayName}</strong>
              <span>{item.defaultModel}</span>
              <small>{item.isConfigured ? "Configured" : "Not configured"}</small>
            </button>
          ))}
        </div>
        <div className={detailCardClass}>
          <div className="grid grid-cols-1 gap-4">
            <label className={labelClass}>
              <span>Model Search</span>
              <input className={inputClass} value={props.modelSearch} onChange={(event) => props.onModelSearchChange(event.target.value)} />
            </label>
            <label className={labelClass}>
              <span>Model</span>
              <select className={inputClass} value={props.selectedModel} onChange={(event) => props.onModelChange(event.target.value)}>
                {props.models.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={primaryButtonClass} onClick={props.onTestProvider}>Test Provider</button>
          </div>
          {props.testResult ? <p className="text-sm text-slate-300">{props.testResult.message}</p> : null}
          <div className="grid grid-cols-1 gap-4" style={{ marginTop: "1rem" }}>
            <label className={labelClass}>
              <span>Project</span>
              <select className={inputClass} value={props.selectedProjectId} onChange={(event) => props.onProjectChange(event.target.value)}>
                {props.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
          </div>
          {props.projectHealth ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {["overallHealthScore", "scheduleHealth", "budgetHealth", "teamHealth"].map((key) => (
                <span className="inline-flex rounded-full bg-sky-300/10 px-2.5 py-1 text-xs font-medium text-sky-200 ring-1 ring-sky-300/15" key={key}>
                  {key.replace("Health", "")}: {Math.round(Number(props.projectHealth?.[key as keyof ProjectHealth] ?? 0))}%
                </span>
              ))}
            </div>
          ) : null}
          {props.projectInsights.length ? (
            <div className="mt-2 flex flex-wrap gap-2" style={{ marginTop: "0.75rem" }}>
              {props.projectInsights.map((item) => <span className="inline-flex rounded-full bg-sky-300/10 px-2.5 py-1 text-xs font-medium text-sky-200 ring-1 ring-sky-300/15" key={item}>{item}</span>)}
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2" style={{ marginTop: "0.75rem" }}>
            <button className={ghostButtonClass} onClick={props.onOptimizeResources}>Optimize Resources</button>
          </div>
          {props.resourcePlan ? <p className="text-sm text-slate-300">Expected efficiency gain: {Math.round(props.resourcePlan.expectedEfficiencyGain * 100)}% across {props.resourcePlan.tasksAtRisk} tasks at risk.</p> : null}
          <div className="grid grid-cols-1 gap-4" style={{ marginTop: "1rem" }}>
            <label className={labelClass}>
              <span>Chat Prompt</span>
              <textarea className={inputClass} rows={4} value={props.chatPrompt} onChange={(event) => props.onChatPromptChange(event.target.value)} />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={primaryButtonClass} onClick={props.onRunChat}>Run Prompt</button>
          </div>
          {props.chatResult ? <p className="text-sm text-slate-300">{props.chatResult.message}</p> : null}
          <div className={classNames(listColumnClass, "mt-4")}>
            {props.burnout.slice(0, 5).map((item) => (
              <div className={listCardClass} key={item.userId}>
                <strong>{item.fullName}</strong>
                <span>{item.riskLevel}</span>
                <small>Burnout {Math.round(item.burnoutRisk * 100)}% / Load {Math.round(item.workloadScore)}%</small>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}
    </Panel>
  );
}
