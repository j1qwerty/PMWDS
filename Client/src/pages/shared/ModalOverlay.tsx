import { useEffect, useId, useRef, type ReactNode } from "react";

interface ModalOverlayProps {
  children: ReactNode;
  onClose: () => void;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  contentClassName?: string;
  widthClassName?: string;
  ariaLabel?: string;
}

let modalLockCount = 0;
let previousBodyOverflow = "";

export function ModalOverlay({
  children,
  onClose,
  showCloseButton = true,
  closeOnBackdrop = true,
  contentClassName = "",
  widthClassName = "max-w-2xl",
  ariaLabel = "Dialog",
}: ModalOverlayProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (modalLockCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    modalLockCount += 1;

    const previousActiveElement = document.activeElement as HTMLElement | null;
    const focusFrame = requestAnimationFrame(() => {
      const firstFocusable = contentRef.current?.querySelector<HTMLElement>(
        "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
      );
      firstFocusable?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      modalLockCount = Math.max(0, modalLockCount - 1);
      if (modalLockCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
      }
      previousActiveElement?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[1000] overflow-y-auto overscroll-contain bg-slate-950/40 p-4 backdrop-blur-sm animate-[fadeIn_0.18s_ease-out]"
      role="presentation"
      onMouseDown={closeOnBackdrop ? onClose : undefined}
    >
      <div className="flex min-h-full items-center justify-center sm:p-2">
        <div
          ref={contentRef}
          className={`relative w-full ${widthClassName} max-h-[calc(100vh-2rem)] overflow-hidden animate-[slideUp_0.2s_ease-out] ${contentClassName}`}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          aria-labelledby={titleId}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="absolute right-3 top-3 z-20 inline-flex size-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white/95 text-slate-500 shadow-sm backdrop-blur transition-colors hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
          <div id={titleId} className="sr-only">
            {ariaLabel}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
