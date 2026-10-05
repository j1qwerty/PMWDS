import { useNavigate } from "react-router-dom";
import type { NotificationItem } from "../../types";
import { DASHBOARD_OVERVIEW_CARD_HEIGHT } from "../constants";
import { notificationTarget, notificationTargetLabel, notificationVisual } from "./notificationLinks";

export function NotificationList({
  items,
  title = "Notifications",
  onOpen,
}: {
  items: NotificationItem[];
  title?: string;
  /** Optional override; defaults to navigating to the notification's target. */
  onOpen?: (item: NotificationItem) => void;
}) {
  const navigate = useNavigate();
  const itemsArray = Array.isArray(items) ? items : [];

  const handleOpen = (item: NotificationItem) => {
    if (onOpen) {
      onOpen(item);
      return;
    }
    navigate(notificationTarget(item));
  };

  if (!itemsArray.length) {
    return (
      <div className={`bg-surface-container-lowest  rounded-xl p-lg ambient-glow border border-outline-variant/20 ${DASHBOARD_OVERVIEW_CARD_HEIGHT} flex flex-col overflow-hidden`}>
        <div className="flex justify-between items-center mb-md pb-sm border-b border-surface-variant">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary bg-primary/10 p-1.5 rounded-lg">notifications</span>
            <span className=" text-lg font-h2 text-on-surface">{title}</span>
          </div>
          <span className="bg-surface-container text-on-surface-variant text-[10px] font-semibold px-2 py-[2px] rounded-full">0 New</span>
        </div>
        <div className="flex flex-col flex-1 items-center justify-center py-lg text-center">
          <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center mb-sm">
            <span className="material-symbols-outlined text-outline text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              notifications_off
            </span>
          </div>
          <p className="text-on-surface-variant text-sm font-medium">All caught up!</p>
          <p className="text-on-surface-variant text-xs mt-1">No new notifications</p>
        </div>
      </div>
    );
  }

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "1 hour ago";
    if (hours < 24) return `${hours} hours ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const unreadCount = itemsArray.filter(item => !item.isRead).length;

  return (
    <div className={`bg-surface-container-lowest rounded-xl p-lg ambient-glow border border-outline-variant/20 ${DASHBOARD_OVERVIEW_CARD_HEIGHT} flex flex-col overflow-hidden`}>
      <div className="flex justify-between items-center mb-md pb-sm border-b border-surface-variant">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary bg-primary/10 p-1.5 rounded-lg">notifications</span>
            <span className=" text-lg font-h2 text-on-surface">{title}</span>
        </div>
        {unreadCount > 0 && (
          <span className="bg-primary text-white text-[10px] font-bold px-2 py-[2px] rounded-full">
            {unreadCount} New
          </span>
        )}
      </div>
      <div className="flex flex-col gap-sm flex-1 min-h-0 overflow-y-auto pr-1">
        {itemsArray.map((item) => {
          const config = notificationVisual(item);

          // Extract highlighted text from message if it contains a colon or specific pattern
          let mainText = item.title;
          let highlightedText = "";
          
          if (item.title.includes(": ")) {
            const parts = item.title.split(": ");
            mainText = parts[0] + ": ";
            highlightedText = parts[1];
          } else if (item.title.includes(" in ")) {
            const parts = item.title.split(" in ");
            mainText = parts[0] + " in ";
            highlightedText = parts[1];
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleOpen(item)}
              title={notificationTargetLabel(item)}
              className="group flex gap-3 items-start text-left w-full p-3 rounded-xl hover:bg-surface-container-low cursor-pointer transition-all duration-200 border border-transparent hover:border-outline-variant/30 shrink-0"
            >
              <span className={`w-9 h-9 rounded-xl ${config.accent} flex items-center justify-center shrink-0 shadow-sm relative`}>
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {config.icon}
                </span>
                {!item.isRead && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary border-2 border-white" />
                )}
              </span>

              <span className="flex-1 min-w-0 block">
                <span className="flex items-center gap-2">
                  <span className="text-[11px] text-primary font-semibold shrink-0">{formatTime(item.createdDate)}</span>

                  <span className="text-[13px] text-on-surface font-semibold truncate group-hover:text-primary transition-colors">
                    {mainText}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${config.chip} shrink-0`}>
                    {item.priority}
                  </span>
                </span>
                {highlightedText && (
                  <span className={`text-[13px] font-medium text-primary`}>
                    {highlightedText}
                  </span>
                )}
                {item.message && (
                  <span className="block text-[12px] text-on-surface-variant mt-1 line-clamp-2">
                    {item.message.slice(0, 80)}
                  </span>
                )}
                <span className="flex items-center gap-1 mt-1 text-[10px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                  {notificationTargetLabel(item)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}