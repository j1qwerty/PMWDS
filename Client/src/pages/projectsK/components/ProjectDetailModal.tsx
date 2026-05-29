import type { Project } from "../../../types";
import { ModalOverlay } from "../../shared";
import { ProjectHeaderCard } from "./ProjectHeaderCard";

interface ProjectDetailModalProps {
  project: Project | null;
  canManage: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: string) => void;
}

export function ProjectDetailModal({
  project,
  canManage,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
}: ProjectDetailModalProps) {
  if (!project) return null;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200">
        <div className="flex items-center justify-between px-6 pt-5 pb-2 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Project details</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-2">
          <ProjectHeaderCard
            project={project}
            canManage={canManage}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            bare
          />
        </div>
      </div>
    </ModalOverlay>
  );
}
