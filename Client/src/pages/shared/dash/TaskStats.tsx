import React from 'react';
import type { Task } from "../../../types";

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  bgColor: string;
  iconBg: string;
  iconColor: string;
  shadowColor:string;
}

type TaskStatsProps = {
  tasks?: Task[];
};

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, bgColor, iconBg, iconColor,shadowColor }) => (
  <div className={`shadow-sm group relative  overflow-hidden ${shadowColor} rounded-2xl from-surface-container-lowest to-surface-container-low p-4 hover:shadow-sm transition-all duration-300 h-full flex flex-col justify-between border-0 bg-white`}>
    {/* Animated blur background */}
    <div className={`absolute bottom-1/2 right-0 w-24 h-24 ${bgColor} rounded-full blur-lg group-hover:opacity-80 transition-all pointer-events-none opacity-40`} />
    
    {/* Top row - Icon and Label */}
    <div className="relative flex items-center gap-3 mb-2">
      <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center ${iconColor} shrink-0`}>
        {icon}
      </div>
      <span className="text-xs font-medium  text-slate-500 uppercase tracking-wider">
        {label}
      </span>
    </div>
    
    {/* Value */}
    <div className="relative mt-2">
      <span className="text-2xl font-bold text-center tracking-wider text-slate-800">
        {value.toLocaleString()}
      </span>
    </div>
  </div>
);

const TaskStats: React.FC<TaskStatsProps> = ({ tasks = [] }) => {
  const stats = [
    {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
      ),
      value: tasks.length,
      label: 'Total Tasks',
      bgColor: 'bg-cyan-100',
      iconBg: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
      shadowColor: 'hover:shadow-cyan-500'
    },
    {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      ),
      value: tasks.filter(task => task.status === "InProgress").length,
      label: 'In Progress',
      bgColor: 'bg-yellow-100',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-500',
      shadowColor: 'hover:shadow-yellow-500'
    },
    {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      ),
      value: tasks.filter(task => task.status === "OnHold").length,
      label: 'On Hold',
      bgColor: 'bg-gray-200',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-500',
      shadowColor: 'hover:shadow-gray-500'
    },
    {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
        </svg>
      ),
      value: tasks.filter(task => task.status === "Completed" || task.progressPercentage === 100).length,
      label: 'Completed',
      bgColor: 'bg-emerald-100',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      shadowColor: 'hover:shadow-emerald-500'
    },
    {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      ),
      value: tasks.filter(task => task.isOverdue || task.status === "Delayed").length,
      label: 'Delayed',
      bgColor: 'bg-red-100',
      iconBg: 'bg-red-200',
      iconColor: 'text-red-800',
      shadowColor: 'hover:shadow-red-500'
    }
  ];

  return (
    <div className="grid grid-cols-5 gap-4">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
};

export default TaskStats;