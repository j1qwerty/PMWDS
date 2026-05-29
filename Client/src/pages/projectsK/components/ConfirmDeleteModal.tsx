import { DeleteConfirmationModal, ModalOverlay } from "../../shared";

interface ConfirmDeleteModalProps {
  open: boolean;
  name: string;
  warning?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDeleteModal({ open, name, warning, onConfirm, onClose }: ConfirmDeleteModalProps) {
  if (!open) return null;
  return (
    <ModalOverlay onClose={onClose}>
      <DeleteConfirmationModal name={name} warning={warning} onConfirm={onConfirm} onCancel={onClose} />
    </ModalOverlay>
  );
}
