import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { FiEdit3 } from "react-icons/fi";
import { StatusDropdown } from "./StatusDropdown";

interface ProgressStatusEditorProps {
  progress: number;
  status: string;
  mayEdit: boolean;
  onChange: (data: { progress: number; status: string }) => void;
}

function getProgressGradient(value: number): string {
  if (value >= 80) return "from-emerald-400 to-emerald-500";
  if (value >= 50) return "from-cyan-400 to-cyan-500";
  if (value >= 25) return "from-amber-400 to-amber-500";
  return "from-rose-400 to-rose-500";
}

export function ProgressStatusEditor({ progress, status, mayEdit, onChange }: ProgressStatusEditorProps) {
  const [progressInput, setProgressInput] = useState(String(progress));
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [isDragging, setIsDragging] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const currentProgress = Math.min(100, Math.max(0, Number(progressInput) || 0));
  const progressGradient = getProgressGradient(currentProgress);

  const emitChange = (p: number, s: string) => {
    onChange({ progress: p, status: s });
  };

  const confirmProgressBelow100 = (newValue: number): boolean => {
    if (selectedStatus === "Completed" && newValue < 100) {
      if (confirm("This subtask is completed. Reducing progress will change status to InProgress. Continue?")) {
        setSelectedStatus("InProgress");
        emitChange(newValue, "InProgress");
        return true;
      }
      return false;
    }
    return true;
  };

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "Completed") {
      setProgressInput("100");
      setSelectedStatus("Completed");
      emitChange(100, "Completed");
    } else if (selectedStatus === "Completed" && currentProgress === 100) {
      if (confirm("This subtask is completed. Changing status will reset progress. Continue?")) {
        const input = prompt("Enter new progress percentage (0-99):", "0");
        if (input !== null) {
          const val = Math.min(99, Math.max(0, Number(input) || 0));
          setProgressInput(String(val));
          setSelectedStatus(newStatus);
          emitChange(val, newStatus);
        }
      }
    } else {
      setSelectedStatus(newStatus);
      emitChange(currentProgress, newStatus);
    }
  };

  const calculateProgressFromEvent = (clientX: number) => {
    if (!progressBarRef.current) return currentProgress;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return Math.round((x / rect.width) * 100);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!mayEdit) return;
    const newProgress = calculateProgressFromEvent(e.clientX);
    if (!confirmProgressBelow100(newProgress)) return;
    setIsDragging(true);
    setProgressInput(String(newProgress));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!mayEdit) return;
    const newProgress = calculateProgressFromEvent(e.touches[0].clientX);
    if (!confirmProgressBelow100(newProgress)) return;
    setIsDragging(true);
    setProgressInput(String(newProgress));
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newProgress = calculateProgressFromEvent(e.clientX);
      setProgressInput(String(newProgress));
    };

    const handleTouchMove = (e: TouchEvent) => {
      const newProgress = calculateProgressFromEvent(e.touches[0].clientX);
      setProgressInput(String(newProgress));
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleDragEnd);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleDragEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [isDragging]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!mayEdit) return;
    const step = e.shiftKey ? 10 : 1;

    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      const newVal = Math.min(100, currentProgress + step);
      setProgressInput(String(newVal));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      const newVal = Math.max(0, currentProgress - step);
      if (!confirmProgressBelow100(newVal)) return;
      setProgressInput(String(newVal));
    }
  };

  const handleProgressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^\d+$/.test(val)) {
      setProgressInput(val);
    }
  };

  const handleProgressInputBlur = () => {
    const val = Math.min(100, Math.max(0, Number(progressInput) || 0));
    if (!confirmProgressBelow100(val)) {
      setProgressInput("100");
      return;
    }
    setProgressInput(String(val));
  };

  useEffect(() => {
    if (currentProgress === 100 && selectedStatus !== "Completed") {
      setSelectedStatus("Completed");
      onChange({ progress: 100, status: "Completed" });
    }
  }, [currentProgress]);

  if (!mayEdit) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-2">
            Progress
          </label>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${progressGradient}`}
              style={{ width: `${currentProgress}%` }}
            />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-2">
            Status
          </label>
          <StatusDropdown currentStatus={status} onChange={() => {}} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Progress
          </label>
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-white">
            <FiEdit3 className="w-3 h-3 text-slate-400" />
            <input
              type="text"
              inputMode="numeric"
              value={progressInput}
              onChange={handleProgressInputChange}
              onBlur={handleProgressInputBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleProgressInputBlur();
                } else {
                  handleKeyDown(e);
                }
              }}
              className="w-12 text-xs font-semibold text-slate-700 text-center outline-none"
            />
            <span className="text-xs text-slate-400">%</span>
          </div>
        </div>

        <div
          ref={progressBarRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={currentProgress}
          aria-label="Progress"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className={`relative w-full h-4 rounded-full bg-slate-100 overflow-hidden cursor-pointer select-none group ${
            isDragging ? "scale-y-125" : ""
          } transition-transform`}
        >
          <div className="absolute inset-0 bg-slate-100" />

          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${currentProgress}%` }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${progressGradient} rounded-full`}
          />

          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-white/10 to-transparent" />

          <motion.div
            animate={{ left: `${currentProgress}%` }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-md border-2 border-slate-200 ${
              isDragging ? "scale-110 border-indigo-400 shadow-lg" : "group-hover:scale-105"
            } transition-all`}
            style={{ left: `${currentProgress}%` }}
          />
        </div>

        <p className="text-[10px] text-slate-400 mt-1.5">
          Click and drag the bar or use arrow keys to adjust
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-2">
            Status
          </label>
          <StatusDropdown
            currentStatus={selectedStatus}
            onChange={handleStatusChange}
          />
        </div>
      </div>
    </div>
  );
}
