import { useMemo, useState } from "react";
import type { Task } from "../../../types";
import { getStatusColor, getPriorityColor } from "../colors";

type TaskPerformanceProps = {
  tasks?: Task[];
  onViewTask?: (task: Task) => void | Promise<void>;
  onEditTask?: (task: Task) => void | Promise<void>;
  canEdit?: boolean;
};

// Progress bar color utility
const getProgressColor = (progress: number) => {
  if (progress >= 100) return "bg-red-500"; // Overflow/Error
  if (progress >= 80) return "bg-cyan-500"; // Capacity
  if (progress >= 60) return "bg-blue-500"; // Optimal
  if (progress >= 40) return "bg-amber-500"; // Moderate
  if (progress >= 20) return "bg-emerald-500"; // Low
  return "bg-purple-500"; // Minimal
};

// Progress text color utility
const getProgressTextColor = (progress: number) => {
  if (progress >= 100) return "text-red-600";
  if (progress >= 80) return "text-cyan-600";
  if (progress >= 60) return "text-blue-600";
  if (progress >= 40) return "text-amber-600";
  if (progress >= 20) return "text-emerald-600";
  return "text-purple-600";
};

export default function TaskPerformanceTable({ tasks = [], onViewTask, onEditTask, canEdit = false }: TaskPerformanceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [canDelete, setCanDelete] = useState(false);
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

  const handleDeleteTask = (id: string) => {
    // Implement delete logic here
    console.log("Delete task:", id);
  };

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
              const progress = task.progressPercentage || 0;
              const progressBarColor = getProgressColor(progress);
              const progressTextColor = getProgressTextColor(progress);

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
                        <div 
                          className={`${progressBarColor} h-1.5 rounded-full transition-all duration-300`} 
                          style={{ width: `${Math.min(progress, 100)}%` }} 
                        />
                      </div>
                      <span className={`text-xs font-medium ${progressTextColor}`}>{progress}%</span>
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
                    <div className="flex items-center gap-0.5">
                      {/* View Button - Smaller */}
                      <button
                        className=" text-cyan-500 bg-cyan-50 hover:text-cyan-500 hover:cursor-pointer hover:bg-green-200 rounded-lg inline-flex items-center justify-center"
                        style={{ width: "28px", height: "28px" }}
                        title="View task"
                        onClick={() => onViewTask?.(task)}
                      >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                      </button>

                      {/* Edit Button - Smaller, only shown if canEdit is true */}
                      {canEdit && (
                        <button
                          className="p-1 text-amber-500 bg-amber-50 hover:text-amber-700 hover:bg-blue-200 hover:cursor-pointer rounded-lg inline-flex items-center justify-center"
                          style={{ width: "28px", height: "28px" }}
                          title="Edit task"
                          onClick={() => onEditTask?.(task)}
                        >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg> 
                        </button>
                      )}

                      {/* Delete Button - Smaller, controlled by canDelete state */}
                      {canDelete && (
                        <button
                          className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg inline-flex items-center justify-center"
                          style={{ width: "28px", height: "28px" }}
                          title="Delete task"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
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
          {filteredTasks.length === 0
            ? 'No Results'
            : `Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, filteredTasks.length)} of ${filteredTasks.length} Results`
          }
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          {totalPages > 1 && Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors duration-200 ${currentPage === page
                  ? 'text-white bg-primary border border-primary'
                  : 'text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
            >
              {page}
            </button>
          ))}

          <button
            className="px-3 py-1.5 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={currentPage === totalPages || filteredTasks.length === 0}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}