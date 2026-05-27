import React, { useState, useMemo, type JSX } from 'react';
import { getStatusColor, getPriorityColor } from '../colors';

// Types
interface Task {
  id: number;
  name: string;
  category: string;
  progress: number;
  status: 'NotStarted' | 'InProgress' | 'Completed' | 'Delayed' | 'OnHold' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  dueDate: string;
  assignee: {
    name: string;
    avatar: string;
  };
}

// Initial data
const initialTasks: Task[] = [
  {
    id: 1,
    name: 'Database Schema Optimization',
    category: 'Backend Development',
    progress: 64,
    status: 'InProgress',
    priority: 'High',
    dueDate: 'Aug 15, 2025',
    assignee: { name: 'Angelo Smith', avatar: 'https://ui-avatars.com/api/?name=Angelo+Smith&background=0ea5e9&color=fff&size=24' }
  },
  {
    id: 2,
    name: 'API Documentation Update',
    category: 'Documentation',
    progress: 100,
    status: 'Completed',
    priority: 'Medium',
    dueDate: 'Aug 10, 2025',
    assignee: { name: 'Rita Hahn', avatar: 'https://ui-avatars.com/api/?name=Rita+Hahn&background=f43f5e&color=fff&size=24' }
  },
  {
    id: 3,
    name: 'Frontend Performance Testing',
    category: 'Testing',
    progress: 45,
    status: 'OnHold',
    priority: 'Medium',
    dueDate: 'Aug 20, 2025',
    assignee: { name: 'Sue Daniel', avatar: 'https://ui-avatars.com/api/?name=Sue+Daniel&background=8b5cf6&color=fff&size=24' }
  },
  {
    id: 4,
    name: 'Security Audit Implementation',
    category: 'Security',
    progress: 25,
    status: 'Delayed',
    priority: 'High',
    dueDate: 'Aug 05, 2025',
    assignee: { name: 'Kim Schneider', avatar: 'https://ui-avatars.com/api/?name=Kim+Schneider&background=f59e0b&color=fff&size=24' }
  },
  {
    id: 5,
    name: 'User Authentication Flow',
    category: 'Backend Development',
    progress: 100,
    status: 'Completed',
    priority: 'Medium',
    dueDate: 'Aug 08, 2025',
    assignee: { name: 'Martin Emmerich', avatar: 'https://ui-avatars.com/api/?name=Martin+Emmerich&background=10b981&color=fff&size=24' }
  },
  {
    id: 6,
    name: 'Mobile App UI Design',
    category: 'UI/UX Design',
    progress: 78,
    status: 'InProgress',
    priority: 'Medium',
    dueDate: 'Aug 25, 2025',
    assignee: { name: 'Ramona Strosin', avatar: 'https://ui-avatars.com/api/?name=Ramona+Strosin&background=ec4899&color=fff&size=24' }
  },
  {
    id: 7,
    name: 'Backend API Development',
    category: 'Backend Development',
    progress: 92,
    status: 'NotStarted',
    priority: 'Critical',
    dueDate: 'Aug 30, 2025',
    assignee: { name: 'Vivian Koch', avatar: 'https://ui-avatars.com/api/?name=Vivian+Koch&background=6366f1&color=fff&size=24' }
  },
  {
    id: 8,
    name: 'Code Review Process',
    category: 'Quality Assurance',
    progress: 100,
    status: 'Completed',
    priority: 'Low',
    dueDate: 'Aug 12, 2025',
    assignee: { name: 'Angelo Smith', avatar: 'https://ui-avatars.com/api/?name=Angelo+Smith&background=0ea5e9&color=fff&size=24' }
  },
  {
    id: 9,
    name: 'Deployment Pipeline Setup',
    category: 'DevOps',
    progress: 35,
    status: 'InProgress',
    priority: 'High',
    dueDate: 'Sep 05, 2025',
    assignee: { name: 'Rita Hahn', avatar: 'https://ui-avatars.com/api/?name=Rita+Hahn&background=f43f5e&color=fff&size=24' }
  },
  {
    id: 10,
    name: 'User Acceptance Testing',
    category: 'Testing',
    progress: 15,
    status: 'Cancelled',
    priority: 'Low',
    dueDate: 'Sep 15, 2025',
    assignee: { name: 'Sue Daniel', avatar: 'https://ui-avatars.com/api/?name=Sue+Daniel&background=8b5cf6&color=fff&size=24' }
  }
];

const TaskPerformance: React.FC = () => {
  const [tasks] = useState<Task[]>(initialTasks);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Filter tasks based on search
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => 
      task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.assignee.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tasks, searchTerm]);

  // Pagination logic
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get progress bar color
  const getProgressColor = (progress: number): string => {
    if (progress === 100) return 'bg-emerald-500';
    if (progress >= 75) return 'bg-amber-400';
    if (progress >= 50) return 'bg-cyan-400';
    if (progress >= 25) return 'bg-rose-400';
    return 'bg-rose-400';
  };

  // Get icon for task category
  const getTaskIcon = (category: string): JSX.Element => {
    const baseClasses = "w-4 h-4";
    switch (category) {
      case 'Backend Development':
        return (
          <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
            <svg className={`${baseClasses} text-cyan-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
            </svg>
          </div>
        );
      case 'Documentation':
        return (
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <svg className={`${baseClasses} text-emerald-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
        );
      case 'Testing':
        return (
          <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
            <svg className={`${baseClasses} text-cyan-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
        );
      case 'Security':
        return (
          <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
            <svg className={`${baseClasses} text-rose-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
        );
      case 'UI/UX Design':
        return (
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <svg className={`${baseClasses} text-amber-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
        );
      case 'Quality Assurance':
        return (
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <svg className={`${baseClasses} text-emerald-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
        );
      case 'DevOps':
        return (
          <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
            <svg className={`${baseClasses} text-cyan-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
            <svg className={`${baseClasses} text-slate-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
            </svg>
          </div>
        );
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number): void => {
    setCurrentPage(page);
  };

  const handleAddTask = (): void => {
    console.log('Add task clicked');
  };

  const handleViewTask = (id: number): void => {
    console.log('View task:', id);
  };

  const handleEditTask = (id: number): void => {
    console.log('Edit task:', id);
  };

  const handleDeleteTask = (id: number): void => {
    console.log('Delete task:', id);
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 ">
      <div className="flex justify-between items-center mb-6 pb-2 border-b border-b-slate-200">
        <h3 className="text-md font-bold text-slate-700">Task Performance</h3>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg 
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input 
              type="text" 
              placeholder="Search for ..." 
              value={searchTerm}
              onChange={handleSearch}
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl w-64 focus:outline-none focus:border-cyan-400"
            />
          </div>
          <button 
            onClick={handleAddTask}
            className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-cyan-600 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
            </svg>
            Add Task
          </button>
        </div>
      </div>

      <table className="w-full">
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
          {paginatedTasks.map((task) => (
            <tr key={task.id} className="border-b border-slate-50 hover:bg-slate-50/50">
              <td className="py-4 px-2">
                <div className="flex items-center gap-3">
                  {getTaskIcon(task.category)}
                  <div>
                    <div className="font-medium text-slate-700">{task.name}</div>
                    <div className="text-xs text-slate-400">{task.category}</div>
                  </div>
                </div>
              </td>
              <td className="py-4 px-2">
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-100 rounded-full h-1.5">
                    <div 
                      className={`${getProgressColor(task.progress)} h-1.5 rounded-full`} 
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-slate-500">{task.progress}%</span>
                </div>
              </td>
              <td className="py-4 px-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status).bg} ${getStatusColor(task.status).text}`}>
                  {task.status}
                </span>
              </td>
              <td className="py-4 px-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority).bg} ${getPriorityColor(task.priority).text}`}>
                  {task.priority}
                </span>
              </td>
              <td className="py-4 px-2 text-slate-500">{task.dueDate}</td>
              <td className="py-4 px-2">
                <div className="flex items-center gap-2">
                  <img src={task.assignee.avatar} className="w-6 h-6 rounded-full" alt={task.assignee.name} />
                  <span className="text-slate-600">{task.assignee.name}</span>
                </div>
              </td>
              <td className="py-4 px-2">
                <div className="flex items-center gap-1">
                  {/* View Button */}
                  <button 
                    className="p-1.5 text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 rounded-lg transition-all duration-200"
                    title="View Task"
                    onClick={() => handleViewTask(task.id)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  </button>

                  {/* Edit Button */}
                  <button 
                    className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all duration-200"
                    title="Edit Task"
                    onClick={() => handleEditTask(task.id)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>

                  {/* Delete Button */}
                  <button 
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all duration-200"
                    title="Delete Task"
                    onClick={() => handleDeleteTask(task.id)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
        <div className="text-sm text-slate-500">
          Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredTasks.length)} of {filteredTasks.length} Results
        </div>
        <div className="flex items-center gap-2">
          <button 
            className="px-3 py-1.5 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Previous
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-3 py-1.5 text-sm rounded-lg ${
                currentPage === page 
                  ? 'text-white bg-primary' 
                  : 'text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {page}
            </button>
          ))}
          
          <button 
            className="px-3 py-1.5 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Next
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskPerformance;