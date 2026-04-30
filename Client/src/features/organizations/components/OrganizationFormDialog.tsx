import { useEffect, useState } from "react";
import { Dialog } from "../../../components/common/Dialog";
import type { OrganizationRecord } from "../../../types";

type OrganizationFormDialogProps = {
  open: boolean;
  organization?: OrganizationRecord;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
};

function createFormState(organization?: OrganizationRecord) {
  return {
    name: organization?.name ?? "",
    taxId: organization?.taxId ?? "",
    address: organization?.address ?? "",
    contactEmail: organization?.contactEmail ?? "",
    contactPhone: organization?.contactPhone ?? "",
    foundedDate: organization?.foundedDate?.slice(0, 10) ?? "",
  };
}

export function OrganizationFormDialog({
  open,
  organization,
  onClose,
  onSubmit,
}: OrganizationFormDialogProps) {
  const [form, setForm] = useState(createFormState(organization));

  useEffect(() => {
    setForm(createFormState(organization));
  }, [organization, open]);

  return (
    <Dialog
      open={open}
      title={organization ? "Edit Organization" : "Create Organization"}
      onClose={onClose}
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label>
            <span>Name</span>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            <span>Tax ID</span>
            <input value={form.taxId} onChange={(event) => setForm({ ...form, taxId: event.target.value })} />
          </label>
          <label className="md:col-span-2">
            <span>Address</span>
            <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          </label>
          <label>
            <span>Contact Email</span>
            <input value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} />
          </label>
          <label>
            <span>Contact Phone</span>
            <input value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} />
          </label>
          <label>
            <span>Founded Date</span>
            <input type="date" value={form.foundedDate} onChange={(event) => setForm({ ...form, foundedDate: event.target.value })} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={onClose}>
            Cancel
          </button>
          <button className="rounded-md border border-sky-300/60 bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => onSubmit(form)}>
            Save
          </button>
        </div>
      </div>
    </Dialog>
  );
}
