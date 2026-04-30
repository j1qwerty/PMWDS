import { useEffect, useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { StatusBadge } from "../../../components/common/StatusBadge";
import { classNames, dangerButtonClass, ghostButtonClass, listCardClass, listColumnClass, LoadingPanel, ErrorPanel, Notice, Panel, primaryButtonClass, selectedCardClass } from "../../../ui";
import type {
  AlertRuleRecord,
  Department,
  NotificationItem,
  NotificationTemplateRecord,
} from "../../../types";
import { AlertRuleFormDialog } from "../components/AlertRuleFormDialog";
import { BroadcastNotificationDialog } from "../components/BroadcastNotificationDialog";
import { NotificationTemplateFormDialog } from "../components/NotificationTemplateFormDialog";

export function NotificationsPage() {
  const { auth, hasRole } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplateRecord[]>([]);
  const [rules, setRules] = useState<AlertRuleRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplateRecord | null>(null);
  const [editingRule, setEditingRule] = useState<AlertRuleRecord | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<NotificationTemplateRecord | null>(null);
  const [deletingRule, setDeletingRule] = useState<AlertRuleRecord | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canManage = hasRole("SuperAdmin", "ProjectManager", "DepartmentHead");
  const canWrite = hasRole("SuperAdmin");

  const refresh = () => {
    if (!auth) {
      return Promise.resolve();
    }

    return Promise.all([
      api.getNotifications(auth.token),
      canManage ? api.getNotificationTemplates(auth.token) : Promise.resolve([]),
      canManage ? api.getAlertRules(auth.token) : Promise.resolve([]),
      canWrite ? api.getDepartments(auth.token) : Promise.resolve([]),
    ])
      .then(([notificationData, templateData, ruleData, departmentData]) => {
        setItems(notificationData);
        setTemplates(templateData);
        setRules(ruleData);
        setDepartments(departmentData);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Failed to load notifications.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void refresh();
  }, [auth]);

  if (loading) {
    return <LoadingPanel label="Loading notifications..." />;
  }

  if (error) {
    return <ErrorPanel message={error} />;
  }

  return (
    <div className="grid grid-cols-12 gap-4 content-start">
      {message ? <Notice>{message}</Notice> : null}
      <Panel title="Inbox" subtitle="Read, clear, and monitor personal notifications">
        <div className="mt-4 flex flex-wrap gap-2">
          <button className={ghostButtonClass} onClick={() => auth && api.markAllNotificationsRead(auth.token).then(() => { setMessage("Notifications marked as read."); void refresh(); })}>
            Mark All Read
          </button>
          {canWrite ? (
            <button className={primaryButtonClass} onClick={() => setBroadcastOpen(true)}>
              Broadcast
            </button>
          ) : null}
        </div>
        <div className={listColumnClass}>
          {items.map((item) => (
            <div className={classNames(listCardClass, !item.isRead && selectedCardClass)} key={item.id}>
              <strong>{item.title}</strong>
              <span>{item.type}</span>
              <small>{item.message}</small>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge label={item.priority} tone={item.priority === "High" ? "danger" : "info"} />
                <StatusBadge label={item.isRead ? "Read" : "Unread"} tone={item.isRead ? "success" : "warning"} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {!item.isRead ? (
                  <button className={ghostButtonClass} onClick={() => auth && api.markNotificationRead(auth.token, item.id).then(() => { setMessage("Notification marked as read."); void refresh(); })}>
                    Mark Read
                  </button>
                ) : null}
                <button className={dangerButtonClass} onClick={() => auth && api.deleteNotification(auth.token, item.id).then(() => { setMessage("Notification deleted."); void refresh(); })}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      {canManage ? (
        <Panel title="Templates" subtitle="Maintain reusable notification layouts and supported channels">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Variables</th>
                  <th>Channels</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id}>
                    <td>
                      <strong>{template.templateType}</strong>
                      <div className="text-xs text-slate-500">{template.subjectTemplate}</div>
                    </td>
                    <td>{template.variables.join(", ") || "None"}</td>
                    <td>{template.supportedChannels.join(", ") || "None"}</td>
                    <td>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button className={ghostButtonClass} onClick={() => setEditingTemplate(template)}>Edit</button>
                        {canWrite ? <button className={dangerButtonClass} onClick={() => setDeletingTemplate(template)}>Delete</button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {canWrite ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button className={primaryButtonClass} onClick={() => setEditingTemplate({} as NotificationTemplateRecord)}>
                Create Template
              </button>
            </div>
          ) : null}
        </Panel>
      ) : null}
      {canManage ? (
        <Panel title="Alert Rules" subtitle="Define automated notification conditions and downstream actions">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Condition</th>
                  <th>Action</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td>
                      <strong>{rule.name}</strong>
                      <div className="text-xs text-slate-500">{rule.lastTriggered ? `Last triggered ${new Date(rule.lastTriggered).toLocaleString()}` : "Never triggered"}</div>
                    </td>
                    <td>{rule.conditionType}</td>
                    <td>{rule.actionType}</td>
                    <td>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button className={ghostButtonClass} onClick={() => setEditingRule(rule)}>Edit</button>
                        {canWrite ? <button className={dangerButtonClass} onClick={() => setDeletingRule(rule)}>Delete</button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {canWrite ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button className={primaryButtonClass} onClick={() => setEditingRule({} as AlertRuleRecord)}>
                Create Rule
              </button>
            </div>
          ) : null}
        </Panel>
      ) : null}
      <BroadcastNotificationDialog
        open={broadcastOpen}
        departments={departments}
        onClose={() => setBroadcastOpen(false)}
        onSubmit={(payload) => {
          if (!auth) {
            return;
          }

          void api.broadcastNotification(auth.token, payload).then(() => {
            setBroadcastOpen(false);
            setMessage("Broadcast queued.");
          });
        }}
      />
      <NotificationTemplateFormDialog
        open={editingTemplate !== null}
        template={editingTemplate?.id ? editingTemplate : undefined}
        onClose={() => setEditingTemplate(null)}
        onSubmit={(payload) => {
          if (!auth) {
            return;
          }

          const action = editingTemplate?.id
            ? api.updateNotificationTemplate(auth.token, editingTemplate.id, payload)
            : api.createNotificationTemplate(auth.token, payload);

          void action.then(() => {
            setEditingTemplate(null);
            setMessage(editingTemplate?.id ? "Template updated." : "Template created.");
            void refresh();
          });
        }}
      />
      <AlertRuleFormDialog
        open={editingRule !== null}
        rule={editingRule?.id ? editingRule : undefined}
        onClose={() => setEditingRule(null)}
        onSubmit={(payload) => {
          if (!auth) {
            return;
          }

          const action = editingRule?.id
            ? api.updateAlertRule(auth.token, editingRule.id, payload)
            : api.createAlertRule(auth.token, payload);

          void action.then(() => {
            setEditingRule(null);
            setMessage(editingRule?.id ? "Rule updated." : "Rule created.");
            void refresh();
          });
        }}
      />
      <ConfirmDialog
        open={deletingTemplate !== null}
        title="Delete Template"
        message={`Delete ${deletingTemplate?.templateType}?`}
        onClose={() => setDeletingTemplate(null)}
        onConfirm={() =>
          auth && deletingTemplate
            ? api.deleteNotificationTemplate(auth.token, deletingTemplate.id).then(() => {
                setDeletingTemplate(null);
                setMessage("Template deleted.");
                void refresh();
              })
            : undefined
        }
        confirmLabel="Delete"
      />
      <ConfirmDialog
        open={deletingRule !== null}
        title="Delete Rule"
        message={`Delete ${deletingRule?.name}?`}
        onClose={() => setDeletingRule(null)}
        onConfirm={() =>
          auth && deletingRule
            ? api.deleteAlertRule(auth.token, deletingRule.id).then(() => {
                setDeletingRule(null);
                setMessage("Rule deleted.");
                void refresh();
              })
            : undefined
        }
        confirmLabel="Delete"
      />
    </div>
  );
}
