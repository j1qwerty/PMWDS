import type { Project, Task } from "../../types";
import { GlassCard, InfoTip } from "../shared";
import { Icon } from "../../components/ui/Icon";
import { computeHeatmap, isTaskLate } from "./aiMetrics";

interface NeuralHeatmapProps {
  project: Project | null;
  /** The selected project's tasks, grouped by milestone for the load bars. */
  tasks: Task[];
  loading?: boolean;
}

export function NeuralHeatmap({ project, tasks, loading = false }: NeuralHeatmapProps) {
  const cells = computeHeatmap(tasks);
  const highRisk = cells.filter((c) => c.atRisk);
  const totalOpen = tasks.filter((t) => t.status !== "Completed" && (t.progressPercentage ?? 0) < 100).length;
  const totalLate = tasks.filter(isTaskLate).length;

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="hub" size={20} className="text-violet-500 shrink-0" />
          <h3 className="text-sm font-bold text-slate-800 truncate">
            Workload Heatmap{project ? ` · ${project.name}` : ""}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {loading ? "Loading..." : `${totalOpen} open of ${tasks.length}`}
          </span>
          <InfoTip
            title="Workload Heatmap"
            summary="How much work each milestone is currently carrying. A taller bar means more unfinished work sitting in that milestone."
            points={[
              
              "Milestones with no tasks are grouped under 'Unassigned'.",
            ]}
          />
        </div>
      </div>

      {tasks.length === 0 && !loading ? (
        <div className="py-10 text-center">
          <Icon name="hub" size={22} className="block mx-auto mb-2 text-slate-300" />
          <p className="text-xs text-slate-400">
            {project ? "This project has no tasks yet, so there is no workload to map." : "Select a project to map its workload."}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-slate-50 border border-slate-200 rounded-xl pt-5 pb-2 relative" style={{ minHeight: "220px" }}>
            <div className="flex items-end h-50 px-8 gap-3">
              {cells.map((cell) => {
                const heightPx = Math.max(6, (cell.value / 100) * 176);

                return (
                  <div key={cell.name} className="flex-1 flex flex-col items-center group min-w-0">
                    <span className={`text-[10px] font-bold mb-1 ${cell.atRisk ? "text-red-500" : "text-slate-400"}`}>
                      {cell.value}%
                    </span>

                    <div
                      className="w-full relative overflow-hidden transition-all duration-500 hover:opacity-90 rounded-t-lg"
                      style={{ height: `${heightPx}px` }}
                      title={`${cell.name}: ${cell.value}% load, ${cell.taskCount} tasks, ${cell.lateCount} late`}
                    >
                      <div
                        className={`absolute inset-0 rounded-t-lg ${
                          cell.atRisk
                            ? "bg-gradient-to-t from-red-400/80 to-red-300/60"
                            : "bg-gradient-to-t from-indigo-400/60 to-violet-300/40"
                        }`}
                      />
                      <div className="absolute inset-0">
                        {[25, 50, 75].map((line) => (
                          <div key={line} className="absolute w-full border-t border-white/20" style={{ bottom: `${line}%` }} />
                        ))}
                      </div>
                    </div>

                    <span className={`text-[9px] mt-2 font-semibold text-center leading-tight ${cell.atRisk ? "text-red-500" : "text-slate-600"}`}>
                      {cell.name.length > 14 ? `${cell.name.slice(0, 13)}…` : cell.name}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {cell.taskCount} task{cell.taskCount === 1 ? "" : "s"}
                      {cell.lateCount > 0 && <span className="text-red-400"> · {cell.lateCount} late</span>}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="absolute left-3 top-14 bottom-8 flex flex-col justify-between">
              {[100, 75, 50, 25, 0].map((val) => (
                <span key={val} className="text-[8px] text-slate-400">{val}%</span>
              ))}
            </div>

            <div className="absolute top-3 right-3 flex gap-3 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-slate-200">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-indigo-400/60 to-violet-300/40" />
                <span className="text-[9px] text-slate-500">Normal Load</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-red-400/80 to-red-300/60" />
                <span className="text-[9px] text-red-500">High Risk</span>
              </div>
            </div>
          </div>

          {highRisk.length > 0 && (
            <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-2">
              <Icon name="warning" size={18} className="text-red-500 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-red-700 block">
                  {highRisk.length === 1
                    ? `${highRisk[0].name} needs attention`
                    : `${highRisk.length} milestones need attention`}
                </span>
                <span className="text-[10px] text-red-500">
                  {highRisk
                    .slice(0, 3)
                    .map((c) => `${c.name} at ${c.value}% load${c.lateCount > 0 ? ` with ${c.lateCount} late` : ""}`)
                    .join("; ")}
                  . Consider moving work or adding people here first.
                </span>
              </div>
            </div>
          )}

          <p className="text-[9px] text-slate-400 mt-3 text-right">
            {totalLate} of {tasks.length} tasks past due · calculated from this project's live task list
          </p>
        </>
      )}
    </GlassCard>
  );
}
