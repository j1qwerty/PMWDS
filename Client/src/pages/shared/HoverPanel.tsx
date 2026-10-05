import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";

export type HoverRow = {
  /** Primary label, e.g. the project name. */
  title: string;
  /** Secondary line, e.g. department or manager. */
  subtitle?: string;
  /** Trailing metric, e.g. progress percent or days delayed. */
  meta?: string;
  /** Small status pill text. */
  status?: string;
};

type HoverPanelProps = {
  /** Heading inside the panel. */
  heading: string;
  /** One-line explanation of what the number counts. */
  hint?: string;
  rows: HoverRow[];
  /** Shown when there is nothing to list. */
  emptyText?: string;
  /** "Showing 5 of 23" style footer. */
  footer?: string;
  /** Highlights the footer, e.g. for a warning state. */
  tone?: "default" | "warning";
  /** Computed by <StatHoverCard> from the card's position. */
  style: CSSProperties;
  /** Cap on the scrolling row list, derived from the space actually available. */
  maxListHeight: number;
  /** Visible only while the pointer or focus is on the card or the panel. */
  open: boolean;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
};

type PanelPlacement = "above" | "below";
/**
 * Gap between the card and the panel.
 *
 * Zero on purpose. The panel only stays open while the pointer is over the card
 * or the panel, so any space between them is a dead zone: the pointer leaves
 * the card, the panel closes, and there is no way to reach it to read or scroll
 * the list. With the edges touching, the movement across is continuous.
 */
const GAP = 0;

/** Viewport margin kept on every side, so the panel never touches an edge. */
const EDGE = 12;

/** Widest the panel will get. Narrow enough for a phone, wide enough to read. */
const MAX_WIDTH = 300;

/**
 * Rough height of everything in the panel that is not the row list: padding,
 * heading, hint and footer. Subtracted from the available space to work out how
 * tall the list itself may be.
 */
const CHROME = 130;

const MIN_LIST_HEIGHT = 80;

/**
 * Position the panel against the viewport rather than the card.
 *
 * These cards are the first thing on the dashboard, so a panel anchored above
 * them starts at a negative y and the top of it is cut off by the window. The
 * panel also used to be centred on the card with a fixed 290px width, which
 * pushed it past the left and right edges of the viewport on narrow screens.
 * Measuring once and then placing explicitly fixes both.
 */
function computePanelStyle(anchor: HTMLElement): {
  style: CSSProperties;
  maxListHeight: number;
} {
  const rect = anchor.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const width = Math.min(MAX_WIDTH, viewportWidth - EDGE * 2);

  const spaceAbove = rect.top - GAP - EDGE;
  const spaceBelow = viewportHeight - rect.bottom - GAP - EDGE;

  // Prefer below, because these cards sit at the top of the page and above is
  // where there is no room. Flip only when below is genuinely worse, and never
  // to a side that cannot fit a usable panel.
  const fitsBelow = spaceBelow >= MIN_LIST_HEIGHT + 60;
  const fitsAbove = spaceAbove >= MIN_LIST_HEIGHT + 60;
  const placement: PanelPlacement =
    fitsBelow || !fitsAbove ? "below" : "above";

  const available = placement === "below" ? spaceBelow : spaceAbove;
  const maxListHeight = Math.max(
    MIN_LIST_HEIGHT,
    Math.min(240, available - CHROME)
  );

  // Centre on the card, then clamp so the panel stays inside the viewport.
  const centred = rect.left + rect.width / 2 - width / 2;
  const left = Math.max(
    EDGE,
    Math.min(centred, viewportWidth - width - EDGE)
  );

  const style: CSSProperties = {
    position: "fixed",
    left,
    width,
    ...(placement === "below"
      ? { top: rect.bottom + GAP }
      : { bottom: viewportHeight - rect.top + GAP }),
  };

  return { style, maxListHeight };
}

export function HoverPanel({
  heading,
  hint,
  rows,
  emptyText = "Nothing to show yet.",
  footer,
  tone = "default",
  style,
  maxListHeight,
  open,
  onPointerEnter,
  onPointerLeave,
}: HoverPanelProps) {
  // The list is often taller than maxListHeight, so it needs a scrollbar the
  // reader can actually see and use. `pointer-events-auto` is what allows that;
  // the panel is no longer click-through, so it stops clicks reaching the card's
  // own navigation button underneath it.
  const overflows = rows.length > 0 && maxListHeight < rows.length * 44;

  return (
    <div
      className="z-[60] rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-xl shadow-slate-900/10"
      style={{ ...style, display: open ? undefined : "none" }}
      role="tooltip"
      onMouseEnter={onPointerEnter}
      onMouseLeave={onPointerLeave}
      // A fixed-position descendant is still a DOM child of the card, so a
      // click here would otherwise bubble into the card's navigation button.
      onClick={(event) => event.stopPropagation()}
    >
      <p className="text-[12px] font-bold text-slate-800">{heading}</p>
      {hint && <p className="text-[10.5px] text-slate-500 leading-relaxed mt-1">{hint}</p>}

      {rows.length === 0 ? (
        <p className="text-[11px] text-slate-400 mt-3 text-center py-2">{emptyText}</p>
      ) : (
        <ul
          className="mt-2.5 space-y-1.5 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]"
          style={{ maxHeight: maxListHeight }}
        >
          {rows.map((row, i) => (
            <li
              key={`${row.title}-${i}`}
              className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11.5px] font-semibold text-slate-700 leading-snug line-clamp-2">
                  {row.title}
                </span>
                {row.meta && (
                  <span className="text-[10.5px] font-bold text-slate-600 shrink-0 mt-[1px]">
                    {row.meta}
                  </span>
                )}
              </div>
              {(row.subtitle || row.status) && (
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {row.subtitle && (
                    <span className="text-[10px] text-slate-500 truncate max-w-[150px]">
                      {row.subtitle}
                    </span>
                  )}
                  {row.status && (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-[1px] rounded bg-white border border-slate-200 text-slate-500">
                      {row.status}
                    </span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {footer && (
        <p
          className={`text-[10px] font-semibold mt-2.5 pt-2.5 border-t border-slate-100 ${
            tone === "warning" ? "text-rose-600" : "text-indigo-600"
          }`}
        >
          {footer}
        </p>
      )}

      {overflows && (
        <p className="text-[9px] text-slate-400 mt-1.5 flex items-center gap-1">
          <span className="material-symbols-outlined text-[11px]">unfold_more</span>
          Scroll the list for more
        </p>
      )}
    </div>
  );
}

type StatHoverCardProps = {
  // open / pointer handlers / style / maxListHeight are owned by this wrapper,
  // so callers supply only the content.
  content: Omit<
    HoverPanelProps,
    "style" | "maxListHeight" | "open" | "onPointerEnter" | "onPointerLeave"
  >;
  /** The stat card element the panel should sit against. */
  anchorRef: RefObject<HTMLElement | null>;
};

/**
 * Wrapper that reveals <HoverPanel> while the pointer or keyboard focus is on
 * either the card or the panel, and keeps the panel anchored to the card as the
 * page scrolls or resizes.
 *
 * Open state is tracked in JS rather than with `group-hover`, because CSS alone
 * closes the panel the moment the pointer leaves the card - which made the
 * panel unreachable and its list unscrollable.
 *
 * The panel is rendered with `display: none` while closed instead of being
 * unmounted, so its position is measured before it is ever shown and the first
 * hover does not flash it in the wrong place.
 */
export function StatHoverCard({ content, anchorRef }: StatHoverCardProps) {
  const [style, setStyle] = useState<CSSProperties | undefined>(undefined);
  const [maxListHeight, setMaxListHeight] = useState(240);
  const [open, setOpen] = useState(false);
  const frameRef = useRef<number | undefined>(undefined);

  const measure = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const next = computePanelStyle(anchor);
    setStyle(next.style);
    setMaxListHeight(next.maxListHeight);
  }, [anchorRef]);

  // The panel is a fixed-position descendant of the card, so native mouseleave
  // on the card does not fire when the pointer moves onto it. That is what lets
  // the two be treated as one continuous target.
  useEffect(() => {
    const card = anchorRef.current;
    if (!card) return;

    const enter = () => setOpen(true);
    const leave = () => setOpen(false);

    card.addEventListener("mouseenter", enter);
    card.addEventListener("mouseleave", leave);
    card.addEventListener("focusin", enter);
    card.addEventListener("focusout", (event) => {
      // focusout bubbles from descendants too; only close when focus has left
      // the card entirely.
      if (!card.contains(event.relatedTarget as Node | null)) setOpen(false);
    });

    return () => {
      card.removeEventListener("mouseenter", enter);
      card.removeEventListener("mouseleave", leave);
      card.removeEventListener("focusin", enter);
    };
  }, [anchorRef]);

  useEffect(() => {
    // Measure once up front so the first hover does not flash the panel in the
    // wrong place, then re-measure on scroll and resize so it stays attached to
    // the card rather than to a stale rect.
    measure();

    const onViewportChange = () => {
      if (frameRef.current !== undefined) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = undefined;
        measure();
      });
    };

    // Capture phase, because the dashboard scrolls in an inner container.
    window.addEventListener("scroll", onViewportChange, true);
    window.addEventListener("resize", onViewportChange);

    return () => {
      if (frameRef.current !== undefined) {
        window.cancelAnimationFrame(frameRef.current);
      }
      window.removeEventListener("scroll", onViewportChange, true);
      window.removeEventListener("resize", onViewportChange);
    };
  }, [measure]);

  return (
    <HoverPanel
      {...content}
      style={style ?? { position: "fixed", top: 0, left: 0, width: 1, height: 1 }}
      maxListHeight={maxListHeight}
      open={open && !!style}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
    />
  );
}
