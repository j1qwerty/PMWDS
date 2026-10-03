interface DeleteConfirmationModalProps {
  name: string;
  warning?: string;
  onConfirm: () => void;
  onCancel: () => void;
  submitting?: boolean;
}

export function DeleteConfirmationModal({
  name,
  warning,
  onConfirm,
  onCancel,
  submitting = false,
}: DeleteConfirmationModalProps) {
  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-xl">
      <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-red-50">
        <span className="material-symbols-outlined text-[25px] text-red-500">warning</span>
      </div>

      <h3 className="mb-2 text-lg font-bold text-slate-900">Delete item</h3>
      <p className="mb-4 text-sm leading-6 text-slate-600">
        Delete <strong className="text-slate-900">{name}</strong>? The item will be removed from active views.
      </p>

      {warning && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-5 text-amber-700">
          <span className="material-symbols-outlined mt-0.5 shrink-0 text-sm">info</span>
          <span>{warning}</span>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="min-h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className="min-h-10 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
