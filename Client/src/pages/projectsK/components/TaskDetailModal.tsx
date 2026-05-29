import type { Milestone, Task, User } from "../../../types";
import { ModalOverlay } from "../../shared";
import { TaskDetailPanel } from "./TaskDetailPanel";

interface TaskDetailModalProps {
  task: Task | null;
  milestone?: Milestone | null;
  users: User[];
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
  onRefresh: () => void;
  onClose: () => void;
}

export function TaskDetailModal({
  task,
  milestone,
  users,
  canManage,
  onEdit,
  onDelete,
  onStatusChange,
  onRefresh,
  onClose,
}: TaskDetailModalProps) {
  if (!task) return null;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200">
        <TaskDetailPanel
          task={task}
          milestone={milestone}
          users={users}
          canManage={canManage}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          onRefresh={onRefresh}
        />
      </div>
    </ModalOverlay>
  );
}
