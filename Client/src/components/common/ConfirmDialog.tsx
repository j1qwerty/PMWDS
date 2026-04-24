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
      <div className="dialog-stack">
        <p className="dialog-copy">{message}</p>
        <div className="inline-actions">
          <button className="ghost-button" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="danger-button" onClick={() => void onConfirm()} type="button">
            {confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
