import type { NotificationItem } from "../../types";

export function NotificationList({
  items,
  title = "Notifications",
}: {
  items: NotificationItem[];
  title?: string;
}) {
  const itemsArray = Array.isArray(items) ? items : [];

  if (!itemsArray.length) {
    return (
      <div className="bg-surface-container-lowest rounded-xl p-lg ambient-glow">
        <div className="flex justify-between items-center mb-md pb-sm border-b border-surface-variant">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">inbox</span>
            <h2 className="font-h2 text-h2 text-on-surface">{title}</h2>
          </div>
          <span className="bg-primary text-on-primary text-[10px] font-bold px-2 py-[2px] rounded-full">0 New</span>
        </div>
        <div className="flex flex-col items-center justify-center py-lg text-center">
          <span className="material-symbols-outlined text-outline text-4xl mb-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            notifications_off
          </span>
          <p className="text-on-surface-variant text-sm">No notifications</p>
        </div>
      </div>
    );
  }

  // Map priority to exact reference notification types
  const getNotificationType = (item: NotificationItem) => {
    const priority = item.priority || "Info";
    
    switch (priority) {
      case "Critical":
        return {
          type: "critical",
          icon: "priority_high",
          bg: "bg-error/10",
          iconColor: "text-error",
          highlightColor: "text-error",
        };
      case "High":
        return {
          type: "mention",
          icon: "chat",
          bg: "bg-primary/10",
          iconColor: "text-primary",
          highlightColor: "text-primary",
        };
      case "Info":
      case "Success":
      default:
        return {
          type: "release",
          icon: "rocket_launch",
          bg: "bg-secondary-container/10",
          iconColor: "text-secondary",
          highlightColor: "text-secondary",
        };
    }
  };

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
    <div className="bg-surface-container-lowest rounded-xl p-lg ambient-glow">
      <div className="flex justify-between items-center mb-md pb-sm border-b border-surface-variant">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary">inbox</span>
          <h2 className="font-h2 text-h2 text-on-surface">{title}</h2>
        </div>
        {unreadCount > 0 && (
          <span className="bg-primary text-on-primary text-[10px] font-bold px-2 py-[2px] rounded-full">
            {unreadCount} New
          </span>
        )}
      </div>
      <div className="flex flex-col gap-md">
        {itemsArray.map((item) => {
          const config = getNotificationType(item);
          
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
            <div 
              key={item.id} 
              className="flex gap-md items-start p-sm rounded-lg hover:bg-surface-container-low cursor-pointer transition-colors"
            >
              <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center shrink-0`}>
                <span className={`material-symbols-outlined ${config.iconColor} text-[16px]`}>
                  {config.icon}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] text-on-surface font-medium">
                  {mainText}
                  {highlightedText && (
                    <span className={config.highlightColor}>{highlightedText}</span>
                  )}
                </span>
                {item.message && (
                  <span className="text-[11px] text-on-surface-variant mt-xs">
                    {item.message.slice(0, 80)}
                  </span>
                )}
                <span className="text-[11px] text-outline mt-1">
                  {formatTime(item.createdDate)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}