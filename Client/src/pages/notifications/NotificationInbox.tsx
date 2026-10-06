import { useNavigate } from "react-router-dom";
import type { NotificationItem } from "../../types";
import { GlassCard, GradientButton, notificationTarget, notificationTargetLabel, notificationVisual, priorityChip } from "../shared";

interface NotificationInboxProps {
  items: NotificationItem[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onBroadcast: () => void;
  canWrite: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
}

export function NotificationInbox({
  items,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onBroadcast,
  canWrite,
  emptyTitle = "No notifications",
  emptySubtitle = "You're all caught up!",
}: NotificationInboxProps) {
  const navigate = useNavigate();

  /**
   * Clicking a row goes to the page the notification is about. Read state is
   * settled on the way out so an unread row never stays highlighted after the
   * user has already acted on it.
   */
  const openNotification = (item: NotificationItem) => {
    if (!item.isRead) onMarkRead(item.id);
    navigate(notificationTarget(item));
  };

  return (
    <GlassCard className="overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Inbox</h3>
          <p className="text-xs text-slate-400">Click any notification to go straight to it</p>
        </div>
        <div className="flex gap-2">
          <GradientButton variant="ghost" onClick={onMarkAllRead}>
            <span className="material-symbols-outlined text-sm">done_all</span>
            Mark All Read
          </GradientButton>
          {canWrite && (
            <GradientButton onClick={onBroadcast}>
              <span className="material-symbols-outlined text-sm">campaign</span>
              Broadcast
            </GradientButton>
          )}
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-slate-400">notifications_off</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">{emptyTitle}</h4>
            <p className="text-xs text-slate-400">{emptySubtitle}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => {
              const visual = notificationVisual(item);

              return (
                <div
                  key={item.id}
                  className={`group flex items-start gap-3 p-5 transition-colors ${
                    item.isRead ? "hover:bg-slate-50" : "bg-indigo-50/50 border-l-4 border-l-indigo-500 hover:bg-indigo-50"
                  }`}
                >
                  <span
                    className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${visual.accent}`}
                    title={item.type}
                  >
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {visual.icon}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => openNotification(item)}
                    className="flex-1 min-w-0 text-left cursor-pointer"
                    title={notificationTargetLabel(item)}
                  >
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      {!item.isRead && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />}
                      <strong className="text-slate-800 font-semibold text-sm group-hover:text-indigo-700 transition-colors">
                        {item.title}
                      </strong>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${visual.chip}`}>
                        {item.type}
                      </span>
                      {item.isAIGenerated && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100 font-medium">
                          AI
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-600 mb-2">{item.message}</p>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${priorityChip(item.priority)}`}>
                        {item.priority}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          item.isRead
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : "bg-amber-50 text-amber-600 border border-amber-100"
                        }`}
                      >
                        {item.isRead ? "Read" : "Unread"}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">schedule</span>
                        {new Date(item.createdDate).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] text-indigo-500 flex items-center gap-1 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-xs">arrow_forward</span>
                        {notificationTargetLabel(item)}
                      </span>
                    </div>
                  </button>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    {!item.isRead && (
                      <button
                        onClick={() => onMarkRead(item.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors font-medium"
                      >
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(item.id)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
