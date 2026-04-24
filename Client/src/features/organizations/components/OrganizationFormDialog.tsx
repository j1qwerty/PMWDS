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
      <div className="dialog-stack">
        <div className="form-grid">
          <label>
            <span>Name</span>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            <span>Tax ID</span>
            <input value={form.taxId} onChange={(event) => setForm({ ...form, taxId: event.target.value })} />
          </label>
          <label className="wide">
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
        <div className="inline-actions">
          <button className="ghost-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" onClick={() => onSubmit(form)}>
            Save
          </button>
        </div>
      </div>
    </Dialog>
  );
}
