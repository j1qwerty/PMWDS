import { api } from "../../api";
import type { AIModel, AIProvider } from "../../types";
import { GlassCard, GradientButton } from "../shared";

interface ProviderMatrixProps {
  matrixProviders: AIProvider[];
  matrixProvider: string;
  matrixModels: AIModel[];
  modelSearch: string;
  selectedModel: string;
  testResult: { provider: string; model: string; success: boolean; message: string; rawResponse?: string } | null;
  auth: any;
  onProviderChange: (provider: string) => void;
  onModelSearchChange: (search: string) => void;
  onModelSelect: (model: string) => void;
  onTestResult: (result: any) => void;
}

export function ProviderMatrix({
  matrixProviders,
  matrixProvider,
  matrixModels,
  modelSearch,
  selectedModel,
  testResult,
  auth,
  onProviderChange,
  onModelSearchChange,
  onModelSelect,
  onTestResult,
}: ProviderMatrixProps) {
  return (
    <GlassCard className="p-6">
      <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-indigo-500">hub</span>
        Provider Matrix
      </h3>
      <p className="text-xs text-slate-500 mb-5">
        Discover models, test providers, and steer prompt traffic
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider List */}
        <div>
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Providers</h4>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
            {matrixProviders.map((item) => (
              <button
                key={item.provider}
                onClick={() => onProviderChange(item.provider)}
                className={`
                  w-full text-left p-3 rounded-xl cursor-pointer transition-all duration-200
                  ${matrixProvider === item.provider
                    ? "bg-indigo-50 border border-indigo-200 shadow-sm"
                    : "bg-white border border-transparent hover:bg-slate-50 hover:border-slate-200"
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    matrixProvider === item.provider ? "bg-indigo-100" : "bg-slate-100"
                  }`}>
                    <span className={`material-symbols-outlined text-lg ${
                      matrixProvider === item.provider ? "text-indigo-600" : "text-slate-400"
                    }`}>smart_toy</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-slate-800">{item.displayName}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{item.defaultModel}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${item.isConfigured ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                      <span className={`text-[10px] font-medium ${item.isConfigured ? 'text-emerald-600' : 'text-red-500'}`}>
                        {item.isConfigured ? "Configured" : "Missing key"}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Model Search & Test */}
        <div>
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Model Search</h4>
          
          {/* Search Input */}
          <div className="relative mb-4">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">
              search
            </span>
            <input
              value={modelSearch}
              onChange={(e) => onModelSearchChange(e.target.value)}
              placeholder="Search models..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 text-sm outline-none bg-white focus:border-indigo-300 transition-all"
            />
          </div>

          {/* Model List */}
          <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 mb-4">
            {matrixModels.map((item) => (
              <button
                key={item.id}
                onClick={() => onModelSelect(item.id)}
                className={`
                  w-full text-left p-3 rounded-lg cursor-pointer transition-all duration-200
                  ${selectedModel === item.id
                    ? "bg-indigo-50 border border-indigo-200"
                    : "bg-white border border-transparent hover:bg-slate-50"
                  }
                `}
              >
                <div className="font-semibold text-xs text-slate-800 truncate">{item.name}</div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[10px] text-slate-400 font-mono">{item.id}</span>
                  <span className="text-[10px] text-slate-400">
                    {item.contextLength ? `${item.contextLength.toLocaleString()} ctx` : "Unknown"}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Test Button */}
          <GradientButton
            onClick={async () => {
              if (!auth) return;
              const result = await api.testAiProvider(auth.token, matrixProvider, selectedModel);
              onTestResult(result);
            }}
          >
            <span className="material-symbols-outlined text-sm">play_arrow</span>
            Test Provider
          </GradientButton>

          {/* Test Result */}
          {testResult && (
            <div className={`mt-4 p-4 rounded-xl border ${
              testResult.success 
                ? "bg-emerald-50 border-emerald-200" 
                : "bg-red-50 border-red-200"
            }`}>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Provider</span>
                  <span className="text-sm font-semibold text-slate-700">{testResult.provider}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Model</span>
                  <span className="text-sm font-semibold text-slate-700">{testResult.model}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Result</span>
                  <span className={`text-sm font-semibold ${testResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
                    {testResult.success ? "Success" : "Failure"}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-600">{testResult.message}</p>
              {testResult.rawResponse && (
                <pre className="mt-3 p-3 rounded-lg bg-slate-900 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                  {testResult.rawResponse}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}