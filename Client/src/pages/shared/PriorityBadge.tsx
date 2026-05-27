import { classNames } from "../../ui";
import { priorities } from "../constants";
import type { Role } from "../../types";
import { getPriorityColor } from "./colors";

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
  return (
    <div className="flex flex-wrap gap-2">
      {priorities.map((priority) => {
        const canUpdate = hasRole("SuperAdmin", "Director", "ProjectManager", "DepartmentHead");
        const styles = getPriorityColor(priority);
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
  const styles = getPriorityColor(priority);

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