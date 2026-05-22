import { classNames } from "../../ui";
import { projectStatuses, taskStatuses } from "../constants";
import type { Role } from "../../types";

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

  const statusStyles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    NotStarted: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-300", dot: "bg-slate-400" },
    Assigned: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
    InProgress: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/30", dot: "bg-primary" },
    Completed: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
    Delayed: { bg: "bg-error-container", text: "text-error", border: "border-error/30", dot: "bg-error" },
    OnHold: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
    Cancelled: { bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200", dot: "bg-slate-400" },
  };

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((status) => {
        const canUpdate = variant === "task"
          ? hasRole("SuperAdmin", "Director", "ProjectManager", "DepartmentHead")
          : hasRole("SuperAdmin", "Director", "ProjectManager", "DepartmentHead");
        const styles = statusStyles[status] || statusStyles.NotStarted;
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
  const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
    NotStarted: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
    Assigned: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
    InProgress: { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary" },
    Completed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    Delayed: { bg: "bg-error-container", text: "text-error", dot: "bg-error" },
    OnHold: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
    Cancelled: { bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-400" },
  };

  const styles = statusStyles[status] || statusStyles.NotStarted;

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
