import type { BurnoutRiskRecord } from "../../types";
import { formatPercent } from "../../ui";
import { Avatar, GlassCard, InfoTip } from "../shared";
import { Icon } from "../../components/ui/Icon";

interface BurnoutPanelProps {
  burnout: BurnoutRiskRecord[];
  /** True when the figures were worked out on the client because the endpoint failed. */
  isFallback?: boolean;
}

export function BurnoutPanel({ burnout, isFallback = false }: BurnoutPanelProps) {
  // Thresholds match the server's RiskLevel (Critical 0.8+, High 0.6+,
  // Medium 0.4+). The old 0.3 cut-off showed server "Medium" rows as "Low".
  const levelOf = (risk: number) =>
    risk >= 0.8 ? "Critical" : risk >= 0.6 ? "High" : risk >= 0.4 ? "Medium" : "Low";

  const highRisk = burnout.filter((b) => Number(b.burnoutRisk || 0) >= 0.6);
  const mediumRisk = burnout.filter((b) => {
    const risk = Number(b.burnoutRisk || 0);
    return risk >= 0.4 && risk < 0.6;
  });

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="psychology" size={18} className="text-red-500 shrink-0" />
          <h4 className="text-sm font-bold text-slate-800">Burnout Risk</h4>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isFallback && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-50 text-amber-600 border border-amber-100">
              Calculated
            </span>
          )}
          <InfoTip
            title="Burnout Risk"
            summary="How likely each person is to be overloaded, from 0% to 100%."
            points={[
              "Workload score: how much open work someone has compared with a fair share across the team.",
              "Under 40% is Low, 40-60% Medium, 60-80% High, and above 80% Critical.",
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-red-600">{highRisk.length}</div>
          <div className="text-[9px] font-semibold text-red-400 uppercase">High Risk</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-amber-600">{mediumRisk.length}</div>
          <div className="text-[9px] font-semibold text-amber-400 uppercase">Medium Risk</div>
        </div>
      </div>

      <div className="max-h-150 overflow-y-auto space-y-2">
        {burnout.slice(0, 8).map((item, index) => {
          const risk = Number(item.burnoutRisk || 0);
          const workload = Number(item.workloadScore || 0);
          const riskPercent = risk <= 1 ? risk * 100 : risk;
          const workloadPercent = workload <= 1 ? workload * 100 : workload;
          const level = levelOf(risk);

          return (
            <div
              key={`${item.userId}-${index}`}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors"
              title={`${item.fullName}: ${level} burnout risk, ${item.activeTasks} active tasks`}
            >
              <Avatar person={{ userId: item.userId, fullName: item.fullName }} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5 gap-2">
                  <span className="text-xs font-semibold text-slate-700 truncate">{String(item.fullName)}</span>
                  <span
                    className={`text-[10px] font-bold shrink-0 ${
                      risk >= 0.6 ? "text-red-500" : risk >= 0.4 ? "text-amber-500" : "text-emerald-500"
                    }`}
                  >
                    {formatPercent(riskPercent)} {level}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      risk >= 0.6 ? "bg-red-400" : risk >= 0.4 ? "bg-amber-400" : "bg-emerald-400"
                    }`}
                    style={{ width: `${Math.min(riskPercent, 100)}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-400 mt-0.5 block">
                  Workload {formatPercent(workloadPercent)} · {item.activeTasks} open task{item.activeTasks === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {burnout.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <Icon name="sentiment_satisfied" size={22} className="mb-2 block mx-auto" />
          <p className="text-xs">No burnout risks detected</p>
        </div>
      )}
    </GlassCard>
  );
}
