import type { Task } from "../../types";

export function TaskList({
  tasks,
  title = "Tasks",
  subtitle,
}: {
  tasks: Task[];
  title?: string;
  subtitle?: string;
}) {
  if (!tasks.length) {
    return (
      <div className="bg-slate-900/50 rounded-xl p-lg border border-slate-700/30">
        <div className="flex justify-between items-center mb-md pb-sm border-b border-slate-700/30">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-[#818cf8]">task</span>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
          </div>
          {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
        </div>
        <div className="flex flex-col items-center justify-center py-lg text-center">
          <span className="material-symbols-outlined text-slate-500 text-4xl mb-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            task
          </span>
          <p className="text-slate-400 text-sm">No tasks found</p>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, { bg: string; text: string }> = {
    NotStarted: { bg: "bg-slate-700/30", text: "text-slate-400" },
    Assigned: { bg: "bg-[#4648d4]/20", text: "text-[#818cf8]" },
    InProgress: { bg: "bg-amber-500/20", text: "text-amber-400" },
    Completed: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
    Delayed: { bg: "bg-rose-500/20", text: "text-rose-400" },
    OnHold: { bg: "bg-slate-600/30", text: "text-slate-400" },
    Cancelled: { bg: "bg-slate-700/30", text: "text-slate-500" },
  };

  const priorityIcons: Record<string, string> = {
    Critical: "priority_high",
    High: "keyboard_double_arrow_up",
    Medium: "task",
    Low: "arrow_downward",
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "No due date";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

return (
    <div className="bg-slate-900/50 rounded-xl p-lg border border-slate-700/30">
      <div className="flex justify-between items-center mb-md pb-sm border-b border-slate-700/30">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-[#818cf8]">task</span>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
      </div>
      <div className="flex flex-col gap-xs">
        {tasks.map((task) => {
          const colors = statusColors[task.status] || statusColors.NotStarted;
          const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "Completed";

          return (
            <div
              key={task.id}
              className="flex items-center gap-md p-md rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-[#4648d4]/50 hover:bg-[#4648d4]/10 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-lg bg-slate-700/50 border border-slate-600 flex items-center justify-center flex-shrink-0 group-hover:border-[#4648d4] group-hover:bg-[#4648d4]/20 transition-all">
                <span className="material-symbols-outlined text-slate-400 text-xl group-hover:text-[#818cf8] transition-colors" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {priorityIcons[task.priority] || "task"}
                </span>
              </div>
              <div className="flex flex-col flex-grow min-w-0">
                <span className="text-white font-medium truncate">{task.title}</span>
                <span className="text-xs text-slate-400">{task.projectName || "Standalone"} • due {formatDate(task.dueDate)}</span>
              </div>
              <div className="flex flex-col items-end gap-xs flex-shrink-0 w-40">
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#4648d4] to-[#818cf8] rounded-full" style={{ width: `${task.progressPercentage}%` }} />
                </div>
                <span className="text-xs text-slate-400 text-right">{task.progressPercentage}% Complete</span>
                {isOverdue && <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 text-[10px] rounded font-medium">Overdue</span>}
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>{task.status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}