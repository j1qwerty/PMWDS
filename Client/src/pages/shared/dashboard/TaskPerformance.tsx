import { useMemo, useState } from "react";
import type { Task } from "../../../types";
import { getStatusColor, getPriorityColor } from "../colors";

type TaskPerformanceProps = {
  tasks?: Task[];
  onViewTask?: (task: Task) => void | Promise<void>;
  onEditTask?: (task: Task) => void | Promise<void>;
  canEdit?: boolean;
};

export default function TaskPerformance({ tasks = [], onViewTask, onEditTask, canEdit = false }: TaskPerformanceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredTasks = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return tasks.filter(task =>
      task.title.toLowerCase().includes(query) ||
      (task.projectName ?? "").toLowerCase().includes(query) ||
      (task.assignedToUserName ?? "").toLowerCase().includes(query)
    );
  }, [tasks, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / itemsPerPage));
  const paginatedTasks = filteredTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
      <div className="flex flex-col gap-3 lg:flex-row lg:justify-between lg:items-center mb-6 pb-2 border-b border-b-slate-200">
        <h3 className="text-md font-bold text-slate-700">Task Performance</h3>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
          <input
            type="text"
            placeholder="Search tasks"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl w-full lg:w-72 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-medium text-slate-500 py-3 px-2">Task</th>
              <th className="text-left text-xs font-medium text-slate-500 py-3 px-2">Progress</th>
              <th className="text-left text-xs font-medium text-slate-500 py-3 px-2">Status</th>
              <th className="text-left text-xs font-medium text-slate-500 py-3 px-2">Priority</th>
              <th className="text-left text-xs font-medium text-slate-500 py-3 px-2">Due Date</th>
              <th className="text-left text-xs font-medium text-slate-500 py-3 px-2">Assigned To</th>
              <th className="text-left text-xs font-medium text-slate-500 py-3 px-2">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {paginatedTasks.map(task => {
              const statusColor = getStatusColor(task.status);
              const priorityColor = getPriorityColor(task.priority);
              return (
                <tr key={task.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="py-4 px-2">
                    <button className="text-left" onClick={() => onViewTask?.(task)}>
                      <div className="font-medium text-slate-700">{task.title}</div>
                      <div className="text-xs text-slate-400">{task.projectName ?? "General"}</div>
                    </button>
                  </td>
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-100 rounded-full h-1.5">
                        <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: `${task.progressPercentage}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{task.progressPercentage}%</span>
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor.bg} ${statusColor.text}`}>{task.status}</span>
                  </td>
                  <td className="py-4 px-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColor.bg} ${priorityColor.text}`}>{task.priority}</span>
                  </td>
                  <td className="py-4 px-2 text-slate-500">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Not set"}</td>
                  <td className="py-4 px-2 text-slate-600">{task.assignedToUserName ?? "Unassigned"}</td>
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 rounded-lg" title="View task" onClick={() => onViewTask?.(task)}>
                        <span className="material-symbols-outlined text-base">visibility</span>
                      </button>
                      {canEdit && (
                        <button className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg" title="Edit task" onClick={() => onEditTask?.(task)}>
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
        <div className="text-sm text-slate-500">
          Showing {filteredTasks.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredTasks.length)} of {filteredTasks.length}
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm text-slate-500 border border-slate-200 rounded-lg disabled:opacity-50" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>Previous</button>
          <button className="px-3 py-1.5 text-sm text-slate-500 border border-slate-200 rounded-lg disabled:opacity-50" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
