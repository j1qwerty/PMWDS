import { useRef } from "react";
import { InfoTip, StatHoverCard } from "../../shared";
import { DASHBOARD_OVERVIEW_CARD_HEIGHT } from "../../constants";

interface ActivityDataPoint {
  day: string;
  value: number;
}

interface ActivityProps {
  data?: ActivityDataPoint[];
  title?: string;
  filterOptions?: string[];
  selectedFilter?: string;
  onFilterChange?: (filter: string) => void;
  /**
   * Optional breakdown for the hover panel: what the activity actually was.
   * Counted from the same log entries that produce the chart, so the panel can
   * never disagree with the line.
   */
  breakdown?: { label: string; count: number }[];
  /** True when the figures are limited to one person, matching the chart. */
  isFiltered?: boolean;
  filterLabel?: string;
}

export function Activity({
  data,
  title = "Activity",
  filterOptions = ["All Tasks"],
  selectedFilter = "All Tasks",
  onFilterChange,
  breakdown = [],
  isFiltered = false,
  filterLabel,
}: ActivityProps) {
  // No dummy data. When the caller has nothing yet, every day reads zero - which is the
  // truth, not a placeholder curve.
  const activityData: ActivityDataPoint[] =
    data && data.length > 0
      ? data
      : [
          { day: "Sun", value: 0 },
          { day: "Mon", value: 0 },
          { day: "Tue", value: 0 },
          { day: "Wed", value: 0 },
          { day: "Thu", value: 0 },
          { day: "Fri", value: 0 },
          { day: "Sat", value: 0 },
        ];

  const cardRef = useRef<HTMLDivElement>(null);

  const total = activityData.reduce((sum, point) => sum + point.value, 0);
  const busiest = activityData.reduce((top, point) => (point.value > top.value ? point : top), activityData[0]);
  const quietest = activityData.reduce((low, point) => (point.value < low.value ? point : low), activityData[0]);

  // Panel rows. When a breakdown is available it lists what the activity
  // actually was - that is the part the line cannot show - and falls back to
  // the per-day counts otherwise, so the panel is never empty for no reason.
  const dayRows = [...activityData]
    .sort((a, b) => b.value - a.value)
    .map((point) => ({
      title: point.day,
      subtitle: point.value === 0 ? "Nothing logged" : `${point.value} event${point.value === 1 ? "" : "s"}`,
      meta: total > 0 ? `${Math.round((point.value / total) * 100)}%` : undefined,
    }));

  const eventRows = breakdown.map((entry) => ({
    title: entry.label,
    meta: `${entry.count}`,
    subtitle: total > 0 ? `${Math.round((entry.count / total) * 100)}% of activity` : undefined,
  }));

  const scope = isFiltered
    ? `${filterLabel ?? selectedFilter} · last 7 days`
    : "Your workspace · last 7 days";

  const panelRows = eventRows.length > 0 ? eventRows : dayRows;
  const panelHint = eventRows.length > 0 ? scope : `${scope} · by day`;
  
  // Chart dimensions
  const width = 300;
  const height = 150;
  const padding = 10;
  const chartWidth = width - (padding * 2);
  const chartHeight = height - (padding * 2);
  
  // Calculate points for SVG path
  const points = activityData.map((point, index) => {
    const x = padding + (index / (activityData.length - 1)) * chartWidth;
    const maxValue = Math.max(...activityData.map(d => d.value));
    const normalizedValue = maxValue > 0 ? point.value / maxValue : 0;
    const y = padding + chartHeight - normalizedValue * chartHeight;
    return { x, y, ...point };
  });

  // Generate SVG path
  const linePath = points.map((point, index) => {
    if (index === 0) return `M${point.x},${point.y}`;
    
    // Create smooth curve using quadratic bezier
    const prevPoint = points[index - 1];
    const controlX = (prevPoint.x + point.x) / 2;
    return `Q${controlX},${prevPoint.y} ${point.x},${point.y}`;
  }).join(' ');

  // Generate area path (same as line but with bottom closing)
  const areaPath = linePath + ` L${points[points.length - 1].x},${height} L${points[0].x},${height} Z`;

  return (
    <div
      ref={cardRef}
      className={`group bg-white rounded-2xl p-5 border border-slate-100 shadow-md ${DASHBOARD_OVERVIEW_CARD_HEIGHT} flex flex-col`}
    >
      <StatHoverCard
        anchorRef={cardRef}
        content={{
          heading: `${title} · last 7 days`,
          hint: panelHint,
          rows: panelRows,
          emptyText: "No activity recorded in this period.",
          footer:
            total === 0
              ? "Nothing logged in the last 7 days"
              : `${total} event${total === 1 ? "" : "s"} in total · busiest ${busiest.day} (${busiest.value}), quietest ${quietest.day} (${quietest.value})`,
        }}
      />

      <div className="flex justify-between items-center mb-4 relative">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <div className="flex items-center gap-2">
        {filterOptions.length > 0 && (
          <select 
            className="text-xs text-slate-500 border border-slate-200 rounded-lg px-2 py-1 bg-white cursor-pointer"
            value={selectedFilter}
            onChange={(e) => onFilterChange?.(e.target.value)}
          >
            {filterOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        )}
        <InfoTip
          title="Activity"
          summary="How much happened in your workspace on each of the last seven days."
          points={[
            "Each point counts activity log entries recorded that day: tasks created, updated, commented on, escalated or completed, plus project and milestone changes.",
            "The label under each point is the real calendar date, not just the weekday.",
            "A day at zero means nothing was logged, not that the data is missing."
          ]}
          note="This is a count of recorded events, not a measure of how much work was done."
        />
        </div>
      </div>
      
      <div className="flex-1 min-h-0 relative">
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="activityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          
          {/* Line chart */}
          <path 
            d={linePath} 
            fill="none" 
            stroke="#8b5cf6" 
            strokeWidth="2"
          />
          
          {/* Area fill */}
          <path 
            d={areaPath} 
            fill="url(#activityGradient)" 
            opacity="0.1"
          />
        </svg>
      </div>
      
      <div className="flex justify-between text-xs text-slate-400 mt-2">
        {activityData.map((point, index) => (
          <span key={index}>{point.day}</span>
        ))}
      </div>
    </div>
  );
}