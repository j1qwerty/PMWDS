import type { Task } from "../../../types";
import { getDepartmentColor, getPriorityColor } from "../colors";

type HighRiskInterventionsCompactProps = {
  tasks?: Task[];
};

export function HighRiskInterventionsCompact({ tasks = [] }: HighRiskInterventionsCompactProps) {
  const highRiskTasks = tasks.filter(
    task => task.priority === "Critical" || task.priority === "High" || task.status === "Delayed" || task.isOverdue
  );

  return (
    <section className="w-full max-w-150 flex flex-col gap-2 bg-surface-container-lowest rounded-xl p-md ambient-glow  shadow-md">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-error text-lg">warning</span>
        <h2 className="text-lg font-semibold text-slate-700">High-Risk Interventions</h2>
        {highRiskTasks.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
            {highRiskTasks.length} critical
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {highRiskTasks.slice(0, 4).map((task, index) => {
          const deptColor = getDepartmentColor(index);
          const priorityColor = getPriorityColor(task.priority);

          return (
            <div
              key={task.id}
              className={`p-3 rounded-xl border ${deptColor.border} ${deptColor.bg} ${deptColor.hover} relative overflow-hidden transition-colors`}
            >
              <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${deptColor.dot}`} />
              
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${priorityColor.bg} ${priorityColor.text} ${priorityColor.border} border`}>
                  {task.priority}
                </span>
                <h3 className="text-lg font-semibold text-slate-700 truncate flex-1">{task.title}</h3>
              </div>
              
              <p className="text-xs text-slate-500 truncate">
                {task.projectName || "General"}
                {task.assignedToUserName && ` • ${task.assignedToUserName}`}
              </p>
            </div>
          );
        })}

        {highRiskTasks.length === 0 && (
          <div className="p-4 rounded-xl border border-slate-200 text-center">
            <span className="material-symbols-outlined text-slate-300 text-2xl mb-1">check_circle</span>
            <p className="text-xs text-slate-500">No high-risk tasks</p>
          </div>
        )}
      </div>
    </section>
  );
}