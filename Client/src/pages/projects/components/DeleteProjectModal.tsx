import type { Project } from "../../../types";

interface DeleteProjectModalProps {
  show: boolean;
  project: Project | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteProjectModal({
  show,
  project,
  onClose,
  onConfirm,
}: DeleteProjectModalProps) {
  if (!show || !project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm w-full">
      <div className="bg-surface-container-lowest rounded-xl p-lg  w-100 shadow-xl ambient-glow">
        <div className="flex flex-col items-center text-center mb-md">
          <div className="size-16 rounded-full bg-error-container flex items-center justify-center mb-md">
            <span className="material-symbols-outlined text-error text-3xl">warning</span>
          </div>
          <h2 className="font-h2 text-h2 text-on-surface mb-2">Delete Project?</h2>
          <p className="text-body-md text-on-surface-variant">
            Are you sure you want to delete <strong className="text-on-surface">{project.name}</strong>? This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-outline-variant rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-error text-white font-bold rounded-lg text-sm hover:bg-error/90 transition-colors"
          >
            Delete Project
          </button>
        </div>
      </div>
    </div>
  );
}