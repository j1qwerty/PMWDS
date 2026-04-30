import { useState } from "react";
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
        <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setExpanded((current) => !current)}>
          {expanded ? "Collapse" : "Configure"}
        </button>
      </div>
      {!expanded ? null : (
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
          {props.providers.map((item) => (
            <button key={item.provider} className={`rounded-md border border-[var(--pmwds-border)] bg-white/[0.035] px-4 py-3 text-left transition hover:border-sky-300/50 hover:bg-white/[0.06] ${props.provider === item.provider ? "selected-card" : ""}`} onClick={() => props.onProviderChange(item.provider)}>
              <strong>{item.displayName}</strong>
              <span>{item.defaultModel}</span>
              <small>{item.isConfigured ? "Configured" : "Not configured"}</small>
            </button>
          ))}
        </div>
        <div className="rounded-lg border border-[var(--pmwds-border)] bg-[var(--pmwds-surface-2)]/86 p-5 shadow-xl shadow-black/15">
          <div className="grid grid-cols-1 gap-4">
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
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={props.onTestProvider}>Test Provider</button>
          </div>
          {props.testResult ? <p className="text-sm text-slate-300">{props.testResult.message}</p> : null}
          <div className="grid grid-cols-1 gap-4" style={{ marginTop: "1rem" }}>
            <label>
              <span>Project</span>
              <select value={props.selectedProjectId} onChange={(event) => props.onProjectChange(event.target.value)}>
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
            <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={props.onOptimizeResources}>Optimize Resources</button>
          </div>
          {props.resourcePlan ? <p className="text-sm text-slate-300">Expected efficiency gain: {Math.round(props.resourcePlan.expectedEfficiencyGain * 100)}% across {props.resourcePlan.tasksAtRisk} tasks at risk.</p> : null}
          <div className="grid grid-cols-1 gap-4" style={{ marginTop: "1rem" }}>
            <label>
              <span>Chat Prompt</span>
              <textarea rows={4} value={props.chatPrompt} onChange={(event) => props.onChatPromptChange(event.target.value)} />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={props.onRunChat}>Run Prompt</button>
          </div>
          {props.chatResult ? <p className="text-sm text-slate-300">{props.chatResult.message}</p> : null}
          <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1" style={{ marginTop: "1rem" }}>
            {props.burnout.slice(0, 5).map((item) => (
              <div className="rounded-md border border-[var(--pmwds-border)] bg-white/[0.035] px-4 py-3 text-left transition hover:border-sky-300/50 hover:bg-white/[0.06]" key={item.userId}>
                <strong>{item.fullName}</strong>
                <span>{item.riskLevel}</span>
                <small>Burnout {Math.round(item.burnoutRisk * 100)}% · Load {Math.round(item.workloadScore)}%</small>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}
    </Panel>
  );
}
