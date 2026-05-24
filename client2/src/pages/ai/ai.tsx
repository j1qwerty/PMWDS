import { useEffect, useState } from "react";
import { FiCpu, FiMessageSquare, FiSend } from "react-icons/fi";
import { api } from "../../shared/api";
import { useAuth } from "../../shared/auth";
import { MetricCard, PageTitle } from "../../shared/components";
import type { AIProvider, BurnoutRisk, GenericRecord } from "../../shared/types";

const demoProviders: AIProvider[] = [
  { provider: "OpenAI", displayName: "OpenAI", isEnabled: true, isConfigured: true, defaultModel: "gpt-4.1" },
  { provider: "OpenRouter", displayName: "OpenRouter", isEnabled: false, isConfigured: false, defaultModel: "openrouter/auto" },
];

const demoBurnout: BurnoutRisk[] = [
  { userId: "u-1", fullName: "Asha Kapoor", burnoutRisk: 38, workloadScore: 74, activeTasks: 4, riskLevel: "Medium", recommendations: ["Shift one review task"] },
  { userId: "u-2", fullName: "Mira Joshi", burnoutRisk: 71, workloadScore: 88, activeTasks: 6, riskLevel: "High", recommendations: ["Reduce migration load"] },
];

export function AIPage() {
  const { auth } = useAuth();
  const [providers, setProviders] = useState<AIProvider[]>(demoProviders);
  const [burnout, setBurnout] = useState<BurnoutRisk[]>(demoBurnout);
  const [models, setModels] = useState<GenericRecord[]>([]);
  const [predictions, setPredictions] = useState<GenericRecord[]>([]);
  const [prompt, setPrompt] = useState("Summarize project risks.");
  const [chatResult, setChatResult] = useState("");

  useEffect(() => {
    if (!auth || auth.token === "demo-token") {
      setProviders(demoProviders);
      setBurnout(demoBurnout);
      setModels([{ id: "model-1", name: "Delay prediction", modelType: "Delay" }]);
      setPredictions([{ id: "pred-1", recommendation: "Watch gateway retry policy", confidenceScore: 0.78 }]);
      return;
    }
    Promise.all([
      api.getAiProviders(auth.token).catch(() => demoProviders),
      api.getAiBurnoutRisk(auth.token).catch(() => demoBurnout),
      api.getAiModels(auth.token).catch(() => []),
      api.getPredictionResults(auth.token).catch(() => []),
    ]).then(([providerData, burnoutData, modelData, predictionData]) => {
      setProviders(providerData);
      setBurnout(burnoutData);
      setModels(modelData);
      setPredictions(predictionData);
    });
  }, [auth]);

  const send = async () => {
    if (!auth || auth.token === "demo-token") {
      setChatResult("Demo response: project risk is concentrated around delayed migration rollback and gateway retry policy.");
      return;
    }
    const result = await api.chat(auth.token, prompt);
    setChatResult(result.message);
  };

  const highRisk = burnout.filter((item) => item.riskLevel?.toLowerCase() === "high").length;

  return (
    <>
      <PageTitle eyebrow="AI" title="AI Insights" description="Provider status, burnout risk, model inventory, predictions, and chat through the AI API." />
      <section className="metric-grid">
        <MetricCard label="Providers" value={providers.length} note="Configured AI routes" tone="indigo" />
        <MetricCard label="Models" value={models.length} note="Registered models" tone="blue" />
        <MetricCard label="Predictions" value={predictions.length} note="Stored prediction results" tone="green" />
        <MetricCard label="High Burnout" value={highRisk} note="Users at risk" tone="orange" />
        <MetricCard label="Configured" value={providers.filter((item) => item.isConfigured).length} note="Ready providers" tone="yellow" />
        <MetricCard label="Enabled" value={providers.filter((item) => item.isEnabled).length} note="Active providers" tone="pink" />
      </section>
      <section className="resource-layout">
        <div className="resource-table-card">
          <div className="resource-tools"><strong><FiCpu /> Provider and risk matrix</strong><span>{burnout.length} workload records</span></div>
          <div className="settings-grid">
            <div className="settings-card">
              <h3>Providers</h3>
              {providers.map((provider) => (
                <div className="setting-row" key={provider.provider}>
                  <div><strong>{provider.displayName}</strong><p>{provider.defaultModel}</p></div>
                  <span className="message-line">{provider.isConfigured ? "Configured" : "Missing key"}</span>
                </div>
              ))}
            </div>
            <div className="settings-card">
              <h3>Burnout risk</h3>
              {burnout.map((item) => (
                <div className="setting-row" key={item.userId}>
                  <div><strong>{item.fullName}</strong><p>{item.activeTasks} active tasks / load {item.workloadScore}</p></div>
                  <span className="message-line">{item.riskLevel}</span>
                </div>
              ))}
            </div>
            <div className="settings-card">
              <h3>Predictions</h3>
              {predictions.slice(0, 5).map((item, index) => (
                <div className="setting-row" key={String(item.id ?? index)}>
                  <div><strong>{String(item.recommendation ?? item.name ?? item.id)}</strong><p>{String(item.confidenceScore ?? item.modelType ?? "No score")}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <aside className="resource-editor">
          <h3><FiMessageSquare /> AI chat</h3>
          <label className="resource-field"><span>Prompt</span><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} /></label>
          <button className="save-btn" onClick={() => void send()}><FiSend /> Send</button>
          {chatResult ? <p className="message-line">{chatResult}</p> : null}
        </aside>
      </section>
    </>
  );
}
