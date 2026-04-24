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
    <div className="page-grid">
      {message ? <Notice>{message}</Notice> : null}
      <Panel title="Permissions" subtitle="Permission codes, modules, and scope control"><div className="table-wrap"><table className="table"><thead><tr><th>Code</th><th>Name</th><th>Module</th><th>Scope</th><th>Actions</th></tr></thead><tbody>{permissions.map((permission) => <tr key={permission.id}><td><strong>{permission.code}</strong></td><td>{permission.name}<div className="table-sub">{permission.description}</div></td><td>{permission.module}</td><td>{permission.isGlobal ? "Global" : "Scoped"}</td><td><div className="inline-actions"><button className="ghost-button" onClick={() => setEditingPermission(permission)}>Edit</button><button className="danger-button" onClick={() => setConfirmPermission(permission)}>Delete</button></div></td></tr>)}</tbody></table></div><div className="inline-actions"><button className="primary-button" onClick={() => setEditingPermission({} as PermissionRecord)}>Create Permission</button></div></Panel>
      <PermissionFormDialog open={editingPermission !== null} permission={editingPermission?.id ? editingPermission : undefined} onClose={() => setEditingPermission(null)} onSubmit={(payload) => auth && void (editingPermission?.id ? api.updatePermission(auth.token, editingPermission.id, payload) : api.createPermission(auth.token, payload)).then(() => { setEditingPermission(null); setMessage(editingPermission?.id ? "Permission updated." : "Permission created."); void refresh(); })} />
      <ConfirmDialog title="Delete Permission" message={`Delete ${confirmPermission?.code}?`} open={confirmPermission !== null} onClose={() => setConfirmPermission(null)} onConfirm={() => auth && confirmPermission ? api.deletePermission(auth.token, confirmPermission.id).then(() => { setConfirmPermission(null); setMessage("Permission deleted."); void refresh(); }) : undefined} confirmLabel="Delete" />
    </div>
  );
}
