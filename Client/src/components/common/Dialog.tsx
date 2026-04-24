import type { PropsWithChildren } from "react";

type DialogProps = PropsWithChildren<{
  title: string;
  open: boolean;
  onClose: () => void;
  width?: "sm" | "md" | "lg";
}>;

export function Dialog({ title, open, onClose, width = "md", children }: DialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop" onClick={onClose} role="presentation">
      <div className={`dialog dialog-${width}`} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="dialog-head">
          <h3>{title}</h3>
          <button className="ghost-button" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="dialog-body">{children}</div>
      </div>
    </div>
  );
}
