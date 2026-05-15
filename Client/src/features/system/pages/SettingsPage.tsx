import { useEffect, useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import { ErrorPanel, LoadingPanel, Notice, Panel } from "../../../ui";
import type { AISettingsResponse } from "../../../types";

export function SettingsPage() {
  const { auth, hasRole } = useAuth();
  const isSuperAdmin = hasRole("SuperAdmin");

  const [aiSettings, setAiSettings] = useState<AISettingsResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiError, setAiError] = useState("");
  const [message, setMessage] = useState("");
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<Record<string, string>>({});
  const [customResponse, setCustomResponse] = useState<Record<string, string>>({});
  const [testingCustom, setTestingCustom] = useState<string | null>(null);
  const [openRouterModels, setOpenRouterModels] = useState<Array<{ id: string; name: string; free: boolean }>>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    if (!isSuperAdmin || !auth) return;
    setAiLoading(true);
    api.getAISettings(auth.token)
      .then(settings => {
        const providers = settings.providers.filter(p => p.provider === "OpenAI" || p.provider === "OpenRouter");
        const defaultProvider = providers.some(p => p.provider === settings.defaultProvider)
          ? settings.defaultProvider
          : "OpenAI";
        setAiSettings({ ...settings, providers, defaultProvider });
        if (settings.defaultProvider === "OpenRouter" && !openRouterModels.length) {
          void fetchOpenRouterModels();
        }
      })
      .catch(e => setAiError(e instanceof Error ? e.message : "Failed to load AI settings"))
      .finally(() => setAiLoading(false));
  }, [auth, isSuperAdmin]);

  useEffect(() => {
    if (aiSettings?.defaultProvider === "OpenRouter" && !openRouterModels.length) {
      void fetchOpenRouterModels();
    }
  }, [aiSettings?.defaultProvider]);

  const handleSaveAI = async () => {
    if (!aiSettings || !auth) return;
    setAiSaving(true);
    setAiError("");
    try {
      const result = await api.saveAISettings(auth.token, {
        defaultProvider: aiSettings.defaultProvider,
        defaultModel: aiSettings.defaultModel,
        riskThreshold: aiSettings.riskThreshold,
        useLocalModel: aiSettings.useLocalModel,
        mlModelPath: aiSettings.mlModelPath,
        providers: aiSettings.providers
          .filter(p => p.provider === "OpenAI" || p.provider === "OpenRouter")
          .map(p => ({
            provider: p.provider,
            displayName: p.displayName,
            enabled: p.enabled,
            baseUrl: p.baseUrl,
            apiKey: p.apiKey || "",
            defaultModel: p.defaultModel,
          })),
      });
      setMessage(result.message);
      setTimeout(() => setMessage(""), 3000);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Failed to save AI settings");
    } finally {
      setAiSaving(false);
    }
  };

  const testProvider = async (provider: string, apiKey: string, model?: string) => {
    if (!apiKey && !(isDev && provider === "OpenRouter")) {
      setTestResults(prev => ({ ...prev, [provider]: { success: false, message: "API key required" } }));
      return;
    }
    setTestingProvider(provider);
    try {
      const testModel = model || aiSettings?.providers.find(p => p.provider === provider)?.defaultModel;
      const result = await api.testAiProvider(auth!.token, provider, testModel, "Hi");
      setTestResults(prev => ({ ...prev, [provider]: { success: result.success, message: result.message } }));
    } catch (e) {
      setTestResults(prev => ({ ...prev, [provider]: { success: false, message: e instanceof Error ? e.message : "Connection failed" } }));
    } finally {
      setTestingProvider(null);
    }
  };

  const testCustomPrompt = async (provider: string, _apiKey: string, selectedModel?: string) => {
    const prompt = customPrompt[provider]?.trim();
    if (!prompt) {
      setCustomResponse(prev => ({ ...prev, [provider]: "Please enter a test prompt" }));
      return;
    }
    setTestingCustom(provider);
    try {
      const model = selectedModel || aiSettings?.providers.find(p => p.provider === provider)?.defaultModel;
      const result = await api.testAiProvider(auth!.token, provider, model, prompt);
      setCustomResponse(prev => ({ ...prev, [provider]: result.rawResponse || result.message }));
    } catch (e) {
      setCustomResponse(prev => ({ ...prev, [provider]: e instanceof Error ? e.message : "Connection failed" }));
    } finally {
      setTestingCustom(null);
    }
  };

  const fetchOpenRouterModels = async () => {
    if (!auth) return;
    setLoadingModels(true);
    try {
      const apiKey = aiSettings?.providers.find(p => p.provider === "OpenRouter")?.apiKey;
      const response = await fetch("https://openrouter.ai/api/v1/models?limit=100", {
        headers: apiKey ? { "Authorization": `Bearer ${apiKey}` } : {}
      });
      const data = await response.json();
      const allModels = (data.data || [])
        .map((m: { id: string }) => ({
          id: m.id,
          name: m.id,
          free: m.id.toLowerCase().includes("free") || m.id.toLowerCase().includes("mini")
        }));
      const freeModels = allModels.filter((m: { free: boolean }) => m.free).slice(0, 15);
      const otherModels = allModels.filter((m: { free: boolean }) => !m.free).slice(0, 15);
      setOpenRouterModels([...freeModels, ...otherModels]);
    } catch (e) {
      console.error("Failed to fetch OpenRouter models:", e);
      setAiError("Failed to fetch models from OpenRouter");
    } finally {
      setLoadingModels(false);
    }
  };

  const updateProvider = (provider: string, field: string, value: unknown) => {
    if (!aiSettings) return;
    setAiSettings({
      ...aiSettings,
      providers: aiSettings.providers.map(p =>
        p.provider === provider ? { ...p, [field]: value } : p
      ),
    });
    setTestResults(prev => { const next = { ...prev }; delete next[provider]; return next; });
  };

  if (!isSuperAdmin) {
    return (
      <div className="grid gap-4 content-start">
        <Panel title="Settings" subtitle="Manage your preferences">
          <p className="text-sm text-slate-400">You need SuperAdmin privileges to manage system settings.</p>
        </Panel>
      </div>
    );
  }

  if (aiLoading) return <LoadingPanel label="Loading settings..." />;
  if (aiError && !aiSettings) return <ErrorPanel message={aiError} />;

  return (
    <div className="grid gap-4 content-start">
      {message ? <Notice>{message}</Notice> : null}
      {aiError ? <Notice tone="error">{aiError}</Notice> : null}

      <Panel title="AI Configuration" subtitle="Configure AI providers and default model settings (SuperAdmin only)">
        <div className="space-y-6">
          <div>
            <h4 className="mb-4 text-sm font-semibold text-slate-300">Default Settings</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Provider</label>
                <select
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-sky-300/50 focus:bg-white/[0.07]"
                  value={aiSettings?.defaultProvider ?? "OpenAI"}
                  onChange={e => setAiSettings(prev => prev ? { ...prev, defaultProvider: e.target.value } : null)}
                >
                  <option value="OpenAI">OpenAI</option>
                  <option value="OpenRouter">OpenRouter</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Model</label>
                {aiSettings?.defaultProvider === "OpenRouter" ? (
                  <div className="flex gap-2">
                    <select
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-sky-300/50 focus:bg-white/[0.07]"
                      value={aiSettings?.defaultModel ?? ""}
                      onChange={e => setAiSettings(prev => prev ? { ...prev, defaultModel: e.target.value } : null)}
                    >
                      <option value="">Select a model...</option>
                      {openRouterModels.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void fetchOpenRouterModels()}
                      disabled={loadingModels}
                      className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
                    >
                      {loadingModels ? "..." : "Fetch"}
                    </button>
                  </div>
                ) : (
                  <input
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-sky-300/50 focus:bg-white/[0.07]"
                    value={aiSettings?.defaultModel ?? ""}
                    onChange={e => setAiSettings(prev => prev ? { ...prev, defaultModel: e.target.value } : null)}
                    placeholder="e.g., gpt-4o"
                  />
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Risk Threshold</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-sky-300/50 focus:bg-white/[0.07]"
                  value={aiSettings?.riskThreshold ?? 0.7}
                  onChange={e => setAiSettings(prev => prev ? { ...prev, riskThreshold: parseFloat(e.target.value) } : null)}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-white/5" />

          <div>
            <h4 className="mb-4 text-sm font-semibold text-slate-300">AI Providers</h4>
            <div className="space-y-4">
              {aiSettings?.providers.filter(p => p.provider === "OpenAI" || p.provider === "OpenRouter").map(provider => (
                <div key={provider.provider} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={`${provider.provider}-enabled`}
                      checked={provider.enabled}
                      onChange={e => updateProvider(provider.provider, "enabled", e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-white/5 accent-sky-400"
                    />
                    <label htmlFor={`${provider.provider}-enabled`} className="text-sm font-semibold text-white">
                      {provider.displayName}
                    </label>
                    <span className="text-xs text-slate-500">({provider.provider})</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-400">Base URL</label>
                      <input
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-sky-300/50 focus:bg-white/[0.07] disabled:opacity-50"
                        value={provider.baseUrl}
                        onChange={e => updateProvider(provider.provider, "baseUrl", e.target.value)}
                        disabled={!provider.enabled}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-400">API Key</label>
                      <input
                        type="password"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-sky-300/50 focus:bg-white/[0.07] disabled:opacity-50"
                        value={provider.apiKey}
                        onChange={e => updateProvider(provider.provider, "apiKey", e.target.value)}
                        placeholder={isDev && provider.provider === "OpenRouter" ? "Using dev test key" : "Enter API key"}
                        disabled={!provider.enabled}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-400">Default Model</label>
                      {provider.provider === "OpenRouter" && provider.enabled ? (
                        <div className="flex gap-2">
                          <select
                            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-sky-300/50 focus:bg-white/[0.07]"
                            value={provider.defaultModel}
                            onChange={e => updateProvider(provider.provider, "defaultModel", e.target.value)}
                          >
                            <option value="">Select model...</option>
                            {openRouterModels.map(m => (
                              <option key={m.id} value={m.id}>{m.free ? "[free] " : ""}{m.name}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => void fetchOpenRouterModels()}
                            disabled={loadingModels}
                            className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
                          >
                            {loadingModels ? "..." : "Reload"}
                          </button>
                        </div>
                      ) : (
                        <input
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-sky-300/50 focus:bg-white/[0.07] disabled:opacity-50"
                          value={provider.defaultModel}
                          onChange={e => updateProvider(provider.provider, "defaultModel", e.target.value)}
                          placeholder={provider.provider === "OpenAI" ? "gpt-4o" : "openai/gpt-4o-mini"}
                          disabled={!provider.enabled}
                        />
                      )}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-400">Test Connection</label>
                      <button
                        className="w-full rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:opacity-50"
                        style={{
                          background: testResults[provider.provider]?.success ? "#22c55e" : testResults[provider.provider]?.success === false ? "#ef4444" : "#475569",
                          color: "#fff"
                        }}
                        onClick={() => void testProvider(provider.provider, provider.apiKey, provider.defaultModel)}
                        disabled={testingProvider === provider.provider || !provider.enabled}
                      >
                        {testingProvider === provider.provider ? "Testing..." : testResults[provider.provider] ? (testResults[provider.provider].success ? "Connected" : "Failed") : "Test"}
                      </button>
                    </div>
                  </div>
                  {testResults[provider.provider] && (
                    <div className="mt-3 rounded-lg p-3 text-sm"
                      style={{
                        background: testResults[provider.provider].success ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                        border: `1px solid ${testResults[provider.provider].success ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                        color: testResults[provider.provider].success ? "#4ade80" : "#f87171"
                      }}
                    >
                      {testResults[provider.provider].message}
                    </div>
                  )}

                  <div className="mt-4 border-t border-white/5 pt-4">
                    <label className="mb-2 block text-xs font-medium text-slate-400">Custom Test Prompt</label>
                    <textarea
                      className="mb-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-sky-300/50 focus:bg-white/[0.07] disabled:opacity-50"
                      value={customPrompt[provider.provider] || ""}
                      onChange={e => setCustomPrompt(prev => ({ ...prev, [provider.provider]: e.target.value }))}
                      placeholder="Enter a custom prompt to test the AI..."
                      disabled={!provider.enabled}
                      rows={3}
                    />
                    <button
                      className="rounded-lg bg-sky-400/20 px-4 py-2 text-sm font-medium text-sky-300 transition hover:bg-sky-400/30 disabled:opacity-50"
                      onClick={() => void testCustomPrompt(provider.provider, provider.apiKey, provider.defaultModel)}
                      disabled={testingCustom === provider.provider || !provider.enabled || !customPrompt[provider.provider]?.trim()}
                    >
                      {testingCustom === provider.provider ? "Testing..." : "Run Custom Prompt"}
                    </button>
                    {customResponse[provider.provider] && (
                      <div className="mt-3 max-h-48 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-slate-300"
                        style={{ fontFamily: "monospace", whiteSpace: "pre-wrap" }}
                      >
                        {customResponse[provider.provider]}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end border-t border-white/5 pt-4">
            <button
              className="rounded-lg bg-sky-400 px-6 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:opacity-50"
              onClick={() => void handleSaveAI()}
              disabled={aiSaving}
            >
              {aiSaving ? "Saving..." : "Save AI Settings"}
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}