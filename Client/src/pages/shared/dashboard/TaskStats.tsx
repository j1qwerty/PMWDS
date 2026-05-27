import type { Task } from "../../../types";

type TaskStatsProps = {
  tasks?: Task[];
};

function StatCard({ icon, value, label, tone }: { icon: string; value: number; label: string; tone: string }) {
  return (
    <div className="shadow-md relative overflow-hidden rounded-xl p-4 h-full flex flex-col justify-between border border-slate-100 bg-white">
      <div className={`absolute bottom-1/2 right-0 w-24 h-24 rounded-full blur-lg pointer-events-none opacity-30 ${tone}`} />
      <div className="relative flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
          <span className="material-symbols-outlined text-base text-slate-700">{icon}</span>
        </div>
        <span className="text-xs font-medium text-slate-500 uppercase">{label}</span>
      </div>
      <span className="relative mt-2 text-2xl font-bold text-slate-800">{value.toLocaleString()}</span>
    </div>
  );
}

export default function TaskStats({ tasks = [] }: TaskStatsProps) {
  const stats = [
    { icon: "task_alt", value: tasks.length, label: "Total Tasks", tone: "bg-cyan-100" },
    { icon: "schedule", value: tasks.filter(task => task.status === "InProgress").length, label: "In Progress", tone: "bg-yellow-100" },
    { icon: "pause_circle", value: tasks.filter(task => task.status === "OnHold").length, label: "On Hold", tone: "bg-slate-100" },
    { icon: "check_circle", value: tasks.filter(task => task.status === "Completed" || task.progressPercentage === 100).length, label: "Completed", tone: "bg-emerald-100" },
    { icon: "warning", value: tasks.filter(task => task.isOverdue || task.status === "Delayed").length, label: "Delayed", tone: "bg-red-100" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      {stats.map(stat => <StatCard key={stat.label} {...stat} />)}
    </div>
  );
}
