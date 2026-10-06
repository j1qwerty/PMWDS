import type { Project, ProjectHealth, Task } from "../../types";
import { GlassCard, InfoTip } from "../shared";
import { Icon } from "../../components/ui/Icon";
import { computeRisks } from "./aiMetrics";

interface RiskPredictionCardProps {
  project: Project | null;
  health: ProjectHealth | null;
  tasks: Task[];
}

const TONE_BAR: Record<string, string> = {
  red: "bg-gradient-to-r from-red-400 to-red-500",
  amber: "bg-gradient-to-r from-amber-400 to-amber-500",
  indigo: "bg-gradient-to-r from-indigo-400 to-violet-500",
};

const LEVEL_CHIP: Record<string, string> = {
  Critical: "bg-red-50 text-red-700 border-red-200",
  High: "bg-orange-50 text-orange-700 border-orange-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function RiskPredictionCard({ project, health, tasks }: RiskPredictionCardProps) {
  const risks = computeRisks(project, health, tasks);
  const highest = risks.reduce((max, r) => (r.value > max.value ? r : max), risks[0]);

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="speed" size={20} className="text-red-500 shrink-0" />
          <h3 className="text-sm font-bold text-slate-800">Risk Prediction</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${LEVEL_CHIP[highest.level]}`}
            title={`Highest current risk: ${highest.label}`}
          >
            {highest.level}
          </span>
          <InfoTip
            title="Risk Prediction"
            summary="Three separate chances that something on this project goes wrong, each from 0% to 100%. Higher means more likely."
            points={[
              "Budget Overrun: money spent compared with budget, scaled by how much work is actually done.",
              "Schedule Delay: how far behind the project is against its own planned dates.",
              "Resource Conflict: how much of the work is past due, which is the usual sign people are stretched.",
              "Under 40% is Low, 40-60% Medium, 60-80% High, and above 80% Critical.",
            ]}
            note="These are calculated from the project's real dates, budget and task list. The AI service refines them when it is available."
          />
        </div>
      </div>

      <div className="space-y-4">
        {risks.map((risk) => (
          <div key={risk.label}>
            <div className="flex justify-between items-center mb-1.5 gap-2">
              <span className="text-xs text-slate-500">{risk.label}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${LEVEL_CHIP[risk.level]}`}>
                {risk.level} · {Math.round(risk.value * 100)}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${TONE_BAR[risk.tone]}`}
                style={{ width: `${Math.min(risk.value * 100, 100)}%` }}
              />
            </div>
            <p className="text-[9.5px] text-slate-400 mt-1">{risk.basis}</p>
          </div>
        ))}
      </div>

      {risks.every((r) => r.value < 0.15) && (
        <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-start gap-2">
          <Icon name="check_circle" size={18} className="text-emerald-500 shrink-0" />
          <span className="text-[11px] text-emerald-700">
            No meaningful risk detected on budget, schedule, or workload for this project.
          </span>
        </div>
      )}
    </GlassCard>
  );
}
