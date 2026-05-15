import type { AISettingsResponse } from "../../types";
import { GlassCard, GradientButton } from "../shared";

interface AIConfigurationProps {
  aiSettings: AISettingsResponse | null;
  aiError: string;
  aiSaving: boolean;
  testResults: { [key: string]: { success: boolean; message: string } };
  testingProvider: string | null;
  customPrompt: { [key: string]: string };
  customResponse: { [key: string]: string };
  testingCustom: string | null;
  openRouterModels: Array<{ id: string; name: string; free: boolean }>;
  loadingModels: boolean;
  onSaveAI: () => void;
  onTestProvider: (provider: string, apiKey: string, model?: string) => void;
  onTestCustomPrompt: (provider: string, apiKey: string, selectedModel?: string) => void;
  onFetchModels: () => void;
  onUpdateProvider: (provider: string, field: string, value: unknown) => void;
  onUpdateSettings: (settings: AISettingsResponse | null) => void;
  onSetCustomPrompt: (value: React.SetStateAction<{ [key: string]: string }>) => void;
}

export function AIConfiguration({
  aiSettings,
  aiError,
  aiSaving,
  testResults,
  testingProvider,
  customPrompt,
  customResponse,
  testingCustom,
  openRouterModels,
  loadingModels,
  onSaveAI,
  onTestProvider,
  onTestCustomPrompt,
  onFetchModels,
  onUpdateProvider,
  onUpdateSettings,
  onSetCustomPrompt,
}: AIConfigurationProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Error */}
      {aiError && (
        <div className="bg-red-50 border border-red-200 rounded-xl py-3.5 px-5 text-red-700 text-sm flex items-center gap-2.5">
          <span className="material-symbols-outlined">error</span>
          {aiError}
        </div>
      )}

      {/* Default Provider */}
      <GlassCard className="p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-500">settings</span>
          Default Provider
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Provider</label>
            <select
              value={aiSettings?.defaultProvider ?? "OpenAI"}
              onChange={e => onUpdateSettings(aiSettings ? { ...aiSettings, defaultProvider: e.target.value } : null)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white outline-none focus:border-indigo-300 transition-all"
            >
              <option value="OpenAI">OpenAI</option>
              <option value="OpenRouter">OpenRouter</option>
            </select>
          </div>
          
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Model</label>
            {aiSettings?.defaultProvider === "OpenRouter" ? (
              <div className="flex gap-2">
                <select
                  value={aiSettings?.defaultModel ?? ""}
                  onChange={e => onUpdateSettings(aiSettings ? { ...aiSettings, defaultModel: e.target.value } : null)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white outline-none focus:border-indigo-300 transition-all"
                >
                  <option value="">Select a model...</option>
                  {openRouterModels.map(m => (
                    <option key={m.id} value={m.id}>{m.free ? "[free] " : ""}{m.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={onFetchModels}
                  disabled={loadingModels}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  {loadingModels ? "Loading..." : "Fetch"}
                </button>
              </div>
            ) : (
              <input
                value={aiSettings?.defaultModel ?? ""}
                onChange={e => onUpdateSettings(aiSettings ? { ...aiSettings, defaultModel: e.target.value } : null)}
                placeholder="e.g., gpt-4o"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-white focus:border-indigo-300 transition-all"
              />
            )}
          </div>
          
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Risk Threshold</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={aiSettings?.riskThreshold ?? 0.7}
              onChange={e => onUpdateSettings(aiSettings ? { ...aiSettings, riskThreshold: parseFloat(e.target.value) } : null)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-white focus:border-indigo-300 transition-all"
            />
          </div>
        </div>
      </GlassCard>

      {/* AI Providers */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-500">hub</span>
          AI Providers
        </h3>
        
        <div className="flex flex-col gap-5">
          {aiSettings?.providers.filter(p => p.provider === "OpenAI" || p.provider === "OpenRouter").map(provider => (
            <GlassCard key={provider.provider} className="p-6">
              {/* Provider Header */}
              <div className="flex items-center gap-3 mb-5">
                <input
                  type="checkbox"
                  checked={provider.enabled}
                  onChange={e => onUpdateProvider(provider.provider, "enabled", e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{provider.displayName}</h4>
                  <p className="text-[10px] text-slate-400 uppercase">{provider.provider}</p>
                </div>
              </div>

              {/* Provider Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Base URL</label>
                  <input
                    value={provider.baseUrl}
                    onChange={e => onUpdateProvider(provider.provider, "baseUrl", e.target.value)}
                    disabled={!provider.enabled}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-white focus:border-indigo-300 transition-all disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">API Key</label>
                  <label className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={provider.useEnvironmentDefault}
                      onChange={e => onUpdateProvider(provider.provider, "useEnvironmentDefault", e.target.checked)}
                      disabled={!provider.enabled}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Use default key from .env
                  </label>
                  <input
                    type="password"
                    value={provider.apiKey}
                    onChange={e => onUpdateProvider(provider.provider, "apiKey", e.target.value)}
                    placeholder={provider.hasStoredKey ? "Stored key exists. Enter a new key to replace it." : "Enter API key"}
                    disabled={!provider.enabled || provider.useEnvironmentDefault}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-white focus:border-indigo-300 transition-all disabled:bg-slate-50"
                  />
                  {provider.useEnvironmentDefault && (
                    <p className="mt-1.5 text-xs text-slate-400">
                      The server will use the API key configured in the backend .env file.
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Model</label>
                  {provider.provider === "OpenRouter" && provider.enabled ? (
                    <div className="flex gap-2">
                      <select
                        value={provider.defaultModel}
                        onChange={e => onUpdateProvider(provider.provider, "defaultModel", e.target.value)}
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white outline-none focus:border-indigo-300 transition-all"
                      >
                        <option value="">Select model...</option>
                        {openRouterModels.map(m => (
                          <option key={m.id} value={m.id}>{m.free ? "[free] " : ""}{m.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={onFetchModels}
                        disabled={loadingModels}
                        className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        {loadingModels ? "..." : "Reload"}
                      </button>
                    </div>
                  ) : (
                    <input
                      value={provider.defaultModel}
                      onChange={e => onUpdateProvider(provider.provider, "defaultModel", e.target.value)}
                      placeholder={provider.provider === "OpenAI" ? "gpt-4o" : "openai/gpt-4o-mini"}
                      disabled={!provider.enabled}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-white focus:border-indigo-300 transition-all disabled:bg-slate-50"
                    />
                  )}
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => onTestProvider(provider.provider, provider.apiKey, provider.defaultModel)}
                    disabled={testingProvider === provider.provider || !provider.enabled}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      testResults[provider.provider]?.success
                        ? "bg-emerald-600 text-white"
                        : testResults[provider.provider]?.success === false
                        ? "bg-red-600 text-white"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    } disabled:opacity-50`}
                  >
                    {testingProvider === provider.provider 
                      ? "Testing..." 
                      : testResults[provider.provider] 
                        ? (testResults[provider.provider].success ? "Connected" : "Failed") 
                        : "Test Connection"}
                  </button>
                </div>
              </div>

              {/* Test Result */}
              {testResults[provider.provider] && (
                <div className={`p-3 rounded-lg text-sm mb-4 ${
                  testResults[provider.provider].success 
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {testResults[provider.provider].message}
                </div>
              )}

              {/* Custom Prompt Test */}
              <div className="pt-4 border-t border-slate-100">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Custom Test Prompt
                </label>
                <textarea
                  value={customPrompt[provider.provider] || ""}
                  onChange={e => onSetCustomPrompt(prev => ({ ...prev, [provider.provider]: e.target.value }))}
                  placeholder="Enter a custom prompt to test the AI..."
                  disabled={!provider.enabled}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-white focus:border-indigo-300 transition-all resize-none font-mono disabled:bg-slate-50"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => onTestCustomPrompt(provider.provider, provider.apiKey, provider.defaultModel)}
                    disabled={testingCustom === provider.provider || !provider.enabled || !customPrompt[provider.provider]?.trim()}
                    className="px-4 py-2.5 rounded-xl bg-cyan-600 text-white text-sm font-semibold hover:bg-cyan-700 transition-colors disabled:opacity-50"
                  >
                    {testingCustom === provider.provider ? "Testing..." : "Run Prompt"}
                  </button>
                </div>
                {customResponse[provider.provider] && (
                  <div className="mt-3 p-4 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono text-emerald-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {customResponse[provider.provider]}
                  </div>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <GradientButton onClick={onSaveAI} disabled={aiSaving}>
          <span className="material-symbols-outlined text-sm">save</span>
          {aiSaving ? "Saving..." : "Save AI Settings"}
        </GradientButton>
      </div>
    </div>
  );
}
