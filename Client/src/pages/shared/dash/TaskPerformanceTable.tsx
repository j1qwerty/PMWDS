import { useMemo, useState, useRef, useEffect } from "react";
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
  if (progress >= 100) return "bg-red-500";
  if (progress >= 80) return "bg-cyan-500";
  if (progress >= 60) return "bg-blue-500";
  if (progress >= 40) return "bg-amber-500";
  if (progress >= 20) return "bg-emerald-500";
  return "bg-purple-500";
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

type SortDirection = "asc" | "desc";
type SortField = "title" | "progress" | "status" | "priority" | "dueDate" | null;

const statusOptions = ["NotStarted", "InProgress", "Completed", "Delayed", "OnHold", "Cancelled"];
const priorityOptions = ["Low", "Medium", "High", "Critical"];

export default function TaskPerformanceTable({ tasks = [], onViewTask, onEditTask, canEdit = false }: TaskPerformanceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [canDelete, setCanDelete] = useState(false);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const statusButtonRef = useRef<HTMLButtonElement>(null);
  const priorityButtonRef = useRef<HTMLButtonElement>(null);
  
  const itemsPerPage = 10;

  // Handle click outside and scroll for dropdowns
  useEffect(() => {
    const handleClose = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target as Node)) {
        setShowPriorityDropdown(false);
      }
    };

    const handleScroll = () => {
      setShowStatusDropdown(false);
      setShowPriorityDropdown(false);
    };

    document.addEventListener("mousedown", handleClose);
    if (showStatusDropdown || showPriorityDropdown) {
      document.addEventListener("scroll", handleScroll, { capture: true });
    }

    return () => {
      document.removeEventListener("mousedown", handleClose);
      document.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, [showStatusDropdown, showPriorityDropdown]);

  const handleSort = (field: SortField) => {
    if (field === "status" || field === "priority") {
      // Toggle dropdown for status/priority
      if (field === "status") {
        setShowStatusDropdown(!showStatusDropdown);
        setShowPriorityDropdown(false);
      } else {
        setShowPriorityDropdown(!showPriorityDropdown);
        setShowStatusDropdown(false);
      }
      return;
    }

    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setShowStatusDropdown(false);
    setShowPriorityDropdown(false);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
    setCurrentPage(1);
  };

  const handlePriorityFilter = (priority: string) => {
    setPriorityFilter(prev => 
      prev.includes(priority) 
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
    setCurrentPage(1);
  };

  const clearStatusFilter = () => {
    setStatusFilter([]);
    setCurrentPage(1);
  };

  const clearPriorityFilter = () => {
    setPriorityFilter([]);
    setCurrentPage(1);
  };

  const filteredAndSortedTasks = useMemo(() => {
    const query = searchTerm.toLowerCase();
    
    let result = tasks.filter(task => {
      if (task.parentTaskId) return false;
      
      // Search filter
      const matchesSearch = task.title.toLowerCase().includes(query) ||
        (task.projectName ?? "").toLowerCase().includes(query) ||
        (task.assignedToUserName ?? "").toLowerCase().includes(query);
      
      // Status filter
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(task.status);
      
      // Priority filter
      const matchesPriority = priorityFilter.length === 0 || priorityFilter.includes(task.priority);
      
      return matchesSearch && matchesStatus && matchesPriority;
    });

    // Sort
    if (sortField) {
      result.sort((a, b) => {
        let comparison = 0;
        
        switch (sortField) {
          case "title":
            comparison = a.title.localeCompare(b.title);
            break;
          case "progress":
            comparison = (a.progressPercentage || 0) - (b.progressPercentage || 0);
            break;
          case "dueDate":
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
            comparison = dateA - dateB;
            break;
        }
        
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [tasks, searchTerm, sortField, sortDirection, statusFilter, priorityFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedTasks.length / itemsPerPage));
  const paginatedTasks = filteredAndSortedTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDeleteTask = (id: string) => {
    console.log("Delete task:", id);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg className="w-3 h-3 text-slate-300 group-hover:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === "asc" ? (
      <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const hasActiveFilters = statusFilter.length > 0 || priorityFilter.length > 0;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
      <div className="flex flex-col gap-3 lg:flex-row lg:justify-between lg:items-center mb-6 pb-2 border-b border-b-slate-200">
        <h3 className="text-md font-bold text-slate-700">Task Performance</h3>
        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button
              onClick={() => {
                clearStatusFilter();
                clearPriorityFilter();
              }}
              className="text-xs text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filters
            </button>
          )}
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-medium text-slate-500 py-3 px-2">
                <button 
                  onClick={() => handleSort("title")}
                  className="flex items-center gap-1 group hover:text-slate-700 transition-colors"
                >
                  Task
                  {getSortIcon("title")}
                </button>
              </th>
              <th className="text-left text-xs font-medium text-slate-500 py-3 px-2">
                <button 
                  onClick={() => handleSort("progress")}
                  className="flex items-center gap-1 group hover:text-slate-700 transition-colors"
                >
                  Progress
                  {getSortIcon("progress")}
                </button>
              </th>
              <th className="text-left text-xs font-medium text-slate-500 py-3 px-2">
                <div ref={statusDropdownRef}>
                  <button 
                    ref={statusButtonRef}
                    onClick={() => handleSort("status")}
                    className="flex items-center gap-1 group hover:text-slate-700 transition-colors"
                  >
                    Status
                    <svg className={`w-3 h-3 transition-transform ${showStatusDropdown ? 'rotate-180 text-slate-600' : 'text-slate-300 group-hover:text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                    {statusFilter.length > 0 && (
                      <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                    )}
                  </button>
                  {showStatusDropdown && (
                    <div 
                      className="fixed bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-2 min-w-[160px]"
                      style={{
                        top: (statusButtonRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
                        left: statusButtonRef.current?.getBoundingClientRect().left ?? 0,
                      }}
                    >
                      <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-100">
                        <span className="text-xs font-medium text-slate-500">Filter by Status</span>
                        <button onClick={clearStatusFilter} className="text-xs text-rose-400 hover:text-rose-600">Clear</button>
                      </div>
                      {statusOptions.map(status => {
                        const statusColor = getStatusColor(status);
                        return (
                          <label key={status} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={statusFilter.includes(status)}
                              onChange={() => handleStatusFilter(status)}
                              className="rounded border-slate-300 text-cyan-500 focus:ring-cyan-400"
                            />
                            <span className={`text-xs font-medium ${statusColor.text}`}>{status}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </th>
              <th className="text-left text-xs font-medium text-slate-500 py-3 px-2">
                <div ref={priorityDropdownRef}>
                  <button 
                    ref={priorityButtonRef}
                    onClick={() => handleSort("priority")}
                    className="flex items-center gap-1 group hover:text-slate-700 transition-colors"
                  >
                    Priority
                    <svg className={`w-3 h-3 transition-transform ${showPriorityDropdown ? 'rotate-180 text-slate-600' : 'text-slate-300 group-hover:text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                    {priorityFilter.length > 0 && (
                      <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                    )}
                  </button>
                  {showPriorityDropdown && (
                    <div 
                      className="fixed bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-2 min-w-[160px]"
                      style={{
                        top: (priorityButtonRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
                        left: priorityButtonRef.current?.getBoundingClientRect().left ?? 0,
                      }}
                    >
                      <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-100">
                        <span className="text-xs font-medium text-slate-500">Filter by Priority</span>
                        <button onClick={clearPriorityFilter} className="text-xs text-rose-400 hover:text-rose-600">Clear</button>
                      </div>
                      {priorityOptions.map(priority => {
                        const priorityColor = getPriorityColor(priority);
                        return (
                          <label key={priority} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={priorityFilter.includes(priority)}
                              onChange={() => handlePriorityFilter(priority)}
                              className="rounded border-slate-300 text-cyan-500 focus:ring-cyan-400"
                            />
                            <span className={`text-xs font-medium ${priorityColor.text}`}>{priority}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </th>
              <th className="text-left text-xs font-medium text-slate-500 py-3 px-2">
                <button 
                  onClick={() => handleSort("dueDate")}
                  className="flex items-center gap-1 group hover:text-slate-700 transition-colors"
                >
                  Due Date
                  {getSortIcon("dueDate")}
                </button>
              </th>
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
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-0.5">
                      <button
                        className="text-cyan-500 bg-cyan-50 hover:text-cyan-500 hover:cursor-pointer hover:bg-cyan-100 rounded-lg inline-flex items-center justify-center"
                        style={{ width: "28px", height: "28px" }}
                        title="View task"
                        onClick={() => onViewTask?.(task)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>

                      {canEdit && (
                        <button
                          className="p-1 text-amber-500 bg-amber-50 hover:text-amber-700 hover:bg-amber-100 hover:cursor-pointer rounded-lg inline-flex items-center justify-center"
                          style={{ width: "28px", height: "28px" }}
                          title="Edit task"
                          onClick={() => onEditTask?.(task)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg> 
                        </button>
                      )}

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

      {filteredAndSortedTasks.length === 0 && (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm font-medium">No tasks found</p>
          <p className="text-slate-400 text-xs mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
        <div className="text-sm text-slate-500">
          {filteredAndSortedTasks.length === 0
            ? 'No Results'
            : `Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, filteredAndSortedTasks.length)} of ${filteredAndSortedTasks.length} Results`
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
            disabled={currentPage === totalPages || filteredAndSortedTasks.length === 0}
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