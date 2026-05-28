import type { Task } from "../../../types";
import { getPriorityColor, getStatusColor } from "../colors";

type HighRiskInterventionsProps = {
  tasks?: Task[];
};

export function HighRiskInterventions({ tasks = [] }: HighRiskInterventionsProps) {
  const highRiskTasks = tasks.filter(
    task => task.priority === "Critical" || task.priority === "High" || task.status === "Delayed" || task.isOverdue
  );

  return (
    <section className=" max-w-150 flex flex-col gap-2 bg-surface-container-lowest rounded-xl p-md ambient-glow ">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-error text-lg">warning</span>
        <h2 className="text-lg font-semibold text-on-surface">High-Risk Interventions</h2>
        {highRiskTasks.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
            {highRiskTasks.length} critical
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {highRiskTasks.slice(0, 4).map((task) => {
          const priorityColor = getPriorityColor(task.priority);
          const statusColor = getStatusColor(task.status);
          const isCritical = task.priority === "Critical" || task.status === "Delayed";

          return (
            <div
              key={task.id}
              className={`p-3 rounded-xl border ${statusColor.border} ${statusColor.bg} relative overflow-hidden`}
            >
              <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${statusColor.dot}`} />
              
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${priorityColor.bg} ${priorityColor.text} ${priorityColor.border} border`}>
                  {task.priority}
                </span>
                <h3 className="text-sm font-semibold text-on-surface truncate flex-1">{task.title}</h3>
              </div>
              
              <p className="text-xs text-on-surface-variant truncate">
                {task.projectName || "General"}
                {task.assignedToUserName && ` • ${task.assignedToUserName}`}
                {task.dueDate && ` • Due ${new Date(task.dueDate).toLocaleDateString()}`}
              </p>
            </div>
          );
        })}

        {highRiskTasks.length === 0 && (
          <div className="p-4 rounded-xl border border-slate-200 text-center">
            <span className="material-symbols-outlined text-outline text-2xl mb-1">check_circle</span>
            <p className="text-xs text-slate-500">No high-risk tasks</p>
          </div>
        )}
      </div>
    </section>
  );
}