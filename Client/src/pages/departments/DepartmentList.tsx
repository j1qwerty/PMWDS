import { useMemo } from "react";
import type { Department, User } from "../../types";
import { Avatar, GlassCard } from "../shared";

interface DepartmentListProps {
  departments: Department[];
  users: User[];
  selectedDeptId: string;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSelectDept: (id: string) => void;
  organizationName?: string;
}

export function DepartmentList({
  departments,
  users,
  selectedDeptId,
  searchTerm,
  onSearchChange,
  onSelectDept,
  organizationName,
}: DepartmentListProps) {
  const filteredList = useMemo(() => {
    if (!searchTerm) return departments;
    const search = searchTerm.toLowerCase();
    return departments.filter(
      (dept) =>
        dept.name.toLowerCase().includes(search) ||
        dept.code.toLowerCase().includes(search) ||
        (dept.description && dept.description.toLowerCase().includes(search))
    );
  }, [departments, searchTerm]);

  return (
    <GlassCard className="p-2 max-h-[calc(100vh-20px)] flex flex-col">
      {/* Header */}
      <div className="mb-3 px-1">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {organizationName || "All Departments"}
        </h3>
      </div>

      {/* Search Bar */}
      <div className="mb-3 relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">
          search
        </span>
        <input
          type="text"
          placeholder="Search departments..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-10 pl-10 pr-10 rounded-xl border border-slate-200 text-[13px] outline-none bg-white placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        )}
      </div>

      {/* Search Results Count */}
      {searchTerm && (
        <div className="mb-3 px-1 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {filteredList.length} of {departments.length} departments
          </span>
          <button
            onClick={() => onSearchChange("")}
            className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Clear
          </button>
        </div>
      )}

      {/* Department List */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-1 px-2">
        {filteredList.map((dept, index) => (
          <DepartmentListItem
            key={dept.id}
            department={dept}
            isSelected={selectedDeptId === dept.id}
            onClick={() => onSelectDept(dept.id)}
            animationDelay={index * 0.05}
            departmentHead={users.find((u) => u.id === dept.departmentHeadUserId)}
          />
        ))}

        {filteredList.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-3 block">
              {searchTerm ? "search_off" : "folder_open"}
            </span>
            <p className="text-sm font-medium">
              {searchTerm ? "No departments found" : "No departments"}
            </p>
            <p className="text-xs mt-1">
              {searchTerm ? "Try adjusting your search" : "Select an organization above"}
            </p>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

// Department List Item Component
function DepartmentListItem({
  department,
  isSelected,
  onClick,
  animationDelay,
  departmentHead,
}: {
  department: Department;
  isSelected: boolean;
  onClick: () => void;
  animationDelay: number;
  departmentHead?: User;
}) {
  const capacityPercent = Math.round((department.capacityUtilization || 0) * 100);

  const getCapacityColor = (percent: number) => {
    if (percent > 80) return "bg-amber-400";
    if (percent > 60) return "bg-emerald-400";
    return "bg-indigo-400";
  };

  return (
    <button
      onClick={onClick}
      className={`
        text-left p-3 rounded-xl cursor-pointer transition-all duration-200
        ${
          isSelected
            ? "bg-indigo-50 border border-indigo-200 shadow-sm"
            : "bg-white border border-transparent hover:bg-slate-50 hover:border-slate-200"
        }
      `}
      style={{ animation: `slideIn 0.3s ease ${animationDelay}s both` }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            isSelected ? "bg-indigo-100" : "bg-slate-100"
          }`}
        >
          <span
            className={`material-symbols-outlined text-lg ${
              isSelected ? "text-indigo-600" : "text-slate-400"
            }`}
          >
            groups
          </span>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Name & Code */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-slate-800 truncate">
              {department.name}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 bg-slate-100 px-1.5 py-0.5 rounded">
              {department.code}
            </span>
          </div>

          {/* Capacity Bar */}
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getCapacityColor(capacityPercent)}`}
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-slate-400 shrink-0 tabular-nums">
              {capacityPercent}%
            </span>
          </div>

          {/* Department Head */}
          {departmentHead && (
            <div className="flex items-center gap-1.5">
              <Avatar person={departmentHead} size="xs" />
              <span className="text-[10px] text-slate-400 truncate font-medium">
                {departmentHead.fullName}
              </span>
            </div>
          )}

          {/* No Head Assigned */}
          {!departmentHead && department.departmentHeadUserId && (
            <div className="flex items-center gap-1.5">
              <div className="size-4 rounded-full bg-amber-100 flex items-center justify-center ring-2 ring-white">
                <span className="material-symbols-outlined text-[10px] text-amber-600">person</span>
              </div>
              <span className="text-[10px] text-slate-400 truncate italic">
                Head unassigned
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
