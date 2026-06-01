import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAppData } from "../../appData";
import { useAuth } from "../../auth";
import type { PermissionRecord, RoleRecord } from "../../types";
import { 
  AnimatedBackground, 
  GlassCard, 
  LoadingPage,
  useNavHeader,
  ModalOverlay,
  DeleteConfirmationModal,
  useRoleAccess,
} from "../shared";
import { RolesTable } from "./RolesTable";
import { PermissionsTable } from "./PermissionsTable";
import { RoleFormModal } from "./RoleFormModal";
import { PermissionFormModal } from "./PermissionFormModal";

export function RolesPage() {
  const { auth } = useAuth();
  const { data, loading: appDataLoading, refresh: refreshAppData } = useAppData();
  const access = useRoleAccess();
  const isAdmin = access.canManageRoles || access.canManagePermissions;

  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"roles" | "permissions">("roles");

  // Modal states
  const [roleModal, setRoleModal] = useState<{ open: boolean; editRole?: RoleRecord }>({ open: false });
  const [permissionModal, setPermissionModal] = useState<{ open: boolean; editPermission?: PermissionRecord }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    type: "role" | "permission";
    id: string;
    name: string;
  }>({ open: false, type: "role", id: "", name: "" });

  const { setNavHeader } = useNavHeader();

  useEffect(() => {
    setNavHeader({ title: "Roles & Permissions", description: "Manage role definitions, permission levels, and access control" });
  }, [setNavHeader]);

  const loadData = () => {
    if (!auth) return;
    setLoading(true);
    setRoles(data.roles);
    setPermissions(data.permissions);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [auth, data]);

  const handleRoleSubmit = async (payload: Record<string, unknown>) => {
    if (!auth) return;
    try {
      if (roleModal.editRole) {
        await api.updateRole(auth.token, roleModal.editRole.id, payload);
        setMessage("Role updated successfully.");
      } else {
        await api.createRole(auth.token, payload);
        setMessage("Role created successfully.");
      }
      setRoleModal({ open: false });
      await refreshAppData();
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : "Save failed"}`);
    }
  };

  const handlePermissionSubmit = async (payload: Record<string, unknown>) => {
    if (!auth) return;
    try {
      if (permissionModal.editPermission) {
        await api.updatePermission(auth.token, permissionModal.editPermission.id, payload);
        setMessage("Permission updated successfully.");
      } else {
        await api.createPermission(auth.token, payload);
        setMessage("Permission created successfully.");
      }
      setPermissionModal({ open: false });
      await refreshAppData();
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : "Save failed"}`);
    }
  };

  const handleDelete = async () => {
    if (!auth) return;
    try {
      if (deleteConfirm.type === "role") {
        await api.deleteRole(auth.token, deleteConfirm.id);
      } else {
        await api.deletePermission(auth.token, deleteConfirm.id);
      }
      setMessage(`${deleteConfirm.type === "role" ? "Role" : "Permission"} deleted.`);
      setDeleteConfirm({ open: false, type: "role", id: "", name: "" });
      await refreshAppData();
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : "Deletion failed"}`);
    }
  };

  if (loading || appDataLoading) return <LoadingPage label="Loading roles and permissions..." />;

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
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Roles" value={roles.length} color="indigo" icon="shield" />
        <StatCard label="Permissions" value={permissions.length} color="violet" icon="lock" />
        <StatCard 
          label="Global Perms" 
          value={permissions.filter(p => p.isGlobal).length} 
          color="emerald" 
          icon="public" 
        />
        <StatCard 
          label="Avg Level" 
          value={roles.length > 0 ? Math.round(roles.reduce((sum, r) => sum + r.permissionLevel, 0) / roles.length) : 0}
          color="amber" 
          icon="trending_up" 
        />
      </div>

      {/* Tab Navigation */}
      <div className="relative z-10 mb-5">
        <div className="flex gap-2 border-b border-slate-200">
          <TabButton
            active={activeTab === "roles"}
            onClick={() => setActiveTab("roles")}
            icon="shield"
            label="Roles"
            count={roles.length}
          />
          <TabButton
            active={activeTab === "permissions"}
            onClick={() => setActiveTab("permissions")}
            icon="lock"
            label="Permissions"
            count={permissions.length}
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className="relative z-10">
        {activeTab === "roles" && (
          <RolesTable
            roles={roles}
            onEdit={(role) => setRoleModal({ open: true, editRole: role })}
            onDelete={(role) => setDeleteConfirm({ open: true, type: "role", id: role.id, name: role.name })}
            onCreate={() => setRoleModal({ open: true })}
            isAdmin={isAdmin}
          />
        )}

        {activeTab === "permissions" && (
          <PermissionsTable
            permissions={permissions}
            onEdit={(perm) => setPermissionModal({ open: true, editPermission: perm })}
            onDelete={(perm) => setDeleteConfirm({ open: true, type: "permission", id: perm.id, name: perm.code })}
            onCreate={() => setPermissionModal({ open: true })}
            isAdmin={isAdmin}
          />
        )}
      </div>

      {/* Modals */}
      {roleModal.open && (
        <ModalOverlay onClose={() => setRoleModal({ open: false })}>
          <RoleFormModal
            initialData={roleModal.editRole}
            permissions={permissions}
            onSubmit={handleRoleSubmit}
            onCancel={() => setRoleModal({ open: false })}
          />
        </ModalOverlay>
      )}

      {permissionModal.open && (
        <ModalOverlay onClose={() => setPermissionModal({ open: false })}>
          <PermissionFormModal
            initialData={permissionModal.editPermission}
            onSubmit={handlePermissionSubmit}
            onCancel={() => setPermissionModal({ open: false })}
          />
        </ModalOverlay>
      )}

      {deleteConfirm.open && (
        <ModalOverlay onClose={() => setDeleteConfirm({ open: false, type: "role", id: "", name: "" })}>
          <DeleteConfirmationModal
            name={deleteConfirm.name}
            warning={`This will permanently delete this ${deleteConfirm.type}. ${deleteConfirm.type === "role" ? "Users assigned this role will lose associated permissions." : "Roles using this permission will be affected."}`}
            onConfirm={handleDelete}
            onCancel={() => setDeleteConfirm({ open: false, type: "role", id: "", name: "" })}
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
    violet: { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
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

function TabButton({ active, onClick, icon, label, count }: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  count?: number;
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
      {count !== undefined && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
          active ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}
