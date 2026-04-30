import { useEffect, useState } from "react";
import { api } from "../../../api";
import { useAuth } from "../../../auth";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { ErrorPanel, LoadingPanel, Notice, Panel } from "../../../ui";
import type { PermissionRecord } from "../../../types";
import { PermissionFormDialog } from "../components/PermissionFormDialog";

export function PermissionsPage() {
  const { auth } = useAuth();
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [editingPermission, setEditingPermission] = useState<PermissionRecord | null>(null);
  const [confirmPermission, setConfirmPermission] = useState<PermissionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!auth) return;
    api.getPermissions(auth.token).then((items) => { setPermissions(items); setLoading(false); }).catch((cause: unknown) => { setError(cause instanceof Error ? cause.message : "Failed to load permissions."); setLoading(false); });
  }, [auth]);

  const refresh = () => auth && api.getPermissions(auth.token).then(setPermissions);

  if (loading) return <LoadingPanel label="Loading permissions..." />;
  if (error) return <ErrorPanel message={error} />;

  return (
    <div className="grid  gap-4 content-start">
      {message ? <Notice>{message}</Notice> : null}
      <Panel title="Permissions" subtitle="Permission codes, modules, and scope control"><div className="overflow-x-auto"><table className="w-full border-collapse text-sm"><thead><tr><th>Code</th><th>Name</th><th>Module</th><th>Scope</th><th>Actions</th></tr></thead><tbody>{permissions.map((permission) => <tr key={permission.id}><td><strong>{permission.code}</strong></td><td>{permission.name}<div className="text-xs text-slate-500">{permission.description}</div></td><td>{permission.module}</td><td>{permission.isGlobal ? "Global" : "Scoped"}</td><td><div className="mt-4 flex flex-wrap gap-2"><button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setEditingPermission(permission)}>Edit</button><button className="rounded-md border border-rose-300/40 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-400/20" onClick={() => setConfirmPermission(permission)}>Delete</button></div></td></tr>)}</tbody></table></div><div className="mt-4 flex flex-wrap gap-2"><button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setEditingPermission({} as PermissionRecord)}>Create Permission</button></div></Panel>
      <PermissionFormDialog open={editingPermission !== null} permission={editingPermission?.id ? editingPermission : undefined} onClose={() => setEditingPermission(null)} onSubmit={(payload) => auth && void (editingPermission?.id ? api.updatePermission(auth.token, editingPermission.id, payload) : api.createPermission(auth.token, payload)).then(() => { setEditingPermission(null); setMessage(editingPermission?.id ? "Permission updated." : "Permission created."); void refresh(); })} />
      <ConfirmDialog title="Delete Permission" message={`Delete ${confirmPermission?.code}?`} open={confirmPermission !== null} onClose={() => setConfirmPermission(null)} onConfirm={() => auth && confirmPermission ? api.deletePermission(auth.token, confirmPermission.id).then(() => { setConfirmPermission(null); setMessage("Permission deleted."); void refresh(); }) : undefined} confirmLabel="Delete" />
    </div>
  );
}
