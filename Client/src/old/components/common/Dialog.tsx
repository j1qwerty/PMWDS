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

  const widthClass = width === "sm" ? "max-w-md" : width === "lg" ? "max-w-4xl" : "max-w-2xl";

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/75 p-6 backdrop-blur-sm" onClick={onClose} role="presentation">
      <div className={`w-full ${widthClass} overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl`} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button 
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 text-sm transition-colors" 
            onClick={onClose} 
            type="button"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}