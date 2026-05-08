import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { AISettingsResponse } from "../../types";
import {
  LoadingPanel,
  Notice,
  Panel,
} from "../../ui";

export function SettingsPage() {
  const { logout, auth, hasRole } = useAuth();
  const [saved, setSaved] = useState("");
  const isSuperAdmin = hasRole("SuperAdmin");
  const isDev = import.meta.env.DEV;

  const [aiSettings, setAiSettings] = useState<AISettingsResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiError, setAiError] = useState("");
  const [testResults, setTestResults] = useState<{ [key: string]: { success: boolean; message: string } }>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<{ [key: string]: string }>({});
  const [customResponse, setCustomResponse] = useState<{ [key: string]: string }>({});
  const [testingCustom, setTestingCustom] = useState<string | null>(null);
  const [openRouterModels, setOpenRouterModels] = useState<Array<{ id: string; name: string; free: boolean }>>([]);
  const [loadingModels, setLoadingModels] = useState(false);

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
          fetchOpenRouterModels();
        }
      })
      .catch(e => setAiError(e instanceof Error ? e.message : "Failed to load AI settings"))
      .finally(() => setAiLoading(false));
  }, [auth, isSuperAdmin]);

  useEffect(() => {
    if (aiSettings?.defaultProvider === "OpenRouter" && !openRouterModels.length) {
      fetchOpenRouterModels();
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
      setSaved(result.message);
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

  const handleSave = () => {
    setSaved("Settings saved!");
    setTimeout(() => setSaved(""), 2000);
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen">
        <Panel title="Settings" subtitle="Manage your preferences">
          {saved && <Notice>{saved}</Notice>}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label><span>Email</span><input value={auth?.email ?? ""} disabled /></label>
            <label><span>Name</span><input value={auth?.fullName ?? ""} disabled /></label>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <button onClick={handleSave}>Save Settings</button>
            <button onClick={logout} style={{ marginLeft: "0.5rem", background: "#dc3545" }}>Logout</button>
          </div>
        </Panel>
      </div>
    );
  }

  if (aiLoading) return <LoadingPanel label="Loading settings..." />;

  return (
    <div className="min-h-screen">
      <Panel title="Settings" subtitle="Manage your preferences">
        {saved && <Notice>{saved}</Notice>}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label><span>Email</span><input value={auth?.email ?? ""} disabled /></label>
          <label><span>Name</span><input value={auth?.fullName ?? ""} disabled /></label>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <button onClick={handleSave}>Save Settings</button>
          <button onClick={logout} style={{ marginLeft: "0.5rem", background: "#dc3545" }}>Logout</button>
        </div>
      </Panel>

      <Panel title="AI Configuration" subtitle="Configure AI providers (SuperAdmin only)" style={{ marginTop: "1.5rem" }}>
        {aiError && <Notice>{aiError}</Notice>}
        
        <div style={{ marginBottom: "1.5rem" }}>
          <h4 style={{ marginBottom: "0.5rem" }}>Default Provider</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label><span>Provider</span>
              <select
                value={aiSettings?.defaultProvider ?? "OpenAI"}
                onChange={e => setAiSettings(prev => prev ? { ...prev, defaultProvider: e.target.value } : null)}
              >
                <option value="OpenAI">OpenAI</option>
                <option value="OpenRouter">OpenRouter</option>
              </select>
            </label>
            <label><span>Model</span>
              {aiSettings?.defaultProvider === "OpenRouter" ? (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <select
                    value={aiSettings?.defaultModel ?? ""}
                    onChange={e => setAiSettings(prev => prev ? { ...prev, defaultModel: e.target.value } : null)}
                    style={{ flex: 1 }}
                  >
                    <option value="">Select a model...</option>
                    {openRouterModels.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={fetchOpenRouterModels}
                    disabled={loadingModels}
                    style={{ background: "#6c757d", whiteSpace: "nowrap" }}
                  >
                    {loadingModels ? "Loading..." : "Fetch Models"}
                  </button>
                </div>
              ) : (
                <input
                  value={aiSettings?.defaultModel ?? ""}
                  onChange={e => setAiSettings(prev => prev ? { ...prev, defaultModel: e.target.value } : null)}
                  placeholder="e.g., gpt-4o"
                />
              )}
            </label>
            <label><span>Risk Threshold</span>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={aiSettings?.riskThreshold ?? 0.7}
                onChange={e => setAiSettings(prev => prev ? { ...prev, riskThreshold: parseFloat(e.target.value) } : null)}
              />
            </label>
          </div>
        </div>

        <h4 style={{ marginBottom: "0.5rem", marginTop: "1.5rem" }}>AI Providers</h4>
        {aiSettings?.providers.filter(p => p.provider === "OpenAI" || p.provider === "OpenRouter").map(provider => (
          <div key={provider.provider} style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1rem", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <input
                type="checkbox"
                id={`${provider.provider}-enabled`}
                checked={provider.enabled}
                onChange={e => updateProvider(provider.provider, "enabled", e.target.checked)}
              />
              <label htmlFor={`${provider.provider}-enabled`} style={{ fontWeight: "bold" }}>
                {provider.displayName} ({provider.provider})
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label><span>Base URL</span>
                <input
                  value={provider.baseUrl}
                  onChange={e => updateProvider(provider.provider, "baseUrl", e.target.value)}
                  disabled={!provider.enabled}
                />
              </label>
              <label><span>API Key</span>
                <input
                  type="password"
                  value={provider.apiKey}
                  onChange={e => updateProvider(provider.provider, "apiKey", e.target.value)}
                  placeholder={isDev && provider.provider === "OpenRouter" ? "Using dev test key (sk-or-...)" : "Enter API key"}
                  disabled={!provider.enabled}
                />
              </label>
              <label><span>Model</span>
                {provider.provider === "OpenRouter" && provider.enabled ? (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <select
                      value={provider.defaultModel}
                      onChange={e => updateProvider(provider.provider, "defaultModel", e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="">Select model...</option>
                      {openRouterModels.map(m => (
                        <option key={m.id} value={m.id}>{m.free ? "[free] " : ""}{m.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={fetchOpenRouterModels}
                      disabled={loadingModels}
                      style={{ background: "#6c757d", whiteSpace: "nowrap" }}
                    >
                      {loadingModels ? "..." : "Reload"}
                    </button>
                  </div>
                ) : (
                  <input
                    value={provider.defaultModel}
                    onChange={e => updateProvider(provider.provider, "defaultModel", e.target.value)}
                    placeholder={provider.provider === "OpenAI" ? "gpt-4o" : "openai/gpt-4o-mini"}
                    disabled={!provider.enabled}
                  />
                )}
              </label>
              <label>
                <span>&nbsp;</span>
                <button
                  onClick={() => testProvider(provider.provider, provider.apiKey, provider.defaultModel)}
                  disabled={testingProvider === provider.provider || !provider.enabled}
                  style={{ background: testResults[provider.provider]?.success ? "#28a745" : testResults[provider.provider]?.success === false ? "#dc3545" : "#6c757d" }}
                >
                  {testingProvider === provider.provider ? "Testing..." : testResults[provider.provider] ? (testResults[provider.provider].success ? "Connected" : "Failed") : "Test Connection"}
                </button>
              </label>
            </div>
            {testResults[provider.provider] && (
              <div style={{ 
                marginTop: "0.5rem", 
                padding: "0.5rem", 
                borderRadius: "4px",
                background: testResults[provider.provider].success ? "#d4edda" : "#f8d7da",
                color: testResults[provider.provider].success ? "#155724" : "#721c24"
              }}>
                {testResults[provider.provider].message}
              </div>
            )}

            <div style={{ marginTop: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "500" }}>Custom Test Prompt</label>
              <textarea
                value={customPrompt[provider.provider] || ""}
                onChange={e => setCustomPrompt(prev => ({ ...prev, [provider.provider]: e.target.value }))}
                placeholder="Enter a custom prompt to test the AI..."
                disabled={!provider.enabled}
                rows={3}
                style={{ width: "100%", padding: "0.5rem", marginBottom: "0.5rem", fontFamily: "monospace" }}
              />
              <button
                onClick={() => testCustomPrompt(provider.provider, provider.apiKey, provider.defaultModel)}
                disabled={testingCustom === provider.provider || !provider.enabled || !customPrompt[provider.provider]?.trim()}
                style={{ background: "#17a2b8", marginBottom: "0.5rem" }}
              >
                {testingCustom === provider.provider ? "Testing..." : "Run Custom Prompt"}
              </button>
              {customResponse[provider.provider] && (
                <div style={{ 
                  marginTop: "0.5rem", 
                  padding: "0.5rem", 
                  borderRadius: "4px",
                  background: "#2d2d2d",
                  border: "1px solid #555",
                  whiteSpace: "pre-wrap",
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                  maxHeight: "200px",
                  overflow: "auto",
                  color: "#e0e0e0"
                }}>
                  {customResponse[provider.provider]}
                </div>
              )}
            </div>
          </div>
        ))}
        
        <div style={{ marginTop: "1rem" }}>
          <button onClick={handleSaveAI} disabled={aiSaving}>
            {aiSaving ? "Saving..." : "Save AI Settings"}
          </button>
        </div>
      </Panel>
    </div>
  );
}