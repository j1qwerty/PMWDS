import type { PropsWithChildren } from "react";
import { ghostButtonClass } from "../../ui";

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

  const widthClass = width === "sm" ? "max-w-md" : width === "lg" ? "max-w-4xl" : "max-w-2xl";

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#05070b]/75 p-6 backdrop-blur-sm" onClick={onClose} role="presentation">
      <div className={`w-full ${widthClass} overflow-hidden rounded-xl border border-[var(--pmwds-border)] bg-[var(--pmwds-surface)] shadow-[var(--pmwds-shadow)]`} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between border-b border-[var(--pmwds-border)] px-5 py-4">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button className={ghostButtonClass} onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
