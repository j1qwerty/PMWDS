import type { ReactNode } from "react";

interface ModalOverlayProps {
  children: ReactNode;
  onClose: () => void;
}

export function ModalOverlay({ children, onClose }: ModalOverlayProps) {
  return (
    <div
      className="fixed inset-0 bg-black/35 backdrop-blur-md flex items-center justify-center z-1000 animate-[fadeIn_0.2s_ease]"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="animate-[slideUp_0.3s_ease] w-full flex justify-center">
        {children}
      </div>
    </div>
  );
}