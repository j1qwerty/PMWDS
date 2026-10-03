import { Dialog } from "./Dialog";

interface DeleteConfirmationModalProps {
  name: string;
  warning?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
}

export function DeleteConfirmationModal({
  name,
  warning,
  onConfirm,
  onCancel,
  submitting = false,
  title = "Confirm deletion",
  description = "This removes the selected record from the current workspace.",
  confirmLabel = "Delete",
}: DeleteConfirmationModalProps) {
  return (
    <Dialog
      title={title}
      description={description}
      icon="warning"
      size="sm"
      onClose={onCancel}
      closeOnBackdrop={!submitting}
      showCloseButton={!submitting}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Deleting…" : confirmLabel}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-6 text-slate-600">
          Are you sure you want to delete{" "}
          <strong className="font-semibold text-slate-900">{name}</strong>?
        </p>

        {warning && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-800">
            <span className="material-symbols-outlined mt-0.5 shrink-0 text-base">info</span>
            <span>{warning}</span>
          </div>
        )}
      </div>
    </Dialog>
  );
}
