import type { Project, ProjectHealth, Task } from "../../types";
import { formatPercent } from "../../ui";
import { GlassCard, InfoTip } from "../shared";
import { Icon } from "../../components/ui/Icon";
import { computeHealth } from "./aiMetrics";

interface HealthCardProps {
  project: Project | null;
  health: ProjectHealth | null;
  /** The selected project's own tasks, used for the calculated fallback. */
  tasks: Task[];
}

export function HealthCard({ project, health, tasks }: HealthCardProps) {
  // Prefer the server's analysis. When it is unavailable, work the score out
  // from the project's own dates, budget, and task list rather than showing
  // the old fixed sample numbers.
  const calculated = computeHealth(project, tasks);
  const hasRealData = !!health;

  const scores = hasRealData
    ? {
        overall: health!.overallHealthScore ?? 0,
        schedule: health!.scheduleHealth ?? 0,
        budget: health!.budgetHealth ?? 0,
        team: health!.teamHealth ?? 0,
      }
    : {
        overall: calculated.overall,
        schedule: calculated.schedule,
        budget: calculated.budget,
        team: calculated.team,
      };

  const status = scores.overall > 0.8 ? "Stable" : scores.overall > 0.6 ? "Watch" : "Needs Attention";

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="monitoring" size={20} className="text-indigo-500 shrink-0" />
          <h3 className="text-sm font-bold text-slate-800 truncate">
            {project?.name || "Project"} Health
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
              hasRealData
                ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                : "bg-amber-50 text-amber-600 border border-amber-100"
            }`}
            title={hasRealData ? "Produced by the AI health service" : "Worked out directly from this project's data"}
          >
            {hasRealData ? "AI analysed" : "Calculated"}
          </span>
          <InfoTip
            title="Overall Health Score"
            summary="One number for how well a project is going, from 0% to 100%. Higher is better. Anything under 60% means the project needs attention."
            points={[
              "Schedule (40% of the score): compares how much work is finished against how much of the planned time has already passed.",
              "Budget (30%): compares money spent against budget, adjusted for how much of the work is actually done.",
              "Team (30%): the share of tasks that are not past their due date.",
              'A project marked "AI analysed" was scored by the AI service. "Calculated" means the same formula was applied directly to this project\'s data because AI was unavailable.',
            ]}
            note="A project with no tasks yet scores on its dates and budget alone, which can read as healthy before any work has started."
          />
        </div>
      </div>

      {/* Overall Health Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-slate-500">Overall Health Score</span>
          <span className="font-bold text-emerald-600">{formatPercent(scores.overall)}</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(scores.overall * 100, 100)}%` }}
          />
        </div>
        <span className="text-[10px] text-slate-400 mt-1 block">
          {hasRealData
            ? `Analysed ${new Date(health!.generatedAt).toLocaleString()}`
            : `From ${tasks.length} task${tasks.length === 1 ? "" : "s"}, the planned dates and the budget`}
        </span>
      </div>

      {/* Health Metrics Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <MiniHealthMetric
          label="Schedule"
          value={formatPercent(scores.schedule)}
          color="indigo"
          subtext={scores.schedule > 0.8 ? "On Track" : scores.schedule > 0.6 ? "At Risk" : "Delayed"}
        />
        <MiniHealthMetric
          label="Budget"
          value={formatPercent(scores.budget)}
          color="emerald"
          subtext={scores.budget > 0.8 ? "Within Budget" : scores.budget > 0.6 ? "Warning" : "Over Budget"}
        />
        <MiniHealthMetric
          label="Team"
          value={formatPercent(scores.team)}
          color="violet"
          subtext={scores.team > 0.8 ? "Strong" : scores.team > 0.6 ? "Stable" : "Stressed"}
        />
      </div>

      {/* Breakdown bars */}
      <div className="space-y-2">
        <HealthIndicator label="Schedule" value={scores.schedule} />
        <HealthIndicator label="Budget" value={scores.budget} />
        <HealthIndicator label="Team" value={scores.team} />
      </div>

      <div className="flex gap-2 mt-4 flex-wrap">
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${
            scores.overall > 0.8
              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
              : scores.overall > 0.6
                ? "bg-amber-50 text-amber-600 border border-amber-100"
                : "bg-red-50 text-red-600 border border-red-100"
          }`}
        >
          {status}
        </span>
        {!hasRealData && (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-100">
            AI unavailable - calculated from live data
          </span>
        )}
      </div>
    </GlassCard>
  );
}

function MiniHealthMetric({ label, value, color, subtext }: {
  label: string;
  value: string;
  color: string;
  subtext: string;
}) {
  const colors: Record<string, string> = {
    indigo: "text-indigo-600 bg-indigo-50",
    emerald: "text-emerald-600 bg-emerald-50",
    violet: "text-violet-600 bg-violet-50",
  };

  return (
    <div className={`rounded-lg p-3 text-center ${colors[color] || colors.indigo}`}>
      <div className="text-[9px] font-semibold uppercase mb-0.5 opacity-70">{label}</div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[8px] font-medium mt-0.5 opacity-60">{subtext}</div>
    </div>
  );
}

function HealthIndicator({ label, value }: { label: string; value: number }) {
  const bar = value > 0.8 ? "bg-emerald-400" : value > 0.6 ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-slate-500 w-20">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full rounded-full ${bar} transition-all duration-500`}
          style={{ width: `${Math.min(value * 100, 100)}%` }}
        />
      </div>
      <span className="text-[10px] font-semibold text-slate-600 w-12 text-right">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}
