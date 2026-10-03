import type React from "react";
import { Dialog } from "./Dialog";

interface ModalOverlayProps {
  children: React.ReactNode;
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
  const size =
    widthClassName.includes("max-w-4xl") ? "xl"
      : widthClassName.includes("max-w-2xl") ? "lg"
        : widthClassName.includes("max-w-xl") ? "md"
          : "sm";

  return (
    <Dialog
      onClose={onClose}
      closeOnBackdrop={closeOnBackdrop}
      closeOnEscape
      showCloseButton={showCloseButton}
      size={size}
      className={contentClassName}
    >
      {children}
    </Dialog>
  );
}
