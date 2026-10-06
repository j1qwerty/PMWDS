import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Task } from "../../../types";
import { getStatusColor } from "../../shared/colors";
import { Icon } from "../../../components/ui/Icon";
import { InfoTip, StatHoverCard, type HoverRow } from "../../shared";

/** Cap on how many tasks the hover panel lists. */
const MAX_ROWS = 10;

/** The five cards, and the server-side bucket each one summarises. */
export type TaskStatKind = "Total" | "InProgress" | "OnHold" | "Completed" | "Delayed";

export type TaskStatBucket = {
  /** Exact count for this bucket, from the server's filtered totalCount. */
  total: number;
  /** A short page of representative tasks for the hover list. */
  items: Task[];
};

/**
 * What a card click asks the task table for.
 *
 * Deliberately able to express "past due" rather than only a status list: the
 * Delayed card counts every overdue task whatever its status, so asking the
 * table for status=Delayed would open a list missing most of them.
 */
export type TaskStatFilter = {
  statuses?: string[];
  overdueOnly?: boolean;
};

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  statusKey: string;
  heading: string;
  hint: string;
  rows: HoverRow[];
  footer: string;
  to: string;
  tip: { summary: string; points?: string[]; note?: string };
  onClick?: () => void;
  /**
   * Whether to show the "?" explainer in the corner.
   *
   * Hidden on the dashboard at the owner's request - the copy is still here and
   * still drives the hover panel, so this is a display switch rather than a removal.
   */
  showInfoTip?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  icon, value, label, statusKey, heading, hint, rows, footer, to, tip, onClick, showInfoTip = true,
}) => {
  const navigate = useNavigate();
  const colors = getStatusColor(statusKey);
  // The hover panel positions itself against the viewport, so it needs this
  // element's rect rather than being laid out inside the card.
  const cardRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    navigate(to);
  };

  return (
    <div ref={cardRef} className={`shadow-sm group relative overflow-visible rounded-2xl p-4 hover:shadow-md transition-all duration-300 h-full flex flex-col justify-between border-0 bg-white`}>
      <StatHoverCard content={{ heading, hint, rows, footer }} anchorRef={cardRef} />

      {/* Animated blur background */}
      <div className={`absolute bottom-1/2 right-0 w-24 h-24 ${colors.bg} rounded-full blur-lg group-hover:opacity-80 transition-all pointer-events-none opacity-40`} />

      {/* Top row - Icon and Label.
          The right padding only existed to keep the label clear of the absolutely
          positioned "?", so it goes when the "?" does. Leaving it would leave a
          visible gap at the end of every label. */}
      <div className={`relative flex items-center gap-2 mb-2 ${showInfoTip ? "pr-5" : ""}`}>
        <div className={`w-8 h-8 ${colors.badgeBg} rounded-lg flex items-center justify-center ${colors.badgeText} shrink-0`}>
          {icon}
        </div>
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider truncate">
          {label}
        </span>
        {showInfoTip && (
          <span className="absolute top-0 right-0">
            <InfoTip title={heading} summary={tip.summary} points={tip.points} note={tip.note} />
          </span>
        )}
      </div>

      {/* Value */}
      <div className="relative mt-2">
        <span className={`text-2xl font-bold text-center tracking-wider block ${colors.text}`}>
          {value.toLocaleString()}
        </span>
      </div>

      <button
        type="button"
        onClick={handleClick}
        className="absolute inset-0 z-10 cursor-pointer rounded-2xl"
        aria-label={`${label}: ${value}. ${hint}`}
      />
    </div>
  );
};

/** Days past the due date for an unfinished task. */
function daysLate(task: Task): number {
  if (!task.dueDate || task.status === "Completed") return 0;
  const due = new Date(task.dueDate).getTime();
  if (Number.isNaN(due)) return 0;
  return Math.max(0, Math.floor((Date.now() - due) / 86_400_000));
}

/**
 * Task rows lead with the task name, then the project it belongs to and the
 * milestone it sits under - without those two a task title alone rarely
 * identifies anything.
 */
function toRow(task: Task, kind: TaskStatKind): HoverRow {
  const context = [task.projectName || "No project", task.milestoneName || "No milestone"];
  const who = task.assignedToUserName ? ` Â· ${task.assignedToUserName}` : "";

  let meta: string | undefined;
  if (kind === "Delayed") {
    const late = daysLate(task);
    meta = late > 0 ? `${late}d late` : "Overdue";
  } else {
    meta = `${Math.round(task.progressPercentage ?? 0)}%`;
  }

  return {
    title: task.title,
    subtitle: `${context.join(" â€¢ ")}${who}`,
    meta,
    status: task.status,
  };
}

const TaskStats: React.FC<{
  /**
   * One bucket per card, each already narrowed by the server.
   *
   * `total` is the exact count for that status and `items` is a short page of
   * representative tasks for the hover list. Counting a single large fetch on
   * the client instead would mean the card number silently capped at whatever
   * page was fetched.
   */
  buckets?: Partial<Record<TaskStatKind, TaskStatBucket>>;
  loading?: boolean;
  /**
   * Called when a card is clicked. The dashboard wires this to the task
   * performance table's status filter so the click filters the list already
   * on screen instead of navigating away to an unrelated route.
   */
  onSelectFilter?: (filter: TaskStatFilter) => void;
  /** Hides the "?" explainer on every card. See StatCardProps.showInfoTip. */
  showInfoTip?: boolean;
}> = ({ buckets = {}, loading = false, onSelectFilter, showInfoTip = true }) => {
  const emptyBucket: TaskStatBucket = { total: 0, items: [] };

  const card = (kind: TaskStatKind) => {
    const bucket = buckets[kind] ?? emptyBucket;

    // The server already ordered these; only the top slice is used.
    const shown = bucket.items.slice(0, MAX_ROWS);

    let footer: string;
    if (loading) {
      footer = "Loading...";
    } else if (bucket.total === 0) {
      footer = "Nothing to show yet";
    } else if (bucket.total <= shown.length) {
      footer =
        bucket.total === 1
          ? "1 task - click to open"
          : `All ${bucket.total} shown - click to open`;
    } else {
      footer = `Top ${shown.length} of ${bucket.total} - click to see all`;
    }

    return {
      rows: shown.map((t) => toRow(t, kind)),
      footer,
      total: bucket.total,
    };
  };

  const totalCard = card("Total");
  const inProgressCard = card("InProgress");
  const onHoldCard = card("OnHold");
  const completedCard = card("Completed");
  const delayedCard = card("Delayed");

  const select = (filter: TaskStatFilter) => () => onSelectFilter?.(filter);

  const stats: StatCardProps[] = [
    {
      icon: <Icon name="file" size={16} />,
      value: totalCard.total,
      label: 'Total Tasks',
      statusKey: 'Total',
      heading: 'Total Tasks',
      hint: 'Every task across the projects you have access to.',
      rows: totalCard.rows,
      footer: totalCard.footer,
      to: '/',
      onClick: select({}),
      tip: {
        summary: 'All work items across every project you have access to, whatever state they are in.',
        points: [
          'Each row on hover shows the project and the milestone the task belongs to.',
          'These are the same tasks listed in the Task Performance table below.',
        ],
        note:
          totalCard.total > MAX_ROWS
            ? `The number is the exact total. Hover lists the ${MAX_ROWS} most urgent, and you can scroll it. Click the card to filter the table to every one.`
            : undefined,
      },
    },
    {
      icon: <Icon name="clock" size={16} />,
      value: inProgressCard.total,
      label: 'In Progress',
      statusKey: 'InProgress',
      heading: 'In-Progress Tasks',
      hint: 'Tasks that have been started but not finished.',
      rows: inProgressCard.rows,
      footer: inProgressCard.footer,
      to: '/',
      onClick: select({ statuses: ["InProgress"] }),
      tip: {
        summary: 'Tasks where work has already begun. These are the ones moving right now.',
        points: [
          'The percentage is how far along each task is.',
          'Hover to see which are predicted to slip - those sort to the top.',
        ],
      },
    },
    {
      icon: <Icon name="alert-circle" size={16} />,
      value: onHoldCard.total,
      label: 'On Hold',
      statusKey: 'OnHold',
      heading: 'On-Hold Tasks',
      hint: 'Tasks that have been deliberately paused.',
      rows: onHoldCard.rows,
      footer: onHoldCard.footer,
      to: '/',
      onClick: select({ statuses: ["OnHold"] }),
      tip: {
        summary: 'Tasks that are paused on purpose - blocked on a decision, a dependency, or waiting on someone else. They are not counted as late.',
        points: [
          'Unlike delayed work, being on hold is a deliberate choice.',
          'Each task still needs someone to restart it.',
        ],
      },
    },
    {
      icon: <Icon name="check-circle" size={16} />,
      value: completedCard.total,
      label: 'Completed',
      statusKey: 'Completed',
      heading: 'Completed Tasks',
      hint: 'Tasks that have been finished.',
      rows: completedCard.rows,
      footer: completedCard.footer,
      to: '/',
      onClick: select({ statuses: ["Completed"] }),
      tip: {
        summary: 'Work that has been finished, either marked Complete or ticked off to 100%.',
        points: [
          'A task counts as done when its status is Completed or its progress hits 100%.',
        ],
      },
    },
    {
      icon: <Icon name="close" size={16} />,
      value: delayedCard.total,
      label: 'Delayed',
      statusKey: 'Delayed',
      heading: 'Delayed Tasks',
      hint: 'Tasks past their due date.',
      rows: delayedCard.rows,
      footer: delayedCard.footer,
      to: '/',
      onClick: select({ overdueOnly: true }),
      tip: {
        summary: 'Tasks that have slipped past the date they were due. The figure on each row is how many days late it is.',
        points: [
          'A task counts as delayed when it is not finished, not cancelled, and today is already past its due date.',
          'That is a date, not a status, so it includes tasks still sitting in Not Started that simply ran out of time.',
          'Hover to see which are the furthest behind, with the project and milestone each one belongs to.',
          'Click the card to open that list - each row says how many days late it is, and whether anything has flagged it yet.',
        ],
        note: 'Counted the same way as the Total card, so subtasks are not included and this number always matches the list it opens.',
      },
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} showInfoTip={showInfoTip} />
      ))}
    </div>
  );
};

export default TaskStats;
