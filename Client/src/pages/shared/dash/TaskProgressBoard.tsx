import React, { useState, useMemo, useRef, useEffect, type JSX } from 'react';
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
    project: string;
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
        assignee: { name: 'Angelo Smith', avatar: 'https://ui-avatars.com/api/?name=Angelo+Smith&background=0ea5e9&color=fff&size=24' },
        project: 'SemiDash Admin'
    },
    {
        id: 2,
        name: 'API Documentation Update',
        category: 'Documentation',
        progress: 100,
        status: 'Completed',
        priority: 'Medium',
        dueDate: 'Aug 10, 2025',
        assignee: { name: 'Rita Hahn', avatar: 'https://ui-avatars.com/api/?name=Rita+Hahn&background=f43f5e&color=fff&size=24' },
        project: 'SemiDash Admin'
    },
    {
        id: 3,
        name: 'Frontend Performance Testing',
        category: 'Testing',
        progress: 45,
        status: 'OnHold',
        priority: 'Medium',
        dueDate: 'Aug 20, 2025',
        assignee: { name: 'Sue Daniel', avatar: 'https://ui-avatars.com/api/?name=Sue+Daniel&background=8b5cf6&color=fff&size=24' },
        project: 'Mobile App'
    },
    {
        id: 4,
        name: 'Security Audit Implementation',
        category: 'Security',
        progress: 25,
        status: 'Delayed',
        priority: 'High',
        dueDate: 'Aug 05, 2025',
        assignee: { name: 'Kim Schneider', avatar: 'https://ui-avatars.com/api/?name=Kim+Schneider&background=f59e0b&color=fff&size=24' },
        project: 'SemiDash Admin'
    },
    {
        id: 5,
        name: 'User Authentication Flow',
        category: 'Backend Development',
        progress: 100,
        status: 'Completed',
        priority: 'Medium',
        dueDate: 'Aug 08, 2025',
        assignee: { name: 'Martin Emmerich', avatar: 'https://ui-avatars.com/api/?name=Martin+Emmerich&background=10b981&color=fff&size=24' },
        project: 'Mobile App'
    },
    {
        id: 6,
        name: 'Mobile App UI Design',
        category: 'UI/UX Design',
        progress: 78,
        status: 'InProgress',
        priority: 'Medium',
        dueDate: 'Aug 25, 2025',
        assignee: { name: 'Ramona Strosin', avatar: 'https://ui-avatars.com/api/?name=Ramona+Strosin&background=ec4899&color=fff&size=24' },
        project: 'Mobile App'
    },
    {
        id: 7,
        name: 'Backend API Development',
        category: 'Backend Development',
        progress: 92,
        status: 'NotStarted',
        priority: 'Critical',
        dueDate: 'Aug 30, 2025',
        assignee: { name: 'Vivian Koch', avatar: 'https://ui-avatars.com/api/?name=Vivian+Koch&background=6366f1&color=fff&size=24' },
        project: 'SemiDash Admin'
    },
    {
        id: 8,
        name: 'Code Review Process',
        category: 'Quality Assurance',
        progress: 100,
        status: 'Completed',
        priority: 'Low',
        dueDate: 'Aug 12, 2025',
        assignee: { name: 'Angelo Smith', avatar: 'https://ui-avatars.com/api/?name=Angelo+Smith&background=0ea5e9&color=fff&size=24' },
        project: 'SemiDash Admin'
    },
    {
        id: 9,
        name: 'Deployment Pipeline Setup',
        category: 'DevOps',
        progress: 35,
        status: 'InProgress',
        priority: 'High',
        dueDate: 'Sep 05, 2025',
        assignee: { name: 'Rita Hahn', avatar: 'https://ui-avatars.com/api/?name=Rita+Hahn&background=f43f5e&color=fff&size=24' },
        project: 'Web Platform'
    },
    {
        id: 10,
        name: 'User Acceptance Testing',
        category: 'Testing',
        progress: 15,
        status: 'Cancelled',
        priority: 'Low',
        dueDate: 'Sep 15, 2025',
        assignee: { name: 'Sue Daniel', avatar: 'https://ui-avatars.com/api/?name=Sue+Daniel&background=8b5cf6&color=fff&size=24' },
        project: 'Mobile App'
    },
    {
        id: 11,
        name: 'Cloud Migration Planning',
        category: 'DevOps',
        progress: 0,
        status: 'NotStarted',
        priority: 'High',
        dueDate: 'Oct 01, 2025',
        assignee: { name: 'Vivian Koch', avatar: 'https://ui-avatars.com/api/?name=Vivian+Koch&background=6366f1&color=fff&size=24' },
        project: 'Web Platform'
    },
    {
        id: 12,
        name: 'Performance Monitoring Setup',
        category: 'DevOps',
        progress: 55,
        status: 'Delayed',
        priority: 'Medium',
        dueDate: 'Aug 18, 2025',
        assignee: { name: 'Kim Schneider', avatar: 'https://ui-avatars.com/api/?name=Kim+Schneider&background=f59e0b&color=fff&size=24' },
        project: 'SemiDash Admin'
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

// Board configurations
const allBoards: BoardConfig[] = [
    { status: 'NotStarted' as Task['status'], title: 'Not Started', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
        </svg>
    )},
    { status: 'InProgress' as Task['status'], title: 'In Progress', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    )},
    { status: 'Completed' as Task['status'], title: 'Completed', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
    )},
    { status: 'Delayed' as Task['status'], title: 'Delayed', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    )},
    { status: 'OnHold' as Task['status'], title: 'On Hold', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    )},
    { status: 'Cancelled' as Task['status'], title: 'Cancelled', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
    )},
].map(board => {
    const colors = getStatusColor(board.status);
    return {
        ...board,
        headerBg: colors.headerBg,
        headerText: colors.headerText,
        badgeBg: colors.badgeBg,
        badgeText: colors.badgeText,
    };
});

const TaskProgressBoards: React.FC = () => {
    const [tasks] = useState<Task[]>(initialTasks);
    const [selectedProject, setSelectedProject] = useState<string>('All Projects');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [showFilters, setShowFilters] = useState<boolean>(true);
    const [visibleBoards, setVisibleBoards] = useState<Record<string, boolean>>({
        'Not Started': true,
        'In Progress': true,
        'Completed': true,
        'Delayed': true,
        'On Hold': true,
        'Cancelled': true
    });

    // Close settings when clicking outside
    const settingsRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
                setShowSettings(false);
            }
        };
        if (showSettings) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showSettings]);

    // Get unique projects
    const projects = useMemo(() => {
        const uniqueProjects = new Set(tasks.map(task => task.project));
        return ['All Projects', ...Array.from(uniqueProjects)];
    }, [tasks]);

    // Filter tasks
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchesProject = selectedProject === 'All Projects' || task.project === selectedProject;
            const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                task.category.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesProject && matchesSearch;
        });
    }, [tasks, selectedProject, searchTerm]);

    // Progress bar color
    const getProgressColor = (progress: number): string => {
        if (progress === 100) return 'bg-emerald-500';
        if (progress >= 75) return 'bg-amber-400';
        if (progress >= 50) return 'bg-cyan-400';
        if (progress >= 25) return 'bg-rose-400';
        return 'bg-slate-300';
    };

    // Get only visible boards
    const visibleBoardConfigs = allBoards.filter(board => visibleBoards[board.title]);

    const getTasksByStatus = (status: Task['status']): Task[] => {
        return filteredTasks.filter(task => task.status === status);
    };

    const toggleBoard = (boardTitle: string): void => {
        setVisibleBoards(prev => ({
            ...prev,
            [boardTitle]: !prev[boardTitle]
        }));
    };

    return (
        <div className="w-full my-4  py-4">
  {/* Top Controls */}
  <div className="flex items-center  mx-4 ">
    <span className='px-2 text-md font-bold'>Tasks Board</span>
    {/* Left side: settings, filter toggle, then project & search */}
    <div className="flex items-center gap-2">

        {/* Filter toggle button */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`p-2 rounded-xl transition-all duration-200 ${
          showFilters
            ? 'bg-cyan-50 text-cyan-600'
            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
        }`}
        title={showFilters ? 'Hide filters' : 'Show filters'}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
        </svg>
      </button>
      {/* Settings Button */}
      <div className="relative" ref={settingsRef}>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-xl transition-all duration-200 ${
            showSettings
              ? 'bg-cyan-50 text-cyan-600'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          }`}
          title="Board Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </button>

        {/* Settings Dropdown */}
        {showSettings && (
          <div className="absolute left-0 top-12 w-64 bg-white rounded-xl shadow-lg border border-slate-100 p-3 z-50">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">
              Visible Boards
            </h4>
            <div className="space-y-1">
              {allBoards.map((board) => (
                <button
                  key={board.title}
                  onClick={() => toggleBoard(board.title)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-all duration-200 ${
                    visibleBoards[board.title]
                      ? 'bg-slate-50 hover:bg-slate-100'
                      : 'opacity-50 hover:opacity-75 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`${board.headerText}`}>{board.icon}</span>
                    <span className={`text-xs font-medium ${
                      visibleBoards[board.title] ? 'text-slate-700' : 'text-slate-400'
                    }`}>
                      {board.title}
                    </span>
                  </div>
                  {/* Toggle Switch */}
                  <div className={`w-8 h-4 rounded-full transition-colors duration-200 ${
                    visibleBoards[board.title] ? 'bg-cyan-500' : 'bg-slate-200'
                  }`}>
                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 mt-0.5 ${
                      visibleBoards[board.title] ? 'translate-x-4' : 'translate-x-0.5'
                    }`}></div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      

      {/* Project & Search (toggleable) */}
      {showFilters && (
        <>
          {/* Project Dropdown */}
          <div className="relative">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 pr-10 text-sm font-medium text-slate-700 focus:outline-none focus:border-cyan-400 cursor-pointer hover:border-slate-300 transition-colors"
            >
              {projects.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
            <svg
              className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>

          {/* Search Box */}
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
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl w-48 sm:w-64 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </>
      )}
    </div>
  </div>

  {/* Kanban Boards – fixed order, no extra padding/margin */}
  <div className="flex flex-col md:flex-row md:flex-wrap">
    {allBoards.map((board) => {
      // Only render if board is visible
      if (!visibleBoards[board.title]) return null;
      
      const boardTasks = getTasksByStatus(board.status);
      
      return (
        <div
          key={board.status}
          className="bg-slate-50/50 rounded-2xl p-4 flex-1 min-w-[200px] max-w-[500px]"
        >
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

                {/* Priority Badge & Assignee */}
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority).bg} ${getPriorityColor(task.priority).text} ${getPriorityColor(task.priority).border}`}>
                    {task.priority}
                  </span>
                  
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