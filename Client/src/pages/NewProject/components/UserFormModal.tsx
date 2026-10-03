import { useState, type FormEvent } from "react";
import type { OrganizationRecord } from "../../../types";
import { Dialog } from "../../shared/Dialog";

interface UserFormModalProps {
  organizations: OrganizationRecord[];
  defaultOrganizationId?: string;
  hideOrganization?: boolean;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

export function UserFormModal({
  organizations,
  defaultOrganizationId = "",
  hideOrganization = false,
  onSubmit,
  onCancel,
}: UserFormModalProps) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    jobTitle: "",
    organizationId: defaultOrganizationId || (organizations[0]?.id ?? ""),
    phoneNumber: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.email.trim() ||
      !form.password.trim() ||
      !form.organizationId ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSubmit({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        jobTitle: form.jobTitle.trim() || null,
        phoneNumber: form.phoneNumber.trim() || null,
        organizationId: form.organizationId,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to create the user.");
      setSaving(false);
    }
  };

  return (
    <Dialog
      title="Create user"
      description="Add a new user to the organization."
      icon="person_add"
      size="md"
      onClose={onCancel}
      closeOnBackdrop={!saving}
      showCloseButton={!saving}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-user-form"
            disabled={
              saving ||
              !form.firstName.trim() ||
              !form.lastName.trim() ||
              !form.email.trim() ||
              !form.password.trim() ||
              !form.organizationId
            }
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create user"}
          </button>
        </div>
      }
    >
      <form id="create-user-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="First name"
            value={form.firstName}
            onChange={(value) => setForm({ ...form, firstName: value })}
            required
          />
          <Field
            label="Last name"
            value={form.lastName}
            onChange={(value) => setForm({ ...form, lastName: value })}
            required
          />
        </div>

        <Field
          label="Email"
          type="email"
          value={form.email}
          onChange={(value) => setForm({ ...form, email: value })}
          placeholder="email@organization.com"
          required
        />

        <Field
          label="Password"
          type="password"
          value={form.password}
          onChange={(value) => setForm({ ...form, password: value })}
          placeholder="Set initial password"
          required
        />

        {!hideOrganization && (
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Organization</span>
            <select
              value={form.organizationId}
              onChange={(event) => setForm({ ...form, organizationId: event.target.value })}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Select organization</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>{organization.name}</option>
              ))}
            </select>
          </label>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Job title"
            value={form.jobTitle}
            onChange={(value) => setForm({ ...form, jobTitle: value })}
            placeholder="Optional"
          />
          <Field
            label="Phone"
            value={form.phoneNumber}
            onChange={(value) => setForm({ ...form, phoneNumber: value })}
            placeholder="Optional"
          />
        </div>
      </form>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}{required ? " *" : ""}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}
