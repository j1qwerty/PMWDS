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
} from "../shared";

import { NotificationInbox } from "./NotificationInbox";
import { NotificationTemplates } from "./NotificationTemplates";
import { NotificationRules } from "./NotificationRules";
import { BroadcastModal } from "./BroadcastModal";
import { TemplateFormModal } from "./TemplateFormModal";
import { RuleFormModal } from "./RuleFormModal";
import { DeleteConfirmationModal } from "../shared/DeleteConfirmationModal";

export function NotificationsPage() {
  const { auth, hasRole } = useAuth();
  const canConfigure = hasRole("SuperAdmin");
  const canBroadcast = hasRole("SuperAdmin", "Director", "DepartmentHead");

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplateRecord[]>([]);
  const [rules, setRules] = useState<AlertRuleRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"inbox" | "templates" | "rules">("inbox");

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

  const handleMarkAllRead = async () => {
    if (!auth) return;
    await api.markAllNotificationsRead(auth.token);
    setMessage("All notifications marked as read.");
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
    setMessage("Notification deleted.");
    loadData();
  };

  const handleBroadcast = async (payload: Record<string, unknown>) => {
    if (!auth) return;
    await api.broadcastNotification(auth.token, payload);
    setBroadcastOpen(false);
    setMessage("Broadcast sent successfully.");
  };

  const handleTemplateSubmit = async (payload: Record<string, unknown>) => {
    if (!auth) return;
    if (templateModal.editTemplate) {
      await api.updateNotificationTemplate(auth.token, templateModal.editTemplate.id, payload);
      setMessage("Template updated.");
    } else {
      await api.createNotificationTemplate(auth.token, payload);
      setMessage("Template created.");
    }
    setTemplateModal({ open: false });
    loadData();
  };

  const handleRuleSubmit = async (payload: Record<string, unknown>) => {
    if (!auth) return;
    if (ruleModal.editRule) {
      await api.updateAlertRule(auth.token, ruleModal.editRule.id, payload);
      setMessage("Rule updated.");
    } else {
      await api.createAlertRule(auth.token, payload);
      setMessage("Rule created.");
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
    setMessage(`${deleteConfirm.type === "template" ? "Template" : "Rule"} deleted.`);
    setDeleteConfirm({ open: false, type: "template", id: "", name: "" });
    loadData();
  };

  if (loading) return <LoadingPage label="Loading notifications..." />;

  return (
    <div>
      <AnimatedBackground />

      {/* Message */}
      {message && (
        <div className="relative z-10 mb-5 bg-emerald-50 border border-emerald-200 rounded-xl py-3.5 px-5 text-emerald-700 text-sm flex items-center gap-2.5 animate-[slideIn_0.3s_ease]">
          <span className="material-symbols-outlined">check_circle</span>
          {message}
          <button
            className="ml-auto bg-transparent border-none cursor-pointer text-emerald-500 hover:text-emerald-700"
            onClick={() => setMessage("")}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Stats Row */}
      <div className={`relative z-10 grid grid-cols-2 ${canConfigure ? "md:grid-cols-4" : "md:grid-cols-2"} gap-3 mb-5`}>
        <StatCard label="Total Notifications" value={items.length} color="indigo" icon="notifications" />
        <StatCard label="Unread" value={unreadCount} color="amber" icon="mark_email_unread" />
        {canConfigure && (
          <>
            <StatCard label="Templates" value={templates.length} color="emerald" icon="description" />
            <StatCard label="Alert Rules" value={rules.length} color="violet" icon="rule" />
          </>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="relative z-10 mb-5">
        <div className="flex gap-2 border-b border-slate-200 pb-0">
          <TabButton
            active={activeTab === "inbox"}
            onClick={() => setActiveTab("inbox")}
            icon="inbox"
            label="Inbox"
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
            items={items}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onDelete={handleDeleteNotification}
            onBroadcast={() => setBroadcastOpen(true)}
            canWrite={canBroadcast}
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

// Helper Components
function StatCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: string }) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
    violet: { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-100" },
    blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
  };
  const colors = colorMap[color] || colorMap.indigo;

  return (
    <div className={`rounded-xl border p-4 ${colors.border} ${colors.bg}`}>
      <div className="flex items-center gap-3">
        <span className={`material-symbols-outlined text-xl ${colors.text}`}>{icon}</span>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-bold ${colors.text}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, count, countColor }: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  count?: number;
  countColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-5 py-3 rounded-t-xl text-sm font-medium transition-all duration-200 flex items-center gap-2
        ${active
          ? "bg-white text-indigo-600 border border-slate-200 border-b-white -mb-px"
          : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
        }
      `}
    >
      <span className="material-symbols-outlined text-lg">{icon}</span>
      {label}
      {count !== undefined && count > 0 && (
        <span className={`
          px-2 py-0.5 rounded-full text-xs font-bold
          ${countColor === "amber" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}
        `}>
          {count}
        </span>
      )}
    </button>
  );
}
