import { useEffect, useState } from "react";
import { Dialog } from "../../../components/common/Dialog";
import type { PermissionRecord, RoleRecord } from "../../../types";
import { inputClass, labelClass } from "../../../ui";

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
      <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); onSubmit({ ...form, permissionIds: selectedIds }); }}>
        <label className={labelClass}><span>Name</span><input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Role name" /></label>
        <label className={labelClass}><span>Permission Level</span><input className={inputClass} type="number" value={form.permissionLevel} onChange={(event) => setForm({ ...form, permissionLevel: Number(event.target.value) })} placeholder="Level" /></label>
        <label className="md:col-span-2"><div className={labelClass}><span>Description</span></div><textarea className={inputClass} style={{ minHeight: "80px" }} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe this role" /></label>
        <div className="md:col-span-2 grid max-h-64 grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2">{permissions.map((permission) => <label className="flex items-center gap-2 text-sm text-slate-300" key={permission.id}><input type="checkbox" checked={selectedIds.includes(permission.id)} onChange={() => togglePermission(permission.id)} /><span>{permission.module} · {permission.name}</span></label>)}</div>
        <div className="md:col-span-2 mt-4 flex flex-wrap gap-2"><button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={onClose}>Cancel</button><button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" type="submit">{role ? "Save Role" : "Create Role"}</button></div>
      </form>
    </Dialog>
  );
}
