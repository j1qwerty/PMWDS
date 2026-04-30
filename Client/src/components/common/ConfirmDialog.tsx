import { Dialog } from "./Dialog";
import { dangerButtonClass, ghostButtonClass } from "../../ui";

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
      <div className="grid gap-4">
        <p className="text-sm text-slate-300">{message}</p>
        <div className="flex flex-wrap gap-2">
          <button className={ghostButtonClass} onClick={onClose} type="button">
            Cancel
          </button>
          <button className={dangerButtonClass} onClick={() => void onConfirm()} type="button">
            {confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
