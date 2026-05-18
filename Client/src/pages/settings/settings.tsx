import { useEffect, useState, useDeferredValue } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { AIModel, AIProvider, AISettingsResponse, DatabaseStatus } from "../../types";
import { 
  AnimatedBackground, 
  LoadingPage,
  PageHeader,
} from "../shared";
import { ProfileSettings } from "./ProfileSettings";
import { AIConfiguration } from "./AIConfiguration";
import { ProviderMatrix } from "./ProviderMatrix";
import { DatabaseStatusSection } from "./DatabaseStatusSection";

export function SettingsPage() {
  const { logout, auth, hasRole } = useAuth();
  const isSuperAdmin = hasRole("SuperAdmin");

  const [saved, setSaved] = useState("");
  const [activeTab, setActiveTab] = useState<"profile" | "ai" | "matrix" | "database">("profile");
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus | null>(null);
  const [databaseLoading, setDatabaseLoading] = useState(false);
  const [databaseError, setDatabaseError] = useState("");

  // AI Settings State
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

  // Provider Matrix State
  const [matrixProviders, setMatrixProviders] = useState<AIProvider[]>([]);
  const [matrixProvider, setMatrixProvider] = useState("OpenAI");
  const [matrixModels, setMatrixModels] = useState<AIModel[]>([]);
  const [modelSearch, setModelSearch] = useState("");
  const deferredSearch = useDeferredValue(modelSearch);
  const [selectedModel, setSelectedModel] = useState("");
  const [testResult, setTestResult] = useState<{ provider: string; model: string; success: boolean; message: string; rawResponse?: string } | null>(null);

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

  const fetchDatabaseStatus = async () => {
    if (!auth || !isSuperAdmin) return;
    setDatabaseLoading(true);
    setDatabaseError("");
    try {
      setDatabaseStatus(await api.getDatabaseStatus(auth.token));
    } catch (e) {
      setDatabaseError(e instanceof Error ? e.message : "Failed to load database status");
    } finally {
      setDatabaseLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseStatus();
  }, [auth, isSuperAdmin]);

  useEffect(() => {
    if (aiSettings?.defaultProvider === "OpenRouter" && !openRouterModels.length) {
      fetchOpenRouterModels();
    }
  }, [aiSettings?.defaultProvider]);

  useEffect(() => {
    if (!auth) return;
    api.getAiProviders(auth.token).then(setMatrixProviders);
  }, [auth]);

  useEffect(() => {
    if (!auth || !matrixProvider) return;
    api.searchAiModels(auth.token, matrixProvider, deferredSearch).then((data) => {
      setMatrixModels(data);
      if (data[0]) setSelectedModel(data[0].id);
    });
  }, [auth, matrixProvider, deferredSearch]);

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
            useEnvironmentDefault: p.useEnvironmentDefault,
          })),
      });
      setSaved(result.message || "AI settings saved successfully.");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Failed to save AI settings");
    } finally {
      setAiSaving(false);
    }
  };

  const testProvider = async (provider: string, apiKey: string, model?: string) => {
    const providerConfig = aiSettings?.providers.find(p => p.provider === provider);
    if (!providerConfig?.useEnvironmentDefault && !apiKey && !providerConfig?.hasStoredKey) {
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

  if (aiLoading && isSuperAdmin) return <LoadingPage label="Loading settings..." />;

  return (
    <div className="min-h-screen p-7 relative font-sans">
      <AnimatedBackground />

      {/* Page Header */}
      <div className="relative z-10">
        <PageHeader
          title="Settings"
          description="Manage your profile, AI configuration, and provider settings"
        />
      </div>

      {/* Message */}
      {saved && (
        <div className="relative z-10 mb-5 bg-emerald-50 border border-emerald-200 rounded-xl py-3.5 px-5 text-emerald-700 text-sm flex items-center gap-2.5 animate-[slideIn_0.3s_ease]">
          <span className="material-symbols-outlined">check_circle</span>
          {saved}
          <button
            className="ml-auto bg-transparent border-none cursor-pointer text-emerald-500 hover:text-emerald-700"
            onClick={() => setSaved("")}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="relative z-10 mb-5">
        <div className="flex gap-2 border-b border-slate-200">
          <TabButton
            active={activeTab === "profile"}
            onClick={() => setActiveTab("profile")}
            icon="person"
            label="Profile"
          />
          {isSuperAdmin && (
            <>
              <TabButton
                active={activeTab === "ai"}
                onClick={() => setActiveTab("ai")}
                icon="smart_toy"
                label="AI Configuration"
              />
              <TabButton
                active={activeTab === "matrix"}
                onClick={() => setActiveTab("matrix")}
                icon="hub"
                label="Provider Matrix"
              />
              <TabButton
                active={activeTab === "database"}
                onClick={() => setActiveTab("database")}
                icon="database"
                label="Database"
              />
            </>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="relative z-10">
        {activeTab === "profile" && (
          <ProfileSettings
            auth={auth}
            onSave={() => { setSaved("Profile settings saved!"); setTimeout(() => setSaved(""), 2000); }}
            onLogout={logout}
          />
        )}

        {activeTab === "ai" && isSuperAdmin && (
          <AIConfiguration
            aiSettings={aiSettings}
            aiError={aiError}
            aiSaving={aiSaving}
            testResults={testResults}
            testingProvider={testingProvider}
            customPrompt={customPrompt}
            customResponse={customResponse}
            testingCustom={testingCustom}
            openRouterModels={openRouterModels}
            loadingModels={loadingModels}
            onSaveAI={handleSaveAI}
            onTestProvider={testProvider}
            onTestCustomPrompt={testCustomPrompt}
            onFetchModels={fetchOpenRouterModels}
            onUpdateProvider={updateProvider}
            onUpdateSettings={setAiSettings}
            onSetCustomPrompt={setCustomPrompt}
          />
        )}

        {activeTab === "matrix" && isSuperAdmin && (
          <ProviderMatrix
            matrixProviders={matrixProviders}
            matrixProvider={matrixProvider}
            matrixModels={matrixModels}
            modelSearch={modelSearch}
            selectedModel={selectedModel}
            testResult={testResult}
            auth={auth}
            onProviderChange={setMatrixProvider}
            onModelSearchChange={setModelSearch}
            onModelSelect={setSelectedModel}
            onTestResult={setTestResult}
          />
        )}

        {activeTab === "database" && isSuperAdmin && (
          <DatabaseStatusSection
            status={databaseStatus}
            loading={databaseLoading}
            error={databaseError}
            onRetry={fetchDatabaseStatus}
          />
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-5 py-3 rounded-t-xl text-sm font-medium transition-all duration-200 flex items-center gap-2
        ${active
          ? "bg-white text-indigo-600 border border-slate-200 border-b-white -mb-[1px]"
          : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
        }
      `}
    >
      <span className="material-symbols-outlined text-lg">{icon}</span>
      {label}
    </button>
  );
}
