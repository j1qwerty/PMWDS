import { useState, type FormEvent } from "react";
import type { OrganizationRecord } from "../../types";
import { InputF } from "./InputF";
import { Dialog } from "./Dialog";

interface OrgFormModalProps {
  initialData?: OrganizationRecord;
  onSubmit: (data: Record<string, unknown>) => void | Promise<void>;
  onCancel: () => void;
}

export function OrgFormModal({ initialData, onSubmit, onCancel }: OrgFormModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: initialData?.name || "",
    taxId: initialData?.taxId || "",
    address: initialData?.address || "",
    contactEmail: initialData?.contactEmail || "",
    contactPhone: initialData?.contactPhone || "",
    foundedDate: initialData?.foundedDate?.slice(0, 10) || "",
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        taxId: form.taxId.trim() || null,
        address: form.address.trim() || null,
        contactEmail: form.contactEmail.trim() || null,
        contactPhone: form.contactPhone.trim() || null,
        foundedDate: form.foundedDate || null,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to save the organization.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      title={initialData ? "Edit organization" : "Create organization"}
      description={initialData ? "Update organization details." : "Add an organization to your structure."}
      icon={initialData ? "edit_business" : "add_business"}
      size="md"
      onClose={onCancel}
      closeOnBackdrop={!submitting}
      showCloseButton={!submitting}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={submitting} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" form="organization-form" disabled={submitting} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? "Saving…" : initialData ? "Update organization" : "Create organization"}
          </button>
        </div>
      }
    >
      <form id="organization-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
            {error}
          </div>
        )}

        <InputF label="Organization name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />

        <div className="grid gap-4 sm:grid-cols-2">
          <InputF label="Tax ID" value={form.taxId} onChange={(value) => setForm({ ...form, taxId: value })} />
          <InputF label="Phone" value={form.contactPhone} onChange={(value) => setForm({ ...form, contactPhone: value })} />
        </div>

        <InputF label="Email" type="email" value={form.contactEmail} onChange={(value) => setForm({ ...form, contactEmail: value })} />
        <InputF label="Address" value={form.address} onChange={(value) => setForm({ ...form, address: value })} />
        <InputF label="Founded date" type="date" value={form.foundedDate} onChange={(value) => setForm({ ...form, foundedDate: value })} />
      </form>
    </Dialog>
  );
}
