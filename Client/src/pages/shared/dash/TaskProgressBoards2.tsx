import { useState, useMemo, useRef, useEffect, useCallback, type JSX } from 'react';
import { getStatusColor } from '../colors';
import type { Task } from '../../../types';
import { TaskCard } from '../../projectsK/components/TaskCard';

interface TaskProgressBoardsProps {
    tasks?: Task[];
    onViewTask?: (task: Task) => void | Promise<void>;
    onEditTask?: (task: Task) => void | Promise<void>;
    canEdit?: boolean;
}

// Board configuration
interface BoardConfig {
    status: string;
    title: string;
    headerBg: string;
    headerText: string;
    badgeBg: string;
    badgeText: string;
    icon: JSX.Element;
}

// Board configurations
const allBoards: BoardConfig[] = [
    {
        status: 'NotStarted', title: 'Not Started', icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
        )
    },
    {
        status: 'InProgress', title: 'In Progress', icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        )
    },
    {
        status: 'Completed', title: 'Completed', icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
        )
    },
    {
        status: 'Delayed', title: 'Delayed', icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        )
    },
    {
        status: 'OnHold', title: 'On Hold', icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        )
    },
    {
        status: 'Cancelled', title: 'Cancelled', icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        )
    },
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

const TaskProgressBoards: React.FC<TaskProgressBoardsProps> = ({
    tasks = [],
    onViewTask,
    onEditTask,
    canEdit = false
}) => {
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

    // Get unique projects from API tasks
    const projects = useMemo(() => {
        const uniqueProjects = new Set(tasks.map(task => task.projectName).filter((p): p is string => !!p));
        return ['All Projects', ...Array.from(uniqueProjects)];
    }, [tasks]);

    // Filter tasks based on project and search
    const filteredTasks = useMemo(() => {
        const query = searchTerm.toLowerCase();
        return tasks.filter(task => {
            const projectName = task.projectName ?? '';
            const matchesProject = selectedProject === 'All Projects' || projectName === selectedProject;
            const matchesSearch = !query ||
                (task.title ?? '').toLowerCase().includes(query) ||
                projectName.toLowerCase().includes(query);
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

    const getTasksByStatus = useCallback((status: string): Task[] => {
        return filteredTasks.filter(task => task.status === status);
    }, [filteredTasks]);

    const toggleBoard = (boardTitle: string): void => {
        setVisibleBoards(prev => ({
            ...prev,
            [boardTitle]: !prev[boardTitle]
        }));
    };

    return (
        <div className="w-full my-4 py-4 rounded-xl p-md ambient-glow ">
            {/* Top Controls */}
            <div className="flex items-center mb-2 ">
                <span className='px-2 text-md font-bold'>Tasks Board</span>
                {/* Left side: settings, filter toggle, then project & search */}
                <div className="flex items-center gap-2">
                    {/* Filter toggle button */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 rounded-xl transition-all duration-200 ${showFilters
                                ? 'bg-cyan-50 text-cyan-600'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                        title={showFilters ? 'Hide filters' : 'Show filters'}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                    </button>

                    {/* Settings Button */}
                    <div className="relative " ref={settingsRef}>
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`p-2 rounded-xl transition-all duration-200 ${showSettings
                                    ? 'bg-cyan-50 text-cyan-600'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                }`}
                            title="Board Settings"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
                                            className={`w-full flex items-center justify-between p-2 rounded-lg transition-all duration-200 ${visibleBoards[board.title]
                                                    ? 'bg-slate-50 hover:bg-slate-100'
                                                    : 'opacity-50 hover:opacity-75 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className={`${board.headerText}`}>{board.icon}</span>
                                                <span className={`text-xs font-medium ${visibleBoards[board.title] ? 'text-slate-700' : 'text-slate-400'
                                                    }`}>
                                                    {board.title}
                                                </span>
                                            </div>
                                            {/* Toggle Switch */}
                                            <div className={`w-8 h-4 rounded-full transition-colors duration-200 ${visibleBoards[board.title] ? 'bg-cyan-500' : 'bg-slate-200'
                                                }`}>
                                                <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 mt-0.5 ${visibleBoards[board.title] ? 'translate-x-4' : 'translate-x-0.5'
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>

                            {/* Search Box */}
                            <div className="relative ">
                                <svg
                                    className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 "
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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

            {/* Kanban Boards */}
            <div className="flex flex-col md:flex-row md:flex-wrap gap-1">
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
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
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