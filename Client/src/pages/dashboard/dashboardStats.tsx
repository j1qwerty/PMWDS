import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Project } from "../../types";
import { getStatusColor } from "../shared/colors";
import { Icon } from "../../components/ui/Icon";
import { InfoTip, StatHoverCard, type HoverRow } from "../shared";

/** Cap on how many names the hover panel lists before it says "showing X of Y". */
const MAX_ROWS = 10;

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  statusKey: string;
  /** Explains the number in plain language. */
  heading: string;
  hint: string;
  /** Up to MAX_ROWS names to list on hover. */
  rows: HoverRow[];
  /** "Showing 5 of 23" line. */
  footer: string;
  tone?: "default" | "warning";
  /** Route the whole card navigates to on click. */
  to: string;
  /** Plain-language "how this works" copy for the ? popup. */
  tip: { summary: string; points?: string[]; note?: string };
  /**
   * Whether to show the "?" explainer in the corner.
   *
   * Hidden on the dashboard at the owner's request - the copy is still here and still
   * drives the hover panel, so this is a display switch rather than a removal.
   */
  showInfoTip?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  icon, value, label, statusKey, heading, hint, rows, footer, tone, to, tip, showInfoTip = true,
}) => {
  const navigate = useNavigate();
  const colors = getStatusColor(statusKey);
  // The hover panel positions itself against the viewport, so it needs this
  // element's rect rather than being laid out inside the card.
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={cardRef}
      className={`shadow-sm group relative ${colors.badgeBg} overflow-visible rounded-2xl p-4 hover:shadow-md transition-all duration-300 h-full flex flex-col justify-between border-0`}
    >
      <StatHoverCard content={{ heading, hint, rows, footer, tone }} anchorRef={cardRef} />

      {/* The right padding only existed to keep the label clear of the absolutely
          positioned "?", so it goes when the "?" does. */}
      <div className={`relative flex items-center gap-2 mb-2 ${showInfoTip ? "pr-5" : ""}`}>
        <div className={`w-8 h-8 ${colors.badgeBg} rounded-lg flex items-center justify-center ${colors.badgeText} shrink-0`}>
          {icon}
        </div>
        <span className={`text-xs font-medium ${colors.badgeText} uppercase tracking-wider truncate`}>
          {label}
        </span>
        {showInfoTip && (
          <span className="absolute top-0 right-0">
            <InfoTip title={heading} summary={tip.summary} points={tip.points} note={tip.note} />
          </span>
        )}
      </div>

      <div className="relative mt-2">
        <span className={`text-2xl font-bold text-center tracking-wider block ${colors.text}`}>
          {value.toLocaleString()}
        </span>
      </div>

      <button
        type="button"
        onClick={() => navigate(to)}
        className="absolute inset-0 z-10 cursor-pointer rounded-2xl"
        aria-label={`${label}: ${value}. ${hint}`}
      />
    </div>
  );
};

interface DashboardStatsProps {
  projects?: Project[];
  /** Hides the "?" explainer on every card. See StatCardProps.showInfoTip. */
  showInfoTip?: boolean;
}

/** Days past the planned end date; 0 when the project is not yet late. */
function daysLate(p: Project): number {
  if (!p.plannedEndDate || p.status === "Completed") return 0;
  const end = new Date(p.plannedEndDate).getTime();
  if (Number.isNaN(end)) return 0;
  return Math.max(0, Math.floor((SESSION_NOW - end) / 86_400_000));
}

const SESSION_NOW = Date.now();

/**
 * Most-relevant-first ordering for the hover list: the projects a user would
 * most want to see for that card. For "delayed"/"on hold" that means the ones
 * furthest past due, not merely the most recently created.
 */
function pickForCard(projects: Project[], kind: string): Project[] {
  const matched = projects.filter((p) => matches(p, kind));

  const ordered = [...matched].sort((a, b) => {
    if (kind === "Delayed") return daysLate(b) - daysLate(a);
    if (kind === "OnHold") return (b.aiDelayRiskScore ?? 0) - (a.aiDelayRiskScore ?? 0);
    if (kind === "Completed") return (b.progressPercentage ?? 0) - (a.progressPercentage ?? 0);
    return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
  });

  return ordered.slice(0, MAX_ROWS);
}

function matches(p: Project, kind: string): boolean {
  switch (kind) {
    case "InProgress":
      return p.status === "InProgress";
    case "OnHold":
      return p.status === "OnHold";
    case "Completed":
      return p.status === "Completed" || p.progressPercentage === 100;
    case "Delayed":
      return p.status === "Delayed" || daysLate(p) > 0;
    default:
      return true;
  }
}

function toRow(p: Project, kind: string): HoverRow {
  const subtitleParts = [
    p.projectCode,
    p.departmentName,
    p.projectManagerName ? `PM ${p.projectManagerName}` : null,
  ].filter(Boolean) as string[];

  let meta: string | undefined;
  if (kind === "Delayed") {
    const late = daysLate(p);
    meta = late > 0 ? `${late}d late` : undefined;
  } else if (kind === "OnHold") {
    meta = `${Math.round(p.aiDelayRiskScore ?? 0)}% risk`;
  } else {
    meta = `${Math.round(p.progressPercentage ?? 0)}%`;
  }

  return {
    title: p.name,
    subtitle: subtitleParts.join(" • "),
    meta,
    status: p.status,
  };
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ projects = [], showInfoTip = true }) => {
  const counts = {
    Total: projects.length,
    InProgress: projects.filter((p) => p.status === "InProgress").length,
    OnHold: projects.filter((p) => p.status === "OnHold").length,
    Completed: projects.filter((p) => p.status === "Completed" || p.progressPercentage === 100).length,
    Delayed: projects.filter((p) => p.status === "Delayed" || daysLate(p) > 0).length,
  };

  const card = (kind: string) => {
    const matched = projects.filter((p) => matches(p, kind));
    const shown = pickForCard(projects, kind);
    const actualTotal = matched.length;

    return {
      rows: shown.map((p) => toRow(p, kind)),
      footer: actualTotal === 0
        ? "Nothing to show yet"
        : shown.length < actualTotal
          ? `Showing ${shown.length} of ${actualTotal} - click to see all`
          : actualTotal === 1
            ? "1 project - click to open"
            : `All ${actualTotal} shown - click to open`,
    };
  };

  const totalCard = card("Total");
  const inProgressCard = card("InProgress");
  const onHoldCard = card("OnHold");
  const completedCard = card("Completed");
  const delayedCard = card("Delayed");

  const stats: StatCardProps[] = [
    {
      icon: <Icon name="file" size={16} />,
      value: counts.Total,
      label: 'Total Projects',
      statusKey: 'Total',
      heading: 'Total Projects',
      hint: 'Every project you have access to, in any status.',
      rows: totalCard.rows,
      footer: totalCard.footer,
      to: '/projects',
      tip: {
        summary: 'A simple head-count of every project in your workspace. It includes projects that have finished and ones that are still being planned.',
        points: [
          'Counts each project once, no matter how many tasks or milestones it has.',
          'You only see projects your role gives you access to.',
        ],
      },
    },
    {
      icon: <Icon name="clock" size={16} />,
      value: counts.InProgress,
      label: 'In Progress',
      statusKey: 'InProgress',
      heading: 'In Progress',
      hint: 'Projects that have started but are not finished.',
      rows: inProgressCard.rows,
      footer: inProgressCard.footer,
      to: '/projects?status=InProgress',
      tip: {
        summary: 'Work that is actively under way right now. These projects have a start date in the past and have not been finished, paused, or cancelled.',
        points: [
          'A project moves here once you set its status to In Progress.',
          'Completion percentage comes from how much of its work is done.',
        ],
      },
    },
    {
      icon: <Icon name="alert-circle" size={16} />,
      value: counts.OnHold,
      label: 'On Hold',
      statusKey: 'OnHold',
      heading: 'On Hold',
      hint: 'Projects paused on purpose, waiting on something outside their control.',
      rows: onHoldCard.rows,
      footer: onHoldCard.footer,
      to: '/projects?status=OnHold',
      tip: {
        summary: 'A project that has deliberately been paused. Nothing is wrong with it right now, but no work is expected to move until somebody resumes it.',
        points: [
          'This is different from Delayed - being on hold is a decision, not a problem.',
          'The "risk" shown next to each project is how close it is to slipping its dates once it resumes.',
          'Each project here needs a reason and an owner before it can restart.',
        ],
      },
    },
    {
      icon: <Icon name="check-circle" size={16} />,
      value: counts.Completed,
      label: 'Completed',
      statusKey: 'Completed',
      heading: 'Completed',
      hint: 'Projects that have been finished.',
      rows: completedCard.rows,
      footer: completedCard.footer,
      to: '/projects?status=Completed',
      tip: {
        summary: 'Work that is finished - either marked Complete, or with every task ticked off so it reached 100%.',
        points: [
          'A project counts as done when its status is Completed, or its progress reaches 100%.',
          'Completed projects stay in the list as a record of what was delivered.',
        ],
      },
    },
    {
      icon: <Icon name="close" size={16} />,
      value: counts.Delayed,
      label: 'Delayed',
      statusKey: 'Delayed',
      heading: 'Delayed',
      hint: 'Projects past their planned finish date, or explicitly flagged as delayed.',
      rows: delayedCard.rows,
      footer: delayedCard.footer,
      tone: 'warning',
      to: '/projects?status=Delayed',
      tip: {
        summary: 'Projects that have run past the date they were supposed to finish. The figure shown is how many days late each one is.',
        points: [
          'A project counts as delayed if its status is Delayed, or if today is past its planned end date and it is not yet finished.',
          'Hover the card to see which ones are the furthest behind.',
          'Days late are counted from the planned end date, not the start date.',
        ],
        note: 'Sorting is by how late each project is, so the worst offender is listed first.',
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

export default DashboardStats;
