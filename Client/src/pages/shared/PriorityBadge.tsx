import { classNames } from "../../ui";
import { priorities } from "../constants";
import type { Role } from "../../types";

interface PriorityButtonsProps {
  currentPriority: string;
  hasRole: (...roles: Role[]) => boolean;
  onPriorityChange: (priority: string) => void;
}

export function PriorityButtons({
  currentPriority,
  hasRole,
  onPriorityChange,
}: PriorityButtonsProps) {
  const priorityStyles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    Low: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-300", dot: "bg-slate-400" },
    Medium: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
    High: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-500" },
    Critical: { bg: "bg-error-container", text: "text-error", border: "border-error/30", dot: "bg-error" },
  };

  return (
    <div className="flex flex-wrap gap-2">
      {priorities.map((priority) => {
        const canUpdate = hasRole("SuperAdmin", "Director", "ProjectManager", "DepartmentHead");
        const styles = priorityStyles[priority] || priorityStyles.Low;
        const isActive = currentPriority === priority;

        return (
          <button
            key={priority}
            onClick={canUpdate ? () => onPriorityChange(priority) : undefined}
            disabled={!canUpdate}
            className={classNames(
              "px-3 py-1.5 text-xs font-bold rounded-full border transition-all flex items-center gap-1.5",
              styles.bg,
              styles.text,
              isActive ? `${styles.border} ring-2 ring-offset-1 ${styles.border}` : "border-transparent",
              canUpdate
                ? "cursor-pointer hover:shadow-md hover:scale-105"
                : "cursor-default opacity-90"
            )}
            title={canUpdate ? `Change priority to ${priority}` : `Priority: ${priority}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`}></span>
            {priority}
            {isActive && (
              <span className="material-symbols-outlined text-[14px]">check</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface PriorityBadgeProps {
  priority: string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const priorityStyles: Record<string, { bg: string; text: string; dot: string }> = {
    Low: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
    Medium: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
    High: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
    Critical: { bg: "bg-error-container", text: "text-error", dot: "bg-error" },
  };

  const styles = priorityStyles[priority] || priorityStyles.Low;

  return (
    <span className={classNames(
      "px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5",
      styles.bg,
      styles.text
    )}>
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`}></span>
      {priority}
    </span>
  );
}
