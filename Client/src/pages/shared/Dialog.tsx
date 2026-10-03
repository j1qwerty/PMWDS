import { useEffect, useId, useRef, type ReactNode } from "react";

type DialogSize = "sm" | "md" | "lg" | "xl";

interface DialogProps {
  open?: boolean;
  title?: string;
  description?: string;
  icon?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  size?: DialogSize;
  className?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

const sizeClasses: Record<DialogSize, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

const focusableSelector =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let openDialogCount = 0;
let previousBodyOverflow = "";
const dialogStack: symbol[] = [];

export function Dialog({
  title,
  description,
  icon = "dialog",
  children,
  footer,
  onClose,
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  size = "md",
  className = "",
  initialFocusRef,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    openDialogCount += 1;
    if (openDialogCount === 1) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    const instanceId = Symbol("dialog");
    dialogStack.push(instanceId);

    const focusTarget = initialFocusRef?.current;
    const timer = window.setTimeout(() => {
      const target = focusTarget ?? dialogRef.current?.querySelector<HTMLElement>(
        focusableSelector,
      );
      (target ?? dialogRef.current)?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        const isTopmost = dialogStack[dialogStack.length - 1] === instanceId;
        if (isTopmost && closeOnEscape) onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const elements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => element.offsetParent !== null);

      if (elements.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      const index = dialogStack.lastIndexOf(instanceId);
      if (index >= 0) dialogStack.splice(index, 1);
      openDialogCount = Math.max(0, openDialogCount - 1);
      if (openDialogCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
      }
      restoreFocusRef.current?.focus?.();
    };
  }, [closeOnEscape, initialFocusRef]);

  return (
    <div
      className="fixed inset-0 z-[1000] overflow-y-auto overscroll-contain bg-slate-950/35 p-4 backdrop-blur-md motion-safe:animate-[fadeIn_0.18s_ease-out]"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onCloseRef.current();
      }}
      aria-hidden={false}
    >
      <div className="flex min-h-full items-center justify-center">
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descriptionId : undefined}
          onMouseDown={(event) => event.stopPropagation()}
          className={`relative flex w-full ${sizeClasses[size]} max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl motion-safe:animate-[slideUp_0.22s_ease-out] ${className}`}
        >
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="absolute right-4 top-4 z-10 inline-flex size-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          )}

          {(title || description) && (
            <header className="border-b border-slate-100 px-6 py-5 pr-16">
              <div className="flex min-w-0 items-start gap-3">
                {icon && (
                  <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <span className="material-symbols-outlined text-xl">{icon}</span>
                  </span>
                )}
                <div className="min-w-0">
                  {title && (
                    <h2 id={titleId} className="text-base font-bold tracking-tight text-slate-900">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p id={descriptionId} className="mt-1 text-sm leading-5 text-slate-500">
                      {description}
                    </p>
                  )}
                </div>
              </div>
            </header>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

          {footer && <footer className="border-t border-slate-100 px-6 py-4">{footer}</footer>}
        </div>
      </div>
    </div>
  );
}
