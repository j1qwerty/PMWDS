import { useState } from "react";
import { FiMessageSquare, FiTrash2, FiCheck, FiCalendar, FiFlag, FiX } from "react-icons/fi";
import type { Task } from "../../../types";
import { ModalOverlay, useToast } from "../../shared";
import { StatusDropdown } from "../../nested/components/StatusDropdown";
import { SubtaskProgressBar } from "../../nested/components/SubtaskProgressBar";

interface SubtaskEditModalProps {
  subtask: Task;
  mayEdit: boolean;
  onClose: () => void;
  onStatusChange: (subtaskId: string, status: string) => Promise<void>;
  onProgressUpdate: (subtaskId: string, value: number) => Promise<void>;
  onAddComment: (subtaskId: string, text: string) => Promise<void>;
  onDelete: (subtaskId: string) => Promise<void>;
}

export function SubtaskEditModal({
  subtask,
  mayEdit,
  onClose,
  onStatusChange,
  onProgressUpdate,
  onAddComment,
  onDelete,
}: SubtaskEditModalProps) {
  const { addToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete subtask "${subtask.title}"?`)) return;
    setIsDeleting(true);
    try {
      await onDelete(subtask.id);
      addToast("Subtask deleted.");
      onClose();
    } catch {
      setIsDeleting(false);
      addToast("Failed to delete subtask.");
    }
  };

  return (
    <ModalOverlay onClose={onClose} widthClassName="max-w-xl">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden" style={{ width: "36rem", maxWidth: "95vw" }}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                subtask.status === "Completed"
                  ? "bg-emerald-100 text-emerald-600"
                  : subtask.status === "InProgress"
                  ? "bg-blue-100 text-blue-600"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <FiCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">{subtask.title}</h3>
              <p className="text-[10px] text-slate-400">Subtask</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {mayEdit && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                title="Delete subtask"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {mayEdit && (
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-2">
                Progress
              </label>
              <SubtaskProgressBar
                value={subtask.progressPercentage || 0}
                onChange={(val) => onProgressUpdate(subtask.id, val)}
              />
            </div>
          )}

          {mayEdit && (
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-2">
                Status
              </label>
              <StatusDropdown
                currentStatus={subtask.status}
                onChange={(status) => onStatusChange(subtask.id, status)}
              />
            </div>
          )}

          <SubtaskCommentInput
            onAddComment={(text) => {
              onAddComment(subtask.id, text);
              addToast("Comment added.");
            }}
          />

          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center gap-4 text-xs text-slate-500">
              {subtask.dueDate && (
                <div className="flex items-center gap-1.5">
                  <FiCalendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Due <strong className="text-slate-700">{new Date(subtask.dueDate).toLocaleDateString()}</strong></span>
                </div>
              )}
              {subtask.priority && (
                <div className="flex items-center gap-1.5">
                  <FiFlag className="w-3.5 h-3.5 text-slate-400" />
                  <span>Priority <strong className="text-slate-700">{subtask.priority}</strong></span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

function SubtaskCommentInput({ onAddComment }: { onAddComment: (text: string) => void }) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (!text.trim()) return;
    onAddComment(text.trim());
    setText("");
  };

  return (
    <div>
      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
        <FiMessageSquare className="w-3.5 h-3.5" /> Comment
      </label>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Post
        </button>
      </div>
    </div>
  );
}
