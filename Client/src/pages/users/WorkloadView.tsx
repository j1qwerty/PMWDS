import type { WorkloadReport } from "../../types";
import { formatPercent } from "../../ui";
import { GlassCard } from "../shared";

interface WorkloadViewProps {
  workload: WorkloadReport | null;
}

export function WorkloadView({ workload }: WorkloadViewProps) {
  const members = workload?.members || [];
  const departments = workload?.departmentId || [];

  if (!members.length && !departments.length) {
    return (
      <GlassCard className="p-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-3xl text-slate-400">monitoring</span>
        </div>
        <h4 className="text-sm font-semibold text-slate-700 mb-2">No workload data</h4>
        <p className="text-xs text-slate-400">Workload telemetry will appear here when users and tasks exist.</p>
      </GlassCard>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Individual Workload */}
      {members.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-500">person</span>
            Individual Workload
          </h3>
          <div className="space-y-4">
            {members.map((member) => {
              const workloadScore = Number(member.workloadScore ?? member.score ?? 0);
              const normalizedScore = workloadScore <= 1 ? workloadScore * 100 : workloadScore;
              const burnoutRaw = Number(member.burnoutRisk ?? 0);
              const burnout = burnoutRaw <= 1 ? burnoutRaw * 100 : burnoutRaw;

              return (
                <div key={member.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50">
                  <img
                    className="size-10 rounded-lg ring-2 ring-white shadow-sm shrink-0"
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=4f46e5&color=fff&size=40`}
                    alt={member.name}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-700 truncate">{member.name}</span>
                      <span className="text-xs text-slate-400 ml-2 shrink-0">
                        Burnout {formatPercent(burnout)}
                      </span>
                    </div>
                    {member.jobTitle && (
                      <p className="text-[10px] text-slate-400 mb-1.5">{member.jobTitle}</p>
                    )}
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          normalizedScore > 80 ? "bg-red-400" : normalizedScore > 60 ? "bg-amber-400" : "bg-emerald-400"
                        }`}
                        style={{ width: `${Math.min(normalizedScore, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-slate-400">Workload</span>
                      <span className="text-[10px] font-semibold text-slate-500">{formatPercent(normalizedScore)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* Department Workload */}
      {departments.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-500">business</span>
            Department Workload
          </h3>
          <div className="space-y-4">
            {departments.map((dept) => {
              const workloadScore = Number(dept.workloadScore ?? dept.score ?? 0);
              const normalizedScore = workloadScore <= 1 ? workloadScore * 100 : workloadScore;

              return (
                <div key={dept.id} className="p-4 rounded-xl bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-semibold text-slate-700">{dept.name}</span>
                      <span className="text-xs text-slate-400 ml-2">
                        {dept.memberCount} member{dept.memberCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {dept.activeTasks} active tasks
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        normalizedScore > 80 ? "bg-red-400" : normalizedScore > 60 ? "bg-amber-400" : "bg-emerald-400"
                      }`}
                      style={{ width: `${Math.min(normalizedScore, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-slate-400">Load</span>
                    <span className="text-[10px] font-semibold text-slate-500">{formatPercent(normalizedScore)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
}