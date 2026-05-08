import { useEffect, useState } from "react";
import { Dialog } from "../../../components/common/Dialog";
import type { PermissionRecord } from "../../../types";
import { inputClass, labelClass } from "../../../ui";

const PERMISSION_MODULES = [
  "Dashboard",
  "Projects",
  "Tasks",
  "Users",
  "Resources",
  "Roles",
  "Reports",
  "Settings",
  "Notifications",
  "Operations",
  "AIInsights",
];

type PermissionFormDialogProps = {
  open: boolean;
  permission?: PermissionRecord | null;
  onClose: () => void;
  onSubmit: (payload: { code?: string; name: string; description: string; module: string; isGlobal: boolean }) => void;
};

export function PermissionFormDialog({ open, permission, onClose, onSubmit }: PermissionFormDialogProps) {
  const [form, setForm] = useState({ code: "", name: "", description: "", module: "", isGlobal: false });

  useEffect(() => {
    setForm({ code: permission?.code ?? "", name: permission?.name ?? "", description: permission?.description ?? "", module: permission?.module ?? "", isGlobal: permission?.isGlobal ?? false });
  }, [permission, open]);

  return (
    <Dialog title={permission ? "Edit Permission" : "Create Permission"} open={open} onClose={onClose}>
      <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
        {!permission ? <label className={labelClass}><span>Code</span><input className={inputClass} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="e.g. PROJECTS.VIEW" /></label> : null}
        <label className={labelClass}><span>Name</span><input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. View Projects" /></label>
        <label className={labelClass}><span>Module</span><select className={inputClass} value={form.module} onChange={(event) => setForm({ ...form, module: event.target.value })}><option value="">Select module...</option>{PERMISSION_MODULES.map((module) => <option key={module} value={module}>{module}</option>)}</select></label>
        <label className="md:col-span-2"><div className={labelClass}><span>Description</span></div><textarea className={inputClass} style={{ minHeight: "80px" }} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe what this permission allows" /></label>
        <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.isGlobal} onChange={(event) => setForm({ ...form, isGlobal: event.target.checked })} /><span>Global permission (applies to all scopes)</span></label>
        <div className="md:col-span-2 mt-4 flex flex-wrap gap-2"><button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={onClose}>Cancel</button><button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" type="submit">{permission ? "Save Permission" : "Create Permission"}</button></div>
      </form>
    </Dialog>
  );
}
