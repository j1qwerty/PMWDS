import type { Task } from "../../types";
import { StatusBadge } from "./StatusBadge";

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
      <div className="bg-surface-container-lowest rounded-xl p-lg ambient-glow">
        <div className="flex justify-between items-center mb-md pb-sm border-b border-surface-variant">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">check_circle</span>
            <h2 className="font-h2 text-h2 text-on-surface">{title}</h2>
          </div>
          {subtitle && <span className="text-outline font-label-caps text-[10px]">{subtitle}</span>}
        </div>
        <div className="flex flex-col items-center justify-center py-lg text-center">
          <span className="material-symbols-outlined text-outline text-4xl mb-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            assignment
          </span>
          <p className="text-on-surface-variant text-sm">No tasks found</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "No due date";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="bg-surface-container-lowest rounded-xl p-lg ambient-glow">
      <div className="flex justify-between items-center mb-md pb-sm border-b border-surface-variant">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary">check_circle</span>
          <h2 className="font-h2 text-h2 text-on-surface">{title}</h2>
        </div>
        {subtitle && <span className="text-outline font-label-caps text-[10px]">{subtitle}</span>}
      </div>
      <div className="flex flex-col">
        {tasks.map((task) => {
          const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "Completed";

          return (
            <div
              key={task.id}
              className="flex items-center justify-between py-md px-sm rounded-lg hover:bg-surface-container-low transition-colors group border-b border-surface-variant/50 last:border-b-0"
            >
              <div className="flex items-center gap-md">
                <span className={`material-symbols-outlined ${task.status === "Completed" ? "text-primary" : "text-outline"} group-hover:text-primary transition-colors`}>
                  {task.status === "Completed" ? "check_circle" : "radio_button_unchecked"}
                </span>
                <div className="flex flex-col">
                  <span className="font-body-md text-on-surface font-medium">{task.title}</span>
                  <span className="text-[11px] text-on-surface-variant">
                    {task.projectName || "Standalone"} • due {formatDate(task.dueDate)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-xl">
                <div className="w-24">
                  <div className="flex flex-col gap-xs">
                    <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                      <div 
                        className="h-full primary-gradient rounded-full" 
                        style={{ width: `${task.progressPercentage}%` }} 
                      />
                    </div>
                    <span className="text-[11px] font-numeric text-on-surface-variant text-right">
                      {task.progressPercentage}% Complete
                    </span>
                  </div>
                </div>
                {isOverdue && (
                  <span className="px-sm py-[2px] bg-error-container text-error rounded-full text-[11px] font-medium flex items-center gap-xs">
                    <span className="w-1 h-1 rounded-full bg-error"></span> Overdue
                  </span>
                )}
                <StatusBadge status={task.status} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}