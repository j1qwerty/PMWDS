import { classNames } from "../../ui";
import { projectStatuses, taskStatuses } from "../constants";
import type { Role } from "../../types";
import { getStatusColor } from "./colors";

interface StatusButtonsProps {
  currentStatus: string;
  hasRole: (...roles: Role[]) => boolean;
  onStatusChange: (status: string) => void;
  variant?: "project" | "task";
}

export function StatusButtons({
  currentStatus,
  hasRole,
  onStatusChange,
  variant = "project",
}: StatusButtonsProps) {
  const statuses = variant === "task" ? taskStatuses : projectStatuses;

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((status) => {
        const canUpdate = variant === "task"
          ? hasRole("SuperAdmin", "Director", "ProjectManager", "DepartmentHead")
          : hasRole("SuperAdmin", "Director", "ProjectManager", "DepartmentHead");
        const styles = getStatusColor(status);
        const isActive = currentStatus === status;

        return (
          <button
            key={status}
            onClick={canUpdate ? () => onStatusChange(status) : undefined}
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
            title={canUpdate ? `Change status to ${status}` : `Status: ${status}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`}></span>
            {status}
            {isActive && (
              <span className="material-symbols-outlined text-[14px]">check</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = getStatusColor(status);

  return (
    <span className={classNames(
      "px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5",
      styles.bg,
      styles.text
    )}>
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`}></span>
      {status}
    </span>
  );
}