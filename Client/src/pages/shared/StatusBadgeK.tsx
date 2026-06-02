import { classNames } from "../../ui";
import { projectStatuses, taskStatuses } from "../constants";
import type { Role } from "../../types";
import { getStatusColor } from "./colors";
import { Permission, useRoleAccess } from "./RoleGate";


const ANIMATIONS = {
  base: "transition-all duration-200 ease-out",
  hoverScale: "hover:scale-[1.03]",
  pressScale: "active:scale-[0.97]",
  focusRing: "focus:outline-none focus:ring-2 focus:ring-offset-1",
} as const;


interface StatusBadgeMinimalProps {
  status: string;
  isActive?: boolean;
  onClick?: (status: string) => void;
  disabled?: boolean;
  showDot?: boolean;
  className?: string;
}

export function StatusBadgeK({
  status,
  isActive = false,
  onClick,
  disabled = false,
  showDot = true,
  className,
}: StatusBadgeMinimalProps) {
  const styles = getStatusColor(status);
  const isInteractive = !!onClick && !disabled;

  return (
    <button
      type="button"
      disabled={!isInteractive}
      onClick={() => onClick?.(status)}
      className={classNames(
        // Layout
        "group relative inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border",
        // Animations
        ANIMATIONS.base,
        ANIMATIONS.focusRing,
        isInteractive && ANIMATIONS.hoverScale,
        isInteractive && ANIMATIONS.pressScale,
        // Inactive state — neutral minimal
        !isActive && "bg-white text-slate-400 border-slate-200",
        // Hover reveal (interactive + inactive)
        isInteractive && !isActive && `hover:${styles.bg} hover:${styles.text} hover:${styles.border}`,
        isInteractive && !isActive && "hover:shadow-sm",
        // Active state — real solid color
        isActive && `${styles.dot} text-white border-transparent shadow-sm`,
        // Disabled
        disabled && "opacity-50 cursor-not-allowed",
        // Cursor
        isInteractive ? "cursor-pointer" : "cursor-default",
        className
      )}
      title={isInteractive ? `Change status to ${status}` : `Status: ${status}`}
    >
      {showDot && (
        <span
          className={classNames(
            "w-1.5 h-1.5 rounded-full transition-transform duration-200",
            isActive ? "bg-white/90 scale-110" : styles.dot,
            !isActive && "opacity-60",
            isInteractive && !isActive && "group-hover:scale-125 group-hover:opacity-100"
          )}
        />
      )}
      <span className="leading-none">{status}</span>
      {isActive && (
        <svg
          className="w-3 h-3 ml-0.5 opacity-90"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}


// StatusButtons 
interface StatusButtonsProps {
  currentStatus: string;
  hasRole?: (...roles: Role[]) => boolean;
  onStatusChange: (status: string) => void;
  variant?: "project" | "task";
}

export function StatusButtonsK({
  currentStatus,
  onStatusChange,
  variant = "project",
}: StatusButtonsProps) {
  const access = useRoleAccess();
  const statuses = variant === "task" ? taskStatuses : projectStatuses;
  const canUpdate = variant === "task"
    ? access.can(Permission.TaskEdit)
    : access.can(Permission.ProjectEdit);

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((status) => {
        const styles = getStatusColor(status);
        const isActive = currentStatus === status;

        return (
          <button
            key={status}
            type="button"
            onClick={canUpdate ? () => onStatusChange(status) : undefined}
            disabled={!canUpdate}
            className={classNames(
              // Layout
              "group relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border",
              // Animations (shared with StatusBadgeMinimal)
              ANIMATIONS.base,
              ANIMATIONS.focusRing,
              canUpdate && !isActive && ANIMATIONS.hoverScale,
              canUpdate && ANIMATIONS.pressScale,
              // Inactive state — neutral minimal
              !isActive && "bg-white text-slate-400 border-slate-200",
              // Hover reveal (interactive + inactive)
              canUpdate && !isActive && `hover:${styles.bg} hover:${styles.text} hover:${styles.border}`,
              canUpdate && !isActive && "hover:shadow-sm",
              // Active state — real solid color
              isActive && `${styles.dot} text-white border-transparent shadow-sm`,
              // Disabled
              !canUpdate && "opacity-50 cursor-not-allowed",
              // Cursor
              canUpdate ? "cursor-pointer" : "cursor-default"
            )}
            title={canUpdate ? `Change status to ${status}` : `Status: ${status}`}
          >
            <span
              className={classNames(
                "w-1.5 h-1.5 rounded-full transition-transform duration-200",
                isActive ? "bg-white/90 scale-110" : styles.dot,
                !isActive && "opacity-60",
                canUpdate && !isActive && "group-hover:scale-125 group-hover:opacity-100"
              )}
            />
            <span className="leading-none">{status}</span>
            {isActive && (
              <svg
                className="w-3 h-3 ml-0.5 opacity-90"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
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