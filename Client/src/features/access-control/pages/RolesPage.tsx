import { useEffect, useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { StatusBadge } from "../../../components/common/StatusBadge";
import { ErrorPanel, LoadingPanel, Notice, Panel } from "../../../ui";
import type { PermissionRecord, RoleRecord } from "../../../types";
import { PermissionFormDialog } from "../components/PermissionFormDialog";
import { RoleFormDialog } from "../components/RoleFormDialog";

export function RolesPage() {
  const { auth } = useAuth();
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [editingPermission, setEditingPermission] = useState<PermissionRecord | null>(null);
  const [confirmRole, setConfirmRole] = useState<RoleRecord | null>(null);
  const [confirmPermission, setConfirmPermission] = useState<PermissionRecord | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth) return;
    Promise.all([api.getRoles(auth.token), api.getPermissions(auth.token)]).then(([roleData, permissionData]) => { setRoles(roleData); setPermissions(permissionData); setLoading(false); }).catch((cause: unknown) => { setError(cause instanceof Error ? cause.message : "Failed to load roles."); setLoading(false); });
  }, [auth]);

  const refresh = () => auth && Promise.all([api.getRoles(auth.token), api.getPermissions(auth.token)]).then(([roleData, permissionData]) => { setRoles(roleData); setPermissions(permissionData); });

  if (loading) return <LoadingPanel label="Loading roles and permissions..." />;
  if (error) return <ErrorPanel message={error} />;

  return (
    <div className="grid gap-4 content-start">
      {message ? <Notice>{message}</Notice> : null}
      <Panel title="Roles" subtitle="Role definitions and permission assignment"><div className="overflow-x-auto rounded-lg border border-white/10"><table className="w-full border-collapse text-sm"><thead><tr className="border-b border-white/10 bg-white/[0.02]"><th className="p-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th><th className="p-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Level</th><th className="p-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Permissions</th><th className="p-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th></tr></thead><tbody>{roles.map((role) => <tr key={role.id} className="border-b border-white/5 hover:bg-white/[0.02]"><td className="p-4 align-middle"><strong className="text-white">{role.name}</strong><div className="text-xs text-slate-500">{role.description}</div></td><td className="p-4 align-middle text-slate-300">{role.permissionLevel}</td><td className="p-4 align-middle"><div className="flex flex-wrap gap-2">{role.permissions.map((permission) => <StatusBadge key={permission.id} label={permission.code} tone="info" />)}</div></td><td className="p-4 align-middle"><div className="flex flex-wrap gap-2"><button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setEditingRole(role)}>Edit</button><button className="rounded-md border border-rose-300/40 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-400/20" onClick={() => setConfirmRole(role)}>Delete</button></div></td></tr>)}</tbody></table></div><div className="mt-4 flex flex-wrap gap-2"><button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setEditingRole({} as RoleRecord)}>Create Role</button></div></Panel>
      <Panel title="Permissions" subtitle="Module-level permissions used by roles"><div className="overflow-x-auto rounded-lg border border-white/10"><table className="w-full border-collapse text-sm"><thead><tr className="border-b border-white/10 bg-white/[0.02]"><th className="p-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Code</th><th className="p-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Module</th><th className="p-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Scope</th><th className="p-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th></tr></thead><tbody>{permissions.map((permission) => <tr key={permission.id} className="border-b border-white/5 hover:bg-white/[0.02]"><td className="p-4 align-middle"><strong className="text-white">{permission.code}</strong><div className="text-xs text-slate-500">{permission.name}</div></td><td className="p-4 align-middle text-slate-300">{permission.module}</td><td className="p-4 align-middle text-slate-300">{permission.isGlobal ? "Global" : "Scoped"}</td><td className="p-4 align-middle"><div className="flex flex-wrap gap-2"><button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setEditingPermission(permission)}>Edit</button><button className="rounded-md border border-rose-300/40 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-400/20" onClick={() => setConfirmPermission(permission)}>Delete</button></div></td></tr>)}</tbody></table></div><div className="mt-4 flex flex-wrap gap-2"><button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setEditingPermission({} as PermissionRecord)}>Create Permission</button></div></Panel>
      <RoleFormDialog open={editingRole !== null} role={editingRole?.id ? editingRole : undefined} permissions={permissions} onClose={() => setEditingRole(null)} onSubmit={(payload) => auth && void (editingRole?.id ? api.updateRole(auth.token, editingRole.id, payload) : api.createRole(auth.token, payload)).then(() => { setEditingRole(null); setMessage(editingRole?.id ? "Role updated." : "Role created."); void refresh(); })} />
      <PermissionFormDialog open={editingPermission !== null} permission={editingPermission?.id ? editingPermission : undefined} onClose={() => setEditingPermission(null)} onSubmit={(payload) => auth && void (editingPermission?.id ? api.updatePermission(auth.token, editingPermission.id, payload) : api.createPermission(auth.token, payload)).then(() => { setEditingPermission(null); setMessage(editingPermission?.id ? "Permission updated." : "Permission created."); void refresh(); })} />
      <ConfirmDialog title="Delete Role" message={`Delete ${confirmRole?.name}?`} open={confirmRole !== null} onClose={() => setConfirmRole(null)} onConfirm={() => auth && confirmRole ? api.deleteRole(auth.token, confirmRole.id).then(() => { setConfirmRole(null); setMessage("Role deleted."); void refresh(); }) : undefined} confirmLabel="Delete" />
      <ConfirmDialog title="Delete Permission" message={`Delete ${confirmPermission?.code}?`} open={confirmPermission !== null} onClose={() => setConfirmPermission(null)} onConfirm={() => auth && confirmPermission ? api.deletePermission(auth.token, confirmPermission.id).then(() => { setConfirmPermission(null); setMessage("Permission deleted."); void refresh(); }) : undefined} confirmLabel="Delete" />
    </div>
  );
}
