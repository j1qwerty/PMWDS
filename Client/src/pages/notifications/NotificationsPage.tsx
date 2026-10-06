import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import type {
  AlertRuleRecord,
  Department,
  NotificationItem,
  NotificationTemplateRecord,
} from "../../types";
import {
  AnimatedBackground,
  LoadingPage,
  useNavHeader,
  ModalOverlay,
  PERMISSION_GROUPS,
  usePermission,
  StatCard,
  TabButton,
  useToast,
} from "../shared";
import { NotificationInbox } from "./NotificationInbox";
import { NotificationTemplates } from "./NotificationTemplates";
import { NotificationRules } from "./NotificationRules";
import { BroadcastModal } from "./BroadcastModal";
import { TemplateFormModal } from "./TemplateFormModal";
import { RuleFormModal } from "./RuleFormModal";
import { DeleteConfirmationModal } from "../shared/DeleteConfirmationModal";

export function NotificationsPage() {
  const { auth } = useAuth();
  const perm = usePermission();
  // Templates and Alert Rules are SuperAdmin-only. Keying this off the
  // superadmin role (rather than the template/rule permissions) hides the
  // stat cards, the tabs, and the loaders for every other role.
  const canConfigure = perm.isSuperAdmin;
  const canBroadcast = perm.has(PERMISSION_GROUPS.notification.broadcast);

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplateRecord[]>([]);
  const [rules, setRules] = useState<AlertRuleRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"inbox" | "templates" | "rules">("inbox");
  // Sub-filter for the inbox: "all" shows every notification, "unread" only
  // the ones still flagged. Defaults to "all" so nothing looks silently lost.
  const [inboxFilter, setInboxFilter] = useState<"all" | "unread">("all");

  // Modal states
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [templateModal, setTemplateModal] = useState<{ open: boolean; editTemplate?: NotificationTemplateRecord }>({ open: false });
  const [ruleModal, setRuleModal] = useState<{ open: boolean; editRule?: AlertRuleRecord }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    type: "template" | "rule";
    id: string;
    name: string;
  }>({ open: false, type: "template", id: "", name: "" });

  const { setNavHeader } = useNavHeader();

  useEffect(() => {
    setNavHeader({
      title: "Notifications",
      description: canConfigure ? "Manage inbox, templates, and alert rules" : "Manage your notification inbox",
      action: canBroadcast ? {
        label: "Broadcast",
        onClick: () => setBroadcastOpen(true),
        icon: "campaign",
      } : undefined,
    });
  }, [setNavHeader, canConfigure, canBroadcast]);

  const loadData = () => {
    if (!auth) return;
    setLoading(true);
    Promise.all([
      api.getNotifications(auth.token),
      canConfigure ? api.getNotificationTemplates(auth.token) : Promise.resolve([]),
      canConfigure ? api.getAlertRules(auth.token) : Promise.resolve([]),
      canBroadcast ? api.getDepartments(auth.token) : Promise.resolve([]),
    ])
      .then(([notificationData, templateData, ruleData, departmentData]) => {
        setItems(notificationData);
        setTemplates(templateData);
        setRules(ruleData);
        setDepartments(departmentData);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [auth, canBroadcast, canConfigure]);

  useEffect(() => {
    if (!canConfigure && activeTab !== "inbox") {
      setActiveTab("inbox");
    }
  }, [activeTab, canConfigure]);

  const unreadCount = items.filter(i => !i.isRead).length;
  const readCount = items.length - unreadCount;
  const visibleItems = inboxFilter === "unread" ? items.filter(i => !i.isRead) : items;

  const handleMarkAllRead = async () => {
    if (!auth) return;
    await api.markAllNotificationsRead(auth.token);
    addToast("All notifications marked as read.");
    loadData();
  };

  const handleMarkRead = async (id: string) => {
    if (!auth) return;
    await api.markNotificationRead(auth.token, id);
    loadData();
  };

  const handleDeleteNotification = async (id: string) => {
    if (!auth) return;
    await api.deleteNotification(auth.token, id);
    addToast("Notification deleted.");
    loadData();
  };

  const handleBroadcast = async (payload: Record<string, unknown>) => {
    if (!auth) return;
    await api.broadcastNotification(auth.token, payload);
    setBroadcastOpen(false);
    addToast("Broadcast sent successfully.");
  };

  const handleTemplateSubmit = async (payload: Record<string, unknown>) => {
    if (!auth) return;
    if (templateModal.editTemplate) {
      await api.updateNotificationTemplate(auth.token, templateModal.editTemplate.id, payload);
      addToast("Template updated.");
    } else {
      await api.createNotificationTemplate(auth.token, payload);
      addToast("Template created.");
    }
    setTemplateModal({ open: false });
    loadData();
  };

  const handleRuleSubmit = async (payload: Record<string, unknown>) => {
    if (!auth) return;
    if (ruleModal.editRule) {
      await api.updateAlertRule(auth.token, ruleModal.editRule.id, payload);
      addToast("Rule updated.");
    } else {
      await api.createAlertRule(auth.token, payload);
      addToast("Rule created.");
    }
    setRuleModal({ open: false });
    loadData();
  };

  const handleDelete = async () => {
    if (!auth) return;
    if (deleteConfirm.type === "template") {
      await api.deleteNotificationTemplate(auth.token, deleteConfirm.id);
    } else {
      await api.deleteAlertRule(auth.token, deleteConfirm.id);
    }
    addToast(`${deleteConfirm.type === "template" ? "Template" : "Rule"} deleted.`);
    setDeleteConfirm({ open: false, type: "template", id: "", name: "" });
    loadData();
  };

  if (loading) return <LoadingPage label="Loading notifications..." />;

  return (
    <div>
      <AnimatedBackground />





      {/* Stats Row */}
      {/* Column count follows the card count. Non-superadmins get three cards
          (Total, Unread, Read), and a two-column grid left the third stranded
          on its own row. */}
      <div
        className={`relative z-10 grid grid-cols-2 gap-3 mb-5 ${
          canConfigure ? "lg:grid-cols-4" : "sm:grid-cols-3 lg:grid-cols-3"
        }`}
      >
        <StatCard label="Total Notifications" value={items.length} color="indigo" icon="notifications" />
        <StatCard label="Unread" value={unreadCount} color="amber" icon="mark_email_unread" />
        <StatCard label="Read" value={readCount} color="emerald" icon="mark_email_read" />
        {canConfigure && (
          <>
            <StatCard label="Templates" value={templates.length} color="emerald" icon="description" />
            <StatCard label="Alert Rules" value={rules.length} color="violet" icon="rule" />
          </>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="relative z-10 mb-5">
        <div className="flex gap-2 border-b border-slate-200 pb-0 flex-wrap">
          <TabButton
            active={activeTab === "inbox" && inboxFilter === "all"}
            onClick={() => {
              setActiveTab("inbox");
              setInboxFilter("all");
            }}
            icon="notifications"
            label="All Notifications"
            count={items.length}
          />
          <TabButton
            active={activeTab === "inbox" && inboxFilter === "unread"}
            onClick={() => {
              setActiveTab("inbox");
              setInboxFilter("unread");
            }}
            icon="mark_email_unread"
            label="Unread"
            count={unreadCount}
            countColor="amber"
          />
          {canConfigure && (
            <>
              <TabButton
                active={activeTab === "templates"}
                onClick={() => setActiveTab("templates")}
                icon="description"
                label="Templates"
                count={templates.length}
              />
              <TabButton
                active={activeTab === "rules"}
                onClick={() => setActiveTab("rules")}
                icon="rule"
                label="Alert Rules"
                count={rules.length}
              />
            </>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="relative z-10">
        {activeTab === "inbox" && (
          <NotificationInbox
            items={visibleItems}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onDelete={handleDeleteNotification}
            onBroadcast={() => setBroadcastOpen(true)}
            canWrite={canBroadcast}
            emptyTitle={inboxFilter === "unread" ? "No unread notifications" : "No notifications"}
            emptySubtitle={
              inboxFilter === "unread"
                ? `All ${items.length} notification${items.length === 1 ? "" : "s"} read. Nothing needs your attention.`
                : "You're all caught up!"
            }
          />
        )}

        {activeTab === "templates" && canConfigure && (
          <NotificationTemplates
            templates={templates}
            onEdit={(template) => setTemplateModal({ open: true, editTemplate: template })}
            onDelete={(template) => setDeleteConfirm({ open: true, type: "template", id: template.id, name: template.templateType })}
            onCreate={() => setTemplateModal({ open: true })}
            canWrite={canConfigure}
          />
        )}

        {activeTab === "rules" && canConfigure && (
          <NotificationRules
            rules={rules}
            onEdit={(rule) => setRuleModal({ open: true, editRule: rule })}
            onDelete={(rule) => setDeleteConfirm({ open: true, type: "rule", id: rule.id, name: rule.name })}
            onCreate={() => setRuleModal({ open: true })}
            canWrite={canConfigure}
          />
        )}
      </div>

      {/* Modals */}
      {broadcastOpen && canBroadcast && (
        <ModalOverlay onClose={() => setBroadcastOpen(false)}>
          <BroadcastModal
            departments={departments}
            onSubmit={handleBroadcast}
            onCancel={() => setBroadcastOpen(false)}
          />
        </ModalOverlay>
      )}

      {templateModal.open && canConfigure && (
        <ModalOverlay onClose={() => setTemplateModal({ open: false })}>
          <TemplateFormModal
            initialData={templateModal.editTemplate}
            onSubmit={handleTemplateSubmit}
            onCancel={() => setTemplateModal({ open: false })}
          />
        </ModalOverlay>
      )}

      {ruleModal.open && canConfigure && (
        <ModalOverlay onClose={() => setRuleModal({ open: false })}>
          <RuleFormModal
            initialData={ruleModal.editRule}
            onSubmit={handleRuleSubmit}
            onCancel={() => setRuleModal({ open: false })}
          />
        </ModalOverlay>
      )}

      {deleteConfirm.open && canConfigure && (
        <ModalOverlay onClose={() => setDeleteConfirm({ open: false, type: "template", id: "", name: "" })}>
          <DeleteConfirmationModal
            name={deleteConfirm.name}
            warning={`This will permanently delete this ${deleteConfirm.type}.`}
            onConfirm={handleDelete}
            onCancel={() => setDeleteConfirm({ open: false, type: "template", id: "", name: "" })}
          />
        </ModalOverlay>
      )}
    </div>
  );
}


