import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type { NotificationItem } from "../../types";
import {
  NotificationList,
  Panel,
} from "../../ui";

export function NotificationsPage() {
  const { auth, hasRole } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", departmentId: "", actionUrl: "" });

  async function loadNotifications() {
    if (!auth) return;
    setItems(await api.getNotifications(auth.token, unreadOnly));
  }

  useEffect(() => {
    void loadNotifications();
  }, [auth, unreadOnly]);

  return (
    <div className="grid  gap-4 content-start">
      <Panel title="Inbox" subtitle="Alerts, AI observations, and operational signals">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} />
            <span>Unread only</span>
          </label>
          <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => auth && void api.markAllNotificationsRead(auth.token).then(loadNotifications)}>
            Mark All Read
          </button>
        </div>
        <NotificationList
          items={items}
          onRead={(id) => auth && api.markNotificationRead(auth.token, id).then(loadNotifications)}
          onDelete={(id) => auth && api.deleteNotification(auth.token, id).then(loadNotifications)}
        />
      </Panel>

      {hasRole("SuperAdmin") ? (
        <Panel title="Broadcast" subtitle="Push a system message to everyone or one department">
          <form
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!auth) return;
              void api.broadcastNotification(auth.token, {
                title: form.title,
                message: form.message,
                departmentId: form.departmentId || null,
                actionUrl: form.actionUrl || null,
              });
            }}
          >
            <label><span>Title</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
            <label><span>Department Id</span><input value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value })} /></label>
            <label className="md:col-span-2"><span>Message</span><textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} /></label>
            <label className="md:col-span-2"><span>Action Url</span><input value={form.actionUrl} onChange={(event) => setForm({ ...form, actionUrl: event.target.value })} /></label>
            <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2" type="submit">Broadcast</button>
          </form>
        </Panel>
      ) : null}
    </div>
  );
}