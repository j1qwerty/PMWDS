import type { Task } from "../../../types";
import { getPriorityColor, getStatusColor } from "../colors";
import { InfoTip } from "../../shared";
import { DASHBOARD_OVERVIEW_CARD_HEIGHT } from "../../constants";

type HighRiskInterventionsProps = {
  tasks?: Task[];
  /**
   * Navigate to the escalated task. The card renders the project on each row
   * but the deep link needs the id, so the handler lives on the page.
   */
  onSelectTask?: (task: Task) => void;
};

export function HighRiskInterventions({ tasks = [], onSelectTask }: HighRiskInterventionsProps) {
  return (
    <section className={`max-w-150 flex flex-col gap-[clamp(1px,0.4vw,8px)] bg-white rounded-2xl p-6 shadow-md  p-[clamp(8px,2vw,32px)] border border-slate-100 hover:shadow-blue-200 ${DASHBOARD_OVERVIEW_CARD_HEIGHT} overflow-hidden`}>
      <div className="flex items-center gap-[clamp(4px,1vw,8px)] border-b border-slate-300 pb-1 shrink-0">
        <span className="material-symbols-outlined text-error text-[clamp(16px,2vw,24px)]">warning</span>
        <h2 className="text-[clamp(12px,1.5vw,16px)] font-semibold text-on-surface">High-Risk Escalations</h2>
        {tasks.length > 0 && (
          // Count only. The card title already says what the number is, and
          // "12 escalated" wrapped the header on a narrow column.
          <span
            title={`${tasks.length} escalated task${tasks.length === 1 ? "" : "s"}`}
            className="min-w-[18px] text-center px-[clamp(4px,0.8vw,6px)] py-[clamp(1px,0.3vw,3px)] rounded-full bg-red-100 text-red-600 text-[clamp(8px,1vw,10px)] font-bold tabular-nums"
          >
            {tasks.length}
          </span>
        )}
        <span className="ml-auto">
          <InfoTip
            title="High-Risk Escalations"
            summary="The number is how many tasks have been escalated because they are stuck or at risk. An escalation is raised automatically when a task passes its due date without finishing, and it can also be raised by a manager."
            points={[
              "Each row shows the task, the project it belongs to, who owns it, and when it was due.",
            ]}
            note="Escalated tasks are not deleted - resolving one returns it to the normal task list."
          />
        </span>
      </div>

      <div className="flex flex-col gap-[clamp(4px,0.8vw,6px)] flex-1 min-h-0 overflow-y-auto pr-1">
        {tasks.map((task) => {
          const priorityColor = getPriorityColor(task.priority);
          const statusColor = getStatusColor(task.status);

          // The milestone and escalation level used to be a third line under
          // each row, which made every row tall enough that only two or three
          // were visible. They move into the tooltip instead, so the detail is
          // still there but the list is readable at a glance.
          const tooltip = [
            task.title,
            task.projectName || "No project",
            task.milestoneName ? `Milestone: ${task.milestoneName}` : "No milestone",
            task.escalationLevel > 0 ? `Escalation level ${task.escalationLevel}` : null,
            task.assignedToUserName ? `Owner: ${task.assignedToUserName}` : null,
            task.dueDate ? `Due ${new Date(task.dueDate).toLocaleDateString()}` : null,
            onSelectTask ? "Click to open this task" : null,
          ]
            .filter(Boolean)
            .join("\n");

          return (
            <button
              key={task.id}
              type="button"
              onClick={() => onSelectTask?.(task)}
              disabled={!onSelectTask}
              title={tooltip}
              className={`group shrink-0 text-left p-[clamp(8px,1.5vw,12px)] rounded-lg border ${statusColor.border} ${statusColor.bg} relative overflow-hidden transition-shadow ${
                onSelectTask ? "cursor-pointer hover:shadow-md" : "cursor-default"
              }`}
            >
              <div className={`absolute top-[clamp(6px,1vw,8px)] right-[clamp(6px,1vw,8px)] w-[clamp(6px,0.8vw,8px)] h-[clamp(6px,0.8vw,8px)] rounded-full ${statusColor.dot}`} />

              <div className={`flex items-center gap-[clamp(4px,0.8vw,8px)] mb-[clamp(2px,0.4vw,4px)]`}>
                <span className={`px-[clamp(4px,1vw,6px)] py-[clamp(2px,0.4vw,4px)] rounded text-[clamp(8px,1vw,10px)] font-bold uppercase ${priorityColor.bg} ${priorityColor.text} ${priorityColor.border} border`}>
                  {task.priority}
                  {task.dueDate && ` • Due ${new Date(task.dueDate).toLocaleDateString()}`}

                </span>
                <h3 className="text-[clamp(11px,1.4vw,14px)] font-semibold text-on-surface truncate flex-1 group-hover:text-primary transition-colors">
                  {task.title}
                </h3>
                {onSelectTask && (
                  <span className="material-symbols-outlined text-[clamp(12px,1.4vw,15px)] text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    chevron_right
                  </span>
                )}
              </div>

              <p className="text-[clamp(9px,1.1vw,11px)] text-on-surface-variant truncate">
                proj: {task.projectName || "General"}
                {task.assignedToUserName && ` • ${task.assignedToUserName}`}
              </p>
            </button>
          );
        })}

        {tasks.length === 0 && (
          <div className="p-[clamp(12px,2vw,16px)]  text-center">
            <span className="material-symbols-outlined text-outline text-[clamp(18px,2.5vw,24px)] mb-[clamp(2px,0.4vw,4px)]">check_circle</span>
            <p className="text-[clamp(9px,1.1vw,11px)] text-slate-500">No escalated tasks</p>
          </div>
        )}
      </div>
    </section>
  );
}
