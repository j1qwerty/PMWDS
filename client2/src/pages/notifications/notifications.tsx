import { useEffect, useState } from "react";
import { FiBell, FiCheckCircle, FiSend } from "react-icons/fi";
import { api } from "../../shared/api";
import { useAuth } from "../../shared/auth";
import { PageTitle, PriorityBadge } from "../../shared/components";
import type { GenericRecord, NotificationItem } from "../../shared/types";
import { formatDate } from "../../shared/utils";

const demoNotifications: NotificationItem[] = [
  { id: "n-1", title: "Gateway delay", message: "Vayu Node retry task is near SLA limit.", type: "Task", priority: "High", isRead: false, createdDate: "2026-05-24T08:00:00Z" },
  { id: "n-2", title: "Migration checkpoint", message: "Dry run requires rollback approval.", type: "Project", priority: "Medium", isRead: true, createdDate: "2026-05-23T12:00:00Z" },
];

export function NotificationsPage() {
  const { auth } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>(demoNotifications);
  const [templates, setTemplates] = useState<GenericRecord[]>([]);
  const [rules, setRules] = useState<GenericRecord[]>([]);
  const [broadcast, setBroadcast] = useState({ title: "", message: "", priority: "Medium" });
  const [message, setMessage] = useState("");

  const load = async () => {
    if (!auth || auth.token === "demo-token") {
      setItems(demoNotifications);
      setTemplates([{ id: "tpl-1", templateType: "TaskDelay", subjectTemplate: "Task delayed" }]);
      setRules([{ id: "rule-1", name: "High risk task", isEnabled: true }]);
      return;
    }
    const [notificationData, templateData, ruleData] = await Promise.all([
      api.getNotifications(auth.token),
      api.getNotificationTemplates(auth.token).catch(() => []),
      api.getAlertRules(auth.token).catch(() => []),
    ]);
    setItems(notificationData);
    setTemplates(templateData);
    setRules(ruleData);
  };

  useEffect(() => {
    void load();
  }, [auth]);

  const markRead = async (id: string) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
    if (auth && auth.token !== "demo-token") await api.markNotificationRead(auth.token, id);
  };

  const sendBroadcast = async () => {
    if (auth && auth.token !== "demo-token") await api.broadcastNotification(auth.token, broadcast);
    setMessage("Broadcast submitted.");
    setBroadcast({ title: "", message: "", priority: "Medium" });
  };

  return (
    <>
      <PageTitle eyebrow="Notifications" title="Notifications" description="Inbox, templates, alert rules, and broadcast actions integrated with the Notifications API." />
      {message ? <p className="message-line">{message}</p> : null}
      <section className="resource-layout">
        <div className="resource-table-card">
          <div className="resource-tools"><strong><FiBell /> Inbox</strong><span>{items.filter((item) => !item.isRead).length} unread</span></div>
          <div className="notification-list">
            {items.map((item) => (
              <article className="notification-item" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.message}</p>
                  <small>{item.type} / {formatDate(item.createdDate)}</small>
                </div>
                <PriorityBadge priority={item.priority} />
                {!item.isRead ? <button className="table-action" onClick={() => void markRead(item.id)}><FiCheckCircle /></button> : <span className="message-line">Read</span>}
              </article>
            ))}
          </div>
        </div>
        <aside className="resource-editor">
          <h3><FiSend /> Broadcast</h3>
          <label className="resource-field"><span>Title</span><input value={broadcast.title} onChange={(event) => setBroadcast((current) => ({ ...current, title: event.target.value }))} /></label>
          <label className="resource-field"><span>Message</span><textarea value={broadcast.message} onChange={(event) => setBroadcast((current) => ({ ...current, message: event.target.value }))} /></label>
          <label className="resource-field"><span>Priority</span><select value={broadcast.priority} onChange={(event) => setBroadcast((current) => ({ ...current, priority: event.target.value }))}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label>
          <button className="save-btn" onClick={() => void sendBroadcast()}>Send broadcast</button>
          <div className="setting-row"><div><strong>Templates</strong><p>{templates.length} loaded</p></div></div>
          <div className="setting-row"><div><strong>Alert rules</strong><p>{rules.length} loaded</p></div></div>
        </aside>
      </section>
    </>
  );
}
