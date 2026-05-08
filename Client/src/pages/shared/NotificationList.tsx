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
      <div className="bg-slate-900/50 rounded-xl p-lg border border-slate-700/30">
        <div className="flex justify-between items-center mb-md pb-sm border-b border-slate-700/30">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-[#818cf8]">notifications</span>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-lg text-center">
          <span className="material-symbols-outlined text-slate-500 text-4xl mb-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            notifications_none
          </span>
          <p className="text-slate-400 text-sm">No notifications</p>
        </div>
      </div>
    );
  }

  const priorityStyles: Record<string, { icon: string; bg: string; text: string }> = {
    Critical: { icon: "cancel", bg: "bg-rose-500/20", text: "text-rose-400" },
    High: { icon: "warning", bg: "bg-amber-500/20", text: "text-amber-400" },
    Info: { icon: "info", bg: "bg-[#4648d4]/20", text: "text-[#818cf8]" },
    Success: { icon: "check_circle", bg: "bg-emerald-500/20", text: "text-emerald-400" },
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="bg-slate-900/50 rounded-xl p-lg border border-slate-700/30">
      <div className="flex justify-between items-center mb-md pb-sm border-b border-slate-700/30">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-[#818cf8]">notifications</span>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
      </div>
      <div className="flex flex-col gap-sm">
        {itemsArray.map((item) => {
          const style = priorityStyles[item.priority] || priorityStyles.Info;
          return (
            <div key={item.id} className={`flex gap-sm items-start p-sm rounded-lg hover:bg-slate-800/50 cursor-pointer transition-all border-l-2 ${item.isRead ? "border-transparent" : "border-[#4648d4]"}`}>
              <div className={`w-8 h-8 rounded-full ${style.bg} flex items-center justify-center flex-shrink-0`}>
                <span className={`material-symbols-outlined ${style.text} text-[16px]`} style={{ fontVariationSettings: "'FILL' 1" }}>
                  {style.icon}
                </span>
              </div>
              <div className="flex flex-col flex-grow min-w-0">
                <span className="text-sm text-white font-medium truncate">{item.title}</span>
                <span className="text-xs text-slate-400 mt-xs">{item.message.slice(0, 80)}</span>
                <span className="text-[10px] text-slate-500 mt-xs">{formatTime(item.createdDate)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}