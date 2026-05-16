import { Dialog } from "./Dialog";

type ConfirmDialogProps = {
  title: string;
  message: string;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  confirmLabel?: string;
};

export function ConfirmDialog({
  title,
  message,
  open,
  onClose,
  onConfirm,
  confirmLabel = "Confirm",
}: ConfirmDialogProps) {
  return (
    <Dialog title={title} open={open} onClose={onClose} width="sm">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">{message}</p>
        <div className="flex justify-end gap-2">
          <button 
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium" 
            onClick={onClose} 
            type="button"
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium" 
            onClick={() => void onConfirm()} 
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}