import type { NotificationItem } from "../../types";

/**
 * Resolve the in-app route a notification should open.
 *
 * The backend already writes a routable ActionUrl for every notification it
 * creates (see NotificationLinks on the server). This resolves that URL and,
 * for rows written before those links existed or by a broadcast with no
 * target, falls back to a sensible page so a click never dead-ends.
 */
export function notificationTarget(item: NotificationItem): string {
  const url = normalize(item.actionUrl);
  if (url) return url;

  switch (item.type) {
    case "AIInsight":
      return "/ai";
    case "SystemAlert":
      return "/notificationsPage";
    default:
      return "/notificationsPage";
  }
}

/** True when clicking the notification should actually navigate. */
export function hasNotificationTarget(item: NotificationItem): boolean {
  return notificationTarget(item).length > 0;
}

/**
 * Accepts only same-origin absolute paths. An ActionUrl is data, not a
 * trusted route, so a "/tasks/{id}" value from an older row - or anything
 * scheme-relative or absolute - is treated as absent and falls through to
 * the type-based default rather than being pushed into navigate().
 */
function normalize(raw?: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value.startsWith("/")) return null;
  // Reject protocol-relative ("//evil.com") and traversal paths.
  if (value.startsWith("//")) return null;
  if (value.includes("..")) return null;
  return value;
}

/** Human label for the destination, used as the row's secondary hint. */
export function notificationTargetLabel(item: NotificationItem): string {
  const target = notificationTarget(item);
  if (target.startsWith("/projects/")) {
    const tab = target.split("/")[3]?.split("?")[0];
    if (tab === "tasks") return "Open task";
    if (tab === "milestones") return "Open milestones";
    return "Open project";
  }
  if (target.startsWith("/ai")) return "Open AI insights";
  if (target.startsWith("/reports")) return "Open reports";
  return "Go to notifications";
}

/**
 * Icon + colour for a notification, keyed off the backend enum
 * (NotificationType / NotificationPriority) rather than free text.
 */
export function notificationVisual(item: NotificationItem): {
  icon: string;
  accent: string;
  chip: string;
} {
  const urgent = item.priority === "Urgent" || item.priority === "High";

  const byType: Record<string, { icon: string; accent: string; chip: string }> = {
    TaskAssigned: {
      icon: "assignment_ind",
      accent: "bg-indigo-50 text-indigo-600",
      chip: "bg-indigo-50 text-indigo-600 border-indigo-100",
    },
    TaskDeadline: {
      icon: "schedule",
      accent: "bg-amber-50 text-amber-600",
      chip: "bg-amber-50 text-amber-600 border-amber-100",
    },
    TaskDelayed: {
      icon: "running_with_errors",
      accent: "bg-rose-50 text-rose-600",
      chip: "bg-rose-50 text-rose-600 border-rose-100",
    },
    TaskEscalated: {
      icon: "priority_high",
      accent: "bg-red-50 text-red-600",
      chip: "bg-red-50 text-red-600 border-red-100",
    },
    MilestoneAlert: {
      icon: "flag",
      accent: "bg-violet-50 text-violet-600",
      chip: "bg-violet-50 text-violet-600 border-violet-100",
    },
    ProjectAlert: {
      icon: "folder",
      accent: "bg-sky-50 text-sky-600",
      chip: "bg-sky-50 text-sky-600 border-sky-100",
    },
    BudgetAlert: {
      icon: "account_balance_wallet",
      accent: "bg-emerald-50 text-emerald-600",
      chip: "bg-emerald-50 text-emerald-600 border-emerald-100",
    },
    AIInsight: {
      icon: "auto_awesome",
      accent: "bg-fuchsia-50 text-fuchsia-600",
      chip: "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100",
    },
    SystemAlert: {
      icon: "campaign",
      accent: "bg-slate-100 text-slate-600",
      chip: "bg-slate-100 text-slate-600 border-slate-200",
    },
  };

  const mapped = byType[item.type];
  if (mapped) return mapped;

  // Unknown type: fall back to urgency so nothing renders as unstyled text.
  return urgent
    ? { icon: "error", accent: "bg-red-50 text-red-600", chip: "bg-red-50 text-red-600 border-red-100" }
    : { icon: "info", accent: "bg-blue-50 text-blue-600", chip: "bg-blue-50 text-blue-600 border-blue-100" };
}

/** Chip colour for the priority badge. Matches the C# enum names exactly. */
export function priorityChip(priority: string): string {
  switch (priority) {
    case "Urgent":
      return "bg-red-50 text-red-700 border-red-200";
    case "High":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "Low":
      return "bg-slate-50 text-slate-600 border-slate-200";
    case "Normal":
    default:
      return "bg-blue-50 text-blue-600 border-blue-100";
  }
}
