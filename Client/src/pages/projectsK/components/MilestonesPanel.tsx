import type { Milestone, Project, Task, User } from "../../../types";
import { GlassCard, getStatusColor } from "../../shared";
import { MilestoneDetail } from "../../milestones/MilestoneDetail";

interface MilestonesPanelProps {
  milestones: Milestone[];
  tasks: Task[];
  users: User[];
  project?: Project | null;
  selectedMilestoneId: string;
  onSelectMilestone: (id: string) => void;
  canManage: boolean;
  onAdd: () => void;
  onEdit: (milestone: Milestone) => void;
  onDelete: (milestone: Milestone) => void;
  onComplete: (milestoneId: string) => void;
  onAddTask: (milestoneId: string) => void;
}

export function MilestonesPanel({
  milestones,
  tasks,
  users,
  project,
  selectedMilestoneId,
  onSelectMilestone,
  canManage,
  onAdd,
  onEdit,
  onDelete,
  onComplete,
  onAddTask,
}: MilestonesPanelProps) {
  const selected = milestones.find((m) => m.id === selectedMilestoneId) ?? null;
  const milestoneTasks = selected ? tasks.filter((t) => t.milestoneId === selected.id) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_1fr] gap-6">
      {/* Milestones List */}
      <GlassCard className="p-4 max-h-[calc(100vh-340px)] flex flex-col">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Milestones
          </span>
          {canManage && (
             <button type="button" onClick={onAdd} className="text-indigo-600 hover:text-indigo-800">
          <span className="material-symbols-outlined text-lg">add</span>
      </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
          {milestones.map((milestone, index) => {
            const isSelected = milestone.id === selectedMilestoneId;
            const statusColors = getStatusColor(milestone.status);
            const progress = milestone.progressPercentage || 0;

            return (
              <button
                key={milestone.id}
                onClick={() => onSelectMilestone(milestone.id)}
                className={`text-left p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? "bg-indigo-50 border border-indigo-200 shadow-sm"
                    : "bg-white border border-transparent hover:bg-slate-50 hover:border-slate-200"
                }`}
                style={{ animation: `slideIn 0.3s ease ${index * 0.05}s both` }}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    milestone.isCritical ? "bg-red-100" : "bg-slate-100"
                  }`}>
                    <span className={`material-symbols-outlined text-lg ${
                      milestone.isCritical ? "text-red-500" : "text-slate-400"
                    }`}>
                      {milestone.status === "Completed" ? "check_circle" : "flag"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-slate-800 truncate">
                        {milestone.name}
                      </span>
                      {milestone.isCritical && (
                        <span className="text-[10px] font-bold text-red-500 uppercase bg-red-50 px-1.5 py-0.5 rounded">
                          Critical
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${statusColors.dot}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 shrink-0 tabular-nums">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-medium ${statusColors.text}`}>
                        {milestone.status}
                      </span>
                      {milestone.dueDate && (
                        <span className="text-[10px] text-slate-400">
                          Due {new Date(milestone.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}

          {milestones.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-3 block">flag</span>
              <p className="text-sm font-medium">No milestones yet</p>
              <p className="text-xs mt-1">Create your first milestone for this project</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Milestone Detail */}
      <div className="flex flex-col gap-5">
        {selected ? (
          <MilestoneDetail
            milestone={selected}
            tasks={milestoneTasks}
            project={project}
            users={users}
            onComplete={() => onComplete(selected.id)}
            onEdit={() => onEdit(selected)}
            onDelete={() => onDelete(selected)}
            onAddTask={() => onAddTask(selected.id)}
            isAdmin={canManage}
          />
        ) : (
          <GlassCard className="p-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total Milestones" value={milestones.length} color="indigo" />
              <StatCard label="Completed" value={milestones.filter((m) => m.status === "Completed").length} color="emerald" />
              <StatCard label="Critical" value={milestones.filter((m) => m.isCritical).length} color="rose" />
              <StatCard label="Avg Progress" value={milestones.length ? `${Math.round(milestones.reduce((s, m) => s + (m.progressPercentage || 0), 0) / milestones.length)}%` : "0%"} color="amber" />
            </div>
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 mx-auto">
                <span className="material-symbols-outlined text-4xl text-slate-400">flag</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Select a Milestone</h3>
              <p className="text-sm text-slate-400  mx-auto">
                Choose a milestone from the left panel to view its details and associated tasks
              </p>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
    rose: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
  };
  const colors = colorMap[color] || colorMap.indigo;

  return (
    <div className={`rounded-xl border p-4 text-center ${colors.border} ${colors.bg}`}>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors.text}`}>{value}</p>
    </div>
  );
}
