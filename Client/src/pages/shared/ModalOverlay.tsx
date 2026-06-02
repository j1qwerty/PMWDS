import type { ReactNode } from "react";
import { FiX } from "react-icons/fi";

interface ModalOverlayProps {
  children: ReactNode;
  onClose: () => void;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  contentClassName?: string;
  widthClassName?: string;
}

export function ModalOverlay({
  children,
  onClose,
  showCloseButton = true,
  closeOnBackdrop = true,
  contentClassName = "",
  widthClassName = "max-w-2xl",
}: ModalOverlayProps) {
  return (
    <div
      className="fixed inset-0 bg-black/35 backdrop-blur-md flex items-center justify-center z-1000 animate-[fadeIn_0.2s_ease] p-4"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${widthClassName} animate-[slideUp_0.3s_ease] flex justify-center`}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute -top-2 -right-2 z-10 w-9 h-9 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <FiX className="w-4 h-4" />
          </button>
        )}
        <div className={`w-full ${contentClassName}`}>{children}</div>
      </div>
    </div>
  );
}
