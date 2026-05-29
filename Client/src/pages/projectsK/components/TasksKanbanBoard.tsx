import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
import { getStatusColor } from "../../shared";
import type { Task, Milestone } from "../../../types";
import { TaskCard } from "./TaskCard";

interface TasksKanbanBoardProps {
  tasks: Task[];
  milestones: Milestone[];
  selectedMilestoneId: string;
  canEdit: boolean;
  onViewTask?: (task: Task) => void;
  onEditTask?: (task: Task) => void;
  onStatusChange: (taskId: string, status: string) => void;
  searchTerm: string;
  visibleBoards: Record<string, boolean>;
  onToggleBoard: (title: string) => void;
}

interface BoardConfig {
  status: string;
  title: string;
  headerBg: string;
  headerText: string;
  badgeBg: string;
  badgeText: string;
  icon: JSX.Element;
}

export const allBoards: BoardConfig[] = [
  {
    status: "NotStarted",
    title: "Not Started",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    status: "InProgress",
    title: "In Progress",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    status: "Completed",
    title: "Completed",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  {
    status: "Delayed",
    title: "Delayed",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    status: "OnHold",
    title: "On Hold",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    status: "Cancelled",
    title: "Cancelled",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
].map((board) => {
  const colors = getStatusColor(board.status);
  return {
    ...board,
    headerBg: colors.headerBg,
    headerText: colors.headerText,
    badgeBg: colors.badgeBg,
    badgeText: colors.badgeText,
  };
});

export function TasksKanbanBoard({
  tasks,
  milestones,
  selectedMilestoneId,
  canEdit,
  onViewTask,
  onEditTask,
  onStatusChange,
  searchTerm,
  visibleBoards,
  onToggleBoard,
}: TasksKanbanBoardProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null); 

  // Track container width for responsive board visibility
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const autoHideSet = useMemo(() => {
    const hidden = new Set<string>();
    if (containerWidth > 0 && containerWidth < 1200) hidden.add("Cancelled");
    if (containerWidth > 0 && containerWidth < 1008) hidden.add("OnHold");
    return hidden;
  }, [containerWidth]);

  const isBoardVisible = (boardTitle: string) => {
    if (!visibleBoards[boardTitle]) return false;
    return !autoHideSet.has(boardTitle);
  };

  // Only root tasks
  const rootTasks = useMemo(() => tasks.filter((t) => !t.parentTaskId), [tasks]);

  // Filter by milestone and search term
  const filteredTasks = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return rootTasks.filter((task) => {
      // Milestone filter
      if (selectedMilestoneId && task.milestoneId !== selectedMilestoneId) {
        return false;
      }

      // Search filter
      if (query) {
        return (
          task.title.toLowerCase().includes(query) ||
          (task.description?.toLowerCase().includes(query) ?? false)
        );
      }
      return true;
    });
  }, [
    rootTasks,
    selectedMilestoneId,
    searchTerm,
  ]);

  const getTasksByStatus = useCallback(
    (status: string) => filteredTasks.filter((task) => task.status === status),
    [filteredTasks]
  );

  const getProgressColor = (progress: number) => {
    if (progress === 100) return "bg-emerald-500";
    if (progress >= 75) return "bg-amber-400";
    if (progress >= 50) return "bg-cyan-400";
    if (progress >= 25) return "bg-rose-400";
    return "bg-slate-300";
  };

  return (
    <div ref={containerRef} className="w-full my-4 py-4 rounded-xl ambient-glow  shadow-lg px-1">

      {/* Kanban Boards */}
      <div className="flex flex-col md:flex-row md:flex-wrap">
        {allBoards.map((board) => {
          if (!isBoardVisible(board.title)) return null;
          const boardTasks = getTasksByStatus(board.status);

          return (
            <div
              key={board.status}
              className="bg-slate-50/50 rounded-2xl p-1 flex-1 min-w-[200px] max-w-[500px]"
            >
              {/* Board Header */}
              <div className={`flex items-center justify-between mb-4 p-3 rounded-xl ${board.headerBg}`}>
                <div className="flex items-center gap-2">
                  <span className={board.headerText}>{board.icon}</span>
                  <h3 className={`text-sm font-semibold ${board.headerText}`}>{board.title}</h3>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${board.badgeBg} ${board.badgeText}`}
                >
                  {boardTasks.length}
                </span>
              </div>

              {/* Task Cards */}
              <div className="space-y-3 max-h-[480px] overflow-y-auto pb-4">
                {boardTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    canEdit={canEdit}
                    onViewTask={onViewTask}
                    onEditTask={onEditTask}
                    getProgressColor={getProgressColor}
                  />
                ))}

                {boardTasks.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-slate-400 mb-2">
                      <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                    </div>
                    <p className="text-xs text-slate-400">No tasks</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}