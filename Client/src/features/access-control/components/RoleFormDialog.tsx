import { useEffect, useState } from "react";
import { Dialog } from "../../../components/common/Dialog";
import type { PermissionRecord, RoleRecord } from "../../../types";

type RoleFormDialogProps = {
  open: boolean;
  role?: RoleRecord | null;
  permissions: PermissionRecord[];
  onClose: () => void;
  onSubmit: (payload: { name: string; description: string; permissionLevel: number; permissionIds: string[] }) => void;
};

export function RoleFormDialog({ open, role, permissions, onClose, onSubmit }: RoleFormDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form, setForm] = useState({ name: "", description: "", permissionLevel: 10 });

  useEffect(() => {
    setForm({ name: role?.name ?? "", description: role?.description ?? "", permissionLevel: role?.permissionLevel ?? 10 });
    setSelectedIds(role?.permissions.map((permission) => permission.id) ?? []);
  }, [role, open]);

  const togglePermission = (permissionId: string) => {
    setSelectedIds((current) => current.includes(permissionId) ? current.filter((item) => item !== permissionId) : [...current, permissionId]);
  };

  return (
    <Dialog title={role ? "Edit Role" : "Create Role"} open={open} onClose={onClose} width="lg">
      <form className="form-grid" onSubmit={(event) => { event.preventDefault(); onSubmit({ ...form, permissionIds: selectedIds }); }}>
        <label><span>Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label><span>Permission Level</span><input type="number" value={form.permissionLevel} onChange={(event) => setForm({ ...form, permissionLevel: Number(event.target.value) })} /></label>
        <label className="wide"><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <div className="wide permission-grid">{permissions.map((permission) => <label className="checkbox-row" key={permission.id}><input type="checkbox" checked={selectedIds.includes(permission.id)} onChange={() => togglePermission(permission.id)} /><span>{permission.module} · {permission.name}</span></label>)}</div>
        <div className="wide inline-actions"><button className="ghost-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">{role ? "Save Role" : "Create Role"}</button></div>
      </form>
    </Dialog>
  );
}
