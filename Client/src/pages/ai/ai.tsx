import { useEffect, useState } from "react";
import { useDeferredValue } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { AIModel, AIProvider, BurnoutRiskRecord, Project, ProjectHealth, Task } from "../../types";
import {
  MetricRow,
  MetricTile,
  Panel,
  classNames,
  formatDate,
  formatPercent,
  listCardClass,
  selectedCardClass,
} from "../../ui";

export function AIPage() {
  const { auth } = useAuth();
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [provider, setProvider] = useState("OpenAI");
  const [models, setModels] = useState<AIModel[]>([]);
  const [modelSearch, setModelSearch] = useState("");
  const deferredSearch = useDeferredValue(modelSearch);
  const [selectedModel, setSelectedModel] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [chatPrompt, setChatPrompt] = useState("Summarize the highest operational risk in the current delivery portfolio.");
  const [chatResult, setChatResult] = useState<any>(null);
  const [burnout, setBurnout] = useState<BurnoutRiskRecord[]>([]);
  const [health, setHealth] = useState<ProjectHealth | null>(null);
  const [delay, setDelay] = useState<any>(null);

  useEffect(() => {
    if (!auth) return;
    Promise.all([api.getAiProviders(auth.token), api.getProjects(auth.token), api.getMyTasks(auth.token), api.getAiBurnoutRisk(auth.token)]).then(
      ([providerData, projectData, taskData, burnoutData]) => {
        setProviders(providerData);
        setProjects(projectData);
        setTasks(taskData);
        setBurnout(burnoutData);
        if (providerData[0]) setProvider(providerData[0].provider);
        if (projectData[0]) setSelectedProjectId(projectData[0].id);
        if (taskData[0]) setSelectedTaskId(taskData[0].id);
      },
    );
  }, [auth]);

  useEffect(() => {
    if (!auth || !provider) return;
    api.searchAiModels(auth.token, provider, deferredSearch).then((data) => {
      setModels(data);
      if (data[0]) setSelectedModel(data[0].id);
    });
  }, [auth, provider, deferredSearch]);

  useEffect(() => {
    if (!auth || !selectedProjectId) return;
    api.getAiProjectHealth(auth.token, selectedProjectId).then(setHealth);
  }, [auth, selectedProjectId]);

  useEffect(() => {
    if (!auth || !selectedTaskId) return;
    api.getTaskDelay(auth.token, selectedTaskId).then(setDelay);
  }, [auth, selectedTaskId]);

  return (
    <div className="grid  gap-4 content-start">
      <Panel title="Provider Matrix" subtitle="Discover models, test providers, and steer prompt traffic">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
            {providers.map((item) => (
              <button key={item.provider} className={classNames(listCardClass, provider === item.provider && selectedCardClass)} onClick={() => setProvider(item.provider)}>
                <strong>{item.displayName}</strong>
                <span>{item.defaultModel}</span>
                <small>{item.isConfigured ? "Configured" : "Missing key"}</small>
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-[var(--pmwds-border)] bg-[var(--pmwds-surface-2)]/86 p-5 shadow-xl shadow-black/15">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h4>Model Search</h4><input value={modelSearch} onChange={(event) => setModelSearch(event.target.value)} placeholder="Search models" /></div>
            <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
              {models.map((item) => (
                <button key={item.id} className={classNames(listCardClass, selectedModel === item.id && selectedCardClass)} onClick={() => setSelectedModel(item.id)}>
                  <strong>{item.name}</strong>
                  <span>{item.id}</span>
                  <small>{item.contextLength ? `${item.contextLength.toLocaleString()} ctx` : "Context unknown"}</small>
                </button>
              ))}
            </div>
            <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={async () => { if (!auth) return; setTestResult(await api.testAiProvider(auth.token, provider, selectedModel)); }}>Test Provider</button>
            {testResult ? <div className="rounded-lg border border-[var(--pmwds-border)] bg-[var(--pmwds-surface-2)]/86 p-5 shadow-xl shadow-black/15 nested"><MetricRow label="Provider" value={testResult.provider} /><MetricRow label="Model" value={testResult.model} /><MetricRow label="Result" value={testResult.success ? "Success" : "Failure"} /><p>{testResult.message}</p>{testResult.rawResponse ? <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-black/70 p-3 text-xs text-emerald-300">{testResult.rawResponse}</pre> : null}</div> : null}
          </div>
        </div>
      </Panel>

      <Panel title="AI Assistant" subtitle="Provider-aware chat against current PMWDS context">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="md:col-span-2"><span>Prompt</span><textarea value={chatPrompt} onChange={(event) => setChatPrompt(event.target.value)} /></label>
          <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={async () => { if (!auth) return; setChatResult(await api.chat(auth.token, chatPrompt, provider, selectedModel)); }}>Run Prompt</button>
          {chatResult ? <div className="md:col-span-2 rounded-lg border border-[var(--pmwds-border)] bg-[var(--pmwds-surface-2)]/86 p-5 shadow-xl shadow-black/15"><MetricRow label="Intent" value={chatResult.intent} /><p>{chatResult.message}</p><div className="mt-3 flex flex-wrap gap-2">{(chatResult.suggestedActions ?? []).map((item: string) => (<span className="inline-flex rounded-full bg-sky-300/10 px-2.5 py-1 text-xs font-medium text-sky-200 ring-1 ring-sky-300/15" key={item}>{item}</span>))}</div></div> : null}
        </div>
      </Panel>

      <Panel title="Predictive Signals" subtitle="Project health, burnout pressure, and task delay probability">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-lg border border-[var(--pmwds-border)] bg-[var(--pmwds-surface-2)]/86 p-5 shadow-xl shadow-black/15">
            <label>
              <span>Project</span>
              <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
                {projects.map((project) => (<option key={project.id} value={project.id}>{project.name}</option>))}
              </select>
            </label>
            {health ? <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4"><MetricTile label="Overall" value={formatPercent(health.overallHealthScore)} /><MetricTile label="Schedule" value={formatPercent(health.scheduleHealth)} /><MetricTile label="Budget" value={formatPercent(health.budgetHealth)} /><MetricTile label="Team" value={formatPercent(health.teamHealth)} /></div> : null}
          </div>
          <div className="rounded-lg border border-[var(--pmwds-border)] bg-[var(--pmwds-surface-2)]/86 p-5 shadow-xl shadow-black/15">
            <label>
              <span>Task</span>
              <select value={selectedTaskId} onChange={(event) => setSelectedTaskId(event.target.value)}>
                {tasks.map((task) => (<option key={task.id} value={task.id}>{task.title}</option>))}
              </select>
            </label>
            {delay ? <><MetricRow label="Delay Probability" value={formatPercent(delay.delayProbability * 100)} /><MetricRow label="Risk Level" value={delay.riskLevel} /><MetricRow label="Predicted Completion" value={formatDate(delay.predictedCompletionDate)} /><div className="mt-3 flex flex-wrap gap-2">{(delay.contributingFactors ?? []).map((item: string) => (<span className="inline-flex rounded-full bg-sky-300/10 px-2.5 py-1 text-xs font-medium text-sky-200 ring-1 ring-sky-300/15" key={item}>{item}</span>))}</div></> : null}
          </div>
        </div>
      </Panel>

      <Panel title="Burnout Risk" subtitle="AI-flagged capacity pressure across the team">
        <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
          {burnout.map((item, index) => (
            <div className="rounded-md border border-[var(--pmwds-border)] bg-white/[0.035] px-4 py-3 text-left transition hover:border-sky-300/50 hover:bg-white/[0.06]" key={`${item["userId"]}-${index}`}>
              <strong>{String(item["fullName"] ?? "Unknown")}</strong>
              <span>Risk {formatPercent(Number(item["burnoutRisk"] ?? 0) * 100)}</span>
              <small>Workload {formatPercent(Number(item["workloadScore"] ?? 0))}</small>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}