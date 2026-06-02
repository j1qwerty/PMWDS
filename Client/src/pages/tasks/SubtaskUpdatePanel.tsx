import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiCheck, FiMessageSquare, FiChevronDown } from "react-icons/fi";
import type { Task } from "../../types";
import { getStatusColor } from "../shared";

const SUBTASK_STATUSES = ["NotStarted", "InProgress", "OnHold", "Completed", "Delayed", "Cancelled"];

interface SubtaskUpdatePanelProps {
  subtask: Task;
  isAdmin: boolean;
  onUpdateProgress: (subtaskId: string, value: number) => void;
  onUpdateStatus: (subtaskId: string, status: string) => void;
  onAddComment: (subtaskId: string, text: string) => void;
}

export function SubtaskUpdatePanel({
  subtask,
  isAdmin,
  onUpdateProgress,
  onUpdateStatus,
  onAddComment,
}: SubtaskUpdatePanelProps) {
  const isCompleted = subtask.status === "Completed";

  const [localProgress, setLocalProgress] = useState(Math.round(subtask.progressPercentage || 0));
  const [localProgressInput, setLocalProgressInput] = useState(String(Math.round(subtask.progressPercentage || 0)));
  const [commentText, setCommentText] = useState("");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  useEffect(() => {
    setLocalProgress(Math.round(subtask.progressPercentage || 0));
    setLocalProgressInput(String(Math.round(subtask.progressPercentage || 0)));
  }, [subtask.id, subtask.progressPercentage]);

  const progressColor =
    localProgress >= 80 ? "from-emerald-400 to-emerald-500" :
    localProgress >= 50 ? "from-cyan-400 to-cyan-500" :
    localProgress >= 25 ? "from-amber-400 to-amber-500" :
    "from-rose-400 to-rose-500";

  const statusStyle = getStatusColor(subtask.status);

  const handleProgressChange = (value: number) => {
    setLocalProgress(value);
    setLocalProgressInput(String(value));
  };

  const handleProgressInput = (value: string) => {
    setLocalProgressInput(value);
    const num = Math.max(0, Math.min(100, Number(value) || 0));
    setLocalProgress(num);
  };

  const handleSaveProgress = () => {
    onUpdateProgress(subtask.id, localProgress);
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(subtask.id, commentText);
    setCommentText("");
  };

  return (
    <div className="space-y-3">
      {isCompleted ? (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
            <FiCheck className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-700">Completed</p>
            <p className="text-[10px] text-emerald-600">Progress at 100%</p>
          </div>
        </div>
      ) : (
        <>
          {/* Progress Control */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Progress
              </span>
              <span className="text-xs font-bold text-slate-700">{localProgress}%</span>
            </div>
            <div className="relative h-1.5 rounded-full bg-slate-100 overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${localProgress}%` }}
                className={`h-full rounded-full bg-gradient-to-r ${progressColor}`}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                value={localProgress}
                onChange={(e) => handleProgressChange(Number(e.target.value))}
                className="flex-1 h-1.5 rounded-full appearance-none bg-slate-200 cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-indigo-600
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-sm"
              />
              <input
                type="number"
                min={0}
                max={100}
                value={localProgressInput}
                onChange={(e) => handleProgressInput(e.target.value)}
                className="w-14 px-2 py-1 rounded-md border border-slate-200 text-xs text-center font-semibold outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100"
              />
              <button
                onClick={handleSaveProgress}
                className="px-2.5 py-1 rounded-md bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}

      {/* Status Update */}
      {isAdmin && (
        <div className="relative">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Status
          </span>
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
              <span className="text-xs font-medium text-slate-700">{subtask.status}</span>
            </div>
            <motion.span animate={{ rotate: showStatusDropdown ? 180 : 0 }}>
              <FiChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </motion.span>
          </button>
          <AnimatePresence>
            {showStatusDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute z-20 left-0 right-0 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden"
              >
                {SUBTASK_STATUSES.map((s) => {
                  const st = getStatusColor(s);
                  const active = subtask.status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => {
                        onUpdateStatus(subtask.id, s);
                        setShowStatusDropdown(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
                        active
                          ? "bg-indigo-50 text-indigo-700 font-semibold"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                      {s}
                      {active && <FiCheck className="w-3 h-3 ml-auto text-indigo-500" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Comment Input */}
      <form onSubmit={handleSubmitComment} className="space-y-1.5">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
          Comment
        </span>
        <div className="flex items-center gap-2">
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 transition-all"
          />
          <button
            type="submit"
            disabled={!commentText.trim()}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <FiMessageSquare className="w-3 h-3" />
            Post
          </button>
        </div>
      </form>
    </div>
  );
}
