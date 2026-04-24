import { useEffect, useState } from "react";
import { Dialog } from "../../../components/common/Dialog";
import type { PermissionRecord } from "../../../types";

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
      <form className="form-grid" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
        {!permission ? <label><span>Code</span><input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label> : null}
        <label><span>Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label><span>Module</span><input value={form.module} onChange={(event) => setForm({ ...form, module: event.target.value })} /></label>
        <label className="wide"><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <label className="checkbox-row"><input type="checkbox" checked={form.isGlobal} onChange={(event) => setForm({ ...form, isGlobal: event.target.checked })} /><span>Global permission</span></label>
        <div className="wide inline-actions"><button className="ghost-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">{permission ? "Save Permission" : "Create Permission"}</button></div>
      </form>
    </Dialog>
  );
}
