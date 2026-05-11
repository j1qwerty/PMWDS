import { useEffect, useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { StatusBadge } from "../../../components/common/StatusBadge";
import type {
  AlertRuleRecord,
  Department,
  NotificationItem,
  NotificationTemplateRecord,
} from "../../../types";
import { AlertRuleFormDialog } from "../components/AlertRuleFormDialog";
import { BroadcastNotificationDialog } from "../components/BroadcastNotificationDialog";
import { NotificationTemplateFormDialog } from "../components/NotificationTemplateFormDialog";

const cardClass = "bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all duration-300";
const buttonPrimaryClass = "px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const buttonGhostClass = "px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 font-medium text-sm hover:bg-slate-50 hover:border-slate-300 transition-all";
const buttonDangerClass = "px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-600 font-medium text-sm hover:bg-red-100 transition-colors";

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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Loading notifications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">{error}</p>
        <button className="mt-4 text-blue-600 hover:underline" onClick={() => { setError(""); void refresh(); }}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message Toast */}
      {message && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <span className="text-blue-700">{message}</span>
          <button className="text-blue-400 hover:text-blue-600" onClick={() => setMessage("")}>
            ✕
          </button>
        </div>
      )}

      {/* Inbox Section */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Inbox</h2>
            <p className="text-sm text-slate-500">Read, clear, and monitor personal notifications</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={buttonGhostClass} onClick={() => auth && api.markAllNotificationsRead(auth.token).then(() => { setMessage("Notifications marked as read."); void refresh(); })}>
              Mark All Read
            </button>
            {canWrite && (
              <button className={buttonPrimaryClass} onClick={() => setBroadcastOpen(true)}>
                Broadcast
              </button>
            )}
          </div>
        </div>
        
        <div className="max-h-[500px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📭</span>
              </div>
              <p className="text-slate-500">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <div key={item.id} className={`p-4 hover:bg-slate-50 transition-colors ${!item.isRead ? "bg-blue-50/50" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <strong className="text-slate-800 font-semibold">{item.title}</strong>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{item.type}</span>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{item.message}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          item.priority === "High" 
                            ? "bg-red-100 text-red-700" 
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {item.priority}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          item.isRead 
                            ? "bg-emerald-100 text-emerald-700" 
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {item.isRead ? "Read" : "Unread"}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {!item.isRead ? (
                        <button 
                          className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                          onClick={() => auth && api.markNotificationRead(auth.token, item.id).then(() => { setMessage("Notification marked as read."); void refresh(); })}
                        >
                          Mark Read
                        </button>
                      ) : null}
                      <button 
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        onClick={() => auth && api.deleteNotification(auth.token, item.id).then(() => { setMessage("Notification deleted."); void refresh(); })}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Templates Section */}
      {canManage && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Templates</h2>
              <p className="text-sm text-slate-500">Maintain reusable notification layouts and channels</p>
            </div>
            {canWrite && (
              <button className={buttonPrimaryClass} onClick={() => setEditingTemplate({} as NotificationTemplateRecord)}>
                Create Template
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-slate-600">Type</th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-600">Variables</th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-600">Channels</th>
                  <th className="text-right px-6 py-3 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      No templates yet
                    </td>
                  </tr>
                ) : (
                  templates.map((template) => (
                    <tr key={template.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <strong className="text-slate-800">{template.templateType}</strong>
                        <p className="text-xs text-slate-500 mt-0.5">{template.subjectTemplate}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {template.variables.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {template.variables.map((v) => (
                              <span key={v} className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                {v}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {template.supportedChannels.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {template.supportedChannels.map((c) => (
                              <span key={c} className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600">
                                {c}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => setEditingTemplate(template)}>
                            Edit
                          </button>
                          {canWrite && (
                            <button className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50" onClick={() => setDeletingTemplate(template)}>
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alert Rules Section */}
      {canManage && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Alert Rules</h2>
              <p className="text-sm text-slate-500">Define automated notification conditions and actions</p>
            </div>
            {canWrite && (
              <button className={buttonPrimaryClass} onClick={() => setEditingRule({} as AlertRuleRecord)}>
                Create Rule
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-slate-600">Name</th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-600">Condition</th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-600">Action</th>
                  <th className="text-right px-6 py-3 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rules.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      No alert rules yet
                    </td>
                  </tr>
                ) : (
                  rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <strong className="text-slate-800">{rule.name}</strong>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {rule.lastTriggered 
                            ? `Last triggered ${new Date(rule.lastTriggered).toLocaleString()}` 
                            : "Never triggered"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100">
                          {rule.conditionType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600">
                          {rule.actionType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => setEditingRule(rule)}>
                            Edit
                          </button>
                          {canWrite && (
                            <button className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50" onClick={() => setDeletingRule(rule)}>
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <BroadcastNotificationDialog
        open={broadcastOpen}
        departments={departments}
        onClose={() => setBroadcastOpen(false)}
        onSubmit={(payload) => {
          if (!auth) return;
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
          if (!auth) return;
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
          if (!auth) return;
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