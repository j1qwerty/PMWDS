import React, { useState, type JSX } from 'react';

// Types
interface Task {
  id: number;
  name: string;
  category: string;
  progress: number;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Delayed' | 'On Hold' | 'Cancelled';
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
    status: 'In Progress',
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
    status: 'On Hold',
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
    status: 'In Progress',
    priority: 'Medium',
    dueDate: 'Aug 25, 2025',
    assignee: { name: 'Ramona Strosin', avatar: 'https://ui-avatars.com/api/?name=Ramona+Strosin&background=ec4899&color=fff&size=24' }
  },
  {
    id: 7,
    name: 'Backend API Development',
    category: 'Backend Development',
    progress: 92,
    status: 'Not Started',
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
    status: 'In Progress',
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
  },
  {
    id: 11,
    name: 'Cloud Migration Planning',
    category: 'DevOps',
    progress: 0,
    status: 'Not Started',
    priority: 'High',
    dueDate: 'Oct 01, 2025',
    assignee: { name: 'Vivian Koch', avatar: 'https://ui-avatars.com/api/?name=Vivian+Koch&background=6366f1&color=fff&size=24' }
  },
  {
    id: 12,
    name: 'Performance Monitoring Setup',
    category: 'DevOps',
    progress: 55,
    status: 'Delayed',
    priority: 'Medium',
    dueDate: 'Aug 18, 2025',
    assignee: { name: 'Kim Schneider', avatar: 'https://ui-avatars.com/api/?name=Kim+Schneider&background=f59e0b&color=fff&size=24' }
  }
];

// Board configuration
interface BoardConfig {
  status: Task['status'];
  title: string;
  headerBg: string;
  headerText: string;
  badgeBg: string;
  badgeText: string;
  icon: JSX.Element;
}

const TaskProgressBoards: React.FC = () => {
  const [tasks] = useState<Task[]>(initialTasks);

  // Priority badge styles
  const getPriorityBadge = (priority: Task['priority']): string => {
    switch (priority) {
      case 'Low':
        return 'bg-gray-50 text-gray-500 border-gray-200';
      case 'Medium':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'High':
        return 'bg-yellow-50 text-red-600 border-yellow-200';
      case 'Critical':
        return 'bg-red-50 text-red-800 border-red-200';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  // Progress bar color
  const getProgressColor = (progress: number): string => {
    if (progress === 100) return 'bg-emerald-500';
    if (progress >= 75) return 'bg-amber-400';
    if (progress >= 50) return 'bg-cyan-400';
    if (progress >= 25) return 'bg-rose-400';
    return 'bg-slate-300';
  };

  // Board configurations
  const boards: BoardConfig[] = [
    {
      status: 'Not Started',
      title: 'Not Started',
      headerBg: 'bg-slate-100',
      headerText: 'text-slate-700',
      badgeBg: 'bg-slate-100',
      badgeText: 'text-slate-600',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
        </svg>
      )
    },
    {
      status: 'In Progress',
      title: 'In Progress',
      headerBg: 'bg-yellow-50',
      headerText: 'text-yellow-500',
      badgeBg: 'bg-yellow-50',
      badgeText: 'text-yellow-600',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      )
    },
    {
      status: 'Completed',
      title: 'Completed',
      headerBg: 'bg-emerald-100',
      headerText: 'text-emerald-700',
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-600',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
        </svg>
      )
    },
    {
      status: 'Delayed',
      title: 'Delayed',
      headerBg: 'bg-yellow-100',
      headerText: 'text-red-700',
      badgeBg: 'bg-yellow-50',
      badgeText: 'text-red-600',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      )
    },
    {
      status: 'On Hold',
      title: 'On Hold',
      headerBg: 'bg-gray-100',
      headerText: 'text-gray-700',
      badgeBg: 'bg-gray-100',
      badgeText: 'text-gray-500',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      )
    },
    {
      status: 'Cancelled',
      title: 'Cancelled',
      headerBg: 'bg-red-100',
      headerText: 'text-red-800',
      badgeBg: 'bg-red-50',
      badgeText: 'text-red-800',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      )
    }
  ];

  const getTasksByStatus = (status: Task['status']): Task[] => {
    return tasks.filter(task => task.status === status);
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="grid grid-cols-6  min-w-[1400px]">
        {boards.map((board) => {
          const boardTasks = getTasksByStatus(board.status);
          
          return (
            <div key={board.status} className="bg-slate-50/50 rounded-2xl p-4">
              {/* Board Header */}
              <div className={`flex items-center justify-between mb-4 p-3 rounded-xl ${board.headerBg}`}>
                <div className="flex items-center gap-2">
                  <span className={board.headerText}>{board.icon}</span>
                  <h3 className={`text-sm font-semibold ${board.headerText}`}>
                    {board.title}
                  </h3>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${board.badgeBg} ${board.badgeText}`}>
                  {boardTasks.length}
                </span>
              </div>

              {/* Task Cards */}
              <div className="space-y-3">
                {boardTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                  >
                    {/* Task Name */}
                    <h4 className="text-sm font-medium text-slate-700 mb-3 leading-snug">
                      {task.name}
                    </h4>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-slate-400 font-medium">Progress</span>
                        <span className="text-[10px] font-semibold text-slate-600">{task.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div 
                          className={`${getProgressColor(task.progress)} h-1.5 rounded-full transition-all duration-300`}
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Priority Badge */}
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getPriorityBadge(task.priority)}`}>
                        {task.priority}
                      </span>
                      
                      {/* Assignee Avatar */}
                      <img 
                        src={task.assignee.avatar} 
                        alt={task.assignee.name}
                        className="w-5 h-5 rounded-full"
                        title={task.assignee.name}
                      />
                    </div>
                  </div>
                ))}

                {/* Empty State */}
                {boardTasks.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-slate-300 mb-2">
                      <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
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
};

export default TaskProgressBoards;