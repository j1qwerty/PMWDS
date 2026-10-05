import type { BurnoutRiskRecord, DelayPrediction, Task } from "../../types";
import { InfoTip, type InfoTipProps } from "../shared";
import { isTaskLate } from "./aiMetrics";

interface StatsCardsProps {
  /**
   * Effective health score for the selected project, 0-1.
   *
   * Resolved by the page rather than read from the raw ProjectHealth, because
   * health is null both while the request is in flight and when the AI service
   * is unavailable - two very different states that used to collapse into
   * "No project selected" even with a project clearly chosen.
   */
  healthScore: number | null;
  healthSource: "ai" | "calculated" | "loading";
  /** Whether a project is actually selected in the list. */
  projectSelected: boolean;
  burnout: BurnoutRiskRecord[];
  delay: DelayPrediction | null;
  tasks: Task[];
  /** True when the AI service is reachable and produced these numbers. */
  aiOnline: boolean;
}

export function StatsCards({
  healthScore,
  healthSource,
  projectSelected,
  burnout,
  delay,
  tasks,
  aiOnline,
}: StatsCardsProps) {
  // Every figure below is counted from live data. The previous version showed a
  // hardcoded "24 insights", "94% accuracy" and "1.2s", none of which moved.
  const highRiskMembers = burnout.filter((b) => Number(b.burnoutRisk || 0) >= 0.6).length;
  const lateTasks = tasks.filter(isTaskLate).length;
  const openTasks = tasks.filter((t) => t.status !== "Completed" && (t.progressPercentage ?? 0) < 100).length;

  const healthValue = !projectSelected
    ? "n/a"
    : healthSource === "loading"
      ? "…"
      : `${Math.round((healthScore ?? 0) * 100)}%`;

  const healthSubtext = !projectSelected
    ? "No project selected"
    : healthSource === "loading"
      ? "Analysing..."
      : healthSource === "calculated"
        ? "Calculated from live data"
        : "AI analysed";

  const cards: Array<{
    label: string;
    value: string | number;
    subtext: string;
    icon: string;
    color: "indigo" | "emerald" | "red" | "violet";
    tip: Omit<InfoTipProps, "title" | "summary"> & { summary: string };
  }> = [
    {
      label: "Project Health",
      value: healthValue,
      subtext: healthSubtext,
      icon: "monitoring",
      color: "indigo",
      tip: {
        summary: "How well the selected project is going overall, from 0% to 100%. It blends schedule, budget, and whether the work is on time.",
        points: [
          "Weighting: schedule 40%, budget 30%, team 30%.",
          "Under 60% means the project needs attention.",
          'It reads "Calculated" when the AI service is unavailable and the same formula was applied to the project\'s own data.',
        ],
      },
    },
    {
      label: "Open Tasks",
      value: openTasks,
      subtext: `${tasks.length} total in scope`,
      icon: "checklist",
      color: "emerald",
      tip: {
        summary: "Work that has been started or assigned but not finished, for the project currently selected.",
        points: [
          "A task counts as open until its status is Completed or its progress reaches 100%.",
        ],
      },
    },
    {
      label: "Risk Alerts",
      value: highRiskMembers + (delay && Number(delay.delayProbability || 0) >= 0.6 ? 1 : 0),
      subtext: highRiskMembers > 0 ? `${highRiskMembers} team member${highRiskMembers === 1 ? "" : "s"} at high risk` : "No high-risk alerts",
      icon: "warning",
      color: "red",
      tip: {
        summary: "How many things currently need a decision from you: people carrying too much work, plus any selected task predicted to be late.",
        points: [
          "A person counts as a risk alert at 60% burnout risk or above.",
          "A task counts when its predicted chance of being late is 60% or above.",
        ],
      },
    },
    {
      label: "Behind Schedule",
      value: lateTasks,
      subtext: lateTasks > 0 ? "past their due date" : "nothing overdue",
      icon: "running_with_errors",
      color: "violet",
      tip: {
        summary: "How many of the selected project's tasks are past their due date without being finished.",
        points: [
          "Only unfinished tasks are counted - a task completed late is not overdue now.",
          "This is a count of real dates, not a prediction.",
        ],
      },
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-slate-100 bg-white p-4 transition-all duration-300 hover:shadow-md"
        >
          {/* Single header row: icon and label on the left, ? pinned to the top
              right corner. Previously the ? sat inline after the label and the
              icon was a separate right-hand column, so the icon drifted below
              the ? and the two looked unrelated. */}
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${COLOR[card.color].bg}`}>
              <span className={`material-symbols-outlined text-base leading-none ${COLOR[card.color].text}`}>
                {card.icon}
              </span>
            </div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate flex-1">
              {card.label}
            </p>
            <span className="shrink-0">
              <InfoTip title={card.label} summary={card.tip.summary} points={card.tip.points} note={card.tip.note} />
            </span>
          </div>

          <p className={`text-2xl font-bold tracking-tight mt-2 ${COLOR[card.color].text}`}>
            {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{card.subtext}</p>
        </div>
      ))}

      <div className="col-span-2 lg:col-span-4 flex items-center gap-2 -mt-1">
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${aiOnline ? "bg-emerald-500" : "bg-amber-500"}`}
          aria-hidden
        />
        <span className="text-[10px] text-slate-500">
          {aiOnline
            ? "AI service reachable — figures above are AI analysed where available."
            : "AI service unavailable — every figure above was calculated directly from live project data."}
        </span>
      </div>
    </div>
  );
}

const COLOR: Record<"indigo" | "emerald" | "red" | "violet", { bg: string; text: string }> = {
  indigo: { bg: "bg-indigo-50", text: "text-indigo-600" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
  red: { bg: "bg-red-50", text: "text-red-600" },
  violet: { bg: "bg-violet-50", text: "text-violet-600" },
};
