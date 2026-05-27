import { useMemo, useState } from "react";
import type { Task } from "../../../types";
import { getStatusColor, getPriorityColor } from "../colors";

type TaskProgressBoardsProps = {
  tasks?: Task[];
  onViewTask?: (task: Task) => void;
  onEditTask?: (task: Task) => void;
  canEdit?: boolean;
};

const boards = [
  { status: "NotStarted", title: "Not Started", icon: "add_circle" },
  { status: "Assigned", title: "Assigned", icon: "assignment_ind" },
  { status: "InProgress", title: "In Progress", icon: "schedule" },
  { status: "Completed", title: "Completed", icon: "check_circle" },
  { status: "Delayed", title: "Delayed", icon: "warning" },
  { status: "OnHold", title: "On Hold", icon: "pause_circle" },
];

export default function TaskProgressBoards({ tasks = [], onViewTask, onEditTask, canEdit = false }: TaskProgressBoardsProps) {
  const [selectedProject, setSelectedProject] = useState("All Projects");
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleBoards, setVisibleBoards] = useState<Record<string, boolean>>(
    Object.fromEntries(boards.map(board => [board.status, true])),
  );

  const projects = useMemo(() => {
    const names = tasks.map(task => task.projectName).filter(Boolean) as string[];
    return ["All Projects", ...Array.from(new Set(names)).sort()];
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return tasks.filter(task => {
      const matchesProject = selectedProject === "All Projects" || task.projectName === selectedProject;
      const matchesSearch = task.title.toLowerCase().includes(query) || (task.projectName ?? "").toLowerCase().includes(query);
      return matchesProject && matchesSearch;
    });
  }, [tasks, selectedProject, searchTerm]);

  return (
    <div className="w-full my-4 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mx-4 mb-4">
        <span className="text-md font-bold text-slate-700">Tasks Board</span>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedProject}
            onChange={(event) => setSelectedProject(event.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-cyan-400"
          >
            {projects.map(project => <option key={project} value={project}>{project}</option>)}
          </select>
          <input
            type="text"
            placeholder="Search tasks"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="px-4 py-2 text-sm border border-slate-200 rounded-xl w-56 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 px-4">
        {boards.map(board => {
          if (!visibleBoards[board.status]) return null;
          const boardTasks = filteredTasks.filter(task => task.status === board.status);
          const colors = getStatusColor(board.status);

          return (
            <div key={board.status} className="bg-slate-50/70 rounded-xl p-4 flex-1 min-w-[220px] max-w-[420px] border border-slate-100">
              <div className={`flex items-center justify-between mb-4 p-3 rounded-xl ${colors.headerBg}`}>
                <button
                  className="flex items-center gap-2"
                  onClick={() => setVisibleBoards(current => ({ ...current, [board.status]: !current[board.status] }))}
                  title="Hide board"
                >
                  <span className={`material-symbols-outlined text-base ${colors.headerText}`}>{board.icon}</span>
                  <h3 className={`text-sm font-semibold ${colors.headerText}`}>{board.title}</h3>
                </button>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${colors.badgeBg} ${colors.badgeText}`}>{boardTasks.length}</span>
              </div>

              <div className="space-y-3">
                {boardTasks.map(task => {
                  const priorityColor = getPriorityColor(task.priority);
                  return (
                    <div key={task.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                      <button className="block w-full text-left" onClick={() => onViewTask?.(task)}>
                        <h4 className="text-sm font-medium text-slate-700 mb-1 leading-snug">{task.title}</h4>
                        <p className="text-xs text-slate-400 mb-3">{task.projectName ?? "General"}</p>
                      </button>
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-slate-400 font-medium">Progress</span>
                          <span className="text-[10px] font-semibold text-slate-600">{task.progressPercentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: `${task.progressPercentage}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${priorityColor.bg} ${priorityColor.text} ${priorityColor.border}`}>
                          {task.priority}
                        </span>
                        <div className="flex items-center gap-1">
                          <button title="View task" className="p-1 text-slate-400 hover:text-cyan-500" onClick={() => onViewTask?.(task)}>
                            <span className="material-symbols-outlined text-base">visibility</span>
                          </button>
                          {canEdit && (
                            <button title="Edit task" className="p-1 text-slate-400 hover:text-amber-500" onClick={() => onEditTask?.(task)}>
                              <span className="material-symbols-outlined text-base">edit</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {boardTasks.length === 0 && <div className="text-center py-8 text-xs text-slate-400">No tasks</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
