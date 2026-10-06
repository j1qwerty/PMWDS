import type { Project } from "../../types";
import { GlassCard, InfoTip } from "../shared";
import { Icon } from "../../components/ui/Icon";
import { computeTimeline } from "./aiMetrics";

interface TimelinePredictionsProps {
  projects: Project[];
}

const TONE_BAR: Record<string, string> = {
  indigo: "bg-gradient-to-r from-indigo-500 to-violet-500",
  red: "bg-red-500",
  emerald: "bg-emerald-500",
};

const TONE_CHIP: Record<string, string> = {
  indigo: "text-indigo-600 bg-indigo-50",
  red: "text-red-600 bg-red-50",
  emerald: "text-emerald-600 bg-emerald-50",
};

export function TimelinePredictions({ projects }: TimelinePredictionsProps) {
  const rows = computeTimeline(projects);

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="timeline" size={20} className="text-indigo-500 shrink-0" />
          <h3 className="text-sm font-bold text-slate-800 truncate">Timeline Predictions</h3>
        </div>
        <InfoTip
          title="Timeline Predictions"
          summary="Where each open project is heading, and roughly when it will finish if the current pace holds."
          points={[
            "The bar is the project's real completion percentage.",
            "The projected date assumes work continues at the same rate it has gone so far - the elapsed time divided by the work done.",
            "At Risk means the projection is more than a week past the planned end date. Ahead means more than three days early. Otherwise it is On Track.",
            "Finished projects are left out, since there is nothing left to predict.",
          ]}
          note="This is a straight-line projection, so it will move as progress is reported. It is a planning aid, not a commitment."
        />
      </div>

      {rows.length === 0 ? (
        <div className="py-10 text-center">
          <Icon name="task_alt" size={22} className="block mx-auto mb-2 text-slate-300" />
          <p className="text-xs text-slate-400">
            {projects.length === 0 ? "No projects in this scope yet." : "Every project in this scope is complete."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.id}>
              <div className="flex justify-between items-center mb-1.5 gap-2">
                <span className="text-xs text-slate-600 font-medium truncate">{row.name}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${TONE_CHIP[row.tone]}`}>
                  {row.status} · {row.progress}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${TONE_BAR[row.tone]}`}
                  style={{ width: `${row.progress}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">{row.detail}</span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
